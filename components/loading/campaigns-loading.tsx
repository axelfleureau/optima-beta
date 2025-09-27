import { LoadingCard, LoadingTable } from "@/components/ui/loading-skeleton"

export default function CampaignsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-56 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-80 rounded-md" />
          </div>
          <div className="animate-pulse bg-blue-300/30 dark:bg-blue-700/30 h-10 w-36 rounded-lg" />
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-64 rounded-lg" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-32 rounded-lg" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-28 rounded-lg" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-24 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-6 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
          <div className="flex space-x-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              {/* Campaign Image */}
              <div className="animate-pulse bg-gradient-to-r from-violet-500/20 to-purple-600/20 h-32 w-full" />
              
              {/* Campaign Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-48 rounded-md" />
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-64 rounded-md" />
                </div>

                {/* Campaign Meta */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 rounded-md" />
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="animate-pulse bg-green-300/30 dark:bg-green-700/30 h-6 w-16 rounded-full" />
                  <div className="flex space-x-2">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-8 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-8 rounded-md" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-16 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-12 rounded-md" />
                  </div>
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-2 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
        <div className="rounded-xl border bg-card p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-64 rounded-md" />
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-32 rounded-md" />
                </div>
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}