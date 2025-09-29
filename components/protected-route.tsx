"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { useAuthStatus, useAuthUser } from "@/hooks/viewmodels"
import type { UserRole } from "@/lib/role-hierarchy"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, loading } = useAuthStatus()
  const { user } = useAuthUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isInitialized && !loading) {
      // Se l'utente non è autenticato, reindirizza al login
      if (!isAuthenticated) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
        return
      }

      // Se è richiesto un ruolo specifico, verifica che l'utente lo abbia
      if (requiredRole && user) {
        const userRole = user.role
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

        if (!requiredRoles.includes(userRole)) {
          // Reindirizza alla dashboard o mostra un messaggio di accesso negato
          router.push("/dashboard?error=access_denied")
        }
      }
    }
  }, [isAuthenticated, isInitialized, user, loading, router, pathname, requiredRole])

  // Mostra loading durante l'inizializzazione
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  // Se l'utente è autenticato e ha i permessi necessari, mostra il contenuto
  if (isAuthenticated && user) {
    return <>{children}</>
  }

  // Non mostrare nulla durante il reindirizzamento
  return null
}
