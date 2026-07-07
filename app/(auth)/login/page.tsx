"use client";

import { SignIn } from "@clerk/nextjs";
import {
  ClerkAuthShell,
  optimaClerkAppearance,
} from "@/components/auth/clerk-auth-shell";

export default function LoginPage() {
  return (
    <ClerkAuthShell title="Accedi">
      <SignIn
        routing="hash"
        signUpUrl="/register"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
        oauthFlow="redirect"
        oidcPrompt="select_account"
        appearance={optimaClerkAppearance}
      />
    </ClerkAuthShell>
  );
}
