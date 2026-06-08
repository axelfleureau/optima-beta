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

function safeEquals(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
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
  const configuredServiceToken = process.env.OPTIMA_MCP_SERVICE_TOKEN || ""
  if (!configuredServiceToken) {
    return oauthError("server_error", "OPTIMA_MCP_SERVICE_TOKEN non configurato.", 503)
  }

  const contentType = request.headers.get("content-type") || ""
  const body = contentType.includes("application/x-www-form-urlencoded")
    ? new URLSearchParams(await request.text())
    : new URLSearchParams()

  const grantType = formValue(body, "grant_type")
  if (grantType !== "client_credentials") {
    return oauthError("unsupported_grant_type", "Usa grant_type=client_credentials per Optima MCP server-to-server.")
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
