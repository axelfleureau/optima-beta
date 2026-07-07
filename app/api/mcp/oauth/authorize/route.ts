import { NextRequest } from "next/server"

import { createId } from "@/lib/cloudflare-db"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { createOpaqueMcpToken, hashMcpToken } from "@/lib/mcp-auth"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

const DEFAULT_SCOPES = ["optima:read", "optima:agent-jobs", "optima:repositories", "optima:reports", "optima:connectors"]

function html(title: string, body: string, status = 400) {
  return new Response(
    `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #070b14; color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(680px, calc(100vw - 32px)); border: 1px solid rgba(255,255,255,.12); border-radius: 18px; background: #111827; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,.35); }
      h1 { margin: 0 0 12px; font-size: clamp(28px, 6vw, 42px); line-height: 1; }
      p { color: #cbd5e1; line-height: 1.7; }
      code { color: #f9a8d4; word-break: break-word; }
    </style>
  </head>
  <body><main><h1>${title}</h1>${body}</main></body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  )
}

function parseScopes(value: string | null) {
  const scopes = String(value || "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
  return scopes.length ? scopes : DEFAULT_SCOPES
}

function allowedRedirectUris() {
  return String(process.env.OPTIMA_MCP_ALLOWED_REDIRECT_URIS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function isLoopbackRedirect(url: URL) {
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]")
  )
}

function isAllowedRedirectUri(raw: string, request: NextRequest) {
  try {
    const url = new URL(raw)
    const allowlist = allowedRedirectUris()
    if (allowlist.length) return allowlist.includes(url.toString())

    const origin = new URL(request.url).origin
    return url.origin === origin || isLoopbackRedirect(url)
  } catch {
    return false
  }
}

function redirectWithError(redirectUri: string, state: string, error: string, description: string) {
  const url = new URL(redirectUri)
  url.searchParams.set("error", error)
  url.searchParams.set("error_description", description)
  if (state) url.searchParams.set("state", state)
  return Response.redirect(url.toString(), 302)
}

export async function GET(request: NextRequest) {
  if (process.env.OPTIMA_MCP_OAUTH_ENABLED === "false") {
    return html("OAuth MCP disabilitato", "<p>Il login OAuth MCP interno non e abilitato in questo runtime.</p>", 503)
  }

  const url = new URL(request.url)
  const responseType = url.searchParams.get("response_type")
  const clientId = String(url.searchParams.get("client_id") || "optima-mcp-client").trim()
  const redirectUri = String(url.searchParams.get("redirect_uri") || "").trim()
  const state = String(url.searchParams.get("state") || "")
  const codeChallenge = String(url.searchParams.get("code_challenge") || "").trim()
  const codeChallengeMethod = String(url.searchParams.get("code_challenge_method") || "S256").trim()
  const scopes = parseScopes(url.searchParams.get("scope"))

  if (responseType !== "code") {
    return html("Richiesta OAuth non valida", "<p>Optima MCP supporta solo <code>response_type=code</code>.</p>")
  }
  if (!clientId) {
    return html("Client OAuth mancante", "<p>Il client MCP deve inviare un <code>client_id</code>.</p>")
  }
  if (!redirectUri || !isAllowedRedirectUri(redirectUri, request)) {
    return html(
      "Redirect URI non autorizzato",
      "<p>Configura <code>OPTIMA_MCP_ALLOWED_REDIRECT_URIS</code> oppure usa un redirect loopback locale del client MCP.</p>",
    )
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return redirectWithError(redirectUri, state, "invalid_request", "Optima MCP richiede PKCE con code_challenge_method=S256.")
  }

  const user = await requireClerkUser()
  if (!user) {
    const callbackUrl = `${url.pathname}${url.search}`
    return Response.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url).toString(), 302)
  }

  const db = await getCloudflareDb()
  if (!db) return redirectWithError(redirectUri, state, "server_error", "Database Optima non disponibile.")

  try {
    const principal = await ensureWorkspacePrincipal(db, user)
    const code = createOpaqueMcpToken("opt_mcp_code")
    const codeHash = await hashMcpToken(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await db
      .prepare(
        `INSERT INTO mcp_oauth_authorization_codes (
          id, code_hash, organization_id, member_id, client_id, redirect_uri,
          scopes_json, code_challenge, code_challenge_method, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId("mcpac"),
        codeHash,
        principal.organizationId,
        principal.memberId,
        clientId,
        redirectUri,
        JSON.stringify(scopes),
        codeChallenge,
        codeChallengeMethod,
        expiresAt,
      )
      .run()

    const redirect = new URL(redirectUri)
    redirect.searchParams.set("code", code)
    if (state) redirect.searchParams.set("state", state)
    return Response.redirect(redirect.toString(), 302)
  } catch (error) {
    console.error("Error authorizing MCP OAuth:", error)
    return redirectWithError(redirectUri, state, "server_error", "Errore durante il login OAuth MCP.")
  }
}
