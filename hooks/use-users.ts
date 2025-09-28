"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/types"

export function useUsers() {
  const { userData } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userData?.tenantId) {
      setLoading(false)
      setError(null)
      return
    }

    // Solo super-admin e admin possono vedere gli utenti
    if (userData.role !== "super-admin" && userData.role !== "admin") {
      setUsers([])
      setLoading(false)
      setError("Non hai i permessi per visualizzare gli utenti")
      return
    }

    setError(null)

    let unsubscribe: (() => void) | undefined

    const initFirestore = async () => {
      try {
        const { db } = await import("@/lib/firebase")
        const { query, collection, where, onSnapshot } = await import("firebase/firestore")

        let usersQuery

        switch (userData.role) {
          case "super-admin":
            // Super admin vede tutti gli utenti
            usersQuery = collection(db, "users")
            break

          case "admin":
            // Admin vede tutti gli utenti del proprio tenant (incluso se stesso)
            usersQuery = query(collection(db, "users"), where("tenantId", "==", userData.tenantId))
            break

          default:
            setUsers([])
            setLoading(false)
            setError("Ruolo non autorizzato")
            return
        }

        unsubscribe = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs
            .map((doc) => ({
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate?.() || undefined,
            }))
            .sort((a: any, b: any) => {
              return b.createdAt.getTime() - a.createdAt.getTime()
            }) as User[]

          console.log(`Users loaded for role ${userData.role}:`, usersData.length)
          setUsers(usersData)
          setLoading(false)
        })
      } catch (err) {
        console.error("Error loading users:", err)
        setError("Errore nel caricamento degli utenti")
        setLoading(false)
      }
    }

    initFirestore()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [userData])

  return { users, loading, error }
}
