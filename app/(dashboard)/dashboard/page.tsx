'use client'

import dynamic from "next/dynamic"

const dashboardPageClass =
  "optima-app-surface min-h-[calc(100svh-73px)] w-full overflow-x-hidden md:min-h-screen"

const DashboardClient = dynamic(
  () => import("./dashboard-client").then((mod) => ({ default: mod.DashboardClient })),
  {
    loading: () => (
      <div className={dashboardPageClass}>
        <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="space-y-8 animate-pulse">
            <div className="h-12 w-72 rounded-2xl bg-white/10" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-32 rounded-2xl border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default function DashboardPage() {
  return <DashboardClient />
}
