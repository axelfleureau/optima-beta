import { hashMcpToken, storeMcpAccessToken } from "@/lib/mcp-auth"
import { getCloudflareDb } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"

function formValue(body: URLSearchParams, key: string) {
  return String(body.get(key) || "").trim()
}

function basicSecret(request: Request) {
  const header = request.headers.get("authorization") || ""
  if (!header.toLowerCase().startsWith("basic ")) return ""

  try {
    const decoded = atob(header.slice("basic ".length).trim())
    const separator = decoded.indexOf(":")
    if (separator < 0) return ""
    return decoded.slice(separator + 1)
  } catch {
    return ""
  }
}

function basicClientId(request: Request) {
  const header = request.headers.get("authorization") || ""
  if (!header.toLowerCase().startsWith("basic ")) return ""

  try {
    const decoded = atob(header.slice("basic ".length).trim())
    const separator = decoded.indexOf(":")
    if (separator < 0) return decoded
    return decoded.slice(0, separator)
  } catch {
    return ""
  }
}

function safeEquals(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  let binary = ""
  new Uint8Array(digest).forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    {
      error,
      error_description: description,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  )
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || ""
  const body = contentType.includes("application/x-www-form-urlencoded")
    ? new URLSearchParams(await request.text())
    : new URLSearchParams()

  const grantType = formValue(body, "grant_type")

  if (grantType === "client_credentials") {
    const configuredServiceToken = process.env.OPTIMA_MCP_SERVICE_TOKEN || ""
    if (!configuredServiceToken) {
      return oauthError("server_error", "OPTIMA_MCP_SERVICE_TOKEN non configurato.", 503)
    }

    const providedSecret = basicSecret(request) || formValue(body, "client_secret")
    if (!safeEquals(providedSecret, configuredServiceToken)) {
      return oauthError("invalid_client", "Credenziali MCP non valide.", 401)
    }

    const requestedScope = formValue(body, "scope")
    const scope = requestedScope || "optima:read optima:agent-jobs optima:repositories optima:reports optima:connectors"

    return Response.json(
      {
        access_token: configuredServiceToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    )
  }

  if (grantType !== "authorization_code") {
    return oauthError("unsupported_grant_type", "Usa authorization_code + PKCE oppure client_credentials per runtime interni.")
  }

  if (process.env.OPTIMA_MCP_OAUTH_ENABLED === "false") {
    return oauthError("server_error", "OAuth Authorization Code MCP disabilitato.", 503)
  }

  const code = formValue(body, "code")
  const redirectUri = formValue(body, "redirect_uri")
  const codeVerifier = formValue(body, "code_verifier")
  const clientId = formValue(body, "client_id") || basicClientId(request) || "optima-mcp-client"

  if (!code || !redirectUri || !codeVerifier) {
    return oauthError("invalid_request", "code, redirect_uri e code_verifier sono obbligatori.")
  }

  const db = await getCloudflareDb()
  if (!db) return oauthError("server_error", "Database Cloudflare non disponibile.", 503)

  const now = new Date().toISOString()
  const codeHash = await hashMcpToken(code)
  let row: any = null
  try {
    row = await db
      .prepare(
        `SELECT *
         FROM mcp_oauth_authorization_codes
         WHERE code_hash = ?
           AND consumed_at IS NULL
           AND expires_at > ?
         LIMIT 1`,
      )
      .bind(codeHash, now)
      .first()
  } catch (error) {
    console.error("MCP OAuth code lookup failed:", error)
    return oauthError("server_error", "Migration OAuth MCP non applicata o database non disponibile.", 503)
  }

  if (!row) return oauthError("invalid_grant", "Authorization code non valido o scaduto.", 400)
  if (String(row.redirect_uri || "") !== redirectUri || String(row.client_id || "") !== clientId) {
    return oauthError("invalid_grant", "Authorization code non corrisponde a client_id o redirect_uri.", 400)
  }
  if (String(row.code_challenge_method || "S256") !== "S256") {
    return oauthError("invalid_grant", "Metodo PKCE non supportato.", 400)
  }

  const expectedChallenge = String(row.code_challenge || "")
  const actualChallenge = await pkceChallenge(codeVerifier)
  if (!safeEquals(expectedChallenge, actualChallenge)) {
    return oauthError("invalid_grant", "PKCE code_verifier non valido.", 400)
  }

  await db
    .prepare(
      `UPDATE mcp_oauth_authorization_codes
       SET consumed_at = ?
       WHERE code_hash = ? AND consumed_at IS NULL`,
    )
    .bind(now, codeHash)
    .run()

  let scopes: unknown = []
  try {
    scopes = JSON.parse(String(row.scopes_json || "[]"))
  } catch {
    scopes = []
  }
  const normalizedScopes = Array.isArray(scopes) ? scopes.map((scope) => String(scope)).filter(Boolean) : []
  const issued = await storeMcpAccessToken(db, {
    organizationId: String(row.organization_id),
    memberId: String(row.member_id),
    clientId,
    scopes: normalizedScopes,
    ttlSeconds: 3600,
  })

  return Response.json(
    {
      access_token: issued.token,
      token_type: "Bearer",
      expires_in: issued.expiresIn,
      scope: normalizedScopes.join(" "),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  )
}
