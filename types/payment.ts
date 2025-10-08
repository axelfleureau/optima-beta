import type { Timestamp } from "firebase/firestore"

/**
 * Payment Types for Stripe Integration
 * 
 * These types define the payment data structure for quote payments
 * following security best practices and tenant isolation
 */

// Payment Status Enum
export type PaymentStatus = 
  | "pending"           // Payment intent created, waiting for payment
  | "processing"        // Payment being processed by Stripe
  | "succeeded"         // Payment completed successfully
  | "failed"            // Payment failed
  | "canceled"          // Payment canceled
  | "requires_action"   // Payment requires additional action (3D Secure, etc.)

// Payment Method Types supported by Stripe
export type PaymentMethodType = 
  | "card"
  | "sepa_debit"
  | "ideal"
  | "bancontact"
  | "giropay"
  | "sofort"
  | "p24"
  | "eps"
  | "paypal"

// Stripe Checkout Session Mode
export type CheckoutSessionMode = "payment" | "subscription" | "setup"

// Main Payment Record stored in Firestore
export interface Payment {
  id: string                          // Firestore document ID
  
  // Stripe Integration
  stripePaymentIntentId: string       // Stripe Payment Intent ID
  stripeCheckoutSessionId?: string    // Stripe Checkout Session ID (if using checkout)
  stripeCustomerId?: string           // Stripe Customer ID for the client
  
  // Quote Association
  quoteId: string                     // Associated quote ID
  quoteName: string                   // Quote title for reference
  
  // Tenant & User Context (SECURITY: Critical for data isolation)
  tenantId: string                    // Agency/tenant that owns this payment
  clientId?: string                   // Client making the payment
  clientEmail: string                 // Client email for notifications
  clientName: string                  // Client name for display
  
  // Payment Details
  amount: number                      // Amount in smallest currency unit (cents)
  currency: string                    // ISO currency code (EUR, USD, etc.)
  description: string                 // Payment description
  
  // Payment Status & Metadata
  status: PaymentStatus               // Current payment status
  paymentMethodType?: PaymentMethodType // Method used for payment
  
  // Timestamps
  createdAt: Date | Timestamp         // When payment was created
  updatedAt: Date | Timestamp         // Last update timestamp
  paidAt?: Date | Timestamp           // When payment was completed
  expiresAt?: Date | Timestamp        // When payment intent expires
  
  // Stripe Metadata
  stripeMetadata?: Record<string, string> // Additional Stripe metadata
  
  // Error Handling
  lastError?: string                  // Last error message if failed
  retryCount?: number                 // Number of retry attempts
  
  // Additional Context
  notes?: string                      // Internal notes
  refundedAmount?: number             // Amount refunded (if any)
  refundedAt?: Date | Timestamp       // When refund was processed
}

// Payment Intent Creation Request (from frontend)
export interface CreatePaymentIntentRequest {
  quoteId: string                     // Quote to pay for
  returnUrl?: string                  // URL to redirect after payment
  successUrl?: string                 // Success page URL
  cancelUrl?: string                  // Cancel page URL
  
  // Optional client info (for guest payments)
  clientEmail?: string
  clientName?: string
  
  // Payment configuration
  paymentMethodTypes?: PaymentMethodType[]
  automaticPaymentMethods?: boolean
}

// Payment Intent Creation Response (to frontend)
export interface CreatePaymentIntentResponse {
  success: boolean
  
  // Stripe checkout session data
  checkoutSessionId?: string
  checkoutUrl?: string               // Redirect URL for Stripe Checkout
  
  // Payment intent data (for custom forms)
  paymentIntentId?: string
  clientSecret?: string              // For custom payment forms
  
  // Error information
  error?: string
  details?: string
}

// Stripe Webhook Event Data
export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any                      // Stripe object (PaymentIntent, CheckoutSession, etc.)
  }
  livemode: boolean
  created: number
  pending_webhooks: number
}

// Webhook Processing Result
export interface WebhookProcessingResult {
  success: boolean
  paymentId?: string
  message?: string
  error?: string
  shouldRetry?: boolean
}

// Payment Summary for Dashboard/Reports
export interface PaymentSummary {
  totalAmount: number
  totalCount: number
  successfulAmount: number
  successfulCount: number
  pendingAmount: number
  pendingCount: number
  failedCount: number
  currency: string
  period: string                     // e.g., "2024-01", "2024-Q1"
}

// Payment Query Filters
export interface PaymentFilters {
  tenantId?: string                  // Filter by tenant
  clientId?: string                  // Filter by client
  quoteId?: string                   // Filter by specific quote
  status?: PaymentStatus             // Filter by status
  dateFrom?: Date                    // Date range start
  dateTo?: Date                      // Date range end
  amountMin?: number                 // Minimum amount filter
  amountMax?: number                 // Maximum amount filter
  paymentMethodType?: PaymentMethodType
}

// Secure Payment Context (never send sensitive data to frontend)
export interface SecurePaymentContext {
  payment: Payment
  quote: {
    id: string
    title: string
    total: number
    currency: string
    clientName: string
    tenantId: string
    status: string
    validUntil: Date
  }
  tenant: {
    id: string
    name: string
    stripeAccountId?: string         // For Stripe Connect (future)
  }
}

// Payment Update Request (internal use)
export interface PaymentUpdateRequest {
  paymentId: string
  status?: PaymentStatus
  stripePaymentIntentId?: string
  stripeMetadata?: Record<string, string>
  lastError?: string
  retryCount?: number
  notes?: string
}

// Error types for payment operations
export interface PaymentError {
  code: string
  message: string
  type: "validation" | "stripe" | "database" | "authorization" | "network"
  details?: any
  retryable?: boolean
}

// Payment service response wrapper
export interface PaymentServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: PaymentError
}

// Export utility types
export type PaymentStatusTransition = {
  from: PaymentStatus
  to: PaymentStatus
  allowedBy: string[]                // User roles that can perform this transition
  webhook?: boolean                  // Can be triggered by webhook
}

// Constants for validation
export const PAYMENT_CONSTANTS = {
  MIN_AMOUNT: 50,                    // Minimum amount in cents (0.50 EUR)
  MAX_AMOUNT: 100000000,             // Maximum amount in cents (1M EUR)
  CURRENCY_DEFAULT: "EUR",
  PAYMENT_INTENT_EXPIRY_HOURS: 24,
  MAX_RETRY_ATTEMPTS: 3,
  SUPPORTED_CURRENCIES: ["EUR", "USD", "GBP"] as const,
  WEBHOOK_RETRY_DELAY_MS: 5000,
} as const

export type SupportedCurrency = typeof PAYMENT_CONSTANTS.SUPPORTED_CURRENCIES[number]

// Payment Plan Types for Deposit + Milestone Payments

export interface PaymentPlan {
  type: 'full' | 'deposit_milestone' | 'subscription'
  depositPercentage?: number // es: 50 per 50%
  milestones?: Milestone[]
}

export interface Milestone {
  id: string
  name: string // es: "Completamento Design", "Lancio Sito"
  percentage: number // es: 25 per 25% del totale
  amount: number // calcolato da totale quote
  dueDate?: Date | Timestamp
  status: 'pending' | 'ready' | 'paid' | 'failed'
  paymentIntentId?: string
  paidAt?: Date | Timestamp
}

export interface QuoteWithPaymentPlan {
  // Existing Quote fields
  id: string
  title: string
  description?: string
  clientId: string
  clientName: string
  status: "draft" | "sent" | "pending" | "accepted" | "rejected" | "expired" | "paid"
  currency: string
  total: number
  validUntil: Date
  createdAt: Date
  updatedAt: Date
  tenantId: string
  createdBy: string
  
  // Payment plan extension
  paymentPlan: PaymentPlan
  payments: Payment[] // track all payments (deposit + milestones)
}