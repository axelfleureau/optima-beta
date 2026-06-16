export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { sanitizeQuoteClient } from "@/lib/quote-data-quality"

function parseJson(value: unknown, fallback: unknown) {
  if (typeof value !== "string" || !value.trim()) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function euros(cents: unknown) {
  return Number(cents || 0) / 100
}

function mapQuote(row: any) {
  const items = parseJson(row.items_json, []) as any[]
  const voices = parseJson(row.voices_json, []) as any[]
  const shareRecord = parseJson(row.share_record_json, {}) as { shareToken?: string; sentAt?: string }
  const approvalRecord = parseJson(row.approval_record_json, {}) as {
    approvedAt?: string
    approvedByName?: string
    approvedByEmail?: string
  }
  const total = euros(row.total_cents)
  const itemSubtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const voiceSubtotal = voices.reduce(
    (sum, item) => sum + Number(item.totale ?? Number(item.quantita || 0) * Number(item.prezzoUnitario || 0)),
    0,
  )
  const subtotal = euros(row.subtotal_cents) || itemSubtotal || voiceSubtotal || total
  const vat = euros(row.vat_cents)
  const client = sanitizeQuoteClient({
    nome: row.client_name || row.external_client_name || "Cliente",
    email: row.client_email || row.external_client_email || "",
  })
  const externalClient = sanitizeQuoteClient({
    nome: row.external_client_name || undefined,
    email: row.external_client_email || undefined,
  })

  return {
    id: String(row.id),
    title: String(row.title || ""),
    description: row.description || "",
    clientId: row.client_id || undefined,
    clientName: client.nome || "Cliente",
    clientEmail: client.email || "",
    externalClientName: externalClient.nome || undefined,
    externalClientEmail: externalClient.email || undefined,
    status: row.status || "draft",
    currency: row.currency || "EUR",
    items,
    total,
    subtotale: subtotal,
    iva: vat,
    percentualeIva: Number(row.vat_rate || 22),
    validUntil: row.valid_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareToken: shareRecord.shareToken || row.share_token || undefined,
    sentAt: shareRecord.sentAt || row.sent_at || undefined,
    approvedAt: approvalRecord.approvedAt || row.approved_at || undefined,
    approvedBy: approvalRecord.approvedByName || row.approved_by_name || undefined,
    tenantId: row.organization_id,
    createdBy: row.created_by_member_id || "",
    brandMateriali: parseJson(row.brand_materials_json, undefined),
    obiettivi: parseJson(row.objectives_json, []),
    attivita: parseJson(row.activities_json, []),
    voci: voices,
    terminiCondizioni: row.terms_conditions || undefined,
    sourceType: row.source_type || undefined,
    sourceId: row.source_id || undefined,
    sourceUrl: row.source_url || undefined,
    sourceSnapshot: parseJson(row.source_snapshot_json, undefined),
  }
}

async function requireQuoteContext() {
  const user = await requireClerkUser()
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }

  const db = await getCloudflareDb()
  if (!db) return { error: Response.json({ error: "D1 database binding missing" }, { status: 500 }) }

  const principal = await ensureWorkspacePrincipal(db, user)
  return { db, principal }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireQuoteContext()
    if (context.error) return context.error

    const { id } = await params
    const row = await context.db
      .prepare(
        `SELECT q.*,
                share.raw_json AS share_record_json,
                approval.raw_json AS approval_record_json
         FROM quotes q
         LEFT JOIN external_data_records share
           ON share.organization_id = q.organization_id
          AND share.quote_id = q.id
          AND share.provider = 'optima'
          AND share.record_type = 'quote_share'
         LEFT JOIN external_data_records approval
           ON approval.organization_id = q.organization_id
          AND approval.quote_id = q.id
          AND approval.provider = 'optima'
          AND approval.record_type = 'quote_approval'
         WHERE q.organization_id = ? AND q.id = ?
         LIMIT 1`,
      )
      .bind(context.principal.organizationId, id)
      .first()

    if (!row?.id) {
      return Response.json({ error: "Preventivo non trovato" }, { status: 404 })
    }

    return Response.json(mapQuote(row))
  } catch (error) {
    console.error("Quote GET error:", error)
    return Response.json({ error: "Errore nel caricamento del preventivo" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireQuoteContext()
    if (context.error) return context.error

    const { id } = await params
    await context.db
      .prepare(`DELETE FROM quotes WHERE organization_id = ? AND id = ?`)
      .bind(context.principal.organizationId, id)
      .run()

    return Response.json({ success: true })
  } catch (error) {
    console.error("Quote DELETE error:", error)
    return Response.json({ error: "Errore nell'eliminazione del preventivo" }, { status: 500 })
  }
}
