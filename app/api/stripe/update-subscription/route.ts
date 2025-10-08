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
    const { subscriptionId, newPlanId } = body
    
    if (!subscriptionId || !newPlanId) {
      return NextResponse.json(
        { success: false, error: "subscriptionId and newPlanId are required" },
        { status: 400 }
      )
    }
    
    const newPlan = getPlanById(newPlanId)
    if (!newPlan) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      )
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    if (subscription.metadata.userId !== user.uid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - subscription mismatch" },
        { status: 403 }
      )
    }
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPlan.stripePriceId,
        }
      ],
      metadata: {
        ...subscription.metadata,
        planId: newPlan.id,
        tokenLimit: newPlan.tokenLimit.toString()
      },
      proration_behavior: "always_invoice",
    })
    
    console.log(`✅ Updated subscription ${subscriptionId} to plan ${newPlan.name} for user ${user.uid}`)
    
    if (adminDb) {
      await adminDb.collection("users").doc(user.uid).update({
        plan: newPlan.id,
        aiTokensLimit: newPlan.tokenLimit,
        updatedAt: new Date()
      })
    }
    
    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        planId: newPlan.id,
        tokenLimit: newPlan.tokenLimit
      }
    })
    
  } catch (error) {
    const err = error as Error
    console.error("Error updating subscription:", err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
