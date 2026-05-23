"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Client } from "@/lib/types"

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userData, loading: authLoading } = useAuth()

  const refreshClients = useCallback(async () => {
    if (authLoading) return

    if (!userData?.tenantId) {
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/clients", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Errore nel caricamento dei clienti")
      }

      setClients((payload.clients || []).map((client: Client) => ({
        ...client,
        createdAt: client.createdAt ? new Date(client.createdAt as any) : new Date(),
        updatedAt: client.updatedAt ? new Date(client.updatedAt as any) : new Date(),
      })))
    } catch (err) {
      console.error("Error fetching clients:", err)
      setError(err instanceof Error ? err.message : "Errore nel caricamento dei clienti")
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, userData?.tenantId])

  useEffect(() => {
    refreshClients()
  }, [refreshClients])

  return {
    clients,
    loading,
    error,
    refreshClients,
  }
}
