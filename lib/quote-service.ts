/**
 * Quote Service (Client-Safe)
 * 
 * Client-safe functions for quote operations using Firebase client SDK
 * For server-only operations, use @/lib/quote-service-server
 */

import { doc, updateDoc, serverTimestamp as clientServerTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Quote } from '@/types/quote'

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
