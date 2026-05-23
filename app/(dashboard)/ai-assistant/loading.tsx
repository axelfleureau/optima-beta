import { LoadingChat } from "@/components/ui/loading-skeleton"

export default function AIAssistantLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 space-y-6 md:p-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-64 rounded-md" />
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-full max-w-96 rounded-md" />
          </div>
          <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Token Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-4 w-32 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-6 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-8 w-16 rounded-md" />
              <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-3 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] md:h-[700px]">
          {/* Sidebar */}
          <div className="hidden w-80 border-r border-gray-200 bg-gray-50 p-4 space-y-4 dark:border-gray-700 dark:bg-gray-800 lg:block">
            <div className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-6 w-32 rounded-md" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-300/20 dark:bg-gray-700/20 h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1">
            <LoadingChat />
          </div>
        </div>
      </div>
    </div>
  )
}
