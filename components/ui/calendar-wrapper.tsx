"use client"

import dynamic from "next/dynamic"

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

// Dynamic import with ssr: false in client component
const EditorialCalendarClient = dynamic(() => import("../editorial-calendar-client"), {
  ssr: false,
  loading: () => <CalendarLoading />,
})

export default function CalendarWrapper() {
  return <EditorialCalendarClient />
}
