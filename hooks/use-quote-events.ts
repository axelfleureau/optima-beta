import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import type { QuoteEvent } from '@/types/quote'

interface UseQuoteEventsReturn {
  events: QuoteEvent[]
  loading: boolean
  error: Error | null
}

export function useQuoteEvents(quoteId: string | undefined): UseQuoteEventsReturn {
  const [events, setEvents] = useState<QuoteEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { userData } = useAuth()

  useEffect(() => {
    if (!quoteId || !userData?.tenantId) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const quoteEventsRef = collection(db, 'quoteEvents')
    const q = query(
      quoteEventsRef,
      where('quoteId', '==', quoteId),
      where('tenantId', '==', userData.tenantId),
      orderBy('timestamp', 'desc')
    )

    let unsubscribe: Unsubscribe | undefined

    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const eventsData: QuoteEvent[] = snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              quoteId: data.quoteId,
              tenantId: data.tenantId,
              eventType: data.eventType,
              eventData: data.eventData || {},
              userId: data.userId,
              userName: data.userName,
              timestamp: data.timestamp?.toDate() || new Date(),
            } as QuoteEvent
          })
          
          setEvents(eventsData)
          setLoading(false)
        },
        (err) => {
          console.error('Error fetching quote events:', err)
          setError(err as Error)
          setLoading(false)
        }
      )
    } catch (err) {
      console.error('Error setting up quote events listener:', err)
      setError(err as Error)
      setLoading(false)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [quoteId, userData?.tenantId])

  return { events, loading, error }
}
