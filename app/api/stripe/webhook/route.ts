/**
 * Stripe Webhook Handler API Route
 * 
 * POST /api/stripe/webhook
 * Handles Stripe webhook events with signature verification
 * 
 * SECURITY:
 * - Verifies webhook signature using Stripe secret
 * - Implements idempotent event processing
 * - Validates tenant ownership before updates
 * - Comprehensive error handling and retry logic
 */

import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { adminDb } from "@/lib/firebase-admin"
import { stripeService } from "@/lib/services/stripe.service"
import { updatePayment, findPaymentByStripeId } from "@/collections/payments"
import { SubscriptionEmailService } from "@/lib/services/subscription-email.service"
import { getPlanById, getAllPlans } from "@/lib/constants/token-plans"
import Stripe from "stripe"

// Webhook event processing tracker (in production, use Redis or database)
const processedEvents = new Set<string>()

// Utility function to get raw body from request
async function getRawBody(request: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = request.body?.getReader()
  
  if (!reader) {
    throw new Error("Request body is not readable")
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return Buffer.from(result)
}

// Update quote status after successful payment
async function updateQuoteStatus(quoteId: string, tenantId: string, status: "accepted" | "rejected") {
  try {
    // Get quote document
    const quoteDoc = await getDoc(doc(db, "quotes", quoteId))
    if (!quoteDoc.exists()) {
      console.error(`Quote ${quoteId} not found`)
      return false
    }

    const quoteData = quoteDoc.data()
    
    // SECURITY: Validate tenant ownership
    if (quoteData.tenantId !== tenantId) {
      console.error(`Quote ${quoteId} does not belong to tenant ${tenantId}`)
      return false
    }

    // Update quote status
    await updateDoc(doc(db, "quotes", quoteId), {
      status: status,
      updatedAt: serverTimestamp(),
      ...(status === "accepted" && { acceptedAt: serverTimestamp() })
    })

    console.log(`✅ Quote ${quoteId} status updated to: ${status}`)
    return true
  } catch (error) {
    console.error(`Error updating quote ${quoteId} status:`, error)
    return false
  }
}

// Process payment success
async function processPaymentSuccess(paymentIntentId: string, metadata: any) {
  try {
    const quoteId = metadata?.quoteId
    const tenantId = metadata?.tenantId

    if (!quoteId || !tenantId) {
      console.error("Missing metadata in payment intent:", metadata)
      return false
    }

    console.log(`Processing payment success for quote: ${quoteId}`)

    // Find payment record
    const payment = await findPaymentByStripeId(paymentIntentId, tenantId)
    if (!payment) {
      console.error(`Payment record not found for ${paymentIntentId}`)
      return false
    }

    // Update payment status
    await updatePayment(payment.id, {
      status: "succeeded",
      paidAt: new Date(),
      lastError: undefined,
    })

    // Update quote status to accepted
    await updateQuoteStatus(quoteId, tenantId, "accepted")

    console.log(`✅ Payment ${payment.id} processed successfully`)
    return true
  } catch (error) {
    console.error("Error processing payment success:", error)
    return false
  }
}

// Process payment failure
async function processPaymentFailure(paymentIntentId: string, metadata: any, errorMessage?: string) {
  try {
    const quoteId = metadata?.quoteId
    const tenantId = metadata?.tenantId

    if (!quoteId || !tenantId) {
      console.error("Missing metadata in payment intent:", metadata)
      return false
    }

    console.log(`Processing payment failure for quote: ${quoteId}`)

    // Find payment record
    const payment = await findPaymentByStripeId(paymentIntentId, tenantId)
    if (!payment) {
      console.error(`Payment record not found for ${paymentIntentId}`)
      return false
    }

    // Update payment status
    await updatePayment(payment.id, {
      status: "failed",
      lastError: errorMessage || "Payment failed",
      retryCount: (payment.retryCount || 0) + 1,
    })

    console.log(`✅ Payment ${payment.id} marked as failed`)
    return true
  } catch (error) {
    console.error("Error processing payment failure:", error)
    return false
  }
}

// Process payment cancellation
async function processPaymentCancellation(paymentIntentId: string, metadata: any) {
  try {
    const quoteId = metadata?.quoteId
    const tenantId = metadata?.tenantId

    if (!quoteId || !tenantId) {
      console.error("Missing metadata in payment intent:", metadata)
      return false
    }

    console.log(`Processing payment cancellation for quote: ${quoteId}`)

    // Find payment record
    const payment = await findPaymentByStripeId(paymentIntentId, tenantId)
    if (!payment) {
      console.error(`Payment record not found for ${paymentIntentId}`)
      return false
    }

    // Update payment status
    await updatePayment(payment.id, {
      status: "canceled",
    })

    console.log(`✅ Payment ${payment.id} marked as canceled`)
    return true
  } catch (error) {
    console.error("Error processing payment cancellation:", error)
    return false
  }
}

async function handleSubscriptionEvent(event: Stripe.Event) {
  try {
    const subscription = event.data.object as any
    const metadata = subscription.metadata
    
    if (!metadata.userId || !metadata.tenantId) {
      console.error("Missing userId/tenantId in subscription event:", event.type)
      return
    }
    
    const userId = metadata.userId
    const tenantId = metadata.tenantId
    
    // DERIVE PLAN FROM PRICE ID (not metadata)
    const priceId = subscription.items.data[0]?.price.id
    if (!priceId) {
      console.error("No price ID found in subscription")
      return
    }
    
    // Find plan by matching stripePriceId
    const allPlans = getAllPlans()
    const plan = allPlans.find(p => p.stripePriceId === priceId)
    
    if (!plan) {
      console.error(`No plan found for price ID: ${priceId}`)
      return
    }
    
    const planId = plan.id
    const tokenLimit = plan.tokenLimit
    
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized")
      return
    }
    
    // Get user data for email
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()
    const userEmail = userData?.email
    const userName = userData?.name || userEmail
    
    console.log(`📋 Processing subscription event: ${event.type} for user ${userId}, plan ${planId} (from price ${priceId})`)
    
    switch (event.type) {
      case "customer.subscription.created":
        await adminDb.collection("users").doc(userId).update({
          plan: planId,
          aiTokensLimit: tokenLimit,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          billingCycleStart: new Date(subscription.current_period_start * 1000),
          billingCycleEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date()
        })
        
        console.log(`✅ Created subscription for user ${userId} with plan ${planId}`)
        
        if (userEmail) {
          await SubscriptionEmailService.sendSubscriptionConfirmation({
            userEmail,
            userName,
            plan,
            billingCycleEnd: new Date(subscription.current_period_end * 1000)
          })
        }
        break
        
      case "customer.subscription.updated":
        const previousPlanId = userData?.plan
        const previousPlan = getPlanById(previousPlanId)
        
        await adminDb.collection("users").doc(userId).update({
          plan: planId,
          aiTokensLimit: tokenLimit,
          subscriptionStatus: subscription.status,
          billingCycleStart: new Date(subscription.current_period_start * 1000),
          billingCycleEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date()
        })
        
        const currentCycleStart = userData?.billingCycleStart?.toDate()
        const newCycleStart = new Date(subscription.current_period_start * 1000)
        
        if (currentCycleStart && newCycleStart > currentCycleStart) {
          await adminDb.collection("users").doc(userId).update({
            aiTokensUsed: 0
          })
          console.log(`🔄 Reset tokens for user ${userId} - new billing cycle`)
        }
        
        if (userEmail && previousPlan && previousPlanId !== planId) {
          await SubscriptionEmailService.sendUpgradeNotification({
            userEmail,
            userName,
            plan,
            previousPlan
          })
        }
        
        console.log(`✅ Updated subscription for user ${userId} - plan ${planId} (derived from price ${priceId})`)
        break
        
      case "customer.subscription.deleted":
        await adminDb.collection("users").doc(userId).update({
          plan: null,
          subscriptionStatus: "canceled",
          canceledAt: new Date(),
          updatedAt: new Date()
        })
        
        console.log(`❌ Canceled subscription for user ${userId}`)
        
        if (userEmail) {
          await SubscriptionEmailService.sendCancellationConfirmation({
            userEmail,
            userName,
            plan,
            billingCycleEnd: userData?.billingCycleEnd?.toDate()
          })
        }
        break
        
      default:
        console.log(`⚠️ Unhandled subscription event: ${event.type}`)
    }
  } catch (error) {
    const err = error as Error
    console.error("Error handling subscription event:", err)
    throw error
  }
}

async function handleConnectAccountEvent(event: Stripe.Event) {
  try {
    const account = event.data.object as any
    
    if (!account.metadata?.tenantId || !account.metadata?.userId) {
      console.error("Missing metadata in account event")
      return
    }
    
    const userId = account.metadata.userId
    const tenantId = account.metadata.tenantId
    
    console.log(`📋 Processing Connect account event: ${event.type} for tenant ${tenantId}`)
    
    switch (event.type) {
      case "account.updated":
        const onboardingComplete = account.charges_enabled && account.payouts_enabled
        
        if (adminDb) {
          await adminDb.collection("users").doc(userId).update({
            stripeAccountStatus: account.charges_enabled ? 'active' : 'restricted',
            stripeOnboardingComplete: onboardingComplete,
            updatedAt: new Date()
          })
        }
        
        console.log(`✅ Updated Connect account status for tenant ${tenantId}: ${account.charges_enabled ? 'active' : 'restricted'}`)
        break
        
      default:
        console.log(`⚠️ Unhandled Connect account event: ${event.type}`)
    }
  } catch (error) {
    console.error("Error handling Connect account event:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("🔄 Processing Stripe webhook")

  try {
    // Get webhook signature from headers
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      console.error("Missing Stripe signature header")
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      )
    }

    // Get raw request body
    let rawBody: Buffer
    try {
      rawBody = await getRawBody(request)
    } catch (error) {
      console.error("Error reading request body:", error)
      return NextResponse.json(
        { error: "Unable to read request body" },
        { status: 400 }
      )
    }

    console.log(`📝 Webhook payload size: ${rawBody.length} bytes`)

    // Process webhook with Stripe service
    const result = await stripeService.processWebhook(rawBody, signature)
    
    if (!result.success) {
      console.error("Webhook processing failed:", result.error)
      
      // Return appropriate status code based on error type
      const statusCode = result.error?.type === "authorization" ? 401 : 400
      return NextResponse.json(
        { error: result.error?.message || "Webhook processing failed" },
        { status: statusCode }
      )
    }

    console.log(`✅ Webhook processed: ${result.data?.eventType}`)

    // Handle subscription events
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (webhookSecret) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-08-27.basil"
      })
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      
      if (event.type.startsWith("customer.subscription.")) {
        await handleSubscriptionEvent(event)
      }
      
      if (event.type.startsWith("account.")) {
        await handleConnectAccountEvent(event)
      }
    }

    // Return success response
    return NextResponse.json({
      received: true,
      eventType: result.data?.eventType,
      processed: result.data?.processed
    })

  } catch (error) {
    console.error("❌ Webhook processing error:", error)
    
    // Log detailed error for debugging
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. This endpoint only accepts POST requests." },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed. This endpoint only accepts POST requests." },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed. This endpoint only accepts POST requests." },
    { status: 405 }
  )
}