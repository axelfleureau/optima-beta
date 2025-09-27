import { LoadingTable, LoadingCard } from "@/components/ui/loading-skeleton"

export default function QuotesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-48 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-72 rounded-md" />
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

      {/* Quote Stats */}
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

      {/* Quotes List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-28 rounded-md" />
          <div className="flex space-x-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              {/* Quote Header */}
              <div className="flex items-start justify-between pb-4">
                <div className="space-y-2">
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-48 rounded-md" />
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
                      <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-32 rounded-md" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-4 rounded-md" />
                      <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-24 rounded-md" />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse bg-yellow-300/30 dark:bg-yellow-700/30 h-6 w-20 rounded-full" />
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-8 rounded-md" />
                </div>
              </div>

              {/* Quote Content */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Quote Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-full rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-3/4 rounded-md" />
                  </div>

                  <div className="space-y-2">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
                    <div className="space-y-1">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="flex justify-between items-center p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded">
                          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-32 rounded-md" />
                          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-16 rounded-md" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quote Summary */}
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-28 rounded-md" />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
                        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-20 rounded-md" />
                      </div>
                      <div className="flex justify-between">
                        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-12 rounded-md" />
                        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
                      </div>
                      <div className="border-t pt-2 flex justify-between font-medium">
                        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-12 rounded-md" />
                        <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-20 rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <div className="animate-pulse bg-blue-300/30 dark:bg-blue-700/30 h-8 w-20 rounded-md" />
                    <div className="animate-pulse bg-green-300/30 dark:bg-green-700/30 h-8 w-16 rounded-md" />
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
                  </div>
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
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
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