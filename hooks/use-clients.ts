"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Client } from "@/lib/types"

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userData } = useAuth()

  useEffect(() => {
    if (!userData?.tenantId) {
      setLoading(false)
      return
    }

    try {
      const q = query(collection(db, "clients"), where("tenantId", "==", userData.tenantId))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const clientsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Client[]

          setClients(clientsData)
          setLoading(false)
        },
        (err) => {
          console.error("Error fetching clients:", err)
          setError(err.message)
          setLoading(false)
        },
      )

      return unsubscribe
    } catch (err: any) {
      console.error("Error setting up clients listener:", err)
      setError(err.message)
      setLoading(false)
    }
  }, [userData?.tenantId])

  return {
    clients,
    loading,
    error,
  }
}
