import { NextResponse, type NextRequest } from "next/server"

// Disabled for Cloudflare Workers Free size limits.
// Dashboard layouts still use ProtectedRoute and sensitive API routes perform route-level auth.
// Restore as middleware.ts if the Worker is moved to a paid plan or the server bundle is split.

const PROTECTED_PREFIXES = [
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
  "/super-admin",
  "/api/ai",
  "/api/admin",
  "/api/calendar",
  "/api/clients",
  "/api/dashboard",
  "/api/settings",
  "/api/tasks",
  "/api/team",
]

const PUBLIC_API_PREFIXES = [
  "/api/quotes/public",
  "/api/stripe/webhook",
  "/api/cron",
  "/api/auth",
  "/api/placeholder",
]

function hasClerkSession(request: NextRequest) {
  return request.cookies.has("__session") || request.cookies.has("__client_uat")
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_API_PREFIXES.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const protectedPath = PROTECTED_PREFIXES.some((path) => pathname.startsWith(path))
  if (!protectedPath || hasClerkSession(request)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("callbackUrl", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$).*)",
  ],
}
