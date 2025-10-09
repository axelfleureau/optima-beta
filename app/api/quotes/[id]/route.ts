/**
 * Quote Detail API Route
 * 
 * GET /api/quotes/[id]
 * 
 * Fetch a single quote by ID with tenant validation
 * 
 * SECURITY:
 * - Requires authentication
 * - Tenant-scoped data access
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { getQuoteById } from "@/lib/quote-service-server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. AUTHENTICATION
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const decodedToken = await verifyFirebaseToken(token)
    const userData = await getUserData(decodedToken.uid)

    if (!userData) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 401 }
      )
    }

    // 2. PARSE PARAMS - Next.js 15 async params
    const { id: quoteId } = await params
    
    if (!quoteId) {
      return NextResponse.json(
        { error: "Quote ID mancante" },
        { status: 400 }
      )
    }

    // 3. FETCH QUOTE (tenant-scoped)
    const quote = await getQuoteById(quoteId, userData.tenantId)
    
    if (!quote) {
      return NextResponse.json(
        { error: "Preventivo non trovato" },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)

  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: "Errore nel caricamento del preventivo" },
      { status: 500 }
    )
  }
}
