import { LoadingTable, LoadingStats } from "@/components/ui/loading-skeleton"

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-64 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-96 rounded-md" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-red-300/30 dark:bg-red-700/30 h-6 w-20 rounded-full" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-24 rounded-md" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 rounded-md" />
        </div>
      </div>

      {/* System Stats */}
      <LoadingStats />

      {/* Admin Actions Grid */}
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 text-center space-y-4">
              <div className="animate-pulse bg-gradient-to-r from-red-500/20 to-orange-600/20 h-12 w-12 mx-auto rounded-full" />
              <div className="space-y-2">
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-32 mx-auto rounded-md" />
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-48 mx-auto rounded-md" />
              </div>
              <div className="animate-pulse bg-red-300/30 dark:bg-red-700/30 h-8 w-24 mx-auto rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* System Monitoring */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Health */}
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
          <div className="rounded-xl border bg-card p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-24 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-16 rounded-md" />
                  </div>
                </div>
                <div className="animate-pulse bg-green-300/30 dark:bg-green-700/30 h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
          <div className="rounded-xl border bg-card p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 p-2 rounded">
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-6 rounded-full mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-64 rounded-md" />
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-32 rounded-md" />
                </div>
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
        <LoadingTable />
      </div>
    </div>
  )
}