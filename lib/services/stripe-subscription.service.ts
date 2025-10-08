/**
 * Stripe Subscription Service
 * 
 * Handles monthly recurring subscription for maintenance costs
 * Integrates with Quote system for auto-renewal and status tracking
 */

import Stripe from 'stripe'

// Environment validation
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY")
}

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  typescript: true,
  telemetry: false,
  maxNetworkRetries: 3,
  timeout: 10000,
})

export interface CreateSubscriptionParams {
  quoteId: string
  tenantId: string
  customerId: string // Stripe Customer ID
  monthlyAmount: number
  customerEmail: string
  customerName: string
  quoteTitle: string
}

export interface SubscriptionResponse {
  subscriptionId: string
  priceId: string
  clientSecret: string | null
  status: string
}

/**
 * Create a Stripe monthly subscription for maintenance
 */
export async function createMaintenanceSubscription(
  params: CreateSubscriptionParams
): Promise<SubscriptionResponse> {
  const { quoteId, tenantId, customerId, monthlyAmount, customerEmail, customerName, quoteTitle } = params
  
  try {
    console.log('🔄 Creating maintenance subscription for quote:', quoteId)
    
    // 1. Create a Stripe Price for recurring monthly payment
    const price = await stripe.prices.create({
      unit_amount: Math.round(monthlyAmount * 100), // Convert to cents
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: `Manutenzione - ${quoteTitle}`,
        metadata: {
          quoteId,
          tenantId,
          description: `Abbonamento mensile per manutenzione (hosting, gestione contenuti, supporto)`,
        },
      },
    })
    
    console.log('✅ Stripe Price created:', price.id)
    
    // 2. Create a Stripe Subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        quoteId,
        tenantId,
        customerEmail,
        customerName,
        subscriptionType: 'maintenance',
      },
    })
    
    console.log('✅ Stripe Subscription created:', subscription.id)
    
    // 3. Get client_secret for payment
    const invoice = subscription.latest_invoice as Stripe.Invoice | null
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined
    
    return {
      subscriptionId: subscription.id,
      priceId: price.id,
      clientSecret: paymentIntent?.client_secret || null,
      status: subscription.status,
    }
  } catch (error) {
    console.error('❌ Error creating subscription:', error)
    throw error
  }
}

/**
 * Cancel a subscription
 * @param immediately - If true, cancel immediately. If false, cancel at period end
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  try {
    if (immediately) {
      // Cancel immediately
      const subscription = await stripe.subscriptions.cancel(subscriptionId)
      console.log('✅ Subscription canceled immediately:', subscriptionId)
      return subscription
    } else {
      // Cancel at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
      console.log('✅ Subscription will cancel at period end:', subscriptionId)
      return subscription
    }
  } catch (error) {
    console.error('❌ Error canceling subscription:', error)
    throw error
  }
}

/**
 * Pause a subscription (skip invoices)
 */
export async function pauseSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void', // Skip invoices
      },
    })
    console.log('✅ Subscription paused:', subscriptionId)
    return subscription
  } catch (error) {
    console.error('❌ Error pausing subscription:', error)
    throw error
  }
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: '', // Resume billing
    })
    console.log('✅ Subscription resumed:', subscriptionId)
    return subscription
  } catch (error) {
    console.error('❌ Error resuming subscription:', error)
    throw error
  }
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    }
  } catch (error) {
    console.error('❌ Error getting subscription status:', error)
    throw error
  }
}

// Export stripe instance for webhook handlers
export { stripe }
