import { createRemoteJWKSet, jwtVerify } from "jose"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

const MANAGER_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"])

function appBaseUrl(request?: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.OPTIMA_PUBLIC_URL
  if (configured) return configured.replace(/\/$/, "")

  if (request) {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  }

  return "http://localhost:3000"
}

export function mcpResourceUrl(request?: Request) {
  return `${appBaseUrl(request)}/mcp`
}

export function mcpResourceMetadataUrl(request?: Request) {
  return `${appBaseUrl(request)}/.well-known/oauth-protected-resource`
}

export function mcpAuthorizationServerUrl(request?: Request) {
  return (
    process.env.OPTIMA_MCP_AUTHORIZATION_SERVER ||
    process.env.OPTIMA_MCP_ISSUER ||
    appBaseUrl(request)
  ).replace(/\/$/, "")
}

export function unauthorizedMcpResponse(request: Request) {
  const metadataUrl = mcpResourceMetadataUrl(request)
  return Response.json(
    { error: "invalid_token", error_description: "Bearer OAuth token richiesto per Optima MCP." },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"`,
      },
    },
  )
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || ""
  return header.toLowerCase().startsWith("bearer ") ? header.slice("bearer ".length).trim() : ""
}

async function principalFromMember(db: any, row: any): Promise<WorkspacePrincipal | null> {
  if (!row?.id || !row?.organization_id) return null
  return {
    organizationId: String(row.organization_id),
    memberId: String(row.id),
    role: String(row.role || "junior"),
    email: String(row.email || ""),
  }
}

async function findMemberPrincipal(db: any, input: { subject?: string; email?: string }) {
  const email = String(input.email || "").trim()
  const subject = String(input.subject || "").trim()

  const row = await db
    .prepare(
      `SELECT id, organization_id, role, email
       FROM members
       WHERE COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         AND (
           (? <> '' AND lower(email) = lower(?))
           OR (? <> '' AND clerk_user_id = ?)
         )
       ORDER BY
         CASE role
           WHEN 'super-admin' THEN 0
           WHEN 'admin' THEN 1
           WHEN 'direzione' THEN 2
           WHEN 'capo-reparto' THEN 3
           ELSE 4
         END,
         created_at ASC
       LIMIT 1`,
    )
    .bind(email, email, subject, subject)
    .first()

  return principalFromMember(db, row)
}

async function verifyConfiguredJwt(token: string) {
  const issuer = process.env.OPTIMA_MCP_ISSUER
  const jwksUri = process.env.OPTIMA_MCP_JWKS_URI
  const audience = process.env.OPTIMA_MCP_AUDIENCE || process.env.OPTIMA_MCP_CLIENT_ID
  if (!issuer || !jwksUri) return null

  const JWKS = createRemoteJWKSet(new URL(jwksUri))
  const result = await jwtVerify(token, JWKS, {
    issuer,
    audience: audience || undefined,
  })

  return result.payload
}

async function verifySharedServiceToken(token: string, db: any) {
  const configured = process.env.OPTIMA_MCP_SERVICE_TOKEN
  if (!configured || token !== configured) return null

  const serviceEmail = process.env.OPTIMA_MCP_SERVICE_MEMBER_EMAIL || "axel@wearerighello.com"
  const row = await db
    .prepare(
      `SELECT id, organization_id, role, email
       FROM members
       WHERE lower(email) = lower(?)
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1`,
    )
    .bind(serviceEmail)
    .first()

  return principalFromMember(db, row)
}

export async function requireMcpPrincipal(request: Request) {
  const token = bearerToken(request)
  if (!token) return { error: unauthorizedMcpResponse(request), db: null, principal: null }

  const db = await getCloudflareDb()
  if (!db) {
    return {
      error: Response.json({ error: "Database Cloudflare non disponibile." }, { status: 500 }),
      db: null,
      principal: null,
    }
  }

  try {
    const servicePrincipal = await verifySharedServiceToken(token, db)
    if (servicePrincipal) return { error: null, db, principal: servicePrincipal }

    const claims = await verifyConfiguredJwt(token)
    if (!claims) return { error: unauthorizedMcpResponse(request), db, principal: null }

    const principal = await findMemberPrincipal(db, {
      subject: typeof claims.sub === "string" ? claims.sub : "",
      email:
        typeof claims.email === "string"
          ? claims.email
          : typeof claims.preferred_username === "string"
            ? claims.preferred_username
            : "",
    })

    if (!principal) return { error: unauthorizedMcpResponse(request), db, principal: null }
    return { error: null, db, principal }
  } catch (error) {
    console.warn("MCP auth failed:", error)
    return { error: unauthorizedMcpResponse(request), db, principal: null }
  }
}

export function canUseManagerMcpTools(principal: WorkspacePrincipal) {
  return MANAGER_ROLES.has(principal.role)
}
