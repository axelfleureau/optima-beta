'use client'

import type React from "react"
import dynamic from "next/dynamic"

const DashboardShell = dynamic(
  () => import("./dashboard-shell").then((mod) => ({ default: mod.DashboardShell })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-righello-pink" />
      </div>
    ),
    ssr: false,
  }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
