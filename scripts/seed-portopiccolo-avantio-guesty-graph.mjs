#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const organizationId = process.env.OPTIMA_ORGANIZATION_ID || "org_demo_righello"
const database = process.env.OPTIMA_D1_DATABASE || "optima-beta-production-db"
const environment = process.env.OPTIMA_CF_ENV || "production"
const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true"

const paths = {
  skill: "/Users/axel/.codex/skills/portopiccolo-avantio-guesty-sync/SKILL.md",
  locations: "/Users/axel/.codex/skills/portopiccolo-avantio-guesty-sync/references/locations.md",
  openaiYaml: "/Users/axel/.codex/skills/portopiccolo-avantio-guesty-sync/agents/openai.yaml",
  knowhow: "/Users/axel/Documents/Codex/development/knowhow/03-product-admin-security/avantio-guesty-sync.md",
  knowhowIndex: "/Users/axel/Documents/Codex/development/knowhow/INDEX.md",
  dossier: "/Users/axel/Documents/Codex/2026-06-05/ciao/outputs/portopiccolo-apartments-full-operational-context.md",
  repoSync: "/Users/axel/Documents/Codex/2026-05-20/clona-questo-progetto-e-iniziamo-a/tools/avantio-guesty-sync",
  runtimeSync: "/Users/axel/Library/Application Support/PortopiccoloSync/avantio-guesty-sync",
}

const runtimeFiles = {
  auditJson: `${paths.runtimeSync}/data/audit_report.json`,
  auditMarkdown: `${paths.runtimeSync}/data/audit_report.md`,
  syncLog: `${paths.runtimeSync}/logs/sync.log`,
  stateDb: `${paths.runtimeSync}/data/state.sqlite`,
  listingsMap: `${paths.runtimeSync}/config/listings_map.csv`,
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

function readText(path, maxChars = 12000) {
  if (!existsSync(path)) return ""
  return readFileSync(path, "utf8").slice(0, maxChars)
}

function fileMeta(path) {
  if (!existsSync(path)) return { exists: false }
  const stat = statSync(path)
  return {
    exists: true,
    path,
    bytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  }
}

function redact(value) {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>")
    .replace(/\bBearer\s+[^'",\s}]+/gi, "Bearer <redacted>")
    .replace(/\b(?:sk|pk|xox|ghp|github_pat|sg|rk|tk)[_-][A-Za-z0-9_.\-]{6,}\b/g, "<secret_ref>")
    .replace(/\b(api[_-]?key|token|secret|password|passwd|bearer)\s*[:=]\s*['"]?[^'",\s]+/gi, "$1=<redacted>")
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^'",\s}]+/gi, "Authorization: Bearer <redacted>")
}

function summarizeMarkdown(path, maxChars = 700) {
  const content = redact(readText(path))
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("```") && !line.startsWith("|"))
    .slice(0, 18)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, maxChars)
}

function countCsvDataRows(path) {
  const content = readText(path, 200000)
  if (!content) return null
  return Math.max(0, content.split(/\r?\n/).filter((line) => line.trim()).length - 1)
}

function latestLogSignals(path) {
  const content = readText(path, 80000)
  if (!content) return {}
  const lines = content.split(/\r?\n/).filter(Boolean).slice(-120)
  const joined = lines.join("\n")
  return {
    sampledLines: lines.length,
    pushToGuestySeen: /SYNC_PUSH_TO_GUESTY=1/.test(joined) ? "push_enabled_seen" : /SYNC_PUSH_TO_GUESTY=0/.test(joined) ? "dry_run_seen" : "unknown",
    pushedZeroSeen: /pushed[=:]\s*0/i.test(joined) || /pushed\s+0/i.test(joined),
    errorsZeroSeen: /errors[=:]\s*0/i.test(joined) || /errors\s+0/i.test(joined),
  }
}

function runtimeAuditSummary() {
  if (!existsSync(runtimeFiles.auditJson)) {
    return {
      status: "unknown",
      note: "Runtime audit JSON not found. Use read-only audit before making operational claims.",
    }
  }

  try {
    const audit = JSON.parse(readFileSync(runtimeFiles.auditJson, "utf8"))
    const stats = audit.stats && typeof audit.stats === "object" ? audit.stats : audit
    const issueCounts = {}
    if (Array.isArray(audit.issues)) {
      for (const issue of audit.issues) {
        const key = String(issue?.kind || "unknown")
        issueCounts[key] = (issueCounts[key] || 0) + 1
      }
    }
    return {
      status: String(audit.status || "unknown"),
      generatedAt: audit.generated_at || audit.generatedAt || null,
      fetchedFromAvantio: Number(stats.fetched_from_avantio ?? stats.fetched ?? 0),
      keptAfterOtaFilter: Number(stats.kept_after_ota_filter ?? stats.kept ?? 0),
      otaFiltered: Number(stats.ota_filtered ?? stats.filtered_ota ?? 0),
      pastSkipped: Number(stats.past_skipped ?? stats.skipped_past ?? 0),
      synced: Number(stats.synced ?? 0),
      missingInGuesty: Number(stats.missing_in_guesty ?? stats.missing ?? 0),
      mismatched: Number(stats.mismatched ?? 0),
      unmappedProperties: Number(stats.unmapped_properties ?? stats.unmapped ?? 0),
      issueCounts,
      importPolicy: "counts_only_no_guest_names_no_secrets",
    }
  } catch (error) {
    return {
      status: "parse_error",
      note: error instanceof Error ? error.message : "Unable to parse audit JSON",
    }
  }
}

function nodeUpsert({ id, nodeType, title, summary, sourceType, sourceId, confidence = "manual", tags, properties }) {
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

function edgeUpsert({ id, fromNodeId, toNodeId, edgeType, confidence = "manual", weight = 1, properties = {} }) {
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

const nodeIds = {
  system: `agnode_ppsync_${hashId(`${organizationId}:portopiccolo-avantio-guesty-sync-system`)}`,
  skill: `agnode_ppsync_${hashId(`${organizationId}:skill`)}`,
  locations: `agnode_ppsync_${hashId(`${organizationId}:locations`)}`,
  openaiYaml: `agnode_ppsync_${hashId(`${organizationId}:openai-yaml`)}`,
  knowhow: `agnode_ppsync_${hashId(`${organizationId}:knowhow`)}`,
  dossier: `agnode_ppsync_${hashId(`${organizationId}:dossier`)}`,
  repoSync: `agnode_ppsync_${hashId(`${organizationId}:repo-sync`)}`,
  runtimeSync: `agnode_ppsync_${hashId(`${organizationId}:runtime-sync`)}`,
  audit: `agnode_ppsync_${hashId(`${organizationId}:runtime-audit`)}`,
}

const statements = [
  nodeUpsert({
    id: nodeIds.system,
    nodeType: "system",
    title: "Portopiccolo Avantio Guesty Sync",
    summary:
      "Sistema operativo Portopiccolo per audit e sincronizzazione prenotazioni Avantio verso Guesty. Optima lo usa come skill/sorgente read-only salvo conferma esplicita per scritture Guesty.",
    sourceType: "private_readonly_source",
    sourceId: "portopiccolo-avantio-guesty-sync",
    confidence: "manual",
    tags: ["portopiccolo", "avantio", "guesty", "sync", "ota-filter", "read-only", "production-impacting"],
    properties: {
      safetyRule: "Guesty writes require explicit confirmation in the current turn.",
      dedupeKey: "originId=avantio:<id>",
      hardBannedOtaChannels: ["Booking", "Airbnb", "Vrbo", "HomeAway"],
      importPolicy: "index_paths_counts_summaries_no_credentials_no_runtime_dump",
    },
  }),
  nodeUpsert({
    id: nodeIds.skill,
    nodeType: "codex_skill",
    title: "Skill Codex Portopiccolo Avantio Guesty Sync",
    summary: summarizeMarkdown(paths.skill),
    sourceType: "codex_skill",
    sourceId: "portopiccolo-avantio-guesty-sync/SKILL.md",
    confidence: "manual",
    tags: ["codex", "skill", "portopiccolo", "avantio", "guesty", "dry-run"],
    properties: { ...fileMeta(paths.skill), displayName: "Portopiccolo Avantio Guesty Sync" },
  }),
  nodeUpsert({
    id: nodeIds.locations,
    nodeType: "source_map",
    title: "Portopiccolo sync locations map",
    summary: summarizeMarkdown(paths.locations),
    sourceType: "codex_skill",
    sourceId: "portopiccolo-avantio-guesty-sync/references/locations.md",
    confidence: "manual",
    tags: ["locations", "runtime", "repo", "launchagent", "audit"],
    properties: { ...fileMeta(paths.locations), paths },
  }),
  nodeUpsert({
    id: nodeIds.openaiYaml,
    nodeType: "skill_metadata",
    title: "Portopiccolo sync OpenAI skill metadata",
    summary: summarizeMarkdown(paths.openaiYaml, 400),
    sourceType: "codex_skill",
    sourceId: "portopiccolo-avantio-guesty-sync/agents/openai.yaml",
    confidence: "manual",
    tags: ["openai", "skill-metadata", "ui", "codex"],
    properties: fileMeta(paths.openaiYaml),
  }),
  nodeUpsert({
    id: nodeIds.knowhow,
    nodeType: "development_knowhow",
    title: "Avantio Guesty Sync Safety",
    summary: summarizeMarkdown(paths.knowhow),
    sourceType: "codex_knowhow",
    sourceId: "avantio-guesty-sync.md",
    confidence: "manual",
    tags: ["knowhow", "safety", "guesty", "avantio", "sync", "ota-filter"],
    properties: { ...fileMeta(paths.knowhow), index: fileMeta(paths.knowhowIndex) },
  }),
  nodeUpsert({
    id: nodeIds.dossier,
    nodeType: "operational_dossier",
    title: "Portopiccolo Apartments operational dossier",
    summary: summarizeMarkdown(paths.dossier),
    sourceType: "private_readonly_source",
    sourceId: "portopiccolo-apartments-full-operational-context.md",
    confidence: "manual",
    tags: ["portopiccolo", "dossier", "recovery", "operations", "sync"],
    properties: {
      ...fileMeta(paths.dossier),
      importPolicy: "summary_and_path_only_no_full_chat_context",
    },
  }),
  nodeUpsert({
    id: nodeIds.repoSync,
    nodeType: "repository",
    title: "Portopiccolo Avantio Guesty sync source repo",
    summary:
      "Repository locale del tool di sincronizzazione Avantio -> Guesty. Usare per modifiche codice, README, config schema e audit dry-run.",
    sourceType: "private_readonly_source",
    sourceId: "repo-sync-tools-avantio-guesty-sync",
    confidence: "manual",
    tags: ["repo", "portopiccolo", "avantio", "guesty", "python", "sync"],
    properties: {
      path: paths.repoSync,
      readme: fileMeta(`${paths.repoSync}/README.md`),
      envExample: fileMeta(`${paths.repoSync}/.env.example`),
      listingsMapRows: countCsvDataRows(`${paths.repoSync}/config/listings_map.csv`),
    },
  }),
  nodeUpsert({
    id: nodeIds.runtimeSync,
    nodeType: "runtime_source",
    title: "Portopiccolo sync runtime install",
    summary:
      "Installazione runtime locale del sync Portopiccolo. Contiene audit, log, state DB e helper LaunchAgent. Indicizzare solo metadati e conteggi.",
    sourceType: "private_readonly_source",
    sourceId: "runtime-sync-avantio-guesty",
    confidence: "manual",
    tags: ["runtime", "launchagent", "audit", "state-db", "portopiccolo"],
    properties: {
      path: paths.runtimeSync,
      auditJson: fileMeta(runtimeFiles.auditJson),
      auditMarkdown: fileMeta(runtimeFiles.auditMarkdown),
      syncLog: fileMeta(runtimeFiles.syncLog),
      stateDb: fileMeta(runtimeFiles.stateDb),
      listingsMapRows: countCsvDataRows(runtimeFiles.listingsMap),
      latestLogSignals: latestLogSignals(runtimeFiles.syncLog),
    },
  }),
  nodeUpsert({
    id: nodeIds.audit,
    nodeType: "operational_audit",
    title: "Portopiccolo Avantio Guesty latest runtime audit",
    summary:
      "Ultimo audit runtime indicizzato per conteggi operativi. Se il report e stale o drift, eseguire audit read-only prima di fare claim operativi.",
    sourceType: "private_readonly_source",
    sourceId: "runtime-audit-report",
    confidence: "extracted",
    tags: ["audit", "drift", "avantio", "guesty", "read-only"],
    properties: {
      audit: runtimeAuditSummary(),
      auditJson: fileMeta(runtimeFiles.auditJson),
      auditMarkdown: fileMeta(runtimeFiles.auditMarkdown),
      importPolicy: "counts_only_no_issue_table",
    },
  }),
]

for (const [toKey, edgeType, weight] of [
  ["skill", "has_codex_skill", 1.4],
  ["locations", "has_source_map", 1.2],
  ["openaiYaml", "has_skill_metadata", 0.8],
  ["knowhow", "uses_safety_knowhow", 1.4],
  ["dossier", "has_operational_dossier", 1.3],
  ["repoSync", "has_sync_source_repo", 1.2],
  ["runtimeSync", "has_runtime_install", 1.2],
  ["audit", "has_latest_audit", 1.1],
]) {
  statements.push(
    edgeUpsert({
      id: `agedge_ppsync_${hashId(`${organizationId}:system:${toKey}:${edgeType}`)}`,
      fromNodeId: nodeIds.system,
      toNodeId: nodeIds[toKey],
      edgeType,
      confidence: toKey === "audit" ? "extracted" : "manual",
      weight,
      properties: { source: "portopiccolo-avantio-guesty-seed" },
    }),
  )
}

statements.push(
  edgeUpsert({
    id: `agedge_ppsync_${hashId(`${organizationId}:runtime:audit`)}`,
    fromNodeId: nodeIds.runtimeSync,
    toNodeId: nodeIds.audit,
    edgeType: "produces_audit",
    confidence: "extracted",
    weight: 1,
    properties: { source: runtimeFiles.auditJson },
  }),
)

const tempDir = mkdtempSync(join(tmpdir(), "optima-portopiccolo-graph-"))
const sqlPath = join(tempDir, "seed-portopiccolo-graph.sql")
writeFileSync(sqlPath, `${statements.join("\n\n")}\n`, "utf8")

try {
  if (dryRun) {
    console.log(`Dry run: generated ${statements.length} SQL statements at ${sqlPath}`)
    console.log(JSON.stringify({ nodes: Object.keys(nodeIds).length, paths, runtimeAudit: runtimeAuditSummary() }, null, 2))
  } else {
    execFileSync(
      "npx",
      ["wrangler", "d1", "execute", database, "--env", environment, "--remote", "--file", sqlPath],
      { stdio: "inherit" },
    )
    console.log(`Seeded Portopiccolo Avantio/Guesty graph nodes into ${database}/${environment}.`)
  }
} finally {
  if (!dryRun) rmSync(tempDir, { recursive: true, force: true })
}
