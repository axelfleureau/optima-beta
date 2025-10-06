'use client'
import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { RouteError } from "@/components/route-error"
import { Provider } from "react-redux"
import { store } from "@/app/store/store"
import { MobileHeader } from "@/components/mobile-header"
import { AuthInitializer } from "@/components/auth-initializer"
import { ImageGenerator } from "@/components/content-agent/image-generator"
import { useImageGeneratorStore } from "@/lib/stores/image-generator-store"

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
              <div className="p-4 md:p-6">
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
