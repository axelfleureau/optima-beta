import { LoadingStats, LoadingCard } from "@/components/ui/loading-skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-64 rounded-md" />
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-96 rounded-md" />
      </div>

      {/* Stats Cards */}
      <LoadingStats />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Analytics Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
          <div className="rounded-xl border bg-card p-6">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-64 w-full rounded-md" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-28 rounded-md" />
          <LoadingCard />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 text-center space-y-2">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-10 mx-auto rounded-full" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 mx-auto rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}