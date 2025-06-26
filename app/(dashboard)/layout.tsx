import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { RouteError } from "@/components/route-error"
import { Provider } from "react-redux"
import { store } from "@/app/store/store"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Provider store={store}>
      <ProtectedRoute>
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 overflow-hidden">
              <RouteError />
              {children}
            </main>
          </div>
        </SidebarProvider>
      </ProtectedRoute>
    </Provider>
  )
}
