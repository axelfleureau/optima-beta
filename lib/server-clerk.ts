import { cookies, headers } from "next/headers"
import { createClerkClient, verifyToken } from "@clerk/backend"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import type { UserRole } from "@/lib/role-hierarchy"

const VALID_ROLES: UserRole[] = ["super-admin", "admin", "direzione", "capo-reparto", "junior", "client"]

function normalizeRole(value: unknown, email?: string): UserRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole
  }

  if (value === "org:admin" || value === "admin") {
    return "admin"
  }

  if (email?.endsWith("@wearerighello.com")) {
    return "admin"
  }

  return "junior"
}

async function getRuntimeSecret(name: string) {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (env as Record<string, string | undefined>)[name] || process.env[name] || ""
  } catch {
    return process.env[name] || ""
  }
}

async function getSessionToken() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("__session")?.value
  if (sessionCookie) return sessionCookie

  const headerStore = await headers()
  const authorization = headerStore.get("authorization") || ""
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim()
  }

  return ""
}

function getPrimaryEmail(user: any) {
  return user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ""
}

export async function requireClerkUser() {
  const token = await getSessionToken()
  if (!token) {
    return null
  }

  const secretKey = await getRuntimeSecret("CLERK_SECRET_KEY")
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured")
  }

  let claims: Record<string, any>
  try {
    claims = (await verifyToken(token, { secretKey })) as Record<string, any>
  } catch {
    return null
  }

  const userId = typeof claims.sub === "string" ? claims.sub : ""
  if (!userId) {
    return null
  }

  let clerkUser: any = null
  try {
    const clerkClient = createClerkClient({ secretKey })
    clerkUser = await clerkClient.users.getUser(userId)
  } catch (error) {
    console.error("Clerk user lookup failed:", error)
  }

  const email = getPrimaryEmail(clerkUser) || String(claims.email || "")
  const publicMetadata = clerkUser?.publicMetadata || {}
  const role = normalizeRole(publicMetadata.role || claims.org_role || claims.role, email)

  return {
    id: userId,
    organizationId: String(claims.org_id || publicMetadata.tenantId || userId),
    role,
    email,
    firstName: clerkUser?.firstName || clerkUser?.fullName || email || "Utente",
    lastName: clerkUser?.lastName || "",
  }
}
