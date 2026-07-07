export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getQuoteById,
  updateQuoteSubscription,
} from "@/lib/quote-service-server";
import { createMaintenanceSubscription } from "@/lib/services/stripe-subscription.service";
import { getUserData, verifyFirebaseToken } from "@/lib/firebase-admin";
import { canViewInternalEconomicData } from "@/lib/workspace-permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await params;

  try {
    const token =
      req.cookies.get("firebase-auth-token")?.value ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseToken(token);
    const userData = await getUserData(decodedToken.uid);
    if (!userData?.tenantId) {
      return NextResponse.json(
        { error: "User tenant not found" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { tenantId, customerId, customerEmail, customerName } = body;

    // Validate required fields
    if (!tenantId || !customerId || !customerEmail || !customerName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: tenantId, customerId, customerEmail, customerName",
        },
        { status: 400 },
      );
    }

    if (tenantId !== userData.tenantId) {
      return NextResponse.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    // Get quote
    const quote = await getQuoteById(quoteId, userData.tenantId);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const userRole = String(userData.role || "").toLowerCase();
    const userEmail = String(userData.email || "").toLowerCase();
    const quoteClientEmail = String(
      quote.clientEmail || quote.externalClientEmail || "",
    ).toLowerCase();
    const canManageQuoteEconomics = canViewInternalEconomicData(userRole);
    const canUseOwnClientQuote =
      userRole === "client" &&
      userEmail &&
      quoteClientEmail &&
      userEmail === quoteClientEmail;

    if (!canManageQuoteEconomics && !canUseOwnClientQuote) {
      return NextResponse.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    // Calculate monthly amount from annual management costs
    // The gestioneAnnuale field contains totalMonthly and totalAnnual
    const monthlyAmount = quote.gestioneAnnuale?.totalMonthly || 0;

    if (monthlyAmount <= 0) {
      return NextResponse.json(
        { error: "No maintenance costs defined in quote" },
        { status: 400 },
      );
    }

    // Create Stripe subscription
    const subscription = await createMaintenanceSubscription({
      quoteId,
      tenantId: userData.tenantId,
      customerId,
      monthlyAmount,
      customerEmail,
      customerName,
      quoteTitle: quote.titolo || quote.title || `Quote ${quoteId}`,
    });

    // Update quote with subscription info
    await updateQuoteSubscription(quoteId, userData.tenantId, {
      monthlyAmount,
      stripeSubscriptionId: subscription.subscriptionId,
      stripePriceId: subscription.priceId,
      status: "pending", // Will become 'active' after first payment
    });

    console.log("✅ Subscription created for quote:", quoteId);

    return NextResponse.json({
      success: true,
      clientSecret: subscription.clientSecret,
      subscriptionId: subscription.subscriptionId,
      monthlyAmount,
    });
  } catch (error) {
    console.error("❌ Error setting up subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to set up subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
