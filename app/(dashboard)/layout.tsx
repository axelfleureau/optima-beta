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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isOpen, close } = useImageGeneratorStore()

  return (
    <Provider store={store}>
      <AuthInitializer />
      <ProtectedRoute>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 overflow-hidden">
              <MobileHeader />
              <RouteError />
              <div className="h-full">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </ProtectedRoute>

      <ImageGenerator open={isOpen} onOpenChange={(open) => open ? null : close()} />
    </Provider>
  )
}
