import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex-1 overflow-auto">{children}</div>
    </ProtectedRoute>
  )
}
