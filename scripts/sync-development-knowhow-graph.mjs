#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

const knowhowDir =
  process.env.KNOWHOW_DIR || "/Users/axel/Documents/Codex/development/knowhow"
const organizationId = process.env.OPTIMA_ORGANIZATION_ID || "org_demo_righello"
const database = process.env.OPTIMA_D1_DATABASE || "optima-beta-production-db"
const environment = process.env.OPTIMA_CF_ENV || "production"
const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true"
const rootNodeId = `agnode_knowhow_${hashId(`${organizationId}:development-knowhow-index`)}`

function hashId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24)
}

function sql(value) {
  if (value === null || value === undefined) return "NULL"
  return `'${String(value).replaceAll("'", "''")}'`
}

function json(value) {
  return sql(JSON.stringify(value))
}

function titleFromMarkdown(filename, content) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading
  return basename(filename, ".md").replace(/\.(txt|md)$/i, "").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function summarize(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("```"))
    .filter((line) => !line.startsWith("- [") && !line.startsWith("|"))

  return lines.join(" ").replace(/\s+/g, " ").slice(0, 700)
}

function headings(content) {
  return Array.from(content.matchAll(/^#{2,3}\s+(.+)$/gm))
    .map((match) => match[1].trim())
    .slice(0, 12)
}

function tagsFor(filename, content) {
  const stem = basename(filename, ".md")
  const tags = new Set(["codex-knowhow", "development-knowhow"])
  for (const part of stem.split(/[-_]+/)) {
    if (part.length > 2) tags.add(part.toLowerCase())
  }
  for (const heading of headings(content).slice(0, 4)) {
    for (const part of heading.toLowerCase().split(/[^a-z0-9]+/)) {
      if (part.length > 3) tags.add(part)
    }
  }
  return Array.from(tags).slice(0, 16)
}

function nodeUpsert({ id, nodeType, title, summary, sourceType, sourceId, tags, properties }) {
  return `INSERT INTO agentic_graph_nodes (
  id, organization_id, node_type, title, summary, source_type, source_id,
  source_url, confidence, tags_json, properties_json, created_by_member_id
) VALUES (
  ${sql(id)}, ${sql(organizationId)}, ${sql(nodeType)}, ${sql(title)}, ${sql(summary)},
  ${sql(sourceType)}, ${sql(sourceId)}, NULL, 'manual', ${json(tags)}, ${json(properties)}, NULL
)
ON CONFLICT(organization_id, node_type, source_type, source_id) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags_json = excluded.tags_json,
  properties_json = excluded.properties_json,
  updated_at = CURRENT_TIMESTAMP;`
}

function edgeUpsertBySource({ id, fromSourceType, fromSourceId, toSourceType, toSourceId, edgeType, weight = 1, properties = {} }) {
  return `INSERT INTO agentic_graph_edges (
  id, organization_id, from_node_id, to_node_id, edge_type,
  confidence, weight, properties_json, created_by_member_id
)
SELECT
  ${sql(id)}, ${sql(organizationId)}, from_node.id, to_node.id,
  ${sql(edgeType)}, 'manual', ${Number(weight)}, ${json(properties)}, NULL
FROM agentic_graph_nodes from_node
JOIN agentic_graph_nodes to_node
  ON to_node.organization_id = from_node.organization_id
WHERE from_node.organization_id = ${sql(organizationId)}
  AND from_node.source_type = ${sql(fromSourceType)}
  AND from_node.source_id = ${sql(fromSourceId)}
  AND to_node.source_type = ${sql(toSourceType)}
  AND to_node.source_id = ${sql(toSourceId)}
LIMIT 1
ON CONFLICT(organization_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
  confidence = excluded.confidence,
  weight = excluded.weight,
  properties_json = excluded.properties_json,
  updated_at = CURRENT_TIMESTAMP;`
}

function collectKnowledgeFiles(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return []
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return collectKnowledgeFiles(fullPath, relativePath)
    if (entry.isFile() && (entry.name.endsWith(".md") || relativePath === "llms.txt")) return [relativePath]
    return []
  })
}

const files = collectKnowledgeFiles(knowhowDir).sort((a, b) => a.localeCompare(b))

const removeOrphanKnowhowEdges = `DELETE FROM agentic_graph_edges
WHERE organization_id = ${sql(organizationId)}
  AND id LIKE 'agedge_knowhow_%'
  AND (
    from_node_id NOT IN (SELECT id FROM agentic_graph_nodes WHERE organization_id = ${sql(organizationId)})
    OR to_node_id NOT IN (SELECT id FROM agentic_graph_nodes WHERE organization_id = ${sql(organizationId)})
  );`

const statements = [
  removeOrphanKnowhowEdges,
  nodeUpsert({
    id: rootNodeId,
    nodeType: "knowledge_base",
    title: "Codex Development Know-How",
    summary:
      "Indice delle skill e lezioni operative salvate nella cartella globale development/knowhow e riutilizzabili dai progetti Optima/Righello.",
    sourceType: "codex_knowhow",
    sourceId: "development-knowhow-index",
    tags: ["codex", "knowhow", "skills", "workflow", "graphify"],
    properties: {
      directory: knowhowDir,
      fileCount: files.length,
      syncPolicy: "index_titles_summaries_headings_no_secrets",
    },
  }),
]

for (const file of files) {
  const fullPath = join(knowhowDir, file)
  const stat = statSync(fullPath)
  if (!stat.isFile()) continue
  const content = readFileSync(fullPath, "utf8")
  const nodeId = `agnode_knowhow_${hashId(`${organizationId}:${file}`)}`
  const title = titleFromMarkdown(file, content)
  statements.push(
    nodeUpsert({
      id: nodeId,
      nodeType: "development_knowhow",
      title,
      summary: summarize(content),
      sourceType: "codex_knowhow",
      sourceId: file,
      tags: tagsFor(file, content),
      properties: {
        fileName: file,
        relativePath: file,
        filePath: fullPath,
        headings: headings(content),
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      },
    }),
  )
  statements.push(
    edgeUpsertBySource({
      id: `agedge_knowhow_${hashId(`${organizationId}:index:${file}`)}`,
      fromSourceType: "codex_knowhow",
      fromSourceId: "development-knowhow-index",
      toSourceType: "codex_knowhow",
      toSourceId: file,
      edgeType: "indexes_knowhow",
      weight: 1,
      properties: { fileName: file },
    }),
  )
}

statements.push(removeOrphanKnowhowEdges)

const tempDir = mkdtempSync(join(tmpdir(), "optima-knowhow-"))
const sqlPath = join(tempDir, "sync-knowhow.sql")
writeFileSync(sqlPath, `${statements.join("\n\n")}\n`, "utf8")

try {
  if (dryRun) {
    console.log(`Dry run: would sync ${files.length} know-how graph records into ${database}/${environment}.`)
  } else {
    execFileSync("npx", ["wrangler", "d1", "execute", database, "--env", environment, "--remote", "--file", sqlPath], {
      stdio: "inherit",
    })
    console.log(`Synced ${files.length} know-how notes into ${database}/${environment}.`)
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
