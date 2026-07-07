import { createRemoteJWKSet, jwtVerify } from "jose"

import { createId } from "@/lib/cloudflare-db"
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

export type McpAuthMode = "authorization_code" | "jwt_bearer" | "service_token" | "missing"

export function getMcpAuthReadiness() {
  const authorizationEndpoint =
    process.env.OPTIMA_MCP_AUTHORIZATION_ENDPOINT || `${appBaseUrl()}/api/mcp/oauth/authorize`
  const tokenEndpoint = process.env.OPTIMA_MCP_TOKEN_ENDPOINT || `${appBaseUrl()}/api/mcp/oauth/token`
  const issuer = process.env.OPTIMA_MCP_ISSUER || ""
  const jwksUri = process.env.OPTIMA_MCP_JWKS_URI || ""
  const serviceToken = process.env.OPTIMA_MCP_SERVICE_TOKEN || ""

  const authorizationCodeConfigured = process.env.OPTIMA_MCP_OAUTH_ENABLED !== "false" && Boolean(authorizationEndpoint && tokenEndpoint)
  const jwtBearerConfigured = Boolean(issuer && jwksUri)
  const serviceTokenConfigured = Boolean(serviceToken)
  const configured = authorizationCodeConfigured || jwtBearerConfigured || serviceTokenConfigured

  const mode: McpAuthMode = authorizationCodeConfigured
    ? "authorization_code"
    : jwtBearerConfigured
      ? "jwt_bearer"
      : serviceTokenConfigured
        ? "service_token"
        : "missing"

  return {
    configured,
    mode,
    authorizationCodeConfigured,
    jwtBearerConfigured,
    serviceTokenConfigured,
    authorizationEndpoint: authorizationEndpoint || null,
    tokenEndpoint: tokenEndpoint || null,
    issuer: issuer || null,
    jwksUri: jwksUri || null,
  }
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function createOpaqueMcpToken(prefix = "opt_mcp") {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return `${prefix}_${toBase64Url(bytes)}`
}

export async function hashMcpToken(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return toBase64Url(new Uint8Array(digest))
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

async function verifyInternalMcpAccessToken(token: string, db: any) {
  try {
    const tokenHash = await hashMcpToken(token)
    const now = new Date().toISOString()
    const row = await db
      .prepare(
        `SELECT m.id, m.organization_id, m.role, m.email
         FROM mcp_oauth_access_tokens t
         JOIN members m ON m.id = t.member_id AND m.organization_id = t.organization_id
         WHERE t.token_hash = ?
           AND t.revoked_at IS NULL
           AND t.expires_at > ?
           AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         LIMIT 1`,
      )
      .bind(tokenHash, now)
      .first()

    return principalFromMember(db, row)
  } catch (error) {
    console.warn("Internal MCP OAuth token lookup unavailable:", error)
    return null
  }
}

export async function storeMcpAccessToken(
  db: any,
  input: {
    organizationId: string
    memberId: string
    clientId: string
    scopes: string[]
    ttlSeconds?: number
  },
) {
  const token = createOpaqueMcpToken()
  const tokenHash = await hashMcpToken(token)
  const ttlSeconds = Math.max(300, Math.min(86400, input.ttlSeconds ?? 3600))
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()

  await db
    .prepare(
      `INSERT INTO mcp_oauth_access_tokens (
        id, token_hash, organization_id, member_id, client_id, scopes_json, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      createId("mcpat"),
      tokenHash,
      input.organizationId,
      input.memberId,
      input.clientId,
      JSON.stringify(input.scopes),
      expiresAt,
    )
    .run()

  return { token, expiresAt, expiresIn: ttlSeconds }
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

    const internalPrincipal = await verifyInternalMcpAccessToken(token, db)
    if (internalPrincipal) return { error: null, db, principal: internalPrincipal }

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
