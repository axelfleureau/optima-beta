import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Percorsi che richiedono autenticazione
  const protectedPaths = [
    "/dashboard",
    "/campagne",
    "/preventivi",
    "/workspace",
    "/ai-assistant",
    "/clienti",
    "/calendario",
    "/admin",
    "/tenanti",
    "/billing",
  ]

  // Percorsi riservati solo agli admin/agency (non ai clienti)
  const agencyOnlyPaths = [
    "/campagne",
    "/preventivi",
    "/clienti",
    "/calendario",
    "/admin",
    "/tenanti",
    "/billing",
    "/workspace",
  ]

  // Percorsi riservati solo ai clienti
  const clientOnlyPaths = ["/workspace"]

  // Verifica se il percorso richiede autenticazione
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtectedPath) {
    // Qui dovresti verificare il token di autenticazione
    // Per ora, assumiamo che l'autenticazione sia gestita lato client

    // Se il percorso è riservato ai clienti, reindirizza gli utenti non-client
    const isClientOnlyPath = clientOnlyPaths.some((path) => pathname.startsWith(path))
    const isAgencyOnlyPath = agencyOnlyPaths.some((path) => pathname.startsWith(path))

    // Nota: Il controllo del ruolo effettivo dovrebbe essere fatto con il token JWT
    // Questo è un esempio di come strutturare il middleware

    return NextResponse.next()
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
