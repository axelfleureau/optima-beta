#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"

const organizationId = process.env.OPTIMA_ORGANIZATION_ID || "org_demo_righello"
const database = process.env.OPTIMA_D1_DATABASE || "optima-beta-production-db"
const environment = process.env.OPTIMA_CF_ENV || "production"
const outputDir = process.env.OBSIDIAN_VAULT_DIR || "/Users/axel/Documents/Optima Obsidian Vault"
const snapshotPath = process.env.OPTIMA_GRAPH_JSON || ""
const limit = Number(process.env.OPTIMA_OBSIDIAN_NODE_LIMIT || 300)

function parseArgs() {
  const args = new Map()
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) args.set(match[1], match[2])
  }
  return args
}

const args = parseArgs()
const vaultDir = args.get("vault") || outputDir
const explicitSnapshot = args.get("snapshot") || snapshotPath

function slugify(value) {
  return (
    String(value || "Untitled")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .toLowerCase() || "node"
  )
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""))
}

function yamlArray(values) {
  if (!Array.isArray(values) || values.length === 0) return "[]"
  return `[${values.map((value) => yamlString(value)).join(", ")}]`
}

function markdownEscape(value) {
  return String(value ?? "").replaceAll("[[", "[").replaceAll("]]", "]").trim()
}

function noteName(node, used) {
  const base = slugify(`${node.nodeType}-${node.title}`)
  let candidate = base
  let index = 2
  while (used.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }
  used.add(candidate)
  return candidate
}

function readSnapshotFromFile(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"))
  if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed
  if (Array.isArray(parsed.result?.nodes) && Array.isArray(parsed.result?.edges)) return parsed.result
  throw new Error(`Snapshot non valido: ${path}`)
}

function d1Query(sql) {
  const output = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", database, "--env", environment, "--remote", "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  )
  const parsed = JSON.parse(output)
  const first = Array.isArray(parsed) ? parsed[0] : parsed
  return first?.results || first?.result?.[0]?.results || []
}

function parseJson(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function readSnapshotFromD1() {
  const safeOrganizationId = organizationId.replaceAll("'", "''")
  const safeLimit = Math.max(1, Math.min(1000, limit))
  const nodes = d1Query(`
    SELECT id, node_type AS nodeType, title, summary, source_type AS sourceType,
           source_id AS sourceId, source_url AS sourceUrl, confidence,
           tags_json AS tagsJson, properties_json AS propertiesJson, updated_at AS updatedAt
    FROM agentic_graph_nodes
    WHERE organization_id = '${safeOrganizationId}'
    ORDER BY updated_at DESC, title ASC
    LIMIT ${safeLimit}
  `).map((row) => ({
    id: row.id,
    nodeType: row.nodeType,
    title: row.title,
    summary: row.summary || "",
    sourceType: row.sourceType || "manual",
    sourceId: row.sourceId || row.id,
    sourceUrl: row.sourceUrl || null,
    confidence: row.confidence || "manual",
    tags: parseJson(row.tagsJson, []),
    properties: parseJson(row.propertiesJson, {}),
    updatedAt: row.updatedAt,
  }))

  const edges = d1Query(`
    SELECT id, from_node_id AS fromNodeId, to_node_id AS toNodeId, edge_type AS edgeType,
           confidence, weight, properties_json AS propertiesJson
    FROM agentic_graph_edges
    WHERE organization_id = '${safeOrganizationId}'
    ORDER BY weight DESC, updated_at DESC
    LIMIT ${Math.max(1, Math.min(4000, safeLimit * 8))}
  `).map((row) => ({
    id: row.id,
    fromNodeId: row.fromNodeId,
    toNodeId: row.toNodeId,
    edgeType: row.edgeType,
    confidence: row.confidence || "manual",
    weight: Number(row.weight || 1),
    properties: parseJson(row.propertiesJson, {}),
  }))

  return { nodes, edges, stats: { nodes: nodes.length, edges: edges.length } }
}

function loadSnapshot() {
  if (explicitSnapshot) return readSnapshotFromFile(explicitSnapshot)
  return readSnapshotFromD1()
}

function writeObsidianConfig(root) {
  const obsidianDir = join(root, ".obsidian")
  mkdirSync(obsidianDir, { recursive: true })
  writeFileSync(
    join(obsidianDir, "app.json"),
    `${JSON.stringify({ alwaysUpdateLinks: true, newFileLocation: "current", promptDelete: false }, null, 2)}\n`,
    "utf8",
  )
  writeFileSync(
    join(obsidianDir, "graph.json"),
    `${JSON.stringify({ showTags: true, showAttachments: false, hideUnresolved: false, showOrphans: true, search: "" }, null, 2)}\n`,
    "utf8",
  )
}

const snapshot = loadSnapshot()
const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : []
const edges = Array.isArray(snapshot.edges) ? snapshot.edges : []

rmSync(vaultDir, { recursive: true, force: true })
mkdirSync(join(vaultDir, "Nodes"), { recursive: true })
mkdirSync(join(vaultDir, "Sources"), { recursive: true })
writeObsidianConfig(vaultDir)

const usedNames = new Set()
const fileByNodeId = new Map()
for (const node of nodes) {
  const name = noteName(node, usedNames)
  fileByNodeId.set(node.id, `Nodes/${name}.md`)
}

const linksByNode = new Map()
for (const edge of edges) {
  if (!fileByNodeId.has(edge.fromNodeId) || !fileByNodeId.has(edge.toNodeId)) continue
  const fromLinks = linksByNode.get(edge.fromNodeId) ?? []
  fromLinks.push({ direction: "out", edge, otherId: edge.toNodeId })
  linksByNode.set(edge.fromNodeId, fromLinks)
  const toLinks = linksByNode.get(edge.toNodeId) ?? []
  toLinks.push({ direction: "in", edge, otherId: edge.fromNodeId })
  linksByNode.set(edge.toNodeId, toLinks)
}

for (const node of nodes) {
  const file = fileByNodeId.get(node.id)
  if (!file) continue
  const backlinks = linksByNode.get(node.id) ?? []
  const body = [
    "---",
    `id: ${yamlString(node.id)}`,
    `type: ${yamlString(node.nodeType)}`,
    `source_type: ${yamlString(node.sourceType)}`,
    `source_id: ${yamlString(node.sourceId)}`,
    `confidence: ${yamlString(node.confidence)}`,
    `tags: ${yamlArray([...(node.tags ?? []), node.nodeType, node.sourceType].filter(Boolean))}`,
    `optima_organization_id: ${yamlString(organizationId)}`,
    node.sourceUrl ? `source_url: ${yamlString(node.sourceUrl)}` : "source_url: null",
    "---",
    "",
    `# ${markdownEscape(node.title)}`,
    "",
    node.summary ? markdownEscape(node.summary) : "_Nessun sommario disponibile._",
    "",
    "## Collegamenti",
    "",
    backlinks.length
      ? backlinks
          .sort((a, b) => String(a.edge.edgeType).localeCompare(String(b.edge.edgeType)))
          .map((link) => {
            const otherFile = fileByNodeId.get(link.otherId)
            const otherNode = nodes.find((candidate) => candidate.id === link.otherId)
            const target = otherFile ? basename(otherFile, ".md") : markdownEscape(otherNode?.title || link.otherId)
            const direction = link.direction === "out" ? "verso" : "da"
            return `- ${link.edge.edgeType} ${direction} [[${target}]] - ${link.edge.confidence} - peso ${link.edge.weight ?? 1}`
          })
          .join("\n")
      : "- Nessun collegamento visibile nello snapshot esportato.",
    "",
    "## Provenienza",
    "",
    `- Tipo sorgente: ${node.sourceType || "manual"}`,
    `- Source ID: \`${node.sourceId || node.id}\``,
    node.sourceUrl ? `- URL: ${node.sourceUrl}` : "- URL: n/d",
  ].join("\n")

  writeFileSync(join(vaultDir, file), `${body}\n`, "utf8")
}

writeFileSync(
  join(vaultDir, "Optima Graph Memory.md"),
  [
    "---",
    'type: "index"',
    'source_type: "optima"',
    `optima_organization_id: ${yamlString(organizationId)}`,
    "---",
    "",
    "# Optima Graph Memory",
    "",
    `Snapshot esportato in vault Obsidian con ${nodes.length} nodi e ${edges.length} archi.`,
    "",
    "## Nodi principali",
    "",
    nodes
      .slice(0, 80)
      .map((node) => {
        const file = fileByNodeId.get(node.id)
        return file ? `- [[${basename(file, ".md")}]] - ${node.nodeType} - ${node.confidence}` : null
      })
      .filter(Boolean)
      .join("\n"),
    "",
    "## Regole",
    "",
    "- Obsidian e workspace umano di navigazione e cura.",
    "- Graphify resta motore di estrazione/query.",
    "- Optima resta sorgente autoritativa per tenant, permessi, review e azioni agentiche.",
    "- Non inserire segreti, credenziali o dump integrali nelle note.",
  ].join("\n"),
  "utf8",
)

writeFileSync(
  join(vaultDir, "Sources", "README.md"),
  [
    "# Fonti",
    "",
    "Questa cartella puo contenere note redatte sulle sorgenti importate in Optima.",
    "Per importare conoscenza da Obsidian verso Optima usare solo note revisionate, frontmatter chiaro e nessun allegato pesante.",
  ].join("\n"),
  "utf8",
)

console.log(`Vault Obsidian esportato: ${vaultDir}`)
console.log(`Nodi: ${nodes.length}; archi: ${edges.length}`)
