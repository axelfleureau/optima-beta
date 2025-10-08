/**
 * Quote Service
 * 
 * Helper functions for quote operations including sending quotes,
 * generating share links, and managing quote lifecycle
 */

import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { generateShareToken, getBaseUrl } from '@/lib/quote-utils'

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
