/**
 * Quote Approval API Route
 * 
 * POST /api/quotes/[id]/approve
 * 
 * PHASE 5C: Quote Auto-Payment - Complete Flow
 * 
 * This endpoint approves a quote and automatically creates a payment
 * using the client's default payment method with Stripe off-session payment.
 * 
 * SECURITY:
 * - Requires authentication
 * - Requires admin or direzione role
 * - Rate limited with STRIPE profile
 * - Tenant-scoped data access
 * - Rollback on payment failure
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData, adminDb } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { createQuotePaymentIntent, validateClientPaymentSetup, validateQuoteForPayment } from "@/lib/stripe-payment-helpers"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. RATE LIMITING - STRIPE profile
    const rateLimitResult = await rateLimit(request, "STRIPE")
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset)
    }

    // 2. AUTHENTICATION
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const decodedToken = await verifyFirebaseToken(token)
    const userData = await getUserData(decodedToken.uid)

    // 3. AUTHORIZATION - Admin or Direzione only
    if (!userData || !["admin", "super-admin", "direzione"].includes(userData.role || "")) {
      return NextResponse.json(
        { error: "Non hai i permessi per approvare preventivi" },
        { status: 403 }
      )
    }

    // 4. PARSE PARAMS - Next.js 15 async params
    const quoteId = (await params).id
    if (!quoteId) {
      return NextResponse.json(
        { error: "ID preventivo mancante" },
        { status: 400 }
      )
    }

    // 5. FETCH QUOTE (tenant-scoped)
    if (!adminDb) {
      return NextResponse.json(
        { error: "Errore di configurazione database" },
        { status: 500 }
      )
    }

    const quoteDoc = await adminDb.collection("quotes").doc(quoteId).get()
    if (!quoteDoc.exists) {
      return NextResponse.json(
        { error: "Preventivo non trovato" },
        { status: 404 }
      )
    }

    const quote = { id: quoteDoc.id, ...quoteDoc.data() } as any

    // SECURITY: Validate tenant ownership
    if (quote.tenantId !== userData.tenantId) {
      return NextResponse.json(
        { error: "Non hai accesso a questo preventivo" },
        { status: 403 }
      )
    }

    // 6. VALIDATE QUOTE
    try {
      validateQuoteForPayment(quote)
    } catch (validationError: any) {
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      )
    }

    // 7. FETCH CLIENT (tenant-scoped)
    const clientDoc = await adminDb.collection("clients").doc(quote.clientId).get()
    if (!clientDoc.exists) {
      return NextResponse.json(
        { error: "Cliente non trovato" },
        { status: 404 }
      )
    }

    const client = { id: clientDoc.id, ...clientDoc.data() } as any

    // SECURITY: Validate client tenant ownership
    if (client.tenantId !== userData.tenantId) {
      return NextResponse.json(
        { error: "Cliente non appartiene al tuo tenant" },
        { status: 403 }
      )
    }

    // 8. VALIDATE CLIENT PAYMENT SETUP
    try {
      validateClientPaymentSetup(client)
    } catch (paymentError: any) {
      return NextResponse.json(
        { error: paymentError.message },
        { status: 400 }
      )
    }

    // 9. GET TENANT STRIPE ACCOUNT ID
    const tenantDoc = await adminDb.collection("users").doc(userData.tenantId).get()
    const tenantData = tenantDoc.data()
    const tenantAccountId = tenantData?.stripeConnectedAccountId || userData.stripeConnectedAccountId

    if (!tenantAccountId) {
      return NextResponse.json(
        { error: "Account Stripe non configurato. Completa la configurazione Stripe Connect." },
        { status: 400 }
      )
    }

    // 10. UPDATE QUOTE STATUS → ACCEPTED (before payment attempt)
    await adminDb.collection("quotes").doc(quoteId).update({
      status: "accepted",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log(`✅ Quote ${quoteId} status updated to 'accepted'`)

    // 11. CREATE AUTO-PAYMENT
    let paymentIntent: any
    let payment: any

    try {
      const result = await createQuotePaymentIntent(quote, client, tenantAccountId)
      paymentIntent = result.paymentIntent
      payment = result.payment

      console.log(`✅ Payment created for quote ${quoteId}:`, {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: payment.amount,
      })
    } catch (paymentError: any) {
      // ROLLBACK: Payment creation failed, revert quote status
      console.error(`❌ Payment creation failed for quote ${quoteId}:`, paymentError.message)

      await adminDb.collection("quotes").doc(quoteId).update({
        status: quote.status, // Revert to original status
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json(
        {
          error: "Errore durante la creazione del pagamento",
          details: paymentError.message,
        },
        { status: 500 }
      )
    }

    // 12. RETURN SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
      paymentStatus: paymentIntent.status,
      quote: {
        id: quote.id,
        status: "accepted",
        title: quote.title,
        total: quote.total,
        currency: quote.currency,
      },
      message:
        paymentIntent.status === "succeeded"
          ? "Preventivo approvato e pagamento completato con successo"
          : "Preventivo approvato, pagamento in elaborazione",
    })
  } catch (error: any) {
    console.error("❌ Error approving quote:", error)
    return NextResponse.json(
      {
        error: "Errore durante l'approvazione del preventivo",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
