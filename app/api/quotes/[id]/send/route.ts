export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"

import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { sendQuoteToClient } from "@/lib/quote-service-server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const decodedToken = await verifyFirebaseToken(token)
    const userData = await getUserData(decodedToken.uid)

    if (!userData?.tenantId) {
      return NextResponse.json({ error: "Tenant non configurato" }, { status: 400 })
    }

    if (userData.isSuspended) {
      return NextResponse.json({ error: "Account sospeso" }, { status: 403 })
    }

    const { id: quoteId } = await params
    if (!quoteId) {
      return NextResponse.json({ error: "Quote ID mancante" }, { status: 400 })
    }

    const publicUrl = await sendQuoteToClient(quoteId, userData.tenantId)

    return NextResponse.json({
      success: true,
      publicUrl,
    })
  } catch (error) {
    console.error("Error sending quote:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nell'invio del preventivo" },
      { status: 500 }
    )
  }
}
