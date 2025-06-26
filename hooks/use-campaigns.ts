"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
} from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Campaign } from "@/lib/types"

export function useCampaigns(clientId?: string) {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user?.tenantId) {
      setLoading(false)
      // setCampaigns([]); // Keep existing campaigns if user logs out then in, or clear
      return
    }

    setLoading(true)
    let q = query(collection(db, "campaigns"), where("tenantId", "==", user.tenantId), orderBy("createdAt", "desc"))

    if (clientId) {
      q = query(
        collection(db, "campaigns"),
        where("tenantId", "==", user.tenantId),
        where("clientId", "==", clientId),
        orderBy("createdAt", "desc"),
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const campaignsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Campaign[]
        setCampaigns(campaignsData)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching campaigns:", err)
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user?.tenantId, clientId])

  const addCampaign = useCallback(
    async (campaignData: Omit<Campaign, "id" | "createdAt" | "updatedAt" | "tenantId">) => {
      if (!user?.tenantId) throw new Error("User not authenticated or tenantId missing.")
      try {
        const newCampaign = {
          ...campaignData,
          tenantId: user.tenantId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
        const docRef = await addDoc(collection(db, "campaigns"), newCampaign)
        return docRef.id
      } catch (err) {
        console.error("Error adding campaign:", err)
        throw err
      }
    },
    [user?.tenantId],
  )

  const updateCampaign = useCallback(
    async (id: string, updates: Partial<Omit<Campaign, "id" | "createdAt" | "tenantId">>) => {
      try {
        const campaignRef = doc(db, "campaigns", id)
        await updateDoc(campaignRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        })
      } catch (err) {
        console.error("Error updating campaign:", err)
        throw err
      }
    },
    [],
  )

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      const campaignRef = doc(db, "campaigns", id)
      await deleteDoc(campaignRef)
    } catch (err) {
      console.error("Error deleting campaign:", err)
      throw err
    }
  }, [])

  return { campaigns, loading, error, addCampaign, updateCampaign, deleteCampaign }
}
