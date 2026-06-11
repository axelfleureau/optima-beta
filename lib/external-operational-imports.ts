import { createHash } from "node:crypto"
import { createId } from "@/lib/cloudflare-db"

export type ExternalProvider = "notion" | "github" | "onedrive" | "manual" | string

export type ExternalRecordType =
  | "client"
  | "quote"
  | "task"
  | "call"
  | "meeting"
  | "payment"
  | "document"
  | "note"

export interface ExternalDataSourceInput {
  id?: string
  organizationId: string
  provider: ExternalProvider
  sourceType?: string
  externalId: string
  title: string
  url?: string | null
  domain?: string
  status?: string
  syncMode?: string
  schema?: Record<string, unknown>
  allowedFields?: string[]
  redactedFields?: string[]
}

export interface ExternalDataRecordInput {
  id?: string
  organizationId: string
  sourceId: string
  provider: ExternalProvider
  recordType: ExternalRecordType
  externalId: string
  externalUrl?: string | null
  title: string
  summary?: string | null
  clientId?: string | null
  projectId?: string | null
  taskId?: string | null
  quoteId?: string | null
  interactionId?: string | null
  occurredAt?: string | null
  amountCents?: number | null
  currency?: string
  confidence?: "manual" | "extracted" | "inferred" | "ambiguous"
  raw?: Record<string, unknown>
  normalized?: Record<string, unknown>
}

export interface ClientInteractionInput {
  id?: string
  organizationId: string
  clientId?: string | null
  projectId?: string | null
  title: string
  summary?: string | null
  interactionType: "call" | "meeting" | "note" | "email" | "review" | string
  status?: string
  occurredAt?: string | null
  endedAt?: string | null
  sourceType?: string
  sourceId?: string | null
  sourceUrl?: string | null
  participants?: unknown[]
  properties?: Record<string, unknown>
  createdByMemberId?: string | null
}

const SENSITIVE_KEYS = /email|telefono|phone|pec|partita iva|codice fiscale|codice destinatario|password|token|secret|api[_ -]?key|onedrive|allegati|attachments/i

function stableJson(value: unknown) {
  return JSON.stringify(value ?? {})
}

function contentHash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex")
}

export function redactExternalRecord(raw: Record<string, unknown> = {}) {
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (SENSITIVE_KEYS.test(key)) {
      redacted[key] = "[REDACTED]"
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

export function detectOperationalRecordType(input: {
  title?: string | null
  type?: string | string[] | null
  status?: string | null
}): ExternalRecordType {
  const haystack = [input.title, Array.isArray(input.type) ? input.type.join(" ") : input.type, input.status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (/\bpreventiv|proposal|quote\b/.test(haystack)) return "quote"
  if (/\bcall|telefonat/.test(haystack)) return "call"
  if (/\bmeeting|appuntament|incontr|riunion/.test(haystack)) return "meeting"
  if (/\bpagament|incass|fattur|saldo|acconto/.test(haystack)) return "payment"
  if (/\btask|lavor|todo|done|progress/.test(haystack)) return "task"
  return "note"
}

export function parseEuroAmountCents(text: string) {
  const normalized = text.replace(/\s+/g, " ")
  const candidates = [...normalized.matchAll(/(?:€|euro)\s*([0-9][0-9.\s]*,[0-9]{1,2}|[0-9][0-9.\s]*)|([0-9][0-9.\s]*,[0-9]{1,2}|[0-9][0-9.\s]*)\s*(?:€|euro)/gi)]
  const amounts = candidates
    .map((match) => match[1] || match[2])
    .map((raw) => Number(raw.replace(/\./g, "").replace(/\s/g, "").replace(",", ".")))
    .filter((amount) => Number.isFinite(amount) && amount > 0)

  if (!amounts.length) return null
  return Math.round(Math.max(...amounts) * 100)
}

export async function upsertExternalDataSource(db: any, input: ExternalDataSourceInput) {
  const now = new Date().toISOString()
  const id = input.id || createId("extsrc")

  await db
    .prepare(
      `INSERT INTO external_data_sources (
         id, organization_id, provider, source_type, external_id, title, url, domain,
         status, sync_mode, schema_json, allowed_fields_json, redacted_fields_json,
         last_synced_at, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(organization_id, provider, external_id) DO UPDATE SET
         source_type = excluded.source_type,
         title = excluded.title,
         url = excluded.url,
         domain = excluded.domain,
         status = excluded.status,
         sync_mode = excluded.sync_mode,
         schema_json = excluded.schema_json,
         allowed_fields_json = excluded.allowed_fields_json,
         redacted_fields_json = excluded.redacted_fields_json,
         last_synced_at = excluded.last_synced_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.organizationId,
      input.provider,
      input.sourceType || "database",
      input.externalId,
      input.title,
      input.url || null,
      input.domain || "general",
      input.status || "active",
      input.syncMode || "manual",
      stableJson(input.schema || {}),
      stableJson(input.allowedFields || []),
      stableJson(input.redactedFields || []),
      now,
      now,
      now,
    )
    .run()

  const row = await db
    .prepare(`SELECT id FROM external_data_sources WHERE organization_id = ? AND provider = ? AND external_id = ? LIMIT 1`)
    .bind(input.organizationId, input.provider, input.externalId)
    .first()

  return String(row?.id || id)
}

export async function upsertExternalDataRecord(db: any, input: ExternalDataRecordInput) {
  const now = new Date().toISOString()
  const raw = redactExternalRecord(input.raw || {})
  const normalized = input.normalized || {}
  const id = input.id || createId("extrec")

  await db
    .prepare(
      `INSERT INTO external_data_records (
         id, organization_id, source_id, provider, record_type, external_id, external_url,
         title, summary, client_id, project_id, task_id, quote_id, interaction_id,
         occurred_at, amount_cents, currency, confidence, content_hash,
         raw_json, normalized_json, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(organization_id, provider, external_id) DO UPDATE SET
         source_id = excluded.source_id,
         record_type = excluded.record_type,
         external_url = excluded.external_url,
         title = excluded.title,
         summary = excluded.summary,
         client_id = excluded.client_id,
         project_id = excluded.project_id,
         task_id = excluded.task_id,
         quote_id = excluded.quote_id,
         interaction_id = excluded.interaction_id,
         occurred_at = excluded.occurred_at,
         amount_cents = excluded.amount_cents,
         currency = excluded.currency,
         confidence = excluded.confidence,
         content_hash = excluded.content_hash,
         raw_json = excluded.raw_json,
         normalized_json = excluded.normalized_json,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.organizationId,
      input.sourceId,
      input.provider,
      input.recordType,
      input.externalId,
      input.externalUrl || null,
      input.title,
      input.summary || null,
      input.clientId || null,
      input.projectId || null,
      input.taskId || null,
      input.quoteId || null,
      input.interactionId || null,
      input.occurredAt || null,
      input.amountCents ?? null,
      input.currency || "EUR",
      input.confidence || "manual",
      contentHash({ raw, normalized }),
      stableJson(raw),
      stableJson(normalized),
      now,
      now,
    )
    .run()

  const row = await db
    .prepare(`SELECT id FROM external_data_records WHERE organization_id = ? AND provider = ? AND external_id = ? LIMIT 1`)
    .bind(input.organizationId, input.provider, input.externalId)
    .first()

  return String(row?.id || id)
}

export async function upsertClientInteraction(db: any, input: ClientInteractionInput) {
  const now = new Date().toISOString()
  const id = input.id || createId("inter")
  const sourceType = input.sourceType || "manual"
  const sourceId = input.sourceId || id

  await db
    .prepare(
      `INSERT INTO client_interactions (
         id, organization_id, client_id, project_id, title, summary, interaction_type,
         status, occurred_at, ended_at, source_type, source_id, source_url,
         participants_json, properties_json, created_by_member_id, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(organization_id, source_type, source_id) DO UPDATE SET
         client_id = excluded.client_id,
         project_id = excluded.project_id,
         title = excluded.title,
         summary = excluded.summary,
         interaction_type = excluded.interaction_type,
         status = excluded.status,
         occurred_at = excluded.occurred_at,
         ended_at = excluded.ended_at,
         source_url = excluded.source_url,
         participants_json = excluded.participants_json,
         properties_json = excluded.properties_json,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.organizationId,
      input.clientId || null,
      input.projectId || null,
      input.title,
      input.summary || null,
      input.interactionType,
      input.status || "logged",
      input.occurredAt || null,
      input.endedAt || null,
      sourceType,
      sourceId,
      input.sourceUrl || null,
      stableJson(input.participants || []),
      stableJson(input.properties || {}),
      input.createdByMemberId || null,
      now,
      now,
    )
    .run()

  const row = await db
    .prepare(`SELECT id FROM client_interactions WHERE organization_id = ? AND source_type = ? AND source_id = ? LIMIT 1`)
    .bind(input.organizationId, sourceType, sourceId)
    .first()

  return String(row?.id || id)
}
