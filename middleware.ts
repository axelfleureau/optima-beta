import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Percorsi che richiedono autenticazione
  const protectedPaths = [
    "/dashboard",
    "/campagne",
    "/preventivi", 
    "/workspace",
    "/client-workspace",
    "/ai-assistant",
    "/clienti",
    "/calendario-editoriale",
    "/team",
    "/settings",
    "/super-admin"
  ]

  // Percorsi riservati solo agli admin/agency (non ai clienti)
  const agencyOnlyPaths = [
    "/campagne",
    "/preventivi",
    "/clienti", 
    "/calendario-editoriale",
    "/team",
    "/settings"
  ]

  // Percorsi riservati solo ai super-admin
  const superAdminOnlyPaths = [
    "/super-admin"
  ]

  // Percorsi riservati solo ai clienti
  const clientOnlyPaths = ["/client-workspace"]

  // Verifica se il percorso richiede autenticazione
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtectedPath) {
    const token = request.cookies.get("firebase-auth-token")?.value

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      // Verifica il token tramite API interna
      const verifyResponse = await fetch(new URL("/api/auth/verify-token", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      })

      if (!verifyResponse.ok) {
        // Token non valido, rimuovi cookie e reindirizza
        const response = NextResponse.redirect(new URL("/login?error=invalid_token", request.url))
        response.cookies.delete("firebase-auth-token")
        return response
      }

      const { user } = await verifyResponse.json()
      
      // Controllo accessi basato sui ruoli
      const isSuperAdminPath = superAdminOnlyPaths.some((path) => pathname.startsWith(path))
      const isAgencyOnlyPath = agencyOnlyPaths.some((path) => pathname.startsWith(path))
      const isClientOnlyPath = clientOnlyPaths.some((path) => pathname.startsWith(path))

      // Verifica autorizzazioni specifiche per ruolo
      if (isSuperAdminPath && user.role !== "super-admin") {
        return NextResponse.redirect(new URL("/dashboard?error=access_denied", request.url))
      }

      if (isAgencyOnlyPath && !["super-admin", "admin", "user"].includes(user.role)) {
        return NextResponse.redirect(new URL("/workspace?error=access_denied", request.url))
      }

      if (isClientOnlyPath && user.role !== "client") {
        return NextResponse.redirect(new URL("/dashboard?error=access_denied", request.url))
      }

      // Aggiungi headers con dati utente per le API routes
      const response = NextResponse.next()
      response.headers.set("x-user-id", user.uid)
      response.headers.set("x-user-role", user.role)
      response.headers.set("x-tenant-id", user.tenantId || "")

      return response

    } catch (error) {
      console.error("Token verification failed:", error)
      const response = NextResponse.redirect(new URL("/login?error=auth_error", request.url))
      response.cookies.delete("firebase-auth-token")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, register (auth pages)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
}
