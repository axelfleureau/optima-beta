"use client"

import { SignIn } from "@clerk/nextjs"
import { ClerkAuthShell, optimaClerkAppearance } from "@/components/auth/clerk-auth-shell"

export default function LoginPage() {
  return (
    <ClerkAuthShell title="Accedi">
      <SignIn
        routing="hash"
        signUpUrl="/register"
        fallbackRedirectUrl="/dashboard"
        appearance={optimaClerkAppearance}
      />
    </ClerkAuthShell>
  )
}
