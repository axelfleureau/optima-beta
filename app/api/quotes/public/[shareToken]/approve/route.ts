export const dynamic = 'force-dynamic'

/**
 * Public Quote Approval API Route
 * 
 * POST /api/quotes/public/[shareToken]/approve
 * 
 * Public endpoint for client quote approval and payment redirect
 * NO AUTHENTICATION REQUIRED - Public access
 * 
 * SECURITY:
 * - Validates share token format
 * - Validates client input (name, email, terms)
 * - Updates quote status to 'approved'
 * - Creates Stripe checkout session
 * - Returns checkout URL for redirect
 */

import { NextRequest, NextResponse } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { validateShareToken, isValidEmail, isQuoteExpired } from "@/lib/quote-utils"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "STRIPE")
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

    // Parse and validate request body
    const body = await request.json()
    const { clientName, clientEmail, acceptedTerms } = body

    if (!clientName || !clientEmail || !acceptedTerms) {
      return NextResponse.json(
        { error: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      )
    }

    if (!isValidEmail(clientEmail)) {
      return NextResponse.json(
        { error: 'Email non valida' },
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
        `SELECT q.id, q.organization_id, q.valid_until, q.status
         FROM external_data_records r
         JOIN quotes q
           ON q.organization_id = r.organization_id
          AND q.id = r.quote_id
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

    // Validate quote is in correct status
    const allowedStatuses = ['sent', 'pending', 'pending_payment', 'in_review']
    if (!allowedStatuses.includes(String(quoteData.status))) {
      return NextResponse.json(
        { 
          error: `Quote status '${quoteData.status}' is not available for approval. Must be 'sent', 'pending', or 'pending_payment'.` 
        },
        { status: 400 }
      )
    }

    const validUntil = quoteData.valid_until
      ? new Date(String(quoteData.valid_until))
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Check if expired
    if (isQuoteExpired(validUntil)) {
      return NextResponse.json(
        { error: 'Preventivo scaduto' },
        { status: 410 }
      )
    }

    await db
      .prepare(
        `UPDATE quotes
         SET status = 'approved',
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ? AND id = ?`,
      )
      .bind(quoteData.organization_id, quoteData.id)
      .run()

    const approvalPayload = JSON.stringify({
      shareToken,
      quoteId: quoteData.id,
      approvedByName: clientName,
      approvedByEmail: clientEmail,
      approvedAt: new Date().toISOString(),
    })
    const sourceId = `source_quote_public_${quoteData.organization_id}`

    await db
      .prepare(
        `INSERT OR IGNORE INTO external_data_sources (
          id, organization_id, provider, source_type, external_id, title, domain, sync_mode, schema_json, allowed_fields_json, redacted_fields_json
        ) VALUES (?, ?, 'optima', 'system', 'quote_public_sharing', 'Optima public quote sharing', 'quotes', 'manual', '{}', '[]', '[]')`,
      )
      .bind(sourceId, quoteData.organization_id)
      .run()

    await db
      .prepare(
        `INSERT OR REPLACE INTO external_data_records (
          id, organization_id, source_id, provider, record_type, external_id,
          title, summary, quote_id, occurred_at, confidence, raw_json, normalized_json
        ) VALUES (
          COALESCE(
            (SELECT id FROM external_data_records WHERE organization_id = ? AND provider = 'optima' AND external_id = ? LIMIT 1),
            ?
          ),
          ?, ?, 'optima', 'quote_approval', ?,
          ?, ?, ?, CURRENT_TIMESTAMP, 'manual', ?, ?
        )`,
      )
      .bind(
        quoteData.organization_id,
        `quote-approval:${shareToken}`,
        `quote_approval_${shareToken}`,
        quoteData.organization_id,
        sourceId,
        `quote-approval:${shareToken}`,
        `Approvazione preventivo ${quoteData.id}`,
        `Preventivo approvato da ${clientName} (${clientEmail}).`,
        quoteData.id,
        approvalPayload,
        approvalPayload,
      )
      .run()

    return NextResponse.json({
      success: true,
      approved: true,
      message: 'Preventivo approvato con successo. Il team Righello ti contatterà per i prossimi passi.',
    })
  } catch (error) {
    console.error('Error approving quote:', error)
    return NextResponse.json(
      { error: 'Errore durante approvazione preventivo' },
      { status: 500 }
    )
  }
}
