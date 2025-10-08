import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil"
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
    const { clientId, paymentMethodType = 'card' } = body

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 })
    }

    if (!['card', 'sepa_debit'].includes(paymentMethodType)) {
      return NextResponse.json({ 
        error: "paymentMethodType must be 'card' or 'sepa_debit'" 
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

    let stripeCustomerId = clientData?.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: clientData?.email || '',
        name: clientData?.name || '',
        metadata: {
          tenantId,
          clientId,
          clientName: clientData?.name || ''
        }
      }, {
        stripeAccount: stripeConnectedAccountId
      })

      stripeCustomerId = customer.id

      await adminDb.collection("clients").doc(clientId).update({
        stripeCustomerId: customer.id,
        updatedAt: new Date()
      })

      console.log(`✅ Auto-created Stripe customer ${customer.id} for client ${clientId}`)
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
      payment_method_types: [paymentMethodType],
      metadata: {
        tenantId,
        clientId,
        clientName: clientData?.name || ''
      }
    }, {
      stripeAccount: stripeConnectedAccountId
    })

    console.log(`✅ Created SetupIntent ${setupIntent.id} for client ${clientId} (type: ${paymentMethodType})`)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      intentId: setupIntent.id,
      message: "SetupIntent created successfully"
    })

  } catch (error) {
    const err = error as Error
    console.error("Error creating SetupIntent:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
