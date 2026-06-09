export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

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
  const total = euros(row.total_cents)
  const itemSubtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const voiceSubtotal = voices.reduce(
    (sum, item) => sum + Number(item.totale ?? Number(item.quantita || 0) * Number(item.prezzoUnitario || 0)),
    0,
  )
  const subtotal = euros(row.subtotal_cents) || itemSubtotal || voiceSubtotal || total
  const vat = euros(row.vat_cents)

  return {
    id: String(row.id),
    title: String(row.title || ""),
    description: row.description || "",
    clientId: row.client_id || undefined,
    clientName: row.client_name || row.external_client_name || "Cliente",
    clientEmail: row.client_email || row.external_client_email || "",
    externalClientName: row.external_client_name || undefined,
    externalClientEmail: row.external_client_email || undefined,
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
    shareToken: row.share_token || undefined,
    sentAt: row.sent_at || undefined,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by_name || undefined,
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
      .prepare(`SELECT * FROM quotes WHERE organization_id = ? AND id = ? LIMIT 1`)
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
