#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { basename } from "node:path"

const DEFAULT_INPUT = "/private/tmp/righello-client-intelligence-master.md"
const DEFAULT_OUTPUT = "scripts/seed-hermes-client-intelligence-2026-06-15.sql"

const KNOWN_CLIENT_IDS = new Map([
  ["DICO", "client_internal_dico_online"],
  ["PPAP", "client_rig_ppap"],
  ["RECA", "client_rig_reca"],
  ["SSVO", "client_rig_ssvo"],
])

function argValue(name, fallback) {
  const prefix = `${name}=`
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

function sql(value) {
  if (value === null || value === undefined) return "NULL"
  return `'${String(value).replace(/'/g, "''")}'`
}

function jsonSql(value) {
  return sql(JSON.stringify(value))
}

function normalizeSlug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
}

function parseAmountCents(value) {
  const cleaned = String(value)
    .replace(/€/g, "")
    .replace(/\s+/g, "")
    .replace(/,/g, "")
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

function parseInteger(value) {
  const parsed = Number(String(value).trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function contentHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function extractClientRows(markdown) {
  const rows = []
  let inIndex = false

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (line === "## Indice Clienti") {
      inIndex = true
      continue
    }

    if (inIndex && line.startsWith("## ") && line !== "## Indice Clienti") {
      break
    }

    if (!inIndex || !line.startsWith("|") || line.includes("---") || line.includes("Codice")) {
      continue
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())

    if (cells.length < 10) continue

    const [code, name, status, invoiceCount, revenue, hasDocx, hasNarrative, hasOrganic, hasAds, caseStudyPriority] = cells

    if (!code || !name) continue

    rows.push({
      code: code.trim(),
      name: name.replace(/\s+/g, " ").trim(),
      status: status.trim(),
      invoiceCount: parseInteger(invoiceCount),
      revenueCents: parseAmountCents(revenue),
      hasDocx: hasDocx.includes("✓"),
      hasNarrative: hasNarrative.includes("✓"),
      hasOrganic: hasOrganic.includes("✓"),
      hasAds: hasAds.includes("✓"),
      caseStudyPriority: caseStudyPriority.trim(),
    })
  }

  return rows
}

function clientIdFor(row) {
  return KNOWN_CLIENT_IDS.get(row.code) || `client_hermes_${normalizeSlug(row.code || row.name)}`
}

function recordPrefixFor(row) {
  return normalizeSlug(row.code || row.name)
}

function buildSql(rows, sourceFile) {
  const generatedAt = new Date().toISOString()
  const clientValues = rows.map((row) => {
    const status = /inattivo|lost/i.test(row.status)
      ? "inactive"
      : /prospect/i.test(row.status)
        ? "prospect"
        : "active"
    return `(${sql(clientIdFor(row))}, 'org_demo_righello', ${sql(row.name)}, NULL, ${sql(row.name)}, ${sql(status)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  })

  const sourceSchema = {
    source: "Hermes Righello Client Intelligence",
    file: basename(sourceFile),
    extractedFields: ["code", "name", "status", "invoiceCount", "revenueCents", "caseStudyPriority"],
    excludedSections: ["Schede Clienti dettagliate con recapiti"],
    redaction: "Only top index table imported; phone/email/OneDrive fields ignored.",
  }

  const sourceInsert = `INSERT INTO external_data_sources (
  id,
  organization_id,
  provider,
  source_type,
  external_id,
  title,
  url,
  domain,
  status,
  sync_mode,
  schema_json,
  allowed_fields_json,
  redacted_fields_json,
  last_synced_at,
  updated_at
) VALUES (
  'extsrc_hermes_client_intelligence_master',
  'org_demo_righello',
  'hermes',
  'obsidian_markdown',
  'hermes:obsidian:righello-client-intelligence-master',
  'Hermes Righello Client Intelligence Master',
  NULL,
  'clients',
  'active',
  'manual_readonly_import',
  ${jsonSql(sourceSchema)},
  ${jsonSql(sourceSchema.extractedFields)},
  ${jsonSql(["email", "telefono", "phone", "pec", "partita_iva", "onedrive", "attachments", "secrets"])},
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT(organization_id, provider, external_id) DO UPDATE SET
  title = excluded.title,
  domain = excluded.domain,
  status = excluded.status,
  sync_mode = excluded.sync_mode,
  schema_json = excluded.schema_json,
  allowed_fields_json = excluded.allowed_fields_json,
  redacted_fields_json = excluded.redacted_fields_json,
  last_synced_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP;`

  const clientRecords = rows.map((row) => {
    const normalized = {
      code: row.code,
      status: row.status,
      invoiceCount: row.invoiceCount,
      revenueCents: row.revenueCents,
      hasDocx: row.hasDocx,
      hasNarrative: row.hasNarrative,
      hasOrganic: row.hasOrganic,
      hasAds: row.hasAds,
      caseStudyPriority: row.caseStudyPriority,
    }
    const raw = {
      redacted: true,
      source: "Hermes Obsidian Righello Client Intelligence Master",
      importedFrom: "Indice Clienti",
      note: "Detailed contact fields intentionally ignored.",
    }
    return `(
  ${sql(`extrec_hermes_client_${recordPrefixFor(row)}`)},
  'org_demo_righello',
  'extsrc_hermes_client_intelligence_master',
  'hermes',
  'client',
  ${sql(`hermes:client-intelligence:${row.code}`)},
  NULL,
  ${sql(`${row.name} - scheda cliente Hermes`)},
  ${sql(`Cliente ${row.name}: stato ${row.status}, ${row.invoiceCount} fatture tracciate, fatturato aggregato ${(row.revenueCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}. Fonte Hermes read-only.`)},
  ${sql(clientIdFor(row))},
  NULL,
  NULL,
  NULL,
  NULL,
  '2026-06-04T12:15:00.000Z',
  ${row.revenueCents || "NULL"},
  'EUR',
  'extracted',
  ${sql(contentHash({ normalized, raw }))},
  ${jsonSql(raw)},
  ${jsonSql(normalized)},
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)`
  })

  const paymentRecords = rows
    .filter((row) => row.revenueCents > 0 || row.invoiceCount > 0)
    .map((row) => {
      const normalized = {
        code: row.code,
        clientName: row.name,
        invoiceCount: row.invoiceCount,
        revenueCents: row.revenueCents,
        currency: "EUR",
        evidence: "aggregated_invoice_revenue_from_hermes_master",
      }
      const raw = {
        redacted: true,
        source: "Hermes Obsidian Righello Client Intelligence Master",
        importedFrom: "Indice Clienti",
        paymentProof: false,
        invoiceAggregate: true,
      }
      return `(
  ${sql(`extrec_hermes_revenue_${recordPrefixFor(row)}`)},
  'org_demo_righello',
  'extsrc_hermes_client_intelligence_master',
  'hermes',
  'payment',
  ${sql(`hermes:client-intelligence:${row.code}:revenue`)},
  NULL,
  ${sql(`${row.name} - fatturato tracciato Hermes`)},
  ${sql(`Hermes riporta ${row.invoiceCount} fatture e fatturato aggregato ${(row.revenueCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })} per ${row.name}. Trattare come dato amministrativo aggregato da verificare, non come singolo pagamento.`)},
  ${sql(clientIdFor(row))},
  NULL,
  NULL,
  NULL,
  NULL,
  '2026-06-04T12:15:00.000Z',
  ${row.revenueCents || "NULL"},
  'EUR',
  'extracted',
  ${sql(contentHash({ normalized, raw }))},
  ${jsonSql(raw)},
  ${jsonSql(normalized)},
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)`
    })

  const recordUpsert = `ON CONFLICT(organization_id, provider, external_id) DO UPDATE SET
  source_id = excluded.source_id,
  record_type = excluded.record_type,
  title = excluded.title,
  summary = excluded.summary,
  client_id = excluded.client_id,
  occurred_at = excluded.occurred_at,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  confidence = excluded.confidence,
  content_hash = excluded.content_hash,
  raw_json = excluded.raw_json,
  normalized_json = excluded.normalized_json,
  updated_at = CURRENT_TIMESTAMP;`

  return `-- Import Hermes Righello Client Intelligence into Optima operational memory.
-- Generated at ${generatedAt} from ${sourceFile}.
-- Policy: read-only Hermes source; only the top client index is imported; contact fields, OneDrive references and attachments are excluded.

${sourceInsert}

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
${clientValues.join(",\n")}
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO external_data_records (
  id,
  organization_id,
  source_id,
  provider,
  record_type,
  external_id,
  external_url,
  title,
  summary,
  client_id,
  project_id,
  task_id,
  quote_id,
  interaction_id,
  occurred_at,
  amount_cents,
  currency,
  confidence,
  content_hash,
  raw_json,
  normalized_json,
  created_at,
  updated_at
) VALUES
${clientRecords.join(",\n")}
${recordUpsert}

INSERT INTO external_data_records (
  id,
  organization_id,
  source_id,
  provider,
  record_type,
  external_id,
  external_url,
  title,
  summary,
  client_id,
  project_id,
  task_id,
  quote_id,
  interaction_id,
  occurred_at,
  amount_cents,
  currency,
  confidence,
  content_hash,
  raw_json,
  normalized_json,
  created_at,
  updated_at
) VALUES
${paymentRecords.join(",\n")}
${recordUpsert}

INSERT INTO audit_logs (id, organization_id, actor_member_id, action, entity_type, entity_id, metadata_json, created_at)
VALUES (
  'audit_hermes_client_intelligence_import_20260615',
  'org_demo_righello',
  'mem_axel_wearerighello',
  'import_hermes_client_intelligence',
  'external_data_source',
  'extsrc_hermes_client_intelligence_master',
  ${jsonSql({
    rows: rows.length,
    revenueRecords: paymentRecords.length,
    sourceFile: basename(sourceFile),
    policy: "read_only_redacted",
  })},
  CURRENT_TIMESTAMP
) ON CONFLICT(id) DO NOTHING;
`
}

const input = argValue("--input", DEFAULT_INPUT)
const output = argValue("--output", DEFAULT_OUTPUT)
const markdown = readFileSync(input, "utf8")
const rows = extractClientRows(markdown)

if (!rows.length) {
  console.error(`No client rows found in ${input}`)
  process.exit(1)
}

const generated = buildSql(rows, input)
writeFileSync(output, generated)
console.log(`Generated ${output}`)
console.log(`Client records: ${rows.length}`)
console.log(`Revenue records: ${rows.filter((row) => row.revenueCents > 0 || row.invoiceCount > 0).length}`)
