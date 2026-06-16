export const dynamic = 'force-dynamic'

/**
 * Public Quote Retrieval API Route
 * 
 * GET /api/quotes/public/[shareToken]
 * 
 * Public endpoint for retrieving quote details via share token
 * NO AUTHENTICATION REQUIRED - Public access
 * 
 * SECURITY:
 * - Validates share token format
 * - Returns only public-safe quote data (no tenant info)
 * - Checks quote expiration
 * - Rate limited
 */

import { NextRequest, NextResponse } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { sanitizeQuoteClient } from "@/lib/quote-data-quality"
import { validateShareToken, isQuoteExpired } from "@/lib/quote-utils"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function euros(cents: unknown) {
  return Number(cents || 0) / 100
}

function mapPublicItems(row: any) {
  const items = parseJson<any[]>(row.items_json, [])
  const voices = parseJson<any[]>(row.voices_json, [])

  if (items.length > 0) {
    return items.map((item) => ({
      description: String(item.description || item.name || "Voce preventivo"),
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.prezzoUnitario || 0),
      total: Number(item.total || item.totale || 0),
    }))
  }

  return voices.map((voice) => ({
    description: String(voice.descrizione || "Voce preventivo"),
    quantity: Number(voice.quantita || 1),
    unitPrice: Number(voice.prezzoUnitario || 0),
    total: Number(voice.totale ?? Number(voice.quantita || 1) * Number(voice.prezzoUnitario || 0)),
  }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "DEFAULT")
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset)
    }

    // Get and validate share token
    const { shareToken } = await params
    
    if (!validateShareToken(shareToken)) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 400 }
      )
    }

    const db = await getCloudflareDb()
    if (!db) {
      return NextResponse.json(
        { error: 'Errore di configurazione database' },
        { status: 500 }
      )
    }

    const quoteData = await db
      .prepare(
        `SELECT q.*, c.name AS linked_client_name, c.email AS linked_client_email
         FROM external_data_records r
         JOIN quotes q
           ON q.organization_id = r.organization_id
          AND q.id = r.quote_id
         LEFT JOIN clients c
           ON c.organization_id = q.organization_id
          AND c.id = q.client_id
         WHERE r.provider = 'optima'
           AND r.record_type = 'quote_share'
           AND r.external_id = ?
         LIMIT 1`,
      )
      .bind(`quote-share-token:${shareToken}`)
      .first()

    if (!quoteData?.id) {
      return NextResponse.json(
        { error: 'Preventivo non trovato' },
        { status: 404 }
      )
    }

    const validUntil = quoteData.valid_until
      ? new Date(String(quoteData.valid_until))
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Check if expired
    if (isQuoteExpired(validUntil)) {
      return NextResponse.json(
        { error: 'Preventivo scaduto', expired: true },
        { status: 410 }
      )
    }

    const platformClient = sanitizeQuoteClient({
      nome: quoteData.client_name || quoteData.linked_client_name || "",
      email: quoteData.client_email || quoteData.linked_client_email || "",
    })
    const externalClient = sanitizeQuoteClient({
      nome: quoteData.external_client_name,
      email: quoteData.external_client_email || quoteData.client_email || quoteData.linked_client_email,
    })

    // Return public-safe quote data (NO sensitive tenant info)
    // DUAL CLIENT MODE: Include both platform and external client data
    return NextResponse.json({
      id: quoteData.id,
      title: quoteData.title || '',
      description: quoteData.description,
      // Platform client fields
      clientId: quoteData.client_id, // Safe to expose for display logic
      clientName: platformClient.nome || '',
      // External client fields
      externalClientName: externalClient.nome || undefined,
      externalClientEmail: externalClient.email || undefined,
      items: mapPublicItems(quoteData),
      total: euros(quoteData.total_cents),
      currency: quoteData.currency || 'EUR',
      validUntil: validUntil.toISOString(),
      status: quoteData.status || 'draft',
      paymentPlan: parseJson(quoteData.payment_plan_json, undefined),
      // Internal fields excluded: tenantId, createdBy, shareToken, etc.
    })
  } catch (error) {
    console.error('Error fetching public quote:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento del preventivo' },
      { status: 500 }
    )
  }
}
