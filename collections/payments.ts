/**
 * Firestore Payments Collection Schema
 * 
 * This file defines the schema and collection rules for payments
 * in Firestore following security best practices and tenant isolation
 */

import { doc, collection, addDoc, updateDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Payment, PaymentFilters, PaymentSummary } from "@/types/payment"

/**
 * FIRESTORE COLLECTION STRUCTURE:
 * 
 * /payments/{paymentId}
 * ├── id: string (document ID)
 * ├── stripePaymentIntentId: string (indexed)
 * ├── stripeCheckoutSessionId?: string (indexed)
 * ├── stripeCustomerId?: string (indexed)
 * ├── quoteId: string (indexed)
 * ├── quoteName: string
 * ├── tenantId: string (indexed - CRITICAL for security)
 * ├── clientId?: string (indexed)
 * ├── clientEmail: string (indexed)
 * ├── clientName: string
 * ├── amount: number
 * ├── currency: string
 * ├── description: string
 * ├── status: string (indexed)
 * ├── paymentMethodType?: string
 * ├── createdAt: Timestamp (indexed)
 * ├── updatedAt: Timestamp
 * ├── paidAt?: Timestamp (indexed)
 * ├── expiresAt?: Timestamp (indexed)
 * ├── stripeMetadata?: object
 * ├── lastError?: string
 * ├── retryCount?: number
 * ├── notes?: string
 * ├── refundedAmount?: number
 * └── refundedAt?: Timestamp
 * 
 * REQUIRED FIRESTORE INDEXES:
 * - tenantId (single field, ascending)
 * - tenantId + status (composite)
 * - tenantId + createdAt (composite)
 * - tenantId + quoteId (composite)
 * - tenantId + clientId (composite)
 * - stripePaymentIntentId (single field, ascending)
 * - status (single field, ascending)
 * - createdAt (single field, descending)
 * - paidAt (single field, descending)
 * - expiresAt (single field, ascending)
 * 
 * SECURITY RULES (to be implemented in firestore.rules):
 * ```
 * // Payments collection rules
 * match /payments/{paymentId} {
 *   // Only authenticated users can access payments
 *   allow read, write: if request.auth != null;
 *   
 *   // Users can only access payments within their tenant
 *   allow read: if resource.data.tenantId == getUserTenantId(request.auth.uid);
 *   
 *   // Only admins can create/update payments
 *   allow create, update: if getUserRole(request.auth.uid) in ['admin', 'super_admin'];
 *   
 *   // Prevent modification of critical fields
 *   allow update: if !('tenantId' in request.resource.data.diff(resource.data).affectedKeys()) &&
 *                    !('stripePaymentIntentId' in request.resource.data.diff(resource.data).affectedKeys());
 * }
 * ```
 */

export const PAYMENTS_COLLECTION = "payments"

/**
 * Helper function to safely convert Firestore timestamp to Date
 */
export const safeToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    try {
      return timestamp.toDate()
    } catch (e) {
      console.warn("Error converting timestamp:", e)
      return new Date()
    }
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000)
  }
  return new Date()
}

/**
 * Convert Payment document data to Payment interface
 */
export const documentToPayment = (doc: any): Payment => {
  const data = doc.data()
  return {
    id: doc.id,
    stripePaymentIntentId: data.stripePaymentIntentId || "",
    stripeCheckoutSessionId: data.stripeCheckoutSessionId,
    stripeCustomerId: data.stripeCustomerId,
    quoteId: data.quoteId || "",
    quoteName: data.quoteName || "",
    tenantId: data.tenantId || "",
    clientId: data.clientId,
    clientEmail: data.clientEmail || "",
    clientName: data.clientName || "",
    amount: data.amount || 0,
    currency: data.currency || "EUR",
    description: data.description || "",
    status: data.status || "pending",
    paymentMethodType: data.paymentMethodType,
    createdAt: safeToDate(data.createdAt),
    updatedAt: safeToDate(data.updatedAt),
    paidAt: data.paidAt ? safeToDate(data.paidAt) : undefined,
    expiresAt: data.expiresAt ? safeToDate(data.expiresAt) : undefined,
    stripeMetadata: data.stripeMetadata,
    lastError: data.lastError,
    retryCount: data.retryCount || 0,
    notes: data.notes,
    refundedAmount: data.refundedAmount,
    refundedAt: data.refundedAt ? safeToDate(data.refundedAt) : undefined,
  }
}

/**
 * Convert Payment interface to Firestore document data
 */
export const paymentToDocument = (payment: Omit<Payment, "id">): any => {
  return {
    stripePaymentIntentId: payment.stripePaymentIntentId,
    stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
    stripeCustomerId: payment.stripeCustomerId,
    quoteId: payment.quoteId,
    quoteName: payment.quoteName,
    tenantId: payment.tenantId,
    clientId: payment.clientId,
    clientEmail: payment.clientEmail,
    clientName: payment.clientName,
    amount: payment.amount,
    currency: payment.currency,
    description: payment.description,
    status: payment.status,
    paymentMethodType: payment.paymentMethodType,
    createdAt: payment.createdAt instanceof Date ? Timestamp.fromDate(payment.createdAt) : payment.createdAt,
    updatedAt: serverTimestamp(),
    paidAt: payment.paidAt ? (payment.paidAt instanceof Date ? Timestamp.fromDate(payment.paidAt) : payment.paidAt) : null,
    expiresAt: payment.expiresAt ? (payment.expiresAt instanceof Date ? Timestamp.fromDate(payment.expiresAt) : payment.expiresAt) : null,
    stripeMetadata: payment.stripeMetadata || {},
    lastError: payment.lastError,
    retryCount: payment.retryCount || 0,
    notes: payment.notes,
    refundedAmount: payment.refundedAmount,
    refundedAt: payment.refundedAt ? (payment.refundedAt instanceof Date ? Timestamp.fromDate(payment.refundedAt) : payment.refundedAt) : null,
  }
}

/**
 * Create a new payment record in Firestore
 * SECURITY: Always validates tenantId
 */
export const createPayment = async (payment: Omit<Payment, "id">): Promise<string> => {
  // Validate required fields
  if (!payment.tenantId) {
    throw new Error("tenantId is required for payment creation")
  }
  if (!payment.stripePaymentIntentId) {
    throw new Error("stripePaymentIntentId is required for payment creation")
  }
  if (!payment.quoteId) {
    throw new Error("quoteId is required for payment creation")
  }

  const docData = paymentToDocument(payment)
  const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), docData)
  return docRef.id
}

/**
 * Update an existing payment record
 * SECURITY: Prevents modification of critical fields
 */
export const updatePayment = async (paymentId: string, updates: Partial<Payment>): Promise<void> => {
  // Prevent modification of critical security fields
  const secureUpdates = { ...updates }
  delete secureUpdates.id
  delete secureUpdates.tenantId // Cannot change tenant
  delete secureUpdates.stripePaymentIntentId // Cannot change payment intent

  const updateData = {
    ...secureUpdates,
    updatedAt: serverTimestamp(),
  }

  // Convert Date objects to Timestamps
  if (updateData.paidAt instanceof Date) {
    updateData.paidAt = Timestamp.fromDate(updateData.paidAt)
  }
  if (updateData.expiresAt instanceof Date) {
    updateData.expiresAt = Timestamp.fromDate(updateData.expiresAt)
  }
  if (updateData.refundedAt instanceof Date) {
    updateData.refundedAt = Timestamp.fromDate(updateData.refundedAt)
  }

  await updateDoc(doc(db, PAYMENTS_COLLECTION, paymentId), updateData)
}

/**
 * Query payments with tenant isolation
 * SECURITY: Always filters by tenantId
 */
export const queryPayments = async (tenantId: string, filters?: PaymentFilters): Promise<Payment[]> => {
  if (!tenantId) {
    throw new Error("tenantId is required for payment queries")
  }

  let q = query(
    collection(db, PAYMENTS_COLLECTION),
    where("tenantId", "==", tenantId)
  )

  // Apply additional filters
  if (filters?.status) {
    q = query(q, where("status", "==", filters.status))
  }
  if (filters?.clientId) {
    q = query(q, where("clientId", "==", filters.clientId))
  }
  if (filters?.quoteId) {
    q = query(q, where("quoteId", "==", filters.quoteId))
  }
  if (filters?.paymentMethodType) {
    q = query(q, where("paymentMethodType", "==", filters.paymentMethodType))
  }

  // Date range filters (requires composite indexes)
  if (filters?.dateFrom) {
    q = query(q, where("createdAt", ">=", Timestamp.fromDate(filters.dateFrom)))
  }
  if (filters?.dateTo) {
    q = query(q, where("createdAt", "<=", Timestamp.fromDate(filters.dateTo)))
  }

  // Order and limit
  q = query(q, orderBy("createdAt", "desc"), limit(100))

  const snapshot = await getDocs(q)
  return snapshot.docs.map(documentToPayment)
}

/**
 * Find payment by Stripe Payment Intent ID
 * SECURITY: Includes tenant validation
 */
export const findPaymentByStripeId = async (stripePaymentIntentId: string, tenantId?: string): Promise<Payment | null> => {
  let q = query(
    collection(db, PAYMENTS_COLLECTION),
    where("stripePaymentIntentId", "==", stripePaymentIntentId)
  )

  // Add tenant filter if provided (recommended for security)
  if (tenantId) {
    q = query(q, where("tenantId", "==", tenantId))
  }

  const snapshot = await getDocs(q)
  if (snapshot.empty) {
    return null
  }

  return documentToPayment(snapshot.docs[0])
}

/**
 * Get payment summary/statistics for a tenant
 */
export const getPaymentSummary = async (tenantId: string, period?: string): Promise<PaymentSummary> => {
  const payments = await queryPayments(tenantId)
  
  let totalAmount = 0
  let totalCount = payments.length
  let successfulAmount = 0
  let successfulCount = 0
  let pendingAmount = 0
  let pendingCount = 0
  let failedCount = 0
  let currency = "EUR"

  payments.forEach(payment => {
    totalAmount += payment.amount
    currency = payment.currency // Use last currency found

    if (payment.status === "succeeded") {
      successfulAmount += payment.amount
      successfulCount++
    } else if (payment.status === "pending" || payment.status === "processing") {
      pendingAmount += payment.amount
      pendingCount++
    } else if (payment.status === "failed") {
      failedCount++
    }
  })

  return {
    totalAmount,
    totalCount,
    successfulAmount,
    successfulCount,
    pendingAmount,
    pendingCount,
    failedCount,
    currency,
    period: period || "all-time",
  }
}

/**
 * Required Firestore indexes for this collection
 * Add these to firestore.indexes.json:
 */
export const REQUIRED_INDEXES = [
  {
    "collectionGroup": "payments",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "tenantId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "payments", 
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "tenantId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "payments",
    "queryScope": "COLLECTION", 
    "fields": [
      { "fieldPath": "tenantId", "order": "ASCENDING" },
      { "fieldPath": "quoteId", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "payments",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "tenantId", "order": "ASCENDING" },
      { "fieldPath": "clientId", "order": "ASCENDING" }
    ]
  }
]