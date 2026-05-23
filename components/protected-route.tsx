"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { UserRole } from "@/lib/role-hierarchy"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [authInitTimedOut, setAuthInitTimedOut] = useState(false)

  useEffect(() => {
    if (!loading) {
      setAuthInitTimedOut(false)
      return
    }

    const timeout = window.setTimeout(() => setAuthInitTimedOut(true), 10000)
    return () => window.clearTimeout(timeout)
  }, [loading])

  useEffect(() => {
    if (!loading) {
      // Se l'utente non è autenticato, reindirizza al login
      if (!user) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
        return
      }

      // Se è richiesto un ruolo specifico, verifica che l'utente lo abbia
      if (requiredRole && userData) {
        const userRole = userData.role
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

        if (!requiredRoles.includes(userRole)) {
          // Reindirizza alla dashboard o mostra un messaggio di accesso negato
          router.push("/dashboard?error=access_denied")
        }
      }
    }
  }, [user, userData, loading, router, pathname, requiredRole])

  // Mostra loading durante l'inizializzazione
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050811] p-6 text-white">
        <div className="max-w-sm text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-2 border-pink-500" />
          {authInitTimedOut ? (
            <div className="mt-6 rounded-lg border border-red-500/35 bg-red-500/10 p-4 text-left">
              <p className="text-sm font-semibold text-red-100">Autenticazione ancora in inizializzazione.</p>
              <p className="mt-2 text-sm text-red-100/75">
                Se resta bloccata, ricarica la pagina o torna al login: potrebbe esserci un problema temporaneo con
                Clerk o il dominio di autenticazione.
              </p>
              <button
                type="button"
                onClick={() => router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`)}
                className="mt-4 rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Torna al login
              </button>
            </div>
          ) : null}
        </div>
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
