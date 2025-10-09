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
import { Timestamp } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { stripeService } from "@/lib/services/stripe.service"
import { validateShareToken, isValidEmail, isQuoteExpired, getBaseUrl } from "@/lib/quote-utils"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { updateQuoteStatus } from "@/lib/quote-service-server"
import type { SecurePaymentContext } from "@/types/payment"

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

    // Fetch quote by share token
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

    // Validate quote is in correct status
    // Allow approval if status is "sent", "pending", OR "pending_payment" (retry case)
    const allowedStatuses = ['sent', 'pending', 'pending_payment']
    if (!allowedStatuses.includes(quoteData.status)) {
      return NextResponse.json(
        { 
          error: `Quote status '${quoteData.status}' is not available for approval. Must be 'sent', 'pending', or 'pending_payment'.` 
        },
        { status: 400 }
      )
    }

    // Convert Firestore timestamps
    const validUntil = quoteData.validUntil?.toDate 
      ? quoteData.validUntil.toDate() 
      : new Date(quoteData.validUntil)

    // Check if expired
    if (isQuoteExpired(validUntil)) {
      return NextResponse.json(
        { error: 'Preventivo scaduto' },
        { status: 410 }
      )
    }

    // DUAL CLIENT MODE: Check if this is a platform client or external client
    const isPlatformClient = !!quoteData.clientId
    const isExternalClient = !!(quoteData.externalClientName && quoteData.externalClientEmail)

    if (isExternalClient) {
      // EXTERNAL CLIENT: No Stripe automation, direct approval
      console.log(`✅ External client approval (no Stripe): ${quoteData.externalClientName}`)
      
      await updateQuoteStatus(quoteDoc.id, quoteData.tenantId, 'approved', {
        clientEmail: clientEmail,
        approvedAt: Timestamp.now(),
        approvedBy: clientName,
      })

      // Return success without checkout URL (manual payment flow)
      return NextResponse.json({
        success: true,
        approved: true,
        message: 'Preventivo approvato con successo. Il team ti contatterà per il pagamento.',
        // No checkoutUrl for external clients
      })
    }

    // PLATFORM CLIENT: Full Stripe automation
    if (!isPlatformClient) {
      return NextResponse.json(
        { error: 'Cliente non valido per pagamento automatico' },
        { status: 400 }
      )
    }

    console.log(`💳 Platform client payment flow: ${quoteData.clientId}`)

    // Update quote: status → pending_payment (NOT approved yet)
    // Quote will only be approved after checkout.session.completed webhook
    await updateQuoteStatus(quoteDoc.id, quoteData.tenantId, 'pending_payment', {
      clientEmail: clientEmail,
      pendingApprovalAt: Timestamp.now(),
      pendingApprovalBy: clientName,
    })

    // Prepare quote data for Stripe
    const quote = {
      id: quoteDoc.id,
      title: quoteData.title || '',
      clientName: quoteData.clientName || clientName,
      clientEmail: clientEmail,
      total: quoteData.total || 0,
      currency: quoteData.currency || 'EUR',
      items: quoteData.items || [],
      status: 'approved' as const,
      validUntil: validUntil,
    }

    // Prepare payment context
    const context: SecurePaymentContext = {
      quote: quote as any,
      tenant: { id: quoteData.tenantId },
    }

    // Determine base URL for redirects
    const baseUrl = getBaseUrl()

    // Create Stripe Checkout Session based on payment plan
    const paymentPlan = quoteData.paymentPlan || { type: 'full' }
    
    let checkoutResult
    if (paymentPlan.type === 'deposit_milestone' && paymentPlan.depositPercentage) {
      // Create deposit checkout
      checkoutResult = await stripeService.createDepositCheckout(
        quoteDoc.id,
        paymentPlan.depositPercentage,
        context
      )
    } else {
      // Create full payment checkout
      checkoutResult = await stripeService.createCheckoutSession(
        {
          quoteId: quoteDoc.id,
          clientEmail,
          clientName,
          successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/quotes/public/${shareToken}?payment_cancelled=true`,
        },
        context
      )
    }

    if (!checkoutResult.success) {
      console.error('Stripe checkout creation failed:', checkoutResult.error)
      
      // Rollback: pending_payment → sent
      await updateQuoteStatus(quoteDoc.id, quoteData.tenantId, 'sent', {
        pendingApprovalAt: null,
        pendingApprovalBy: null,
      })

      return NextResponse.json(
        { error: 'Errore nella configurazione del pagamento' },
        { status: 500 }
      )
    }

    // Return checkout URL for redirect
    // Status will become "approved" only via webhook (checkout.session.completed)
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResult.data?.checkoutUrl,
      checkoutSessionId: checkoutResult.data?.checkoutSessionId,
    })
  } catch (error) {
    console.error('Error approving quote:', error)
    return NextResponse.json(
      { error: 'Errore durante approvazione preventivo' },
      { status: 500 }
    )
  }
}
