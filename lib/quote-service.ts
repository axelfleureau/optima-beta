/**
 * Quote Service
 * 
 * Helper functions for quote operations including sending quotes,
 * generating share links, and managing quote lifecycle
 */

import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { generateShareToken, getBaseUrl } from '@/lib/quote-utils'
import { doc, updateDoc, serverTimestamp as clientServerTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Quote } from '@/types/quote'

/**
 * Send quote to client
 * Generates a share token, updates quote status, and returns public URL
 * 
 * @param quoteId - ID of the quote to send
 * @param tenantId - Tenant ID for security validation
 * @returns Public URL for quote approval
 */
export async function sendQuoteToClient(quoteId: string, tenantId: string): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  // Fetch quote to validate tenant ownership
  const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get()
  
  if (!quoteDoc.exists) {
    throw new Error('Quote not found')
  }

  const quoteData = quoteDoc.data()
  
  // SECURITY: Validate tenant ownership
  if (quoteData?.tenantId !== tenantId) {
    throw new Error('Unauthorized: Quote does not belong to tenant')
  }

  // Generate secure share token
  const shareToken = generateShareToken()

  // Update quote with shareToken and status='sent'
  await adminDb.collection('quotes').doc(quoteId).update({
    shareToken,
    status: 'sent',
    sentAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  // Generate public URL
  const baseUrl = getBaseUrl()
  const publicUrl = `${baseUrl}/quotes/public/${shareToken}`

  console.log(`✅ Quote ${quoteId} sent to client. Public URL: ${publicUrl}`)

  // TODO: Send email to client with publicUrl
  // This would integrate with the email service to send the quote link
  // await sendQuoteEmail(quoteData.clientEmail, {
  //   quoteName: quoteData.title,
  //   publicUrl,
  //   validUntil: quoteData.validUntil,
  // })

  return publicUrl
}

/**
 * Get quote by share token
 * 
 * @param shareToken - Share token to lookup
 * @returns Quote data or null if not found
 */
export async function getQuoteByShareToken(shareToken: string): Promise<any | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  const quotesSnapshot = await adminDb
    .collection('quotes')
    .where('shareToken', '==', shareToken)
    .limit(1)
    .get()

  if (quotesSnapshot.empty) {
    return null
  }

  const quoteDoc = quotesSnapshot.docs[0]
  const quoteData = quoteDoc.data()

  return {
    id: quoteDoc.id,
    ...quoteData,
    // Convert Firestore timestamps to Date objects
    validUntil: quoteData.validUntil?.toDate?.() || quoteData.validUntil,
    createdAt: quoteData.createdAt?.toDate?.() || quoteData.createdAt,
    updatedAt: quoteData.updatedAt?.toDate?.() || quoteData.updatedAt,
    sentAt: quoteData.sentAt?.toDate?.() || quoteData.sentAt,
    approvedAt: quoteData.approvedAt?.toDate?.() || quoteData.approvedAt,
  }
}

/**
 * Update quote status
 * 
 * @param quoteId - ID of quote to update
 * @param tenantId - Tenant ID for security validation
 * @param status - New status
 * @param additionalData - Optional additional fields to update
 */
export async function updateQuoteStatus(
  quoteId: string,
  tenantId: string,
  status: string,
  additionalData?: Record<string, any>
): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  // Fetch quote to validate tenant ownership
  const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get()
  
  if (!quoteDoc.exists) {
    throw new Error('Quote not found')
  }

  const quoteData = quoteDoc.data()
  
  // SECURITY: Validate tenant ownership
  if (quoteData?.tenantId !== tenantId) {
    throw new Error('Unauthorized: Quote does not belong to tenant')
  }

  await adminDb.collection('quotes').doc(quoteId).update({
    status,
    updatedAt: Timestamp.now(),
    ...additionalData,
  })

  console.log(`✅ Quote ${quoteId} status updated to: ${status}`)
}

/**
 * Get quote by ID with tenant validation
 * 
 * @param quoteId - ID of the quote
 * @param tenantId - Tenant ID for security validation
 * @returns Quote data or null if not found
 */
export async function getQuoteById(quoteId: string, tenantId: string): Promise<any | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get()
  
  if (!quoteDoc.exists) {
    return null
  }

  const quoteData = quoteDoc.data()
  
  // SECURITY: Validate tenant ownership
  if (quoteData?.tenantId !== tenantId) {
    throw new Error('Unauthorized: Quote does not belong to tenant')
  }

  return {
    id: quoteDoc.id,
    ...quoteData,
    // Convert Firestore timestamps to Date objects
    validUntil: quoteData.validUntil?.toDate?.() || quoteData.validUntil,
    createdAt: quoteData.createdAt?.toDate?.() || quoteData.createdAt,
    updatedAt: quoteData.updatedAt?.toDate?.() || quoteData.updatedAt,
    sentAt: quoteData.sentAt?.toDate?.() || quoteData.sentAt,
    approvedAt: quoteData.approvedAt?.toDate?.() || quoteData.approvedAt,
    depositPaidAt: quoteData.depositPaidAt?.toDate?.() || quoteData.depositPaidAt,
  }
}

/**
 * Update milestone status in a quote
 * 
 * @param quoteId - ID of the quote
 * @param tenantId - Tenant ID for security validation
 * @param milestoneId - ID of the milestone to update
 * @param status - New milestone status
 * @param additionalData - Optional additional fields to update on the milestone
 */
export async function updateMilestoneStatus(
  quoteId: string,
  tenantId: string,
  milestoneId: string,
  status: 'pending' | 'ready' | 'paid' | 'failed',
  additionalData?: Record<string, any>
): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get()
  
  if (!quoteDoc.exists) {
    throw new Error('Quote not found')
  }

  const quoteData = quoteDoc.data()
  
  // SECURITY: Validate tenant ownership
  if (quoteData?.tenantId !== tenantId) {
    throw new Error('Unauthorized: Tenant mismatch')
  }

  // Update milestone in array
  const updatedMilestones = quoteData.paymentPlan?.milestones?.map((m: any) =>
    m.id === milestoneId
      ? { ...m, status, ...additionalData }
      : m
  )

  if (!updatedMilestones) {
    throw new Error('No milestones found in quote')
  }

  await adminDb.collection('quotes').doc(quoteId).update({
    'paymentPlan.milestones': updatedMilestones,
    updatedAt: Timestamp.now(),
  })

  console.log(`✅ Milestone ${milestoneId} status updated to: ${status}`)
}

/**
 * Mark milestone as ready for payment (Admin action)
 * 
 * @param quoteId - ID of the quote
 * @param tenantId - Tenant ID for security validation
 * @param milestoneId - ID of the milestone to mark as ready
 */
export async function markMilestoneReady(
  quoteId: string,
  tenantId: string,
  milestoneId: string
): Promise<void> {
  await updateMilestoneStatus(quoteId, tenantId, milestoneId, 'ready')
}

/**
 * Regenerate share token for a quote
 * Useful if the previous token was compromised or expired
 * 
 * @param quoteId - ID of the quote
 * @param tenantId - Tenant ID for security validation
 * @returns New public URL
 */
export async function regenerateShareToken(quoteId: string, tenantId: string): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  // Fetch quote to validate tenant ownership
  const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get()
  
  if (!quoteDoc.exists) {
    throw new Error('Quote not found')
  }

  const quoteData = quoteDoc.data()
  
  // SECURITY: Validate tenant ownership
  if (quoteData?.tenantId !== tenantId) {
    throw new Error('Unauthorized: Quote does not belong to tenant')
  }

  // Generate new share token
  const shareToken = generateShareToken()

  // Update quote with new shareToken
  await adminDb.collection('quotes').doc(quoteId).update({
    shareToken,
    updatedAt: Timestamp.now(),
  })

  // Generate new public URL
  const baseUrl = getBaseUrl()
  const publicUrl = `${baseUrl}/quotes/public/${shareToken}`

  console.log(`✅ Quote ${quoteId} share token regenerated. New URL: ${publicUrl}`)

  return publicUrl
}

/**
 * Update quote subscription plan data
 * 
 * @param quoteId - ID of the quote
 * @param tenantId - Tenant ID for security validation
 * @param subscriptionData - Partial subscription plan data to update
 */
export async function updateQuoteSubscription(
  quoteId: string,
  tenantId: string,
  subscriptionData: {
    monthlyAmount?: number
    stripeSubscriptionId?: string
    stripePriceId?: string
    status?: 'active' | 'paused' | 'cancelled' | 'pending'
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelAt?: Date
    canceledAt?: Date
  }
): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized')
  }

  // Fetch quote to validate tenant ownership
  const quoteDoc = await adminDb.collection('quotes').doc(quoteId).get()
  
  if (!quoteDoc.exists) {
    throw new Error('Quote not found')
  }

  const quoteData = quoteDoc.data()
  
  // SECURITY: Validate tenant ownership
  if (quoteData?.tenantId !== tenantId) {
    throw new Error('Unauthorized: Quote does not belong to tenant')
  }

  // Convert Date objects to Firestore Timestamps
  const subscriptionDataWithTimestamps = {
    ...subscriptionData,
    currentPeriodStart: subscriptionData.currentPeriodStart 
      ? Timestamp.fromDate(subscriptionData.currentPeriodStart)
      : undefined,
    currentPeriodEnd: subscriptionData.currentPeriodEnd
      ? Timestamp.fromDate(subscriptionData.currentPeriodEnd)
      : undefined,
    cancelAt: subscriptionData.cancelAt
      ? Timestamp.fromDate(subscriptionData.cancelAt)
      : undefined,
    canceledAt: subscriptionData.canceledAt
      ? Timestamp.fromDate(subscriptionData.canceledAt)
      : undefined,
  }

  // FIX: Remove undefined fields (Firestore rejects them)
  const cleanedData: any = {}
  
  Object.entries(subscriptionDataWithTimestamps).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedData[key] = value
    }
  })

  // FIX: MERGE with existing subscriptionPlan instead of replacing
  const existingPlan = quoteData?.subscriptionPlan || {}
  
  // Merge: existing data + new data (new data overwrites conflicting keys)
  const mergedData = {
    ...existingPlan,
    ...cleanedData,
  }

  // Update quote with merged subscription plan data
  await adminDb.collection('quotes').doc(quoteId).update({
    subscriptionPlan: mergedData,
    updatedAt: Timestamp.now(),
  })

  console.log(`✅ Quote ${quoteId} subscription plan updated`)
}

/**
 * Update quote (Client-side)
 * 
 * @param quoteId - ID of the quote to update
 * @param data - Partial quote data to update
 * @param tenantId - Tenant ID for security validation (not used client-side, validation happens server-side)
 */
export async function updateQuote(
  quoteId: string,
  data: Partial<Quote>,
  tenantId: string
): Promise<void> {
  const quoteRef = doc(db, "quotes", quoteId)
  await updateDoc(quoteRef, {
    ...data,
    updatedAt: clientServerTimestamp(),
  })
  
  console.log(`✅ Quote ${quoteId} updated successfully`)
}
