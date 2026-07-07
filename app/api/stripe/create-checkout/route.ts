export const dynamic = "force-dynamic";

/**
 * Stripe Checkout Session Creation API Route
 *
 * POST /api/stripe/create-checkout
 * Creates a secure Stripe checkout session for quote payment
 *
 * SECURITY:
 * - Requires authentication via Firebase token
 * - Validates quote ownership via tenant scoping
 * - Server-side price validation (prevents client manipulation)
 * - Comprehensive input validation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripeService } from "@/lib/services/stripe.service";
import { createPayment } from "@/collections/payments";
import { verifyFirebaseToken, adminDb } from "@/lib/firebase-admin";
import type {
  CreatePaymentIntentRequest,
  SecurePaymentContext,
} from "@/types/payment";
import type { Quote } from "@/types/quote";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { canViewInternalEconomicData } from "@/lib/workspace-permissions";

const createCheckoutSchema = z.object({
  quoteId: z.string().min(1, "Quote ID richiesto"),
  clientEmail: z.string().email("Email non valida").optional(),
  clientName: z.string().min(1).optional(),
});

// SECURITY: Verify Firebase auth token using Firebase Admin SDK
async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("firebase-auth-token")?.value;

    let token: string | null = null;

    // Get token from Authorization header or cookie
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1];
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      console.error("❌ No authentication token provided");
      return null;
    }

    // SECURITY: Verify Firebase token using Admin SDK
    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken || !decodedToken.uid) {
      console.error("❌ Invalid token - no UID found");
      return null;
    }

    console.log(`✅ Token verified for user: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error) {
    console.error("❌ Error verifying auth token:", error);
    return null;
  }
}

// SECURITY: Get user data with tenant info using Firebase Admin SDK
async function getUserData(userId: string) {
  try {
    if (!adminDb) {
      console.error("❌ Firebase Admin DB not initialized");
      return null;
    }

    // Use Firebase Admin SDK for server-side operations
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ User ${userId} not found in database`);
      return null;
    }

    const userData = userDoc.data();

    if (!userData) {
      console.error(`❌ User ${userId} has no data`);
      return null;
    }

    // Check if user is suspended
    if (userData.isSuspended) {
      console.error(`❌ User ${userId} is suspended`);
      return null;
    }

    // Get tenant data using Admin SDK
    let tenantData = null;
    if (userData.tenantId) {
      const tenantDoc = await adminDb
        .collection("tenants")
        .doc(userData.tenantId)
        .get();
      if (tenantDoc.exists) {
        tenantData = { id: tenantDoc.id, ...tenantDoc.data() };
      } else {
        console.error(
          `❌ Tenant ${userData.tenantId} not found for user ${userId}`,
        );
        return null;
      }
    } else {
      console.error(`❌ User ${userId} has no tenantId`);
      return null;
    }

    return {
      user: { id: userId, ...userData },
      tenant: tenantData,
    };
  } catch (error) {
    console.error("❌ Error getting user data:", error);
    return null;
  }
}

// SECURITY: Get quote with security validation using Firebase Admin SDK
async function getQuoteSecurely(
  quoteId: string,
  tenantId: string,
): Promise<Quote | null> {
  try {
    if (!adminDb) {
      console.error("❌ Firebase Admin DB not initialized");
      return null;
    }

    // Use Firebase Admin SDK for server-side operations
    const quoteDoc = await adminDb.collection("quotes").doc(quoteId).get();
    if (!quoteDoc.exists) {
      console.error(`❌ Quote ${quoteId} not found`);
      return null;
    }

    const quoteData = quoteDoc.data();

    if (!quoteData) {
      console.error(`❌ Quote ${quoteId} has no data`);
      return null;
    }

    // SECURITY: Validate tenant ownership
    if (quoteData.tenantId !== tenantId) {
      console.error(`Quote ${quoteId} does not belong to tenant ${tenantId}`);
      return null;
    }

    return {
      id: quoteDoc.id,
      title: quoteData.title || "",
      description: quoteData.description || "",
      clientId: quoteData.clientId || "",
      clientName: quoteData.clientName || "",
      status: quoteData.status || "draft",
      currency: quoteData.currency || "EUR",
      items: quoteData.items || [],
      total: quoteData.total || 0,
      clientEmail: quoteData.clientEmail || quoteData.externalClientEmail || "",
      validUntil: quoteData.validUntil?.toDate?.() || new Date(),
      createdAt: quoteData.createdAt?.toDate?.() || new Date(),
      updatedAt: quoteData.updatedAt?.toDate?.() || new Date(),
      tenantId: quoteData.tenantId || "",
      createdBy: quoteData.createdBy || "",
    } as Quote;
  } catch (error) {
    console.error("Error getting quote:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "STRIPE");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset);
  }

  console.log("🔄 Processing Stripe checkout creation request");

  try {
    // Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = createCheckoutSchema.parse(body);

    const requestData = validatedData as CreatePaymentIntentRequest;

    // SECURITY: Verify authentication with detailed error handling
    const authUser = await verifyAuthToken(request);
    if (!authUser) {
      console.error(
        "❌ Authentication failed - invalid or missing Firebase token",
      );
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          details:
            "Invalid or expired Firebase authentication token. Please log in again.",
          code: "AUTH_TOKEN_INVALID",
        },
        { status: 401 },
      );
    }

    console.log(`✅ Authenticated user: ${authUser.uid}`);

    // SECURITY: Get user and tenant data with detailed error handling
    const userData = await getUserData(authUser.uid);
    if (!userData || !userData.user || !userData.tenant) {
      console.error(
        `❌ User or tenant data not found for UID: ${authUser.uid}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "User or tenant not found",
          details:
            "Your account may not be properly configured or may be suspended. Please contact support.",
          code: "USER_TENANT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    console.log(`✅ User tenant: ${userData.tenant.id}`);

    // Get quote with security validation
    const quote = await getQuoteSecurely(
      requestData.quoteId,
      userData.tenant.id,
    );
    if (!quote) {
      console.error(`Quote ${requestData.quoteId} not found or access denied`);
      return NextResponse.json(
        { success: false, error: "Quote not found or access denied" },
        { status: 404 },
      );
    }

    console.log(
      `✅ Quote validated: ${quote.id} - ${quote.title || "Untitled"}`,
    );

    const userRole = String((userData.user as any).role || "").toLowerCase();
    const userEmail = String((userData.user as any).email || "").toLowerCase();
    const quoteClientEmail = String(
      (quote as any).clientEmail || "",
    ).toLowerCase();
    const canUseInternalQuotePayment = canViewInternalEconomicData(userRole);
    const canPayOwnClientQuote =
      userRole === "client" &&
      userEmail &&
      quoteClientEmail &&
      userEmail === quoteClientEmail;

    if (!canUseInternalQuotePayment && !canPayOwnClientQuote) {
      return NextResponse.json(
        {
          success: false,
          error: "Permessi insufficienti",
        },
        { status: 403 },
      );
    }

    // Build secure payment context
    const paymentContext: SecurePaymentContext = {
      payment: null as any, // Will be created after checkout session
      quote: {
        id: quote.id,
        title: quote.title || "Untitled Quote",
        total: quote.total || 0,
        currency: quote.currency || "EUR",
        clientName: quote.clientName || "Unknown Client",
        tenantId: quote.tenantId || userData.tenant.id,
        status: quote.status || "draft",
        validUntil: quote.validUntil || new Date(),
      },
      tenant: {
        id: userData.tenant.id,
        name: (userData.tenant as any).name || "Unknown Tenant",
      },
    };

    // Create Stripe checkout session
    console.log("🔄 Creating Stripe checkout session...");
    const checkoutResult = await stripeService.createCheckoutSession(
      requestData,
      paymentContext,
    );

    if (!checkoutResult.success || !checkoutResult.data) {
      console.error("Failed to create checkout session:", checkoutResult.error);
      return NextResponse.json(
        {
          success: false,
          error:
            checkoutResult.error?.message ||
            "Failed to create checkout session",
          details: checkoutResult.error?.code,
        },
        { status: 500 },
      );
    }

    console.log(
      `✅ Checkout session created: ${checkoutResult.data.checkoutSessionId}`,
    );

    // Create payment record in Firestore
    try {
      const paymentId = await createPayment({
        stripePaymentIntentId: checkoutResult.data.paymentIntentId || "",
        stripeCheckoutSessionId: checkoutResult.data.checkoutSessionId,
        quoteId: quote.id,
        quoteName: quote.title || "Untitled Quote",
        tenantId: userData.tenant.id,
        clientEmail: requestData.clientEmail || "",
        clientName:
          requestData.clientName || quote.clientName || "Unknown Client",
        amount: Math.round((quote.total || 0) * 100), // Convert to cents
        currency: quote.currency || "EUR",
        description: `Payment for quote: ${quote.title || "Untitled Quote"}`,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      console.log(`✅ Payment record created: ${paymentId}`);
    } catch (error) {
      console.error("Failed to create payment record:", error);
      // Don't fail the request, but log the error
      // The payment record can be created via webhook if needed
    }

    // Return success response
    return NextResponse.json({
      success: true,
      checkoutSessionId: checkoutResult.data.checkoutSessionId,
      checkoutUrl: checkoutResult.data.checkoutUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Dati non validi",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error("❌ Error creating checkout session:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
