import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { QuoteEvent } from '@/types/quote'

export async function createQuoteEvent(
  event: Omit<QuoteEvent, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const quoteEventsRef = collection(db, 'quoteEvents')
    
    const docRef = await addDoc(quoteEventsRef, {
      ...event,
      timestamp: serverTimestamp(),
    })
    
    console.log(`✅ Quote event created: ${event.eventType} for quote ${event.quoteId}`)
    return docRef.id
  } catch (error) {
    console.error('❌ Error creating quote event:', error)
    throw error
  }
}
