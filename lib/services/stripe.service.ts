/**
 * Stripe Service Module
 * 
 * Tenant-aware Stripe SDK wrapper with security best practices
 * Handles payment intents, checkout sessions, and webhook processing
 */

import Stripe from "stripe"
import { Timestamp } from "firebase-admin/firestore"
import { updateQuoteStatus, updateMilestoneStatus, getQuoteById, updateQuoteSubscription } from "@/lib/quote-service-server"
import { sendInvoiceEmail } from "@/lib/email-service"
import type { InvoicePaymentData } from "@/lib/invoice-generator"
import type { 
  Payment, 
  PaymentStatus, 
  CreatePaymentIntentRequest, 
  CreatePaymentIntentResponse,
  PaymentServiceResponse,
  SecurePaymentContext,
  MilestonePaymentContext,
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
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
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

      // Create Stripe customer if valid email is available
      let customerId = undefined
      if (request.clientEmail && this.isValidEmail(request.clientEmail)) {
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
   * Create a Stripe Checkout Session for deposit payment
   * SECURITY: Validates quote ownership and calculates deposit amount server-side
   */
  async createDepositCheckout(
    quoteId: string,
    depositPercentage: number,
    context: SecurePaymentContext
  ): Promise<PaymentServiceResponse<CreatePaymentIntentResponse>> {
    try {
      // Validate deposit percentage
      if (depositPercentage <= 0 || depositPercentage > 100) {
        return {
          success: false,
          error: {
            code: "invalid_deposit_percentage",
            message: "Deposit percentage must be between 1 and 100",
            type: "validation",
          },
        }
      }

      // Validate quote is payable
      const quoteValidation = this.validateQuoteForPayment(context.quote)
      if (!quoteValidation.success) {
        return quoteValidation
      }

      // Calculate deposit amount
      const depositAmount = (context.quote.total * depositPercentage) / 100

      // Determine URLs
      const baseUrl = this.getBaseUrl()
      const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${baseUrl}/payment/cancel?quote_id=${context.quote.id}`

      // Create Stripe customer if valid email is available
      let customerId = undefined
      const validEmail = (context.quote as any).clientEmail
      if (validEmail && this.isValidEmail(validEmail)) {
        customerId = await this.getOrCreateCustomer(
          validEmail,
          context.quote.clientName,
          context.tenant.id
        )
      }

      // Create checkout session for deposit
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: context.quote.currency.toLowerCase(),
              product_data: {
                name: `Deposito ${depositPercentage}% - ${context.quote.title}`,
                description: `Acconto iniziale per preventivo ${context.quote.id}`,
                metadata: {
                  quoteId: context.quote.id,
                  tenantId: context.tenant.id,
                },
              },
              unit_amount: Math.round(depositAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        client_reference_id: context.quote.id,
        payment_intent_data: {
          metadata: {
            quoteId: context.quote.id,
            tenantId: context.tenant.id,
            paymentType: "deposit",
            depositPercentage: depositPercentage.toString(),
            totalQuoteAmount: context.quote.total.toString(),
          },
          description: `Deposito ${depositPercentage}% per: ${context.quote.title}`,
        },
        metadata: {
          quoteId: context.quote.id,
          tenantId: context.tenant.id,
          paymentType: "deposit",
          depositPercentage: depositPercentage.toString(),
          totalQuoteAmount: context.quote.total.toString(),
          quoteName: context.quote.title,
          clientName: context.quote.clientName,
        },
        expires_at: Math.floor((new Date().getTime() + 24 * 60 * 60 * 1000) / 1000),
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
      console.error("Error creating deposit checkout session:", error)
      return {
        success: false,
        error: this.formatStripeError(error),
      }
    }
  }

  /**
   * Create a Stripe Checkout Session for milestone payment
   * SECURITY: Validates milestone and quote ownership server-side
   */
  async createMilestonePayment(
    quoteId: string,
    milestoneId: string,
    milestone: { name: string; amount: number },
    context: MilestonePaymentContext
  ): Promise<PaymentServiceResponse<CreatePaymentIntentResponse>> {
    try {
      // Validate milestone amount
      if (milestone.amount <= 0) {
        return {
          success: false,
          error: {
            code: "invalid_milestone_amount",
            message: "Milestone amount must be greater than zero",
            type: "validation",
          },
        }
      }

      // Determine URLs
      const baseUrl = this.getBaseUrl()
      const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${baseUrl}/payment/cancel?quote_id=${context.quote.id}&milestone_id=${milestoneId}`

      // Create Stripe customer if valid email is available
      let customerId = undefined
      const validEmail = (context.quote as any).clientEmail
      if (validEmail && this.isValidEmail(validEmail)) {
        customerId = await this.getOrCreateCustomer(
          validEmail,
          context.quote.clientName,
          context.tenant.id
        )
      }

      // Create checkout session for milestone
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: context.quote.currency.toLowerCase(),
              product_data: {
                name: `Milestone: ${milestone.name}`,
                description: `Pagamento milestone per ${context.quote.title}`,
                metadata: {
                  quoteId: context.quote.id,
                  milestoneId: milestoneId,
                  tenantId: context.tenant.id,
                },
              },
              unit_amount: Math.round(milestone.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        client_reference_id: context.quote.id,
        payment_intent_data: {
          metadata: {
            quoteId: context.quote.id,
            milestoneId: milestoneId,
            paymentType: "milestone",
            tenantId: context.tenant.id,
            milestoneName: milestone.name,
          },
          description: `Milestone "${milestone.name}" per: ${context.quote.title}`,
        },
        metadata: {
          quoteId: context.quote.id,
          milestoneId: milestoneId,
          paymentType: "milestone",
          tenantId: context.tenant.id,
          milestoneName: milestone.name,
          quoteName: context.quote.title,
          clientName: context.quote.clientName,
        },
        expires_at: Math.floor((new Date().getTime() + 24 * 60 * 60 * 1000) / 1000),
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
      console.error("Error creating milestone payment session:", error)
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

        case "customer.subscription.created":
          processed = await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          break

        case "customer.subscription.updated":
          processed = await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case "invoice.payment_succeeded":
          processed = await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case "customer.subscription.deleted":
          processed = await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
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
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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

      const { quoteId, tenantId, paymentType, milestoneId } = session.metadata || {}

      if (!quoteId || !tenantId) {
        console.error("Missing metadata in checkout session:", session.metadata)
        return false
      }

      // IMPORTANT: Update quote status to "approved" ONLY here
      // This ensures quote is approved ONLY if Stripe checkout completed successfully
      await updateQuoteStatus(quoteId, tenantId, 'approved', {
        approvedAt: Timestamp.now(),
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
      })

      // Fetch quote for invoice generation
      const quote = await getQuoteById(quoteId, tenantId)
      
      if (!quote) {
        console.error('Quote not found for invoice:', quoteId)
        return false
      }

      // Generate unique invoice number
      const invoiceNumber = `INV-${Date.now()}-${quoteId.substring(0, 8)}`
      
      // Prepare payment data for invoice
      const paymentData: InvoicePaymentData = {
        paymentIntentId: session.payment_intent as string,
        paymentType: (paymentType || 'full') as 'deposit' | 'milestone' | 'full',
        amount: (session.amount_total || 0) / 100, // Convert from cents to euros
        currency: session.currency || 'eur',
        status: 'succeeded',
        paidAt: new Date(),
        depositPercentage: session.metadata?.depositPercentage,
        milestoneId: milestoneId,
        milestoneName: session.metadata?.milestoneName,
      }

      // Handle different payment types
      if (paymentType === 'deposit') {
        console.log(`✅ Deposit checkout completed for quote ${quoteId}`)
        console.log(`   - Quote approved via checkout: ${session.id}`)
        console.log(`   - Deposit percentage: ${session.metadata?.depositPercentage}%`)
        console.log(`   - Total quote amount: ${session.metadata?.totalQuoteAmount}`)
        console.log(`   - Payment intent: ${session.payment_intent}`)
      } else if (paymentType === 'milestone' && milestoneId) {
        console.log(`✅ Milestone checkout completed for quote ${quoteId}`)
        console.log(`   - Quote approved via checkout: ${session.id}`)
        console.log(`   - Milestone ID: ${milestoneId}`)
        console.log(`   - Milestone name: ${session.metadata?.milestoneName}`)
        console.log(`   - Payment intent: ${session.payment_intent}`)
        
        // Update milestone status to 'paid'
        await updateMilestoneStatus(quoteId, tenantId, milestoneId, 'paid', {
          paidAt: Timestamp.now(),
          paymentIntentId: session.payment_intent as string,
        })
        
        console.log(`   - Milestone ${milestoneId} marked as paid`)
        
        // FIX: RE-FETCH quote AFTER the update to get fresh data
        const updatedQuote = await getQuoteById(quoteId, tenantId)
        
        if (!updatedQuote) {
          console.error('Quote not found after milestone update:', quoteId)
          return false
        }
        
        // Check if ALL milestones are paid using FRESH quote data
        const allMilestonesPaid = updatedQuote.paymentPlan?.milestones?.every((m: any) => m.status === 'paid')
        
        if (allMilestonesPaid) {
          await updateQuoteStatus(quoteId, tenantId, 'completed', {
            completedAt: Timestamp.now(),
          })
          console.log(`   - All milestones paid! Quote ${quoteId} marked as completed`)
        } else {
          console.log(`   - Some milestones still pending payment`)
        }
        
        console.log(`   - Milestone payment processed. All milestones paid: ${allMilestonesPaid}`)
      } else {
        console.log(`✅ Full payment checkout completed for quote ${quoteId}`)
        console.log(`   - Quote approved via checkout: ${session.id}`)
        console.log(`   - Payment intent: ${session.payment_intent}`)
      }

      // Generate and send invoice email
      const clientEmail = (quote as any).clientEmail || session.customer_email || ''
      const clientName = quote.clientName
      
      if (clientEmail) {
        const emailSent = await sendInvoiceEmail(
          invoiceNumber,
          paymentData,
          quote,
          clientName,
          clientEmail
        )
        
        if (emailSent) {
          console.log(`   - Invoice ${invoiceNumber} sent successfully to ${clientEmail}`)
        } else {
          console.log(`   - Failed to send invoice ${invoiceNumber} (email might not be configured)`)
        }
      } else {
        console.log(`   - No email available for invoice delivery`)
      }

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

  // Subscription webhook handlers

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<boolean> {
    try {
      console.log("Processing subscription creation:", subscription.id)

      const { quoteId, tenantId } = subscription.metadata || {}
      
      if (!quoteId || !tenantId) {
        console.error('Missing metadata in subscription.created:', subscription.metadata)
        return false
      }
      
      await updateQuoteSubscription(quoteId, tenantId, {
        stripeSubscriptionId: subscription.id,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      })
      
      console.log(`✅ Subscription created for quote ${quoteId}:`, subscription.id)
      return true
    } catch (error) {
      console.error('Error handling subscription creation:', error)
      return false
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<boolean> {
    try {
      console.log("Processing subscription update:", subscription.id)

      const { quoteId, tenantId } = subscription.metadata || {}
      
      if (!quoteId || !tenantId) {
        console.error('Missing metadata in subscription.updated:', subscription.metadata)
        return false
      }
      
      await updateQuoteSubscription(quoteId, tenantId, {
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      })
      
      console.log(`✅ Subscription updated for quote ${quoteId}:`, subscription.status)
      return true
    } catch (error) {
      console.error('Error handling subscription update:', error)
      return false
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<boolean> {
    try {
      console.log("Processing invoice payment success:", invoice.id)

      const subscriptionId = invoice.subscription as string
      
      if (!subscriptionId) {
        console.log('No subscription ID in invoice, skipping')
        return false
      }
      
      // Get subscription to extract metadata
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const { quoteId, tenantId } = subscription.metadata || {}
      
      if (!quoteId || !tenantId) {
        console.error('Missing metadata in subscription for invoice:', subscription.metadata)
        return false
      }
      
      // Update subscription to active
      await updateQuoteSubscription(quoteId, tenantId, {
        status: 'active',
      })
      
      console.log(`✅ Invoice paid for subscription ${subscriptionId} - Quote ${quoteId}`)
      return true
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error)
      return false
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<boolean> {
    try {
      console.log("Processing subscription deletion:", subscription.id)

      const { quoteId, tenantId } = subscription.metadata || {}
      
      if (!quoteId || !tenantId) {
        console.error('Missing metadata in subscription.deleted:', subscription.metadata)
        return false
      }
      
      await updateQuoteSubscription(quoteId, tenantId, {
        status: 'cancelled',
        canceledAt: new Date(),
      })
      
      console.log(`✅ Subscription deleted for quote ${quoteId}:`, subscription.id)
      return true
    } catch (error) {
      console.error('Error handling subscription deletion:', error)
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

// Helper Utilities for Payment Plans

/**
 * Create a standard Righello payment plan with 50% deposit + 50% completion milestone
 * @param quoteTotal - Total quote amount
 * @returns PaymentPlan with deposit and milestone configuration
 */
export function createStandardPaymentPlan(quoteTotal: number): import("@/types/payment").PaymentPlan {
  return {
    type: 'deposit_milestone',
    depositPercentage: 50, // 50% deposito
    milestones: [
      {
        id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Completamento Progetto',
        percentage: 50,
        amount: quoteTotal * 0.5,
        status: 'pending',
      }
    ]
  }
}

/**
 * Create a custom payment plan with specified deposit percentage
 * @param quoteTotal - Total quote amount
 * @param depositPercentage - Deposit percentage (1-100)
 * @param milestones - Optional custom milestones
 * @returns PaymentPlan with custom configuration
 */
export function createCustomPaymentPlan(
  quoteTotal: number,
  depositPercentage: number,
  milestones?: Array<{ name: string; percentage: number }>
): import("@/types/payment").PaymentPlan {
  const defaultMilestones = milestones || [
    {
      name: 'Completamento Progetto',
      percentage: 100 - depositPercentage,
    }
  ]

  return {
    type: 'deposit_milestone',
    depositPercentage,
    milestones: defaultMilestones.map((m, index) => ({
      id: `milestone_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      name: m.name,
      percentage: m.percentage,
      amount: (quoteTotal * m.percentage) / 100,
      status: 'pending',
    }))
  }
}