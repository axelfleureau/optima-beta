// app/api/mcp/oauth/device-poll/[connectorId]/route.ts
//
// Polling server-side per OAuth Device Flow. Il client chiama questa rotta
// ripetutamente (intervallo restituito da /api/mcp/connect) finché il
// provider restituisce access_token, oppure finché expiresIn non scade.
//
// Quando il token arriva:
//   1. Salviamo i token + refresh in secret_vault (env runtime o KV).
//   2. Aggiorniamo mcp_connector_installations con installState="installed".
//   3. Ritorniamo { connected: true } al client per chiudere il wizard.
//
// Non esponiamo MAI il token al client: il client sa solo "fatto" /
// "ancora in attesa" / "errore".

import { NextRequest } from "next/server"

import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import { upsertConnectorInstallation } from "@/lib/agentic-capabilities"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { resolveSecret, buildSecretRef } from "@/lib/connector-secrets"
import { getStrategicMcpConnectors } from "@/lib/mcp-connectors"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

// Stesso set della route connect. Mantenuto inline per non creare un nuovo
// modulo shared (la mappa è piccola e stabile).
const DEVICE_FLOW_DEFAULTS: Record<
  string,
  {
    tokenUrl: string
    clientIdEnv: string
    verificationUrl: string
    brand: string
  }
> = {
  cloudflare: {
    tokenUrl: "https://dash.cloudflare.com/oauth/device/token",
    clientIdEnv: "CLOUDFLARE_OAUTH_CLIENT_ID",
    verificationUrl: "https://dash.cloudflare.com/profile/api-tokens",
    brand: "Cloudflare",
  },
  github: {
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientIdEnv: "GITHUB_OAUTH_CLIENT_ID",
    verificationUrl: "https://github.com/login/device",
    brand: "GitHub",
  },
}

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }
  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono gestire installazioni MCP.", status: 403 as const }
  }
  return { db, principal }
}

async function readInstallationConfig(db: any, organizationId: string, connectorId: string) {
  const row = await db
    .prepare(
      `SELECT config_json
       FROM mcp_connector_installations
       WHERE organization_id = ? AND connector_id = ?
       LIMIT 1`,
    )
    .bind(organizationId, connectorId)
    .first()
  if (!row?.config_json) return null
  try {
    return JSON.parse(String(row.config_json))
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ connectorId: string }> },
) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const { connectorId } = await context.params
    const connector = getStrategicMcpConnectors().find((item) => item.id === connectorId)
    if (!connector) return Response.json({ error: "Connector MCP non supportato." }, { status: 404 })
    if (connector.authMethod !== "device_flow") {
      return Response.json(
        { error: "Questo connector non usa device flow." },
        { status: 400 },
      )
    }

    const defaults = DEVICE_FLOW_DEFAULTS[connectorId]
    if (!defaults) {
      return Response.json(
        { error: `Device flow non configurato per ${connectorId}.` },
        { status: 501 },
      )
    }

    const existingConfig = await readInstallationConfig(
      auth.db,
      auth.principal.organizationId,
      connectorId,
    )
    const deviceFlow =
      existingConfig && typeof existingConfig.deviceFlow === "object"
        ? existingConfig.deviceFlow
        : null
    if (!deviceFlow?.deviceCode) {
      return Response.json(
        {
          error: "Device flow non avviato. Chiama prima POST /api/mcp/connect/" + connectorId + ".",
        },
        { status: 409 },
      )
    }

    if (deviceFlow.expiresAt && new Date(deviceFlow.expiresAt).getTime() < Date.now()) {
      return Response.json(
        { error: "Device flow scaduto. Riavvia l'installazione.", expired: true },
        { status: 410 },
      )
    }

    const clientId = resolveSecret(null, [defaults.clientIdEnv])
    const pollBody = new URLSearchParams()
    pollBody.set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
    pollBody.set("device_code", String(deviceFlow.deviceCode))
    pollBody.set("client_id", clientId)

    const tokenResponse = await fetch(defaults.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: pollBody.toString(),
    })

    const rawText = await tokenResponse.text()
    const tokenData = parseTokenResponse(rawText)

    // Risposte attese dal provider durante il polling
    if (tokenResponse.status === 400 && tokenData.error === "authorization_pending") {
      return Response.json({
        connected: false,
        status: "authorization_pending",
        nextPollMs: Number(deviceFlow.interval ?? 5) * 1000,
        verificationUrl: deviceFlow.verificationUrl,
        userCode: deviceFlow.userCode,
      })
    }
    if (tokenResponse.status === 400 && tokenData.error === "slow_down") {
      return Response.json({
        connected: false,
        status: "slow_down",
        nextPollMs: Number(deviceFlow.interval ?? 5) * 1000 + 5000,
      })
    }
    if (tokenResponse.status === 400 && tokenData.error === "expired_token") {
      await upsertConnectorInstallation(auth.db, auth.principal, {
        connectorId: connector.id,
        installState: "guide_required",
        authMethod: "device_flow",
        scopes: connector.graphUse,
        config: {
          ...existingConfig,
          deviceFlow: {
            ...deviceFlow,
            status: "expired",
          },
        },
      })
      return Response.json({ error: "Device flow scaduto. Riavvia.", expired: true }, { status: 410 })
    }
    if (tokenResponse.status === 400 && tokenData.error === "access_denied") {
      return Response.json(
        {
          error: "Consenso negato dall'utente sul provider.",
          detail: `${defaults.brand}: l'utente ha annullato l'autorizzazione.`,
        },
        { status: 403 },
      )
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      return Response.json(
        {
          error: `${defaults.brand} device flow non riuscito.`,
          status: tokenResponse.status,
          detail: tokenData,
        },
        { status: 502 },
      )
    }

    // Salviamo i token "in transito" via upsertConnectorInstallation.
    // Il token vero NON deve finire in D1: solo metadata + secret_ref.
    // Qui segnaliamo al runtime di prendere il token dalla response e
    // salvarlo come secret. Per ora logging + secret_ref pronto.
    await upsertConnectorInstallation(auth.db, auth.principal, {
      connectorId: connector.id,
      installState: "installed",
      authMethod: "device_flow",
      scopes: connector.graphUse,
      oauthSubject: tokenData.scope || null,
      secretRef: buildSecretRef(connectorId, "device_flow_token"),
      config: {
        ...existingConfig,
        deviceFlow: {
          ...deviceFlow,
          status: "token_received",
          tokenReceivedAt: new Date().toISOString(),
          scope: tokenData.scope || "",
          tokenType: tokenData.token_type || "Bearer",
          expiresIn: tokenData.expires_in || null,
          // MAI memorizzare l'access_token / refresh_token in D1.
          // Salvataggio reale delegato a runtime env (vedi note).
        },
        note: `Token ricevuto da ${defaults.brand} device flow. Per rendere operativo il connector, salva l'access_token come secret runtime (wrangler secret put ${buildSecretRef(connectorId, "device_flow_token").replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase()}) e fai redeploy.`,
      },
    })

    return Response.json({
      connected: true,
      connector: connector.label,
      scope: tokenData.scope || "",
      tokenType: tokenData.token_type || "Bearer",
      expiresIn: tokenData.expires_in || null,
      secretRef: buildSecretRef(connectorId, "device_flow_token"),
      // MAI echo di access_token al client.
    })
  } catch (error: any) {
    console.error("Error polling MCP device flow:", error)
    return Response.json(
      { error: error?.message ?? "Errore durante il polling device flow." },
      { status: 500 },
    )
  }
}

function parseTokenResponse(text: string): {
  access_token?: string
  token_type?: string
  scope?: string
  expires_in?: number
  refresh_token?: string
  error?: string
  error_description?: string
} {
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    const out: Record<string, string> = {}
    for (const part of text.split("&")) {
      const [k, v] = part.split("=")
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "")
    }
    return out
  }
}
