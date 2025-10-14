"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

export interface Campaign {
  id: string
  title: string
  description?: string
  clientId?: string
  clientName?: string
  status: "draft" | "active" | "paused" | "completed" | "cancelled" | "running"
  budget: number
  startDate: Date
  endDate: Date
  platforms: string[]
  metrics: {
    reach: number
    engagement: number
    conversions: number
    ctr: number
  }
  progress: number
  createdAt: Date
  updatedAt: Date
  tenantId: string
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

export function useCampaigns() {
  const { userData } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const campaignsQuery = useMemo(() => {
    if (!userData?.tenantId) return null
    return query(collection(db, "campaigns"), where("tenantId", "==", userData.tenantId))
  }, [userData?.tenantId])

  const fetchCampaigns = useCallback(async () => {
    if (!campaignsQuery) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const snapshot = await getDocs(campaignsQuery)

      const campaignsData = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          clientId: data.clientId || "",
          clientName: data.clientName || "",
          status: data.status || "draft",
          budget: data.budget || 0,
          startDate: safeToDate(data.startDate),
          endDate: safeToDate(data.endDate),
          platforms: data.platforms || [],
          metrics: {
            reach: data.metrics?.reach || 0,
            engagement: data.metrics?.engagement || 0,
            conversions: data.metrics?.conversions || 0,
            ctr: data.metrics?.ctr || 0,
          },
          progress: data.progress || 0,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          tenantId: data.tenantId,
        } as Campaign
      })

      setCampaigns(campaignsData)
    } catch (err) {
      console.error("Error fetching campaigns:", err)
      setError("Errore nel caricamento delle campagne")
    } finally {
      setLoading(false)
    }
  }, [campaignsQuery])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const createCampaign = useCallback(async (campaignData: Omit<Campaign, "id" | "createdAt" | "updatedAt">) => {
    try {
      const now = new Date()
      const docRef = await addDoc(collection(db, "campaigns"), {
        ...campaignData,
        createdAt: now,
        updatedAt: now,
        tenantId: userData?.tenantId,
      })

      const newCampaign: Campaign = {
        ...campaignData,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      }

      setCampaigns((prev) => [newCampaign, ...prev])
      return newCampaign
    } catch (err) {
      console.error("Error creating campaign:", err)
      throw new Error("Errore nella creazione della campagna")
    }
  }, [userData?.tenantId])

  const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
    try {
      const campaignRef = doc(db, "campaigns", id)
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      }

      await updateDoc(campaignRef, updateData)

      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === id
            ? {
                ...campaign,
                ...updates,
                updatedAt: new Date(),
              }
            : campaign,
        ),
      )
    } catch (err) {
      console.error("Error updating campaign:", err)
      throw new Error("Errore nell'aggiornamento della campagna")
    }
  }, [])

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "campaigns", id))
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== id))
    } catch (err) {
      console.error("Error deleting campaign:", err)
      throw new Error("Errore nell'eliminazione della campagna")
    }
  }, [])

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refetch: fetchCampaigns,
  }
}
