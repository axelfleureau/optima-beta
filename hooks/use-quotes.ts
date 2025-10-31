"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Quote, QuoteItem } from "@/types/quote"

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

  const quotesQuery = useMemo(() => {
    if (!userData?.tenantId) return null
    return query(
      collection(db, "quotes"), 
      where("tenantId", "==", userData.tenantId)
    )
  }, [userData?.tenantId])

  useEffect(() => {
    if (!quotesQuery) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    console.log("Setting up real-time listener for tenant:", userData?.tenantId)

    // Setup onSnapshot listener
    const unsubscribe = onSnapshot(
      quotesQuery,
      (snapshot) => {
        console.log("Real-time update: quotes changed")
        
        const quotesData = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || "",
            description: data.description,
            
            // DUAL CLIENT MODE fields
            clientMode: data.clientMode,
            clientId: data.clientId,
            clientName: data.clientName || "",
            externalClientName: data.externalClientName,
            externalClientEmail: data.externalClientEmail,
            
            status: data.status || "draft",
            currency: data.currency || "EUR",
            items: data.items || [],
            total: data.total || 0,
            
            // Financial breakdown
            subtotale: data.subtotale,
            iva: data.iva,
            percentualeIva: data.percentualeIva,
            
            validUntil: safeToDate(data.validUntil),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            tenantId: data.tenantId || "",
            createdBy: data.createdBy || "",
            
            // Public sharing and approval fields
            shareToken: data.shareToken,
            sentAt: data.sentAt ? safeToDate(data.sentAt) : undefined,
            approvedAt: data.approvedAt ? safeToDate(data.approvedAt) : undefined,
            approvedBy: data.approvedBy,
            clientEmail: data.clientEmail,
            
            // Pending payment approval fields
            pendingApprovalAt: data.pendingApprovalAt ? safeToDate(data.pendingApprovalAt) : undefined,
            pendingApprovalBy: data.pendingApprovalBy,
            
            // Payment plan
            paymentPlan: data.paymentPlan,
            
            // Editor fields
            obiettivi: data.obiettivi,
            attivita: data.attivita,
            voci: data.voci,
            terminiCondizioni: data.terminiCondizioni,
          } as Quote
        })

        // Sort by creation date (newest first)
        quotesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        console.log("Real-time quotes updated:", quotesData.length)
        setQuotes(quotesData)
        setLoading(false)
      },
      (err) => {
        console.error("Real-time listener error:", err)
        setError("Errore nel caricamento real-time dei preventivi")
        setLoading(false)
      }
    )

    // Cleanup: unsubscribe on unmount or tenantId change
    return () => {
      console.log("Unsubscribing from quotes listener")
      unsubscribe()
    }
  }, [quotesQuery, userData?.tenantId])

  const createQuote = useCallback(async (quoteData: Omit<Quote, "id" | "createdAt" | "updatedAt">) => {
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
      return result.id
    } catch (err) {
      console.error("Error creating quote:", err)
      throw new Error(err instanceof Error ? err.message : "Errore nella creazione del preventivo")
    }
  }, [])

  const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
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
    } catch (err) {
      console.error("Error updating quote:", err)
      throw new Error("Errore nell'aggiornamento del preventivo")
    }
  }, [])

  const deleteQuote = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "quotes", id))
    } catch (err) {
      console.error("Error deleting quote:", err)
      throw new Error("Errore nell'eliminazione del preventivo")
    }
  }, [])

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
