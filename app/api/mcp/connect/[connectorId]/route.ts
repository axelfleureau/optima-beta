import { NextRequest } from "next/server"

import { getStrategicMcpConnectors } from "@/lib/mcp-connectors"
import { upsertConnectorInstallation } from "@/lib/agentic-capabilities"
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

const OAUTH_DEFAULTS: Record<string, { prefix: string; authorizeUrl?: string; clientIdEnv?: string; scopeEnv?: string }> = {
  "google-business-profile": {
    prefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    scopeEnv: "GOOGLE_BUSINESS_PROFILE_SCOPES",
  },
  "google-calendar": {
    prefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    scopeEnv: "GOOGLE_CALENDAR_SCOPES",
  },
  "google-drive": {
    prefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    scopeEnv: "GOOGLE_DRIVE_SCOPES",
  },
  "meta-business-suite": {
    prefix: "META",
    authorizeUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    scopeEnv: "META_REQUIRED_SCOPES",
  },
  "linkedin-pages": {
    prefix: "LINKEDIN",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    scopeEnv: "LINKEDIN_REQUIRED_SCOPES",
  },
  notion: {
    prefix: "NOTION",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    clientIdEnv: "NOTION_OAUTH_CLIENT_ID",
    scopeEnv: "NOTION_REQUIRED_SCOPES",
  },
  vercel: {
    prefix: "VERCEL",
    authorizeUrl: "https://vercel.com/oauth/authorize",
    clientIdEnv: "VERCEL_CLIENT_ID",
    scopeEnv: "VERCEL_REQUIRED_SCOPES",
  },
}

function appBaseUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.OPTIMA_PUBLIC_URL
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

function envValue(name: string) {
  return process.env[name]?.trim() || ""
}

function oauthDefaults(connectorId: string) {
  return OAUTH_DEFAULTS[connectorId] ?? {
    prefix: connectorId.replace(/-/g, "_").toUpperCase(),
  }
}

function oauthEnv(connectorId: string) {
  const defaults = oauthDefaults(connectorId)
  const prefix = defaults.prefix
  return {
    authorizeUrlEnv: `${prefix}_OAUTH_AUTHORIZE_URL`,
    authorizeUrl: envValue(`${prefix}_OAUTH_AUTHORIZE_URL`) || defaults.authorizeUrl || "",
    clientIdEnv: defaults.clientIdEnv || `${prefix}_OAUTH_CLIENT_ID`,
    clientId: envValue(defaults.clientIdEnv || `${prefix}_OAUTH_CLIENT_ID`),
    redirectUriEnv: `${prefix}_OAUTH_REDIRECT_URI`,
    redirectUri: envValue(`${prefix}_OAUTH_REDIRECT_URI`),
    scopeEnv: defaults.scopeEnv || `${prefix}_OAUTH_SCOPES`,
    scopes: envValue(defaults.scopeEnv || `${prefix}_OAUTH_SCOPES`),
  }
}

function buildOAuthUrl(input: {
  authorizeUrl: string
  clientId: string
  redirectUri: string
  state: string
  scopes: string
}) {
  const url = new URL(input.authorizeUrl)
  url.searchParams.set("client_id", input.clientId)
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", input.state)
  if (input.scopes) url.searchParams.set("scope", input.scopes)
  return url.toString()
}

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono avviare installazioni MCP.", status: 403 as const }
  }

  return { db, principal }
}

export async function POST(request: NextRequest, context: { params: Promise<{ connectorId: string }> }) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const { connectorId } = await context.params
    const connector = getStrategicMcpConnectors().find((item) => item.id === connectorId)
    if (!connector) return Response.json({ error: "Connector MCP non supportato." }, { status: 404 })
    if (connector.authMethod !== "oauth_pkce" && connector.authMethod !== "external_oauth") {
      return Response.json(
        {
          error: "Questo connector non usa OAuth standard.",
          detail: "Usa Browser MCP, runtime env o secret_ref in base al tipo di connector.",
        },
        { status: 400 },
      )
    }

    const oauth = oauthEnv(connector.id)
    const redirectUri =
      oauth.redirectUri || `${appBaseUrl(request)}/api/mcp/oauth/callback/${encodeURIComponent(connector.id)}`
    const missingEnv = [
      oauth.authorizeUrl ? "" : oauth.authorizeUrlEnv,
      oauth.clientId ? "" : oauth.clientIdEnv,
    ].filter(Boolean)

    if (missingEnv.length) {
      return Response.json(
        {
          error: "OAuth app non configurata.",
          detail: "Crea prima la app developer del provider e configura client id, redirect allowlist e scope minimi nel runtime.",
          missingEnv,
          connector: connector.label,
          redirectUri,
        },
        { status: 409 },
      )
    }

    const state = crypto.randomUUID()
    await upsertConnectorInstallation(auth.db, auth.principal, {
      connectorId: connector.id,
      installState: "guide_required",
      authMethod: connector.authMethod,
      scopes: connector.graphUse,
      oauthSubject: null,
      config: {
        oauth: {
          state,
          redirectUri,
          scopeEnv: oauth.scopeEnv,
          startedAt: new Date().toISOString(),
          status: "authorization_started",
        },
      },
      secretRef: `${connector.id}:oauth_runtime_secret`,
    })

    return Response.json({
      connector: connector.label,
      authorizationUrl: buildOAuthUrl({
        authorizeUrl: oauth.authorizeUrl,
        clientId: oauth.clientId,
        redirectUri,
        state,
        scopes: oauth.scopes,
      }),
      state,
      redirectUri,
      scopeEnv: oauth.scopeEnv,
      note: "Optima apre il consenso OAuth. Token e refresh restano nel runtime/secret vault, non in D1.",
    })
  } catch (error: any) {
    console.error("Error starting MCP OAuth:", error)
    return Response.json({ error: error?.message ?? "Errore avvio OAuth MCP." }, { status: 500 })
  }
}
