export const dynamic = 'force-dynamic'

/**
 * Mark Milestone as Ready API Route
 * 
 * POST /api/quotes/[id]/milestones/[milestoneId]/mark-ready
 * 
 * Admin endpoint to mark a milestone as "ready" for payment
 * 
 * SECURITY:
 * - Requires authentication
 * - Requires admin or direzione role
 * - Tenant-scoped data access
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { markMilestoneReady, getQuoteById } from "@/lib/quote-service-server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
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

    // 2. AUTHORIZATION - Admin or Direzione only
    if (!['admin', 'super-admin', 'direzione'].includes(userData.role || '')) {
      return NextResponse.json(
        { error: "Non hai i permessi per marcare le milestone come pronte" },
        { status: 403 }
      )
    }

    // 3. PARSE PARAMS - Next.js 15 async params
    const { id: quoteId, milestoneId } = await params
    
    if (!quoteId || !milestoneId) {
      return NextResponse.json(
        { error: "Parametri mancanti" },
        { status: 400 }
      )
    }

    // 4. VERIFY QUOTE EXISTS (tenant-scoped)
    const quote = await getQuoteById(quoteId, userData.tenantId)
    
    if (!quote) {
      return NextResponse.json(
        { error: "Preventivo non trovato" },
        { status: 404 }
      )
    }

    // 5. VERIFY MILESTONE EXISTS
    const milestone = quote.paymentPlan?.milestones?.find(
      (m: any) => m.id === milestoneId
    )
    
    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone non trovata" },
        { status: 404 }
      )
    }

    // 6. MARK MILESTONE AS READY
    await markMilestoneReady(quoteId, userData.tenantId, milestoneId)

    console.log(`✅ Milestone ${milestoneId} marked as ready by ${userData.email}`)

    return NextResponse.json({
      success: true,
      message: "Milestone marcata come pronta per il pagamento",
    })

  } catch (error) {
    console.error('Error marking milestone ready:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
