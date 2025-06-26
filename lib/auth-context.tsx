"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase"
import { useRouter } from "next/navigation"
import type { UserData } from "./types"

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isUser: boolean
  isClient: boolean
  isSuspended: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData
            const processedData: UserData = {
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || undefined,
            }
            setUserData(processedData)

            // Verifica sospensione account
            if (processedData.isSuspended) {
              console.log("Account sospeso, reindirizzamento...")
              router.push("/suspended")
              return
            }
          }
        } catch (error) {
          console.error("Errore nel caricamento dati utente:", error)
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Errore nel logout:", error)
    }
  }

  // Computed properties per i ruoli
  const isSuperAdmin = userData?.role === "super-admin"
  const isAdmin = userData?.role === "admin"
  const isUser = userData?.role === "user"
  const isClient = userData?.role === "client"
  const isSuspended = userData?.isSuspended || false

  // Reindirizzamento automatico per clienti
  useEffect(() => {
    if (!loading && userData && isClient) {
      const currentPath = window.location.pathname
      const allowedClientPaths = ["/workspace", "/ai-assistant", "/login", "/register", "/suspended"]

      if (!allowedClientPaths.some((path) => currentPath.startsWith(path))) {
        router.push("/workspace")
      }
    }
  }, [userData, isClient, loading, router])

  // Reindirizzamento per account sospesi
  useEffect(() => {
    if (!loading && userData && isSuspended && window.location.pathname !== "/suspended") {
      router.push("/suspended")
    }
  }, [userData, isSuspended, loading, router])

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isSuperAdmin,
    isAdmin,
    isUser,
    isClient,
    isSuspended,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
