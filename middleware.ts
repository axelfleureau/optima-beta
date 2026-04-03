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

  // Per ora disabiliamo il middleware e lasciamo che AuthContext gestisca l'autenticazione
  // Questo evita problemi di compatibilità con Firebase Admin SDK nel middleware
  
  if (isProtectedPath) {
    // TEMPORANEO: Disabilita controllo cookie per risolvere race condition login
    // Il controllo dell'autenticazione è gestito da AuthContext e ProtectedRoute
    // const token = request.cookies.get("firebase-auth-token")?.value
    // if (!token) {
    //   return NextResponse.redirect(new URL("/login", request.url))
    // }
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
