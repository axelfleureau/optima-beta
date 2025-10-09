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
import { adminDb } from "@/lib/firebase-admin"
import { validateShareToken, isQuoteExpired } from "@/lib/quote-utils"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "PUBLIC")
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

    // Fetch quote by share token from Firestore
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Errore di configurazione database' },
        { status: 500 }
      )
    }

    const quotesSnapshot = await adminDb
      .collection('quotes')
      .where('shareToken', '==', shareToken)
      .limit(1)
      .get()

    if (quotesSnapshot.empty) {
      return NextResponse.json(
        { error: 'Preventivo non trovato' },
        { status: 404 }
      )
    }

    const quoteDoc = quotesSnapshot.docs[0]
    const quoteData = quoteDoc.data()

    // Convert Firestore timestamps to ISO strings
    const validUntil = quoteData.validUntil?.toDate 
      ? quoteData.validUntil.toDate() 
      : new Date(quoteData.validUntil)

    // Check if expired
    if (isQuoteExpired(validUntil)) {
      return NextResponse.json(
        { error: 'Preventivo scaduto', expired: true },
        { status: 410 }
      )
    }

    // Return public-safe quote data (NO sensitive tenant info)
    // DUAL CLIENT MODE: Include both platform and external client data
    return NextResponse.json({
      id: quoteDoc.id,
      title: quoteData.title || '',
      description: quoteData.description,
      // Platform client fields
      clientId: quoteData.clientId, // Safe to expose for display logic
      clientName: quoteData.clientName || '',
      // External client fields
      externalClientName: quoteData.externalClientName,
      externalClientEmail: quoteData.externalClientEmail,
      items: quoteData.items || [],
      total: quoteData.total || 0,
      currency: quoteData.currency || 'EUR',
      validUntil: validUntil.toISOString(),
      status: quoteData.status || 'draft',
      paymentPlan: quoteData.paymentPlan,
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
