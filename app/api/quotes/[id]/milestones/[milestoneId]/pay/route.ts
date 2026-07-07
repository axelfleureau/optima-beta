export const dynamic = "force-dynamic";

/**
 * Milestone Payment API Route
 *
 * POST /api/quotes/[id]/milestones/[milestoneId]/pay
 *
 * Creates a Stripe Checkout session for paying a specific milestone
 *
 * SECURITY:
 * - Requires authentication
 * - Rate limited with STRIPE profile
 * - Tenant-scoped data access
 * - Validates milestone status (must be 'ready')
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  getUserData,
  adminDb,
} from "@/lib/firebase-admin";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getQuoteById } from "@/lib/quote-service-server";
import { StripeService } from "@/lib/services/stripe.service";
import { canViewInternalEconomicData } from "@/lib/workspace-permissions";

const stripeService = new StripeService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    // 1. RATE LIMITING - STRIPE profile
    const rateLimitResult = await rateLimit(request, "STRIPE");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset);
    }

    // 2. AUTHENTICATION
    const token = request.cookies.get("firebase-auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseToken(token);
    const userData = await getUserData(decodedToken.uid);

    if (!userData) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 401 },
      );
    }

    // 3. PARSE PARAMS - Next.js 15 async params
    const { id: quoteId, milestoneId } = await params;

    if (!quoteId || !milestoneId) {
      return NextResponse.json(
        { error: "Parametri mancanti" },
        { status: 400 },
      );
    }

    // 4. FETCH QUOTE (tenant-scoped)
    const quote = await getQuoteById(quoteId, userData.tenantId);

    if (!quote) {
      return NextResponse.json(
        { error: "Preventivo non trovato" },
        { status: 404 },
      );
    }

    const userRole = String(userData.role || "").toLowerCase();
    const userEmail = String(userData.email || "").toLowerCase();
    const quoteClientEmail = String(
      quote.clientEmail || quote.externalClientEmail || "",
    ).toLowerCase();
    const canUseInternalQuotePayment = canViewInternalEconomicData(userRole);
    const canPayOwnClientQuote =
      userRole === "client" &&
      userEmail &&
      quoteClientEmail &&
      userEmail === quoteClientEmail;

    if (!canUseInternalQuotePayment && !canPayOwnClientQuote) {
      return NextResponse.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    // 5. VALIDATE MILESTONE
    const milestone = quote.paymentPlan?.milestones?.find(
      (m: any) => m.id === milestoneId,
    );

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone non trovata" },
        { status: 404 },
      );
    }

    // 6. CHECK MILESTONE STATUS
    if (milestone.status !== "ready") {
      return NextResponse.json(
        {
          error: `La milestone con stato '${milestone.status}' non è pronta per il pagamento. Solo milestone con stato 'ready' possono essere pagate.`,
        },
        { status: 400 },
      );
    }

    // 7. FETCH TENANT DATA
    if (!userData.tenantId) {
      return NextResponse.json(
        { error: "TenantId mancante nei dati utente" },
        { status: 400 },
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin DB not initialized" },
        { status: 500 },
      );
    }

    let tenantName = "Agenzia";
    try {
      const tenantDoc = await adminDb
        .collection("tenants")
        .doc(userData.tenantId)
        .get();
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        tenantName = tenantData?.name || tenantData?.companyName || "Agenzia";
      } else {
        console.warn(
          `Tenant document not found for tenantId: ${userData.tenantId}. Using fallback name.`,
        );
      }
    } catch (error) {
      console.error("Error fetching tenant data from Firestore:", error);
      // Continue with fallback name instead of blocking payment
    }

    // 8. CREATE STRIPE CHECKOUT FOR MILESTONE
    const result = await stripeService.createMilestonePayment(
      quote.id,
      milestone.id,
      {
        name: milestone.name,
        amount: milestone.amount,
      },
      {
        quote: {
          id: quote.id,
          title: quote.title,
          total: quote.total,
          currency: quote.currency,
          clientName: quote.clientName,
          tenantId: quote.tenantId,
          status: quote.status,
          validUntil: quote.validUntil,
          clientEmail: quote.clientEmail || "",
        },
        tenant: {
          id: userData.tenantId,
          name: tenantName,
        },
      },
    );

    if (!result.success) {
      console.error("Failed to create milestone payment:", result.error);
      return NextResponse.json(
        { error: "Impossibile creare il pagamento. Riprova più tardi." },
        { status: 500 },
      );
    }

    // 9. RETURN CHECKOUT URL
    return NextResponse.json({
      success: true,
      checkoutUrl: result.data?.checkoutUrl,
      checkoutSessionId: result.data?.checkoutSessionId,
    });
  } catch (error) {
    console.error("Error creating milestone payment:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 },
    );
  }
}
