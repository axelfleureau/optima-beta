"use client"

import { useState, useEffect } from "react"
import { Quote } from "@/types/quote"
import { useAuth } from "@/hooks/use-auth"

export function useQuoteDetail(quoteId: string) {
  const { userData } = useAuth()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!quoteId) {
      setLoading(false)
      setError("Quote ID mancante")
      return
    }
    
    if (!userData?.tenantId) {
      return
    }
    
    const fetchQuote = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/quotes/${quoteId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Errore nel caricamento del preventivo")
        }
        
        const data = await response.json()
        setQuote(data)
      } catch (err) {
        console.error("Error fetching quote:", err)
        setError(err instanceof Error ? err.message : "Errore sconosciuto")
      } finally {
        setLoading(false)
      }
    }
    
    fetchQuote()
  }, [quoteId, userData?.tenantId])
  
  return { quote, loading, error }
}
