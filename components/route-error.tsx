"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"

export function RouteError() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get("error")

  useEffect(() => {
    if (error) {
      // Rimuovi il parametro di errore dall'URL dopo alcuni secondi
      const timeout = setTimeout(() => {
        router.replace(window.location.pathname)
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [error, router])

  if (!error) return null

  const errorMessages: Record<string, { title: string; description: string }> = {
    access_denied: {
      title: "Accesso negato",
      description: "Non hai i permessi necessari per accedere a questa pagina.",
    },
    not_found: {
      title: "Pagina non trovata",
      description: "La pagina che stai cercando non esiste.",
    },
    session_expired: {
      title: "Sessione scaduta",
      description: "La tua sessione è scaduta. Effettua nuovamente il login.",
    },
  }

  const errorInfo = errorMessages[error] || {
    title: "Errore",
    description: "Si è verificato un errore imprevisto.",
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{errorInfo.title}</AlertTitle>
      <AlertDescription>{errorInfo.description}</AlertDescription>
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna indietro
        </Button>
      </div>
    </Alert>
  )
}
