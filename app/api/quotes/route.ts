export const dynamic = "force-dynamic"

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
    items: parseJson(row.items_json, []),
    total: euros(row.total_cents),
    subtotale: euros(row.subtotal_cents),
    iva: euros(row.vat_cents),
    percentualeIva: Number(row.vat_rate || 22),
    validUntil: row.valid_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantId: row.organization_id,
    createdBy: row.created_by_member_id || "",
    brandMateriali: parseJson(row.brand_materials_json, undefined),
    obiettivi: parseJson(row.objectives_json, []),
    attivita: parseJson(row.activities_json, []),
    voci: parseJson(row.voices_json, []),
    terminiCondizioni: row.terms_conditions || undefined,
  }
}

export async function GET() {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const result = await db
      .prepare(
        `SELECT *
         FROM quotes
         WHERE organization_id = ?
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 200`,
      )
      .bind(principal.organizationId)
      .all()

    return Response.json({ quotes: (result.results || []).map(mapQuote) })
  } catch (error) {
    console.error("Quotes GET error:", error)
    return Response.json({ error: "Errore nel caricamento dei preventivi" }, { status: 500 })
  }
}
