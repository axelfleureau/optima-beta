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
    "/calendario-editoriale",
    "/team",
    "/settings",
    "/super-admin"
  ]

  // Verifica se il percorso richiede autenticazione
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtectedPath) {
    // Controlla se esiste un token di autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value ||
                 request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      // Reindirizza al login se non c'è token
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Se c'è un token, lascia che l'applicazione gestisca l'autorizzazione lato client
    // La verifica JWT vera verrà fatta nelle API routes usando Firebase Admin
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
