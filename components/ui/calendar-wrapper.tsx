"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { CalendarExperienceProvider } from "@/lib/calendar-experience-context"

// Lightweight loading placeholder
function CalendarLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-righello-pink border-t-transparent" />
        <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento calendario editoriale…</p>
      </div>
    </div>
  )
}

export default function CalendarWrapper() {
  const [CalendarComponent, setCalendarComponent] = useState<React.ComponentType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    const loadComponent = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Dynamic import only on client side
        const { default: EditorialCalendarClient } = await import("../../app/(dashboard)/calendario-editoriale/editorial-calendar-client")
        setCalendarComponent(() => EditorialCalendarClient)
      } catch (err) {
        console.error("Failed to load calendar component:", err)
        setError("Errore nel caricamento del calendario")
      } finally {
        setIsLoading(false)
      }
    }

    // Small delay to ensure complete hydration
    const timer = setTimeout(loadComponent, 100)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <CalendarLoading />
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="space-y-4 text-center">
          <p className="text-lg font-medium text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-righello-pink text-white rounded-md hover:bg-righello-pink/90"
          >
            Ricarica pagina
          </button>
        </div>
      </div>
    )
  }

  if (!CalendarComponent) {
    return <CalendarLoading />
  }

  return (
    <CalendarExperienceProvider>
      <CalendarComponent />
    </CalendarExperienceProvider>
  )
}
