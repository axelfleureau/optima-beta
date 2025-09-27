import { LoadingTable, LoadingCard } from "@/components/ui/loading-skeleton"

export default function TeamLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-48 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-72 rounded-md" />
          </div>
          <div className="animate-pulse bg-blue-300/30 dark:bg-blue-700/30 h-10 w-32 rounded-lg" />
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-64 rounded-lg" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-32 rounded-lg" />
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* Team Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-6 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-12 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Team Members Grid */}
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              {/* User Header */}
              <div className="flex items-start justify-between pb-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse bg-gradient-to-r from-violet-500/20 to-purple-600/20 h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-32 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-24 rounded-md" />
                  </div>
                </div>
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-6 rounded-md" />
              </div>

              {/* User Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-48 rounded-md" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <div className="animate-pulse bg-blue-300/30 dark:bg-blue-700/30 h-6 w-16 rounded-full" />
                    <div className="animate-pulse bg-green-300/30 dark:bg-green-700/30 h-6 w-14 rounded-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                  <div className="space-y-1">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-16 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 rounded-md" />
                  </div>
                  <div className="space-y-1">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-20 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}