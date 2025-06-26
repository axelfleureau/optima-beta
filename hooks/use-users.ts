"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import type { UserData } from "@/lib/types"

export function useUsers() {
  const { userData } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.tenantId) {
      setLoading(false)
      return
    }

    // Solo super-admin e admin possono vedere gli utenti
    if (userData.role !== "super-admin" && userData.role !== "admin") {
      setUsers([])
      setLoading(false)
      return
    }

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
            // Admin vede solo i propri user e client
            usersQuery = query(collection(db, "users"), where("parentTenantId", "==", userData.tenantId))
            break

          default:
            setUsers([])
            setLoading(false)
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
            }) as UserData[]

          console.log(`Users loaded for role ${userData.role}:`, usersData.length)
          setUsers(usersData)
          setLoading(false)
        })
      } catch (err) {
        console.error("Error loading users:", err)
        setLoading(false)
      }
    }

    initFirestore()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [userData])

  return { users, loading }
}
