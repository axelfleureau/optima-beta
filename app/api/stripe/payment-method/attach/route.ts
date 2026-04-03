export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion
})

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  
  const token = authHeader.split("Bearer ")[1]
  try {
    if (!adminAuth || !adminDb) return null
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
    if (!userDoc.exists) return null
    return { uid: decodedToken.uid, data: userDoc.data() }
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, "STRIPE")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.data?.role !== "admin" && user.data?.role !== "direzione") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await req.json()
    const { setupIntentId, clientId } = body

    if (!setupIntentId || !clientId) {
      return NextResponse.json({ 
        error: "setupIntentId and clientId are required" 
      }, { status: 400 })
    }

    const tenantId = user.data?.tenantId || user.uid

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 })
    }

    const clientDoc = await adminDb
      .collection("clients")
      .doc(clientId)
      .get()

    if (!clientDoc.exists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const clientData = clientDoc.data()

    if (clientData?.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden - Client not in your tenant" }, { status: 403 })
    }

    const userDoc = await adminDb.collection("users").doc(user.uid).get()
    const userData = userDoc.data()
    const stripeConnectedAccountId = userData?.stripeConnectedAccountId

    if (!stripeConnectedAccountId) {
      return NextResponse.json({ 
        error: "No Stripe Connected Account found. Please complete onboarding first." 
      }, { status: 400 })
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      stripeAccount: stripeConnectedAccountId
    })

    // ✅ VALIDATE metadata matches request (Security Fix)
    if (setupIntent.metadata?.clientId !== clientId) {
      console.error(`SetupIntent clientId mismatch: ${setupIntent.metadata?.clientId} !== ${clientId}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Payment method does not belong to this client' 
      }, { status: 403 })
    }

    if (setupIntent.metadata?.tenantId !== tenantId) {
      console.error(`SetupIntent tenantId mismatch: ${setupIntent.metadata?.tenantId} !== ${tenantId}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Payment method does not belong to this tenant' 
      }, { status: 403 })
    }

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: `SetupIntent not succeeded. Status: ${setupIntent.status}` 
      }, { status: 400 })
    }

    const paymentMethodId = setupIntent.payment_method as string

    if (!paymentMethodId) {
      return NextResponse.json({ 
        error: "No payment method found on SetupIntent" 
      }, { status: 400 })
    }

    // ✅ Extract customer from setupIntent as fallback (Customer Validation Fix)
    const stripeCustomerId = clientData?.stripeCustomerId || setupIntent.customer as string

    // Validate customer exists
    if (!stripeCustomerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Stripe customer found for this client' 
      }, { status: 400 })
    }

    // Persist if missing in Firestore
    if (!clientData?.stripeCustomerId && adminDb) {
      await adminDb.collection("clients").doc(clientId).update({
        stripeCustomerId: stripeCustomerId,
        updatedAt: new Date()
      })
    }

    // Now safe to use validated customer ID
    await stripe.customers.update(
      stripeCustomerId,
      {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      },
      {
        stripeAccount: stripeConnectedAccountId
      }
    )

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId, {
      stripeAccount: stripeConnectedAccountId
    })

    const paymentMethodType = paymentMethod.type as 'card' | 'sepa_debit'
    let last4: string | undefined

    if (paymentMethod.type === 'card' && paymentMethod.card) {
      last4 = paymentMethod.card.last4 ?? undefined
    } else if (paymentMethod.type === 'sepa_debit' && paymentMethod.sepa_debit) {
      last4 = paymentMethod.sepa_debit.last4 ?? undefined
    }

    await adminDb.collection("clients").doc(clientId).update({
      defaultPaymentMethodId: paymentMethodId,
      paymentMethodType: paymentMethodType,
      last4: last4 || undefined,
      updatedAt: new Date()
    })

    console.log(`✅ Attached payment method ${paymentMethodId} (${paymentMethodType}) to client ${clientId}`)

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethodId,
        type: paymentMethodType,
        last4: last4
      },
      message: "Payment method attached successfully"
    })

  } catch (error) {
    const err = error as Error
    console.error("Error attaching payment method:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
