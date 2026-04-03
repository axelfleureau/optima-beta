export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { getPlanById } from "@/lib/constants/token-plans"
import Stripe from "stripe"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
})

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  
  const token = authHeader.split("Bearer ")[1]
  try {
    if (!adminAuth) {
      console.error("Firebase Admin Auth not initialized")
      return null
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized")
      return null
    }

    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
    
    if (!userDoc.exists) return null
    
    return {
      uid: decodedToken.uid,
      data: userDoc.data()
    }
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    const { planId } = body
    
    if (!planId) {
      return NextResponse.json(
        { success: false, error: "planId is required" },
        { status: 400 }
      )
    }
    
    const plan = getPlanById(planId)
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      )
    }
    
    let customerId = user.data?.stripeCustomerId
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.data?.email,
        name: user.data?.name || user.data?.email,
        metadata: {
          userId: user.uid,
          tenantId: user.data?.tenantId || user.uid
        }
      })
      customerId = customer.id
      
      if (adminDb) {
        await adminDb.collection("users").doc(user.uid).update({
          stripeCustomerId: customerId
        })
      }
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      subscription_data: {
        metadata: {
          userId: user.uid,
          tenantId: user.data?.tenantId || user.uid,
          planId: plan.id,
          tokenLimit: plan.tokenLimit.toString()
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`,
      metadata: {
        userId: user.uid,
        tenantId: user.data?.tenantId || user.uid,
        planId: plan.id
      }
    })
    
    console.log(`✅ Created subscription checkout for user ${user.uid}, plan ${plan.name}`)
    
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    })
    
  } catch (error) {
    const err = error as Error
    console.error("Error creating subscription checkout:", err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
