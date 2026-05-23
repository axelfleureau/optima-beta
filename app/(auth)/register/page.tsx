"use client"

import { SignUp } from "@clerk/nextjs"
import { ClerkAuthShell, optimaClerkAppearance } from "@/components/auth/clerk-auth-shell"

export default function RegisterPage() {
  return (
    <ClerkAuthShell title="Crea il tuo accesso">
      <SignUp
        routing="hash"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
        appearance={optimaClerkAppearance}
      />
    </ClerkAuthShell>
  )
}
