export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import {
  detectOperationalRecordType,
  parseEuroAmountCents,
  upsertClientInteraction,
  upsertExternalDataRecord,
  upsertExternalDataSource,
  type ExternalDataRecordInput,
  type ExternalDataSourceInput,
} from "@/lib/external-operational-imports"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function cleanText(value: unknown, limit = 1000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit)
}

async function requireImportContext() {
  const user = await requireClerkUser()
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }

  const db = await getCloudflareDb()
  if (!db) return { error: Response.json({ error: "D1 database binding missing" }, { status: 500 }) }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: Response.json({ error: "Serve un ruolo direzione/admin per importare dati operativi." }, { status: 403 }) }
  }

  return { db, principal }
}

export async function GET() {
  try {
    const context = await requireImportContext()
    if (context.error) return context.error

    const [sources, records, interactions] = await Promise.all([
      context.db
        .prepare(`SELECT COUNT(*) AS count FROM external_data_sources WHERE organization_id = ?`)
        .bind(context.principal.organizationId)
        .first(),
      context.db
        .prepare(`SELECT COUNT(*) AS count FROM external_data_records WHERE organization_id = ?`)
        .bind(context.principal.organizationId)
        .first(),
      context.db
        .prepare(`SELECT COUNT(*) AS count FROM client_interactions WHERE organization_id = ?`)
        .bind(context.principal.organizationId)
        .first(),
    ])

    return Response.json({
      ok: true,
      counts: {
        sources: Number(sources?.count || 0),
        records: Number(records?.count || 0),
        interactions: Number(interactions?.count || 0),
      },
    })
  } catch (error) {
    console.error("Operational imports GET error:", error)
    return Response.json({ error: "Errore nel controllo import operativi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireImportContext()
    if (context.error) return context.error

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Payload import non valido" }, { status: 400 })
    }

    const sourceIds = new Map<string, string>()
    const imported = { sources: 0, records: 0, interactions: 0 }

    for (const source of asArray((body as any).sources)) {
      const title = cleanText(source.title || source.name, 180)
      const externalId = cleanText(source.externalId || source.id || source.url, 220)
      if (!title || !externalId) continue

      const sourceId = await upsertExternalDataSource(context.db, {
        organizationId: context.principal.organizationId,
        provider: cleanText(source.provider || "manual", 40),
        sourceType: cleanText(source.sourceType || "database", 40),
        externalId,
        title,
        url: source.url ? cleanText(source.url, 500) : null,
        domain: cleanText(source.domain || "general", 60),
        status: cleanText(source.status || "active", 40),
        syncMode: cleanText(source.syncMode || "manual", 40),
        schema: source.schema && typeof source.schema === "object" ? source.schema : {},
        allowedFields: asArray(source.allowedFields).map((field) => cleanText(field, 80)),
        redactedFields: asArray(source.redactedFields).map((field) => cleanText(field, 80)),
      } satisfies ExternalDataSourceInput)

      sourceIds.set(externalId, sourceId)
      imported.sources += 1
    }

    for (const record of asArray((body as any).records)) {
      const title = cleanText(record.title || record.name || record["NOME TASK"], 220)
      const externalId = cleanText(record.externalId || record.id || record.url, 260)
      const sourceExternalId = cleanText(record.sourceExternalId || record.sourceId || record.sourceUrl, 260)
      const sourceId = sourceIds.get(sourceExternalId) || cleanText(record.sourceId, 160)
      if (!title || !externalId || !sourceId) continue

      const summary = cleanText(record.summary || record.description || record.DESCRIZIONE, 2000)
      const type = cleanText(record.recordType || record.type || record.TIPO, 160)
      const amountCents =
        Number.isFinite(Number(record.amountCents))
          ? Number(record.amountCents)
          : parseEuroAmountCents(`${title} ${summary}`)

      const recordId = await upsertExternalDataRecord(context.db, {
        organizationId: context.principal.organizationId,
        sourceId,
        provider: cleanText(record.provider || "manual", 40),
        recordType: record.recordType || detectOperationalRecordType({ title, type }),
        externalId,
        externalUrl: record.externalUrl || record.url || null,
        title,
        summary,
        clientId: record.clientId || null,
        projectId: record.projectId || null,
        taskId: record.taskId || null,
        quoteId: record.quoteId || null,
        interactionId: record.interactionId || null,
        occurredAt: record.occurredAt || record.createdTime || null,
        amountCents,
        currency: cleanText(record.currency || "EUR", 12),
        confidence: record.confidence || "extracted",
        raw: record.raw && typeof record.raw === "object" ? record.raw : record,
        normalized: record.normalized && typeof record.normalized === "object" ? record.normalized : {},
      } satisfies ExternalDataRecordInput)

      imported.records += 1

      const recordType = record.recordType || detectOperationalRecordType({ title, type })
      if (recordType === "call" || recordType === "meeting") {
        await upsertClientInteraction(context.db, {
          organizationId: context.principal.organizationId,
          clientId: record.clientId || null,
          projectId: record.projectId || null,
          title,
          summary,
          interactionType: recordType,
          status: cleanText(record.status || "logged", 40),
          occurredAt: record.occurredAt || record.createdTime || null,
          sourceType: cleanText(record.provider || "manual", 40),
          sourceId: externalId,
          sourceUrl: record.externalUrl || record.url || null,
          properties: { externalRecordId: recordId },
          createdByMemberId: context.principal.memberId,
        })
        imported.interactions += 1
      }
    }

    for (const interaction of asArray((body as any).interactions)) {
      const title = cleanText(interaction.title || interaction.name, 220)
      if (!title) continue
      await upsertClientInteraction(context.db, {
        organizationId: context.principal.organizationId,
        clientId: interaction.clientId || null,
        projectId: interaction.projectId || null,
        title,
        summary: cleanText(interaction.summary || interaction.description, 2000),
        interactionType: cleanText(interaction.interactionType || interaction.type || "note", 40),
        status: cleanText(interaction.status || "logged", 40),
        occurredAt: interaction.occurredAt || null,
        endedAt: interaction.endedAt || null,
        sourceType: cleanText(interaction.sourceType || "manual", 40),
        sourceId: interaction.sourceId || interaction.externalId || title,
        sourceUrl: interaction.sourceUrl || interaction.url || null,
        participants: asArray(interaction.participants),
        properties: interaction.properties && typeof interaction.properties === "object" ? interaction.properties : {},
        createdByMemberId: context.principal.memberId,
      })
      imported.interactions += 1
    }

    return Response.json({ ok: true, imported })
  } catch (error) {
    console.error("Operational imports POST error:", error)
    return Response.json({ error: "Errore durante l'import operativo" }, { status: 500 })
  }
}
