export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getStripeClient } from "@/lib/stripe-client"

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
    const stripe = getStripeClient()
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.data?.role !== "admin" && user.data?.role !== "direzione") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Check if already has Connected Account
    let accountId = user.data?.stripeConnectedAccountId
    let account: any = null

    if (accountId) {
      // Fetch existing account to check status
      try {
        account = await stripe.accounts.retrieve(accountId)
      } catch (error) {
        console.warn(`Failed to retrieve account ${accountId}, will create new one:`, error)
        accountId = null // Force create new
      }
    }

    // If onboarding complete, persist status and return success
    if (account && account.charges_enabled && account.payouts_enabled) {
      // ✅ NULL CHECK
      if (adminDb) {
        await adminDb.collection("users").doc(user.uid).update({
          stripeAccountStatus: 'active',
          stripeOnboardingComplete: true,
          updatedAt: new Date()
        })
      }
      
      console.log(`✅ Onboarding already complete for account ${account.id}, Firestore updated`)
      
      return NextResponse.json({
        success: true,
        accountId: account.id,
        onboardingComplete: true,
        status: 'active',
        message: "Onboarding already complete"
      })
    }

    // Create new account if needed
    if (!accountId || !account) {
      account = await stripe.accounts.create({
        type: 'standard',
        country: 'IT',
        email: user.data?.email,
        business_type: 'company',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          tenantId: user.data?.tenantId || user.uid,
          userId: user.uid,
          companyName: user.data?.companyName || 'Unknown'
        }
      })
      
      accountId = account.id

      // Save to Firestore
      if (adminDb) {
        await adminDb.collection("users").doc(user.uid).update({
          stripeConnectedAccountId: accountId,
          stripeAccountStatus: 'pending',
          stripeOnboardingComplete: false,
          updatedAt: new Date()
        })
      }
      
      console.log(`✅ Created new Stripe Connect account ${accountId} for tenant ${user.uid}`)
    }

    // ALWAYS generate AccountLink (whether new or resuming)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
      type: 'account_onboarding',
    })

    console.log(`✅ Generated AccountLink for account ${accountId} (onboarding ${account && account.charges_enabled ? 'complete' : 'pending'})`)

    return NextResponse.json({
      success: true,
      accountId: accountId,
      onboardingUrl: accountLink.url,
      onboardingComplete: account && account.charges_enabled && account.payouts_enabled,
      status: account?.charges_enabled ? 'active' : 'pending'
    })

  } catch (error) {
    const err = error as Error
    console.error("Error creating Connect account:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
