"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase"
import { useRouter } from "next/navigation"
import type { User } from "./types"
import { 
  hasPermission, 
  canManageUser, 
  canAssignTaskTo, 
  getAssignableRoles, 
  getManageableRoles, 
  canViewResource,
  getRoleDisplayName,
  getRoleColor,
  type UserRole 
} from "@/lib/role-hierarchy"

interface AuthContextType {
  user: FirebaseUser | null
  userData: User | null
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isDirezione: boolean
  isCapoReparto: boolean
  isJunior: boolean
  isClient: boolean
  isSuspended: boolean
  signOut: () => Promise<void>
  // Role hierarchy functions
  hasPermission: (permission: any) => boolean
  canManageUser: (targetRole: UserRole) => boolean
  canAssignTaskTo: (assigneeRole: UserRole) => boolean
  getAssignableRoles: () => UserRole[]
  getManageableRoles: () => UserRole[]
  canViewResource: (resourceOwnerId: string) => boolean
  getRoleDisplayName: () => string
  getRoleColor: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)

        try {
          // Ottieni il token ID e salvalo tramite API sicura con timeout
          const token = await user.getIdToken()
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 secondi timeout ridotto
          
          try {
            const response = await fetch("/api/auth/set-secure-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            
            if (response.ok) {
              console.log("✅ AuthContext: Token impostato con successo")
            } else {
              console.error("❌ AuthContext: Errore response token:", response.status)
            }
          } catch (error) {
            clearTimeout(timeoutId)
            if (error instanceof Error && error.name === 'AbortError') {
              console.error("⏱️ AuthContext: Timeout impostazione token")
            } else {
              console.error("❌ AuthContext: Errore nell'impostazione del token sicuro:", error)
            }
          }

          // CRITICAL: Imposta loading false PRIMA del redirect
          setLoading(false)
          
          // Fai il redirect solo se siamo nella pagina di login
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            console.log("🔄 AuthContext: Reindirizzamento alla dashboard")
            // Comunica al login page che il processo è completato con successo
            window.dispatchEvent(new CustomEvent('auth-success'))
            router.push("/dashboard")
            return // Exit early per evitare ulteriori elaborazioni
          }

          // Carica i dati utente in background (dopo il redirect)
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as any
            const processedData: User = {
              ...data,
              id: user.uid,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
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
          setLoading(false)
        }
      } else {
        setUser(null)
        setUserData(null)
        setLoading(false)
        // Le cookie HttpOnly saranno rimosse automaticamente dal middleware
        // quando il token scade o viene invalidato
      }
    })

    return () => unsubscribe()
  }, [router])

  const signOut = async () => {
    try {
      // Chiama API per rimuovere token sicuro
      try {
        await fetch("/api/auth/logout", { method: "POST" })
      } catch (error) {
        console.error("Errore nel logout sicuro:", error)
      }
      await firebaseSignOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Errore nel logout:", error)
    }
  }

  // Computed properties per i ruoli
  const isSuperAdmin = userData?.role === "super-admin"
  const isAdmin = userData?.role === "admin"
  const isDirezione = userData?.role === "direzione"
  const isCapoReparto = userData?.role === "capo-reparto"
  const isJunior = userData?.role === "junior"
  const isClient = userData?.role === "client"
  const isSuspended = userData?.isSuspended || false
  
  // Role hierarchy helper functions
  const userRole = userData?.role as UserRole
  const userId = userData?.id || ""
  
  const roleHelpers = {
    hasPermission: (permission: any) => userRole ? hasPermission(userRole, permission) : false,
    canManageUser: (targetRole: UserRole) => userRole ? canManageUser(userRole, targetRole) : false,
    canAssignTaskTo: (assigneeRole: UserRole) => userRole ? canAssignTaskTo(userRole, assigneeRole) : false,
    getAssignableRoles: () => userRole ? getAssignableRoles(userRole) : [],
    getManageableRoles: () => userRole ? getManageableRoles(userRole) : [],
    canViewResource: (resourceOwnerId: string) => userRole ? canViewResource(userRole, resourceOwnerId, userId) : false,
    getRoleDisplayName: () => userRole ? getRoleDisplayName(userRole) : "",
    getRoleColor: () => userRole ? getRoleColor(userRole) : ""
  }

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
    isDirezione,
    isCapoReparto,
    isJunior,
    isClient,
    isSuspended,
    signOut,
    ...roleHelpers,
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
