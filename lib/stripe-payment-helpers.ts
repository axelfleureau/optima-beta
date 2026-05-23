/**
 * Stripe Payment Helpers for Quote Auto-Payment
 * 
 * PHASE 5C: Quote Auto-Payment - Complete Flow
 * 
 * This module provides helper functions for creating automatic payments
 * for approved quotes using Stripe Payment Intents with off-session
 * capabilities and Stripe Connect for multi-tenant support.
 */

import Stripe from "stripe"
import type { Quote } from "@/lib/ai-quote-service"
import type { Client } from "@/lib/types"
import type { Payment } from "@/types/payment"
import { createPayment } from "@/collections/payments"
import { getStripeClient } from "@/lib/stripe-client"

/**
 * Create a Payment Intent for automatic quote payment
 * 
 * This function creates a Stripe Payment Intent with:
 * - off_session: true (allows charging without customer present)
 * - confirm: true (automatically attempts to charge the card)
 * - Connected account scoping for multi-tenant support
 * 
 * @param quote - The quote to create payment for
 * @param client - Client with Stripe customer ID and default payment method
 * @param tenantAccountId - Stripe Connected Account ID for the tenant
 * @returns Payment Intent and created Payment record
 * @throws Error if payment creation fails
 */
export async function createQuotePaymentIntent(
  quote: Quote,
  client: Client & { stripeCustomerId: string; defaultPaymentMethodId: string },
  tenantAccountId: string
): Promise<{ paymentIntent: Stripe.PaymentIntent; payment: Payment }> {
  try {
    const stripe = getStripeClient()

    // Convert EUR to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(quote.total * 100)
    
    // Validate amount
    if (amountInCents < 50) {
      throw new Error("Amount must be at least 0.50 EUR")
    }
    
    // Create PaymentIntent with OFF-SESSION + AUTO-CONFIRM
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: quote.currency.toLowerCase() || "eur",
        customer: client.stripeCustomerId,
        payment_method: client.defaultPaymentMethodId,
        off_session: true, // CRITICAL: Allows charging without customer present
        confirm: true, // AUTO-CHARGE: Immediately attempt to charge
        metadata: {
          quoteId: quote.id,
          clientId: quote.clientId ?? null,
          tenantId: quote.tenantId,
          quoteName: quote.title,
        },
        description: `Payment for quote: ${quote.title}`,
      },
      {
        stripeAccount: tenantAccountId, // Connect to tenant's Stripe account
      }
    )
    
    console.log(`✅ Created PaymentIntent ${paymentIntent.id} for quote ${quote.id}`)
    
    // Create Payment record in Firestore
    const paymentData: Omit<Payment, "id"> = {
      stripePaymentIntentId: paymentIntent.id,
      quoteId: quote.id,
      quoteName: quote.title,
      tenantId: quote.tenantId,
      clientId: quote.clientId,
      clientEmail: client.email,
      clientName: client.name,
      amount: amountInCents,
      currency: quote.currency,
      description: `Payment for ${quote.title}`,
      status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
      paymentMethodType: client.paymentMethodType as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: paymentIntent.status === "succeeded" ? new Date() : undefined,
    }
    
    // Save to Firestore
    const paymentId = await createPayment(paymentData)
    
    console.log(`✅ Created Payment record ${paymentId} in Firestore`)
    
    return {
      paymentIntent,
      payment: { ...paymentData, id: paymentId },
    }
  } catch (error: any) {
    console.error("❌ Error creating quote payment intent:", error)
    
    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      // Card was declined
      throw new Error(`Payment failed: ${error.message}`)
    } else if (error.code === "authentication_required") {
      // Card requires 3D Secure or other authentication
      throw new Error("Payment requires customer authentication")
    } else if (error.code === "insufficient_funds") {
      // Insufficient funds
      throw new Error("Insufficient funds on payment method")
    } else if (error.message?.includes("No such customer")) {
      // Customer not found in Stripe
      throw new Error("Stripe customer not found. Please setup payment method first.")
    } else if (error.message?.includes("No such payment_method")) {
      // Payment method not found
      throw new Error("Payment method not found. Please setup payment method first.")
    }
    
    // Generic error
    throw new Error(`Payment creation failed: ${error.message || "Unknown error"}`)
  }
}

/**
 * Validate that a client has required payment setup
 * 
 * @param client - Client to validate
 * @returns true if client has payment setup, throws error otherwise
 */
export function validateClientPaymentSetup(
  client: Client
): client is Client & { stripeCustomerId: string; defaultPaymentMethodId: string } {
  if (!client.stripeCustomerId) {
    throw new Error("Client must setup payment method first (no Stripe customer)")
  }
  
  if (!client.defaultPaymentMethodId) {
    throw new Error("Client must setup payment method first (no default payment method)")
  }
  
  return true
}

/**
 * Check if a quote is valid for payment
 * 
 * @param quote - Quote to validate
 * @throws Error if quote is not valid for payment
 */
export function validateQuoteForPayment(quote: Quote): void {
  // Check quote status
  if (!["pending", "sent"].includes(quote.status)) {
    throw new Error(`Quote status must be 'pending' or 'sent', got '${quote.status}'`)
  }
  
  // Check if quote is expired
  const validUntil = new Date(quote.validUntil)
  if (validUntil < new Date()) {
    throw new Error("Quote has expired")
  }
  
  // Check minimum amount
  if (quote.total < 0.5) {
    throw new Error("Quote amount must be at least 0.50 EUR")
  }
}
