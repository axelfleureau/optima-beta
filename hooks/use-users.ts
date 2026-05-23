"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/types"

export function useUsers() {
  const { userData, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUsers = useCallback(async () => {
    if (authLoading) return

    if (!userData?.tenantId) {
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/team/users", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Errore nel caricamento utenti")
      }

      setUsers((payload.users || []).map((user: User) => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt as any) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt as any) : undefined,
      })))
    } catch (err) {
      console.error("Error loading users:", err)
      setError(err instanceof Error ? err.message : "Errore nel caricamento utenti")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, userData?.tenantId])

  useEffect(() => {
    refreshUsers()
  }, [refreshUsers])

  return { users, loading, error, refreshUsers }
}
