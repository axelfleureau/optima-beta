"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Quote } from "@/types/quote"

// Helper function to safely convert Firestore timestamp to Date
const safeToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp === "string" || typeof timestamp === "number") {
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? new Date() : date
  }
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

const stripUndefinedDeep = (value: unknown): unknown => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Date) return value
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined)
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, item]) => {
      const cleaned = stripUndefinedDeep(item)
      if (cleaned !== undefined) {
        acc[key] = cleaned
      }
      return acc
    }, {} as Record<string, unknown>)
  }
  return value
}

const readApiResponse = async (response: Response) => {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export function useQuotes() {
  const { user, userData } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async () => {
    const token = await user?.getIdToken?.()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }, [user])

  const loadQuotes = useCallback(async () => {
    if (!userData?.tenantId) {
      setQuotes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/quotes", {
        credentials: "include",
        headers: await getAuthHeaders(),
      })
      const result = await readApiResponse(response)
      if (!response.ok) {
        throw new Error(result.error || result.details || "Errore nel caricamento dei preventivi")
      }

      const quotesData = ((result.quotes || []) as Quote[]).map((quote) => ({
        ...quote,
        validUntil: safeToDate(quote.validUntil),
        createdAt: safeToDate(quote.createdAt),
        updatedAt: safeToDate(quote.updatedAt),
      }))
      quotesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setQuotes(quotesData)
    } catch (err) {
      console.error("Error loading quotes:", err)
      setError(err instanceof Error ? err.message : "Errore nel caricamento dei preventivi")
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, userData?.tenantId])

  useEffect(() => {
    void loadQuotes()
  }, [loadQuotes])

  const createQuote = useCallback(async (quoteData: Omit<Quote, "id" | "createdAt" | "updatedAt">) => {
    try {
      // SECURITY: Use secure API endpoint instead of direct Firestore writes
      const validUntil = quoteData.validUntil instanceof Date
        ? quoteData.validUntil
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

      const payload = stripUndefinedDeep({
        title: quoteData.title,
        description: quoteData.description,
        clientId: quoteData.clientId,
        clientName: quoteData.clientName,
        clientEmail: quoteData.clientEmail,
        externalClientName: quoteData.externalClientName,
        externalClientEmail: quoteData.externalClientEmail,
        status: quoteData.status,
        currency: quoteData.currency,
        items: quoteData.items,
        total: quoteData.total,
        subtotale: quoteData.subtotale,
        iva: quoteData.iva,
        percentualeIva: quoteData.percentualeIva,
        brandMateriali: quoteData.brandMateriali,
        obiettivi: quoteData.obiettivi,
        attivita: quoteData.attivita,
        voci: quoteData.voci,
        terminiCondizioni: quoteData.terminiCondizioni,
        validUntil: validUntil.toISOString()
        // SECURITY: Do NOT send tenantId or createdBy - server will derive from auth
      })

      const response = await fetch('/api/quotes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        credentials: 'include', // CRITICAL: Send firebase-auth-token cookie
        body: JSON.stringify(payload)
      })

      const result = await readApiResponse(response)

      if (!response.ok) {
        const details = Array.isArray(result.details)
          ? result.details.map((item: any) => item.message || item).join(", ")
          : result.details
        throw new Error(details || result.error || result.message || 'Errore nella creazione del preventivo')
      }

      await loadQuotes()
      return result.id
    } catch (err) {
      console.error("Error creating quote:", err)
      throw new Error(err instanceof Error ? err.message : "Errore nella creazione del preventivo")
    }
  }, [getAuthHeaders, loadQuotes])

  const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
    throw new Error("Modifica preventivo non ancora collegata al backend D1")
  }, [])

  const deleteQuote = useCallback(async (id: string) => {
    const response = await fetch(`/api/quotes/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: await getAuthHeaders(),
    })
    const result = await readApiResponse(response)
    if (!response.ok) {
      throw new Error(result.error || result.details || "Errore nell'eliminazione del preventivo")
    }
    await loadQuotes()
  }, [getAuthHeaders, loadQuotes])

  const getQuotesByStatus = useCallback((status: Quote["status"]) => {
    return quotes.filter((quote) => quote.status === status)
  }, [quotes])

  const getQuoteStats = useCallback(() => {
    const now = new Date()
    return {
      total: quotes.length,
      draft: getQuotesByStatus("draft").length,
      sent: getQuotesByStatus("sent").length,
      inReview: getQuotesByStatus("in_review").length,
      approved: getQuotesByStatus("approved").length,
      rejected: getQuotesByStatus("rejected").length,
      expired: quotes.filter((q) => q.validUntil < now && q.status !== "approved").length,
      totalValue: quotes.filter((q) => q.status === "approved").reduce((sum, q) => sum + q.total, 0),
    }
  }, [quotes, getQuotesByStatus])

  return {
    quotes,
    loading,
    error,
    createQuote,
    updateQuote,
    deleteQuote,
    getQuotesByStatus,
    getQuoteStats,
  }
}
