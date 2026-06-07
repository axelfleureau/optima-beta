#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, extname, join, relative, sep } from "node:path"

const sourceDir = process.env.HERMES_SOURCE_DIR || process.argv[2]
const organizationId = process.env.OPTIMA_ORGANIZATION_ID || "org_demo_righello"
const database = process.env.OPTIMA_D1_DATABASE || "optima-beta-production-db"
const environment = process.env.OPTIMA_CF_ENV || "production"
const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true"
const maxFiles = Math.min(1000, Math.max(1, Number(process.env.HERMES_IMPORT_MAX_FILES || 250)))
const maxBytes = Math.min(1024 * 1024, Math.max(1024, Number(process.env.HERMES_IMPORT_MAX_BYTES || 256 * 1024)))

const allowedRoots = new Set(["memories", "skills", "kanban", "sessions"])
const forbiddenSegments = new Set(["secrets", ".secrets", "tokens", "credentials", "env"])
const allowedExtensions = new Set([".md", ".json", ".jsonl", ".txt", ".yaml", ".yml"])

if (!sourceDir || !existsSync(sourceDir)) {
  console.error("Usage: HERMES_SOURCE_DIR=/path/to/hermes/.hermes node scripts/import-hermes-graph-source.mjs [--dry-run]")
  process.exit(1)
}

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

function safeRelative(path) {
  return relative(sourceDir, path).split(sep).join("/")
}

function isForbidden(relPath) {
  const normalized = relPath.toLowerCase()
  const fileName = basename(normalized)
  if (fileName.startsWith("request_dump")) return true
  if (fileName.includes("credential") || fileName.includes("secret")) return true
  return normalized
    .split("/")
    .some((segment) => forbiddenSegments.has(segment.toLowerCase()) || segment.toLowerCase().includes("secret"))
}

function redact(value) {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>")
    .replace(/\bBearer\s+[^'",\s}]+/gi, "Bearer <redacted>")
    .replace(/\b(?:sk|pk|xox|ghp|github_pat|sg|rk|tk)[_-][A-Za-z0-9_.\-]{6,}\b/g, "<secret_ref>")
    .replace(/\bAIza[A-Za-z0-9_.\-]{6,}\b/g, "<secret_ref>")
    .replace(/\b[A-Za-z0-9_-]{4,}\.\.\.[A-Za-z0-9_-]{4,}\b/g, "<redacted>")
    .replace(/\b[A-Za-z0-9_\-]{32,}\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,}\b/g, "<token>")
    .replace(/\b(api[_-]?key|token|secret|password|passwd|bearer)\s*[:=]\s*['"]?[^'",\s]+/gi, "$1=<redacted>")
    .replace(/\b(password|passwd)\s+[^.,;\n]+/gi, "$1 <redacted>")
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^'",\s}]+/gi, "Authorization: Bearer <redacted>")
    .replace(/\b\+?\d[\d\s().-]{7,}\d\b/g, "<phone>")
}

function titleFromContent(relPath, content) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return redact(heading).slice(0, 120)
  const skillName = content.match(/^name:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim()
  if (skillName) return redact(skillName).slice(0, 120)
  return basename(relPath, extname(relPath)).replaceAll(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 120)
}

function compactSummary(content, relPath, root) {
  if (root === "sessions") {
    const lines = content.split(/\r?\n/).filter(Boolean)
    const sample = lines.slice(0, 12).join(" ")
    const redacted = redact(sample)
      .replace(/[{}[\]"]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500)
    return `Sessione Hermes indicizzata in forma redatta da ${relPath}. Linee campionate: ${Math.min(lines.length, 12)}. ${redacted}`
  }

  const lines = redact(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("```") && !line.startsWith("---"))
    .filter((line) => !/^(token|secret|password|api[_-]?key|bearer)\b/i.test(line))
    .slice(0, 18)

  return lines.join(" ").replace(/\s+/g, " ").slice(0, 700)
}

function tagsFor(relPath, content, root) {
  const tags = new Set(["hermes", "righello", root])
  for (const part of relPath.toLowerCase().split(/[^a-z0-9]+/)) {
    if (part.length > 2 && !["json", "jsonl", "skill"].includes(part)) tags.add(part)
  }
  for (const match of redact(content).matchAll(/\b(?:mcp|telegram|github|cloudflare|sendgrid|notion|crm|graphify|memory|skill|kanban|user)\b/gi)) {
    tags.add(match[0].toLowerCase())
  }
  return Array.from(tags).slice(0, 18)
}

function nodeTypeFor(root) {
  if (root === "memories") return "hermes_memory"
  if (root === "skills") return "hermes_skill"
  if (root === "kanban") return "hermes_kanban"
  return "hermes_session"
}

function confidenceFor(root) {
  return root === "sessions" ? "ambiguous" : "extracted"
}

function walk(dir, output = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    const relPath = safeRelative(fullPath)
    if (isForbidden(relPath)) continue
    if (entry.isDirectory()) {
      walk(fullPath, output)
      continue
    }
    if (!entry.isFile()) continue
    const [root] = relPath.split("/")
    if (!allowedRoots.has(root)) continue
    if (!allowedExtensions.has(extname(entry.name).toLowerCase())) continue
    output.push(fullPath)
  }
  return output
}

function nodeUpsert({ id, nodeType, title, summary, sourceType, sourceId, confidence, tags, properties }) {
  return `INSERT INTO agentic_graph_nodes (
  id, organization_id, node_type, title, summary, source_type, source_id,
  source_url, confidence, tags_json, properties_json, created_by_member_id
) VALUES (
  ${sql(id)}, ${sql(organizationId)}, ${sql(nodeType)}, ${sql(title)}, ${sql(summary)},
  ${sql(sourceType)}, ${sql(sourceId)}, NULL, ${sql(confidence)}, ${json(tags)}, ${json(properties)}, NULL
)
ON CONFLICT(organization_id, node_type, source_type, source_id) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  confidence = excluded.confidence,
  tags_json = excluded.tags_json,
  properties_json = excluded.properties_json,
  updated_at = CURRENT_TIMESTAMP;`
}

function edgeUpsert({ id, fromNodeId, toNodeId, edgeType, confidence = "extracted", weight = 1, properties = {} }) {
  return `INSERT INTO agentic_graph_edges (
  id, organization_id, from_node_id, to_node_id, edge_type,
  confidence, weight, properties_json, created_by_member_id
) VALUES (
  ${sql(id)}, ${sql(organizationId)}, ${sql(fromNodeId)}, ${sql(toNodeId)},
  ${sql(edgeType)}, ${sql(confidence)}, ${Number(weight)}, ${json(properties)}, NULL
)
ON CONFLICT(organization_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
  confidence = excluded.confidence,
  weight = excluded.weight,
  properties_json = excluded.properties_json,
  updated_at = CURRENT_TIMESTAMP;`
}

const rootNodeId = `agnode_hermes_${hashId(`${organizationId}:hermes-righello-readonly`)}`
const statements = [
  nodeUpsert({
    id: rootNodeId,
    nodeType: "knowledge_base",
    title: "Hermes Righello read-only import",
    summary: "Indice redatto dei dati Righello letti da una installazione Hermes esistente. Secrets, token e dump integrali sono esclusi.",
    sourceType: "hermes_readonly",
    sourceId: "hermes-righello-readonly",
    confidence: "manual",
    tags: ["hermes", "righello", "graphify", "read-only", "redacted"],
    properties: {
      sourceDir,
      allowedRoots: Array.from(allowedRoots),
      forbiddenSegments: Array.from(forbiddenSegments),
      policy: "redacted_index_only_no_secrets_no_full_conversation_dump",
    },
  }),
]

const files = walk(sourceDir)
  .sort((a, b) => safeRelative(a).localeCompare(safeRelative(b)))
  .slice(0, maxFiles)

let indexed = 0
let skipped = 0

for (const fullPath of files) {
  const relPath = safeRelative(fullPath)
  const [root] = relPath.split("/")
  const stat = statSync(fullPath)
  if (stat.size > maxBytes) {
    skipped += 1
    continue
  }
  const content = readFileSync(fullPath, "utf8")
  const nodeId = `agnode_hermes_${hashId(`${organizationId}:${relPath}`)}`
  const nodeType = nodeTypeFor(root)
  const sourceId = relPath
  statements.push(
    nodeUpsert({
      id: nodeId,
      nodeType,
      title: titleFromContent(relPath, content),
      summary: compactSummary(content, relPath, root),
      sourceType: "hermes_readonly",
      sourceId,
      confidence: confidenceFor(root),
      tags: tagsFor(relPath, content, root),
      properties: {
        relativePath: relPath,
        root,
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        redaction: "emails_phones_tokens_secret_like_values",
        importPolicy: root === "sessions" ? "metadata_and_small_redacted_sample_only" : "redacted_summary_only",
      },
    }),
  )
  statements.push(
    edgeUpsert({
      id: `agedge_hermes_${hashId(`${organizationId}:root:${relPath}`)}`,
      fromNodeId: rootNodeId,
      toNodeId: nodeId,
      edgeType: "indexes_hermes_source",
      confidence: confidenceFor(root),
      properties: { relativePath: relPath, root },
    }),
  )
  indexed += 1
}

const tempDir = mkdtempSync(join(tmpdir(), "optima-hermes-graph-"))
const sqlPath = join(tempDir, "import-hermes-graph.sql")
writeFileSync(sqlPath, `${statements.join("\n\n")}\n`, "utf8")

try {
  if (dryRun) {
    console.log(`Dry run: generated ${statements.length} SQL statements at ${sqlPath}`)
    console.log(`Indexed files: ${indexed}; skipped oversized files: ${skipped}; source: ${sourceDir}`)
  } else {
    execFileSync(
      "npx",
      ["wrangler", "d1", "execute", database, "--env", environment, "--remote", "--file", sqlPath],
      { stdio: "inherit" },
    )
    console.log(`Imported ${indexed} Hermes graph nodes into ${database}/${environment}. Skipped oversized files: ${skipped}.`)
  }
} finally {
  if (!dryRun) rmSync(tempDir, { recursive: true, force: true })
}
