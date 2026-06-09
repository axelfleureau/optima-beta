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
        `SELECT id, valid_until, status
         FROM quotes
         WHERE share_token = ?
         LIMIT 1`,
      )
      .bind(shareToken)
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
             approved_at = CURRENT_TIMESTAMP,
             approved_by_name = ?,
             approved_by_email = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE share_token = ?`,
      )
      .bind(clientName, clientEmail, shareToken)
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
