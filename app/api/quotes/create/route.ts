export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { z } from "zod"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const quoteItemSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  description: z.string().optional(),
  quantity: z.number().positive("Quantita deve essere positiva"),
  unitPrice: z.number().nonnegative("Prezzo non valido"),
  total: z.number().nonnegative("Totale non valido"),
})

const quoteVoiceSchema = z.object({
  descrizione: z.string().min(1, "Descrizione richiesta"),
  quantita: z.number().positive().default(1),
  prezzoUnitario: z.number().nonnegative().default(0),
  totale: z.number().nonnegative().optional(),
  categoria: z.enum(["base", "optional", "recurring"]).optional(),
  tipo: z.enum(["one_time", "monthly", "annual"]).optional(),
})

const brandMaterialiSchema = z.object({
  brandCoinvolti: z.array(z.string()).optional(),
  brandPrincipale: z.string().optional(),
  statoLogo: z.enum(["available", "to_request", "not_defined"]).optional(),
  noteLogo: z.string().optional(),
  materialiDisponibili: z.string().optional(),
  riferimenti: z.string().optional(),
  materialiDaRichiedere: z.array(z.string()).optional(),
  domandeAperte: z.array(z.string()).optional(),
}).optional()

const createQuoteSchema = z.object({
  title: z.string().min(1, "Titolo richiesto").max(240),
  description: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  externalClientName: z.string().optional(),
  externalClientEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  status: z.enum(["draft", "sent", "in_review", "pending_payment", "approved", "in_progress", "completed", "rejected", "expired"]).optional(),
  currency: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "Almeno una voce richiesta"),
  total: z.number().nonnegative().optional(),
  subtotale: z.number().nonnegative().optional(),
  iva: z.number().nonnegative().optional(),
  percentualeIva: z.number().nonnegative().optional(),
  brandMateriali: brandMaterialiSchema,
  obiettivi: z.array(z.string()).optional().default([]),
  attivita: z.array(z.string()).optional().default([]),
  voci: z.array(quoteVoiceSchema).optional().default([]),
  terminiCondizioni: z.string().optional(),
  validUntil: z.string().optional(),
}).refine(
  (data) => Boolean(data.clientId || data.externalClientName || data.clientName),
  { message: "Serve un cliente piattaforma o un nome cliente esterno" },
)

const toCents = (amount: number | undefined) => Math.round(Number(amount || 0) * 100)

const stringify = (value: unknown) => JSON.stringify(value ?? null)

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Sessione non valida o scaduta" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "Database Cloudflare non disponibile" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json().catch(() => null)
    const data = createQuoteSchema.parse(body)

    const now = new Date().toISOString()
    const validUntil = data.validUntil ? new Date(data.validUntil).toISOString() : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    const quoteId = createId("quote")
    const currency = data.currency || "EUR"
    const status = data.status || "draft"
    const subtotal = data.subtotale ?? data.items.reduce((sum, item) => sum + Number(item.total || 0), 0)
    const vatRate = data.percentualeIva ?? 22
    const vat = data.iva ?? Math.round(subtotal * (vatRate / 100) * 100) / 100
    const total = data.total ?? Math.round((subtotal + vat) * 100) / 100

    let clientId = data.clientId || null
    let clientName = data.clientName || data.externalClientName || "Cliente"
    let clientEmail = data.clientEmail || data.externalClientEmail || ""

    if (clientId) {
      const client = await db
        .prepare(
          `SELECT id, name, email, company
           FROM clients
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, clientId)
        .first()

      if (!client?.id) {
        return Response.json({ error: "Cliente piattaforma non trovato" }, { status: 404 })
      }

      clientName = String(client.name || client.company || clientName)
      clientEmail = String(client.email || clientEmail || "")
    }

    const voices = data.voci.length > 0
      ? data.voci.map((voice) => ({
          ...voice,
          totale: voice.totale ?? Math.round(voice.quantita * voice.prezzoUnitario * 100) / 100,
          categoria: voice.categoria || "base",
          tipo: voice.tipo || "one_time",
        }))
      : data.items.map((item) => ({
          descrizione: item.description || item.name,
          quantita: item.quantity,
          prezzoUnitario: item.unitPrice,
          totale: item.total,
          categoria: "base",
          tipo: "one_time",
        }))

    await db
      .prepare(
        `INSERT INTO quotes (
          id, organization_id, client_id, title, description, client_name, client_email,
          external_client_name, external_client_email, status, currency, total_cents,
          subtotal_cents, vat_cents, vat_rate, valid_until, items_json, voices_json,
          objectives_json, activities_json, brand_materials_json, terms_conditions,
          created_by_member_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        quoteId,
        principal.organizationId,
        clientId,
        data.title,
        data.description || "",
        clientName,
        clientEmail,
        data.externalClientName || null,
        data.externalClientEmail || null,
        status,
        currency,
        toCents(total),
        toCents(subtotal),
        toCents(vat),
        vatRate,
        validUntil,
        stringify(data.items),
        stringify(voices),
        stringify(data.obiettivi),
        stringify(data.attivita),
        data.brandMateriali ? stringify(data.brandMateriali) : null,
        data.terminiCondizioni || null,
        principal.memberId,
        now,
        now,
      )
      .run()

    return Response.json({ success: true, id: quoteId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Dati non validi",
          details: error.errors.map((item) => ({
            field: item.path.join("."),
            message: item.message,
          })),
        },
        { status: 400 },
      )
    }

    console.error("Quote creation API error:", error)
    return Response.json(
      {
        error: "Errore durante la creazione del preventivo",
        details: error instanceof Error ? error.message : "Errore interno",
      },
      { status: 500 },
    )
  }
}
