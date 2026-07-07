import type React from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ProtectedRoute requiredRole="client">
        <div className="optima-ops-page">{children}</div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
