"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  title: string
  description?: string
  clientId: string
  clientName: string
  status: "draft" | "sent" | "pending" | "accepted" | "rejected" | "expired" | "paid"
  currency: string
  items: QuoteItem[]
  total: number
  validUntil: Date
  createdAt: Date
  updatedAt: Date
  tenantId: string
  createdBy: string
}

// Helper function to safely convert Firestore timestamp to Date
const safeToDate = (timestamp: any): Date => {
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

export function useQuotes() {
  const { user, userData } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userData?.tenantId) {
      setLoading(false)
      return
    }

    fetchQuotes()
  }, [userData?.tenantId])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching quotes for tenant:", userData?.tenantId)

      const q = query(collection(db, "quotes"), where("tenantId", "==", userData?.tenantId))
      const snapshot = await getDocs(q)

      const quotesData = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          clientId: data.clientId || "",
          clientName: data.clientName || "",
          status: data.status || "draft",
          currency: data.currency || "EUR",
          items: data.items || [],
          total: data.total || 0,
          validUntil: safeToDate(data.validUntil),
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          tenantId: data.tenantId || "",
          createdBy: data.createdBy || "",
        } as Quote
      })

      // Sort by creation date (newest first)
      quotesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      console.log("Fetched quotes:", quotesData.length)
      setQuotes(quotesData)
    } catch (err) {
      console.error("Error fetching quotes:", err)
      setError("Errore nel caricamento dei preventivi")
    } finally {
      setLoading(false)
    }
  }

  const createQuote = async (quoteData: Omit<Quote, "id" | "createdAt" | "updatedAt">) => {
    try {
      // SECURITY: Use secure API endpoint instead of direct Firestore writes
      const response = await fetch('/api/quotes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Send firebase-auth-token cookie
        body: JSON.stringify({
          title: quoteData.title,
          description: quoteData.description,
          clientId: quoteData.clientId,
          clientName: quoteData.clientName,
          status: quoteData.status,
          currency: quoteData.currency,
          items: quoteData.items,
          total: quoteData.total,
          validUntil: quoteData.validUntil.toISOString()
          // SECURITY: Do NOT send tenantId or createdBy - server will derive from auth
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Errore nella creazione del preventivo')
      }

      const result = await response.json()
      await fetchQuotes() // Refresh the list
      return result.id
    } catch (err) {
      console.error("Error creating quote:", err)
      throw new Error(err instanceof Error ? err.message : "Errore nella creazione del preventivo")
    }
  }

  const updateQuote = async (id: string, updates: Partial<Quote>) => {
    try {
      const quoteRef = doc(db, "quotes", id)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        validUntil: updates.validUntil ? Timestamp.fromDate(updates.validUntil) : undefined,
      }

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      await updateDoc(quoteRef, updateData)
      await fetchQuotes() // Refresh the list
    } catch (err) {
      console.error("Error updating quote:", err)
      throw new Error("Errore nell'aggiornamento del preventivo")
    }
  }

  const deleteQuote = async (id: string) => {
    try {
      await deleteDoc(doc(db, "quotes", id))
      await fetchQuotes() // Refresh the list
    } catch (err) {
      console.error("Error deleting quote:", err)
      throw new Error("Errore nell'eliminazione del preventivo")
    }
  }

  const getQuotesByStatus = (status: Quote["status"]) => {
    return quotes.filter((quote) => quote.status === status)
  }

  const getQuoteStats = () => {
    const now = new Date()
    return {
      total: quotes.length,
      draft: getQuotesByStatus("draft").length,
      sent: getQuotesByStatus("sent").length,
      pending: getQuotesByStatus("pending").length,
      accepted: getQuotesByStatus("accepted").length,
      rejected: getQuotesByStatus("rejected").length,
      expired: quotes.filter((q) => q.validUntil < now && q.status !== "accepted").length,
      totalValue: quotes.filter((q) => q.status === "accepted").reduce((sum, q) => sum + q.total, 0),
    }
  }

  return {
    quotes,
    loading,
    error,
    createQuote,
    updateQuote,
    deleteQuote,
    getQuotesByStatus,
    getQuoteStats,
    refetch: fetchQuotes,
  }
}
