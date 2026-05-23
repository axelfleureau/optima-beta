'use client'
import type React from "react"
import dynamic from 'next/dynamic'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { RouteError } from "@/components/route-error"
import { Provider } from "react-redux"
import { store } from "@/app/store/store"
import { MobileHeader } from "@/components/mobile-header"
import { AuthInitializer } from "@/components/auth-initializer"
import { useImageGeneratorStore } from "@/lib/stores/image-generator-store"
import { AuthProvider } from "@/lib/auth-context"
import { NotificationProvider } from "@/lib/notification-context"
import { CommandBar } from "@/components/command-bar/command-bar"
import { ScrollStabilityGuard } from "@/components/scroll-stability-guard"

// Lazy load Image Generator Dialog - reduces initial bundle size
const ImageGenerator = dynamic(
  () => import("@/components/content-agent/image-generator").then(mod => ({ default: mod.ImageGenerator })),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl border border-purple-200/50">
          <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">Caricamento generatore immagini...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { isOpen, close } = useImageGeneratorStore()

  return (
    <AuthProvider>
      <NotificationProvider>
        <Provider store={store}>
          <AuthInitializer />
          <ScrollStabilityGuard />
          <ProtectedRoute>
            <SidebarProvider>
              <div className="optima-app-surface flex min-h-[100dvh] w-full overflow-x-hidden [overflow-anchor:none]">
                <AppSidebar />
                <main className="min-w-0 flex-1 overflow-x-hidden [-webkit-overflow-scrolling:touch]">
                  <MobileHeader />
                  <RouteError />
                  <div className="min-h-full">
                    {children}
                  </div>
                </main>
              </div>
            </SidebarProvider>
          </ProtectedRoute>

          <ImageGenerator open={isOpen} onOpenChange={(open) => open ? null : close()} />
          <CommandBar />
        </Provider>
      </NotificationProvider>
    </AuthProvider>
  )
}
