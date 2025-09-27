import { LoadingCalendar, LoadingCard } from "@/components/ui/loading-skeleton"

export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-64 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-96 rounded-md" />
          </div>
          <div className="flex space-x-2">
            <div className="animate-pulse bg-blue-300/30 dark:bg-blue-700/30 h-10 w-32 rounded-lg" />
            <div className="animate-pulse bg-green-300/30 dark:bg-green-700/30 h-10 w-28 rounded-lg" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-lg w-fit">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className={`animate-pulse h-8 w-20 rounded-md ${
                i === 0 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-24 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-6 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-12 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Calendar Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <LoadingCalendar />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-28 rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Upcoming Posts */}
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-32 rounded-md" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-24 rounded-md" />
                    <div className="animate-pulse bg-blue-300/30 dark:bg-blue-700/30 h-5 w-16 rounded-full" />
                  </div>
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-32 rounded-md" />
                  <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Preview */}
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-5 w-24 rounded-md" />
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-32 w-full rounded-md" />
              <div className="flex justify-between text-sm">
                <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-16 rounded-md" />
                <div className="animate-pulse bg-green-300/30 dark:bg-green-700/30 h-4 w-12 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}