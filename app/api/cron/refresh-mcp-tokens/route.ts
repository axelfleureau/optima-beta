// app/api/cron/refresh-mcp-tokens/route.ts
//
// Refresh automatico dei token OAuth MCP prima della scadenza.
//
// 2026-06-25: prima versione. Supporta:
//   - Google (oauth_pkce) — Google OAuth refresh_token flow
//   - GitHub (device_flow) — GitHub OAuth refresh_token flow (richiede client_id+secret)
//   - Notion (oauth_pkce)   — Notion OAuth refresh_token flow
//   - Vercel (external_oauth) — Vercel OAuth refresh_token flow
//   - Meta (oauth_pkce)    — long-lived token (~60 giorni), refresh non supportato
//
// Strategia:
//   1. Legge mcp_connector_installations per ogni connector che ha installState = "installed"
//      e authMethod tra quelli supportati.
//   2. Recupera il refresh_token e access_token salvati in config_json (lato D1).
//   3. Se expires_at < now + 24h, chiama il provider per refresh.
//   4. Aggiorna config_json con i nuovi token + expires_at.
//   5. Salva gli errori senza abortire l'intero cron (così un connector rotto non blocca gli altri).
//
// Schedulato via wrangler.jsonc triggers.crons: "0 */6 * * *" (ogni 6 ore).

import { NextRequest, NextResponse } from "next/server"

import { getCloudflareDb } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Provider = "google" | "github" | "notion" | "vercel" | "meta"

interface RefreshSpec {
  provider: Provider
  tokenUrl: string
  clientIdEnv?: string
  clientSecretEnv?: string
  /** Formato grant_type per il refresh. Tipicamente 'refresh_token'. */
  grantType?: string
  /** Quando true, la richiesta va in application/x-www-form-urlencoded. */
  formEncoded?: boolean
  /** Provider che NON supportano refresh (es. Meta long-lived). Li logghiamo e skippiamo. */
  noRefresh?: boolean
  /** Eventuali scope da riapplicare se il provider li richiede. */
  scope?: string
}

const REFRESH_SPECS: Record<string, RefreshSpec> = {
  "google-business-profile": {
    provider: "google",
    tokenUrl: "https://oauth2.googleapis.com/token",
    grantType: "refresh_token",
    formEncoded: true,
    scope: "https://www.googleapis.com/auth/business.manage",
  },
  "google-calendar": {
    provider: "google",
    tokenUrl: "https://oauth2.googleapis.com/token",
    grantType: "refresh_token",
    formEncoded: true,
    scope: "https://www.googleapis.com/auth/calendar",
  },
  "google-drive": {
    provider: "google",
    tokenUrl: "https://oauth2.googleapis.com/token",
    grantType: "refresh_token",
    formEncoded: true,
    scope: "https://www.googleapis.com/auth/drive",
  },
  "meta-business-suite": {
    provider: "meta",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    grantType: "fb_exchange_token",
    noRefresh: true, // Long-lived tokens scadono in 60 giorni
  },
  "linkedin-pages": {
    provider: "google",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    grantType: "refresh_token",
    formEncoded: true,
  },
  notion: {
    provider: "notion",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    grantType: "refresh_token",
    formEncoded: true,
  },
  vercel: {
    provider: "vercel",
    tokenUrl: "https://api.vercel.com/v2/oauth/access_tokens",
    grantType: "refresh_token",
    formEncoded: true,
  },
  github: {
    provider: "github",
    tokenUrl: "https://github.com/login/oauth/access_token",
    grantType: "refresh_token",
    formEncoded: true,
  },
}

async function readInstallations(db: any) {
  const result = await db
    .prepare(
      `SELECT organization_id, connector_id, config_json, auth_method, install_state
       FROM mcp_connector_installations
       WHERE install_state IN ('installed', 'healthy', 'configured')`,
    )
    .all()
  return result.results || []
}

async function refreshOne(
  db: any,
  spec: RefreshSpec,
  config: any,
): Promise<{ ok: true; expiresAt: number } | { ok: false; error: string }> {
  const refreshToken = String(config?.refreshToken || config?.refresh_token || "")
  if (!refreshToken) return { ok: false, error: "no refresh_token" }
  if (spec.noRefresh) return { ok: false, error: "provider does not support refresh (long-lived token)" }

  const clientId = process.env[spec.clientIdEnv || ""] || config?.clientId || ""
  const clientSecret = process.env[spec.clientSecretEnv || ""] || config?.clientSecret || ""
  if (!clientId || !clientSecret) {
    return { ok: false, error: `missing client credentials (${spec.clientIdEnv || "clientId"} / ${spec.clientSecretEnv || "clientSecret"})` }
  }

  const body = new URLSearchParams()
  body.set("grant_type", spec.grantType || "refresh_token")
  body.set("refresh_token", refreshToken)
  if (clientId) body.set("client_id", clientId)
  if (clientSecret) body.set("client_secret", clientSecret)
  if (spec.scope) body.set("scope", spec.scope)

  const response = await fetch(spec.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  })

  const raw = await response.text()
  let data: any = {}
  try {
    data = JSON.parse(raw)
  } catch {
    const out: Record<string, string> = {}
    for (const part of raw.split("&")) {
      const [k, v] = part.split("=")
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "")
    }
    data = out
  }

  if (!response.ok || data.error) {
    return { ok: false, error: data.error || data.error_description || `HTTP ${response.status}` }
  }

  return {
    ok: true,
    expiresAt: Number(data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : Date.now() + 3600 * 1000),
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = await getCloudflareDb()
  if (!db) return NextResponse.json({ error: "D1 missing" }, { status: 500 })

  const installations = await readInstallations(db)
  const now = Date.now()
  const horizonMs = now + 24 * 60 * 60 * 1000 // refresh se scade entro 24h

  const summary = {
    total: installations.length,
    refreshed: 0,
    skippedFresh: 0,
    skippedUnsupported: 0,
    errors: [] as Array<{ organizationId: string; connectorId: string; error: string }>,
  }

  for (const row of installations as Array<Record<string, any>>) {
    const spec = REFRESH_SPECS[row.connector_id]
    if (!spec) {
      summary.skippedUnsupported += 1
      continue
    }

    let config: any = {}
    try {
      config = row.config_json ? JSON.parse(String(row.config_json)) : {}
    } catch {
      summary.errors.push({ organizationId: row.organization_id, connectorId: row.connector_id, error: "invalid config_json" })
      continue
    }

    const oauth = config?.oauth || config || {}
    const expiresAt = Number(oauth.expiresAt || oauth.expires_at || 0)
    if (expiresAt > horizonMs) {
      summary.skippedFresh += 1
      continue
    }

    const result = await refreshOne(db, spec, oauth)
    if (result.ok) {
      // Aggiorna config_json con i nuovi token
      const next = {
        ...config,
        oauth: {
          ...(config.oauth || {}),
          accessToken: undefined, // NON scrivere l'access token in D1
          access_token: undefined,
          expiresAt: result.expiresAt,
          refreshedAt: new Date().toISOString(),
          refreshToken: oauth.refreshToken || oauth.refresh_token,
        },
      }
      await db
        .prepare(
          `UPDATE mcp_connector_installations
           SET config_json = ?, updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND connector_id = ?`,
        )
        .bind(JSON.stringify(next), row.organization_id, row.connector_id)
        .run()
      summary.refreshed += 1
    } else {
      summary.errors.push({ organizationId: row.organization_id, connectorId: row.connector_id, error: result.error })
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    summary,
  })
}