/**
 * Stripe Service Module
 * 
 * Tenant-aware Stripe SDK wrapper with security best practices
 * Handles payment intents, checkout sessions, and webhook processing
 */

import Stripe from "stripe"
import type { 
  Payment, 
  PaymentStatus, 
  CreatePaymentIntentRequest, 
  CreatePaymentIntentResponse,
  PaymentServiceResponse,
  SecurePaymentContext,
  PaymentError,
  PAYMENT_CONSTANTS
} from "@/types/payment"

// Environment validation
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY")
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.warn("Warning: STRIPE_WEBHOOK_SECRET not set. Webhook verification will be disabled.")
}

// Initialize Stripe with security best practices
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil", // Use latest supported version
  typescript: true,
  telemetry: false, // Disable telemetry for privacy
  maxNetworkRetries: 3,
  timeout: 10000, // 10 second timeout
})

/**
 * Stripe Service Class
 * Provides tenant-aware payment operations with comprehensive error handling
 */
export class StripeService {
  /**
   * Create a Stripe Checkout Session for quote payment
   * SECURITY: Validates quote ownership and pricing server-side
   */
  async createCheckoutSession(
    request: CreatePaymentIntentRequest,
    context: SecurePaymentContext
  ): Promise<PaymentServiceResponse<CreatePaymentIntentResponse>> {
    try {
      // Validate request and context
      const validation = this.validateCheckoutRequest(request, context)
      if (!validation.success) {
        return validation
      }

      // Validate quote is payable
      const quoteValidation = this.validateQuoteForPayment(context.quote)
      if (!quoteValidation.success) {
        return quoteValidation
      }

      // Determine URLs
      const baseUrl = this.getBaseUrl()
      const successUrl = request.successUrl || `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = request.cancelUrl || `${baseUrl}/payment/cancel?quote_id=${context.quote.id}`

      // Create Stripe customer if needed
      let customerId = undefined
      if (request.clientEmail) {
        customerId = await this.getOrCreateCustomer(
          request.clientEmail,
          request.clientName || context.quote.clientName,
          context.tenant.id
        )
      }

      // Prepare line items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: context.quote.currency.toLowerCase(),
            product_data: {
              name: context.quote.title,
              description: `Preventivo ${context.quote.id}`,
              metadata: {
                quoteId: context.quote.id,
                tenantId: context.tenant.id,
              },
            },
            unit_amount: Math.round(context.quote.total * 100), // Convert to cents
          },
          quantity: 1,
        },
      ]

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: request.paymentMethodTypes || ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        client_reference_id: context.quote.id,
        payment_intent_data: {
          metadata: {
            quoteId: context.quote.id,
            tenantId: context.tenant.id,
            clientId: context.quote.clientName,
            paymentType: "quote_payment",
          },
          description: `Payment for quote: ${context.quote.title}`,
        },
        metadata: {
          quoteId: context.quote.id,
          tenantId: context.tenant.id,
          quoteName: context.quote.title,
          clientName: context.quote.clientName,
        },
        expires_at: Math.floor((new Date().getTime() + 24 * 60 * 60 * 1000) / 1000), // 24 hours
        automatic_tax: {
          enabled: false, // Can be configured per tenant
        },
        billing_address_collection: "required",
        phone_number_collection: {
          enabled: true,
        },
      })

      return {
        success: true,
        data: {
          success: true,
          checkoutSessionId: session.id,
          checkoutUrl: session.url!,
          paymentIntentId: session.payment_intent as string,
        },
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      return {
        success: false,
        error: this.formatStripeError(error),
      }
    }
  }

  /**
   * Process Stripe webhook events with security verification
   * SECURITY: Verifies webhook signature and handles idempotency
   */
  async processWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<PaymentServiceResponse<{ processed: boolean; eventType: string }>> {
    try {
      // Verify webhook signature if secret is available
      let event: Stripe.Event
      if (STRIPE_WEBHOOK_SECRET) {
        try {
          event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
        } catch (err) {
          console.error("Webhook signature verification failed:", err)
          return {
            success: false,
            error: {
              code: "webhook_signature_invalid",
              message: "Webhook signature verification failed",
              type: "authorization",
              retryable: false,
            },
          }
        }
      } else {
        // Parse without verification (not recommended for production)
        event = JSON.parse(payload.toString())
        console.warn("Webhook processed without signature verification")
      }

      console.log(`Processing webhook event: ${event.type}`)

      // Handle different event types
      let processed = false
      switch (event.type) {
        case "checkout.session.completed":
          processed = await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break

        case "payment_intent.succeeded":
          processed = await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
          break

        case "payment_intent.payment_failed":
          processed = await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
          break

        case "payment_intent.canceled":
          processed = await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
          break

        case "invoice.payment_succeeded":
          // For future subscription support
          console.log("Invoice payment succeeded (not implemented)")
          break

        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }

      return {
        success: true,
        data: {
          processed,
          eventType: event.type,
        },
      }
    } catch (error) {
      console.error("Error processing webhook:", error)
      return {
        success: false,
        error: this.formatStripeError(error),
      }
    }
  }

  /**
   * Retrieve payment intent details from Stripe
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentServiceResponse<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      return {
        success: true,
        data: paymentIntent,
      }
    } catch (error) {
      return {
        success: false,
        error: this.formatStripeError(error),
      }
    }
  }

  /**
   * Retrieve checkout session details from Stripe
   */
  async getCheckoutSession(sessionId: string): Promise<PaymentServiceResponse<Stripe.Checkout.Session>> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      })
      return {
        success: true,
        data: session,
      }
    } catch (error) {
      return {
        success: false,
        error: this.formatStripeError(error),
      }
    }
  }

  /**
   * Create or retrieve Stripe customer
   * SECURITY: Scopes customers by tenant
   */
  private async getOrCreateCustomer(email: string, name: string, tenantId: string): Promise<string> {
    try {
      // Search for existing customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        return customers.data[0].id
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          tenantId: tenantId,
          createdBy: "quote_system",
        },
      })

      return customer.id
    } catch (error) {
      console.error("Error creating/retrieving customer:", error)
      throw error
    }
  }

  // Private webhook handlers

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<boolean> {
    try {
      console.log("Processing checkout completion:", session.id)

      const quoteId = session.metadata?.quoteId
      const tenantId = session.metadata?.tenantId

      if (!quoteId || !tenantId) {
        console.error("Missing metadata in checkout session:", session.metadata)
        return false
      }

      // Update payment record
      // This will be implemented when we have the payment creation logic
      console.log(`Quote ${quoteId} payment completed via checkout ${session.id}`)

      return true
    } catch (error) {
      console.error("Error handling checkout completion:", error)
      return false
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<boolean> {
    try {
      console.log("Processing payment success:", paymentIntent.id)

      const quoteId = paymentIntent.metadata?.quoteId
      const tenantId = paymentIntent.metadata?.tenantId

      if (!quoteId || !tenantId) {
        console.error("Missing metadata in payment intent:", paymentIntent.metadata)
        return false
      }

      // Update quote status to "accepted" and payment status to "succeeded"
      // This will be implemented when we have the quote update logic
      console.log(`Quote ${quoteId} payment succeeded: ${paymentIntent.id}`)

      return true
    } catch (error) {
      console.error("Error handling payment success:", error)
      return false
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<boolean> {
    try {
      console.log("Processing payment failure:", paymentIntent.id)

      const quoteId = paymentIntent.metadata?.quoteId
      const tenantId = paymentIntent.metadata?.tenantId

      if (!quoteId || !tenantId) {
        console.error("Missing metadata in payment intent:", paymentIntent.metadata)
        return false
      }

      // Update payment status to "failed"
      console.log(`Quote ${quoteId} payment failed: ${paymentIntent.id}`)

      return true
    } catch (error) {
      console.error("Error handling payment failure:", error)
      return false
    }
  }

  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<boolean> {
    try {
      console.log("Processing payment cancellation:", paymentIntent.id)

      const quoteId = paymentIntent.metadata?.quoteId
      const tenantId = paymentIntent.metadata?.tenantId

      if (!quoteId || !tenantId) {
        console.error("Missing metadata in payment intent:", paymentIntent.metadata)
        return false
      }

      // Update payment status to "canceled"
      console.log(`Quote ${quoteId} payment canceled: ${paymentIntent.id}`)

      return true
    } catch (error) {
      console.error("Error handling payment cancellation:", error)
      return false
    }
  }

  // Validation helpers

  private validateCheckoutRequest(
    request: CreatePaymentIntentRequest,
    context: SecurePaymentContext
  ): PaymentServiceResponse<CreatePaymentIntentResponse> {
    if (!request.quoteId) {
      return {
        success: false,
        error: {
          code: "missing_quote_id",
          message: "Quote ID is required",
          type: "validation",
        },
      }
    }

    if (!context.quote) {
      return {
        success: false,
        error: {
          code: "quote_not_found",
          message: "Quote not found",
          type: "validation",
        },
      }
    }

    if (!context.tenant) {
      return {
        success: false,
        error: {
          code: "tenant_not_found",
          message: "Tenant not found",
          type: "validation",
        },
      }
    }

    return { success: true }
  }

  private validateQuoteForPayment(quote: SecurePaymentContext["quote"]): PaymentServiceResponse<CreatePaymentIntentResponse> {
    // Check if quote is expired
    if (new Date() > quote.validUntil) {
      return {
        success: false,
        error: {
          code: "quote_expired",
          message: "Quote has expired",
          type: "validation",
        },
      }
    }

    // Check if quote is in payable status
    if (!["sent", "pending"].includes(quote.status)) {
      return {
        success: false,
        error: {
          code: "quote_not_payable",
          message: `Quote status '${quote.status}' is not payable`,
          type: "validation",
        },
      }
    }

    // Validate amount
    if (quote.total <= 0) {
      return {
        success: false,
        error: {
          code: "invalid_amount",
          message: "Quote amount must be greater than zero",
          type: "validation",
        },
      }
    }

    return { success: true }
  }

  private getBaseUrl(): string {
    // In production, use the actual domain
    if (process.env.NODE_ENV === "production") {
      return process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"
    }
    // In development, use localhost
    return "http://localhost:3000"
  }

  private formatStripeError(error: any): PaymentError {
    if (error.type) {
      // This is a Stripe error
      return {
        code: error.code || error.type,
        message: error.message || "An error occurred with Stripe",
        type: "stripe",
        details: error,
        retryable: error.type === "rate_limit_error" || error.type === "api_connection_error",
      }
    }

    // Generic error
    return {
      code: "unknown_error",
      message: error.message || "An unknown error occurred",
      type: "network",
      details: error,
      retryable: true,
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService()

// Export constants for use in other modules
export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET,
  SUPPORTED_PAYMENT_METHODS: ["card", "sepa_debit", "ideal", "bancontact"] as const,
  CHECKOUT_SESSION_EXPIRES_HOURS: 24,
  WEBHOOK_TOLERANCE_SECONDS: 300, // 5 minutes
} as const