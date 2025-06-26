"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string | string[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      // Se l'utente non è autenticato, reindirizza al login
      if (!user) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
        return
      }

      // Se è richiesto un ruolo specifico, verifica che l'utente lo abbia
      if (requiredRole && userData) {
        const userRole = userData.role || "user"
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

        if (!requiredRoles.includes(userRole)) {
          // Reindirizza alla dashboard o mostra un messaggio di accesso negato
          router.push("/dashboard?error=access_denied")
        }
      }
    }
  }, [user, userData, loading, router, pathname, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  // Se l'utente è autenticato e ha i permessi necessari, mostra il contenuto
  if (user) {
    return <>{children}</>
  }

  // Non mostrare nulla durante il reindirizzamento
  return null
}
