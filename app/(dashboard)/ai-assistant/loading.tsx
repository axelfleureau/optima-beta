import { LoadingChat } from "@/components/ui/loading-skeleton";

export default function AIAssistantLoading() {
  return (
    <div className="optima-ops-page min-w-0 space-y-6 overflow-x-clip p-3 sm:p-4 md:space-y-8 md:p-6">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded-md bg-white/10" />
            <div className="h-4 w-full max-w-96 animate-pulse rounded-md bg-white/10" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Token Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-white shadow-sm"
          >
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-32 animate-pulse rounded-md bg-white/10" />
              <div className="h-6 w-6 animate-pulse rounded-md bg-white/10" />
            </div>
            <div className="space-y-1">
              <div className="h-8 w-16 animate-pulse rounded-md bg-white/10" />
              <div className="h-3 w-24 animate-pulse rounded-md bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chat Interface */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-lg">
        <div className="flex min-h-[620px] md:h-[700px]">
          {/* Sidebar */}
          <div className="hidden w-80 space-y-4 border-r border-white/10 bg-black/20 p-4 lg:block">
            <div className="h-6 w-32 animate-pulse rounded-md bg-white/10" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full animate-pulse rounded-lg bg-white/10"
                />
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="min-w-0 flex-1">
            <LoadingChat />
          </div>
        </div>
      </div>
    </div>
  );
}
