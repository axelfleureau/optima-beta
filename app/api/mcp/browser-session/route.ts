import { NextRequest } from "next/server"

import { getAgenticCapabilitySnapshot, upsertConnectorInstallation } from "@/lib/agentic-capabilities"
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

function appBaseUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.OPTIMA_PUBLIC_URL
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

function browserGatewayUrl() {
  return (
    process.env.BROWSER_MCP_GATEWAY_URL ||
    process.env.BROWSER_MCP_ENDPOINT ||
    ""
  ).replace(/\/$/, "")
}

function browserGatewayFallbackUrl(gateway: string) {
  const configured = (
    process.env.BROWSER_MCP_FALLBACK_URL ||
    process.env.BROWSER_MCP_DIRECT_URL ||
    ""
  ).replace(/\/$/, "")
  if (configured) return configured
  if (gateway.includes("padel-vps.tailcd2fda.ts.net")) {
    return gateway.replace("padel-vps.tailcd2fda.ts.net", "100.100.39.96")
  }
  return ""
}

function pairingCode() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const value = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
  return `${value.slice(0, 4)}-${value.slice(4, 8)}`
}

function normalizeBrowserTarget(target: string) {
  const normalized = String(target || "chatgpt").toLowerCase().trim()
  if (normalized === "nanobanana" || normalized === "nano-banana" || normalized === "nano_banana") {
    return "gemini"
  }
  if (normalized === "chatgpt" || normalized === "gemini" || normalized === "perplexity" || normalized === "claude") {
    return normalized
  }
  return "chatgpt"
}

function targetStartUrl(target: string) {
  if (target === "chatgpt") return "https://chatgpt.com"
  if (target === "gemini") return "https://gemini.google.com/app"
  if (target === "perplexity") return "https://www.perplexity.ai"
  if (target === "claude") return "https://claude.ai"
  return "https://chatgpt.com"
}

function targetDisplayName(target: string) {
  if (target === "gemini") return "Gemini / Nano Banana"
  if (target === "chatgpt") return "ChatGPT"
  if (target === "perplexity") return "Perplexity"
  if (target === "claude") return "Claude"
  return target
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono avviare sessioni Browser MCP.", status: 403 as const }
  }

  return { db, principal }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const target = normalizeBrowserTarget(String(body.target || "chatgpt"))
    const sessionId = createId("bmcp")
    const code = pairingCode()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString()
    const baseUrl = appBaseUrl(request)
    const callbackUrl = `${baseUrl}/api/mcp/browser-session/callback?session=${sessionId}&code=${encodeURIComponent(code)}`
    const gateway = browserGatewayUrl()
    const fallbackGateway = gateway ? browserGatewayFallbackUrl(gateway) : ""
    const gatewayHealthUrl = gateway ? `${gateway}/health` : null
    const gatewayUrl = gateway
      ? `${gateway}/pair?session=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(code)}&target=${encodeURIComponent(target)}&callback=${encodeURIComponent(callbackUrl)}`
      : null
    const fallbackGatewayHealthUrl = fallbackGateway ? `${fallbackGateway}/health` : null
    const fallbackGatewayUrl = fallbackGateway
      ? `${fallbackGateway}/pair?session=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(code)}&target=${encodeURIComponent(target)}&callback=${encodeURIComponent(callbackUrl)}`
      : null
    const installCommand = [
      "cd /srv/optima-agent/optima-beta",
      "git pull --ff-only",
      "sudo apt-get update",
      "sudo apt-get install -y chromium-browser xvfb x11vnc novnc websockify || sudo apt-get install -y chromium xvfb x11vnc novnc websockify",
      "sudo mkdir -p /srv/optima-agent/browser-profiles/righello",
      "sudo cp runner/optima-browser-mcp-gateway.service /etc/systemd/system/optima-browser-mcp-gateway.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable --now optima-browser-mcp-gateway",
      "sudo systemctl status optima-browser-mcp-gateway --no-pager",
    ].join("\n")

    const session = {
      id: sessionId,
      status: gatewayUrl ? "ready_to_pair" : "gateway_missing",
      connectorId: "browser",
      target,
      targetLabel: targetDisplayName(target),
      startUrl: targetStartUrl(target),
      gatewayUrl,
      gatewayHealthUrl,
      fallbackGatewayUrl,
      fallbackGatewayHealthUrl,
      callbackUrl,
      pairingCode: code,
      expiresAt,
      createdAt: now.toISOString(),
      createdByMemberId: auth.principal.memberId,
      instructions: gatewayUrl
        ? [
            "Apri il link gateway dal dispositivo autorizzato o dal Mac.",
            "Il login deve avvenire nel Chromium isolato del Browser MCP, non nel browser personale del telefono.",
            "Nano Banana viene trattato come Gemini ufficiale: non aprire siti terzi non allowlist.",
            "Completa login/QR sul sito richiesto, poi esegui health-check prima di dichiarare operativo il connector.",
          ]
        : [
            "Configura BROWSER_MCP_GATEWAY_URL sul runtime/Cloudflare prima di usare login guidato.",
            "Il gateway deve esporre un Chromium/Playwright persistente e isolato per tenant.",
            "Dopo il login, salva solo secret_ref/profilo e audit: niente cookie o token in D1.",
          ],
      runnerCommand: `BROWSER_MCP_SESSION=${sessionId} BROWSER_MCP_PAIRING_CODE=${code} BROWSER_MCP_TARGET=${target} BROWSER_MCP_CALLBACK_URL=${callbackUrl} npm run browser:mcp:pair`,
      installCommand,
      missingEnv: gatewayUrl ? [] : ["BROWSER_MCP_GATEWAY_URL"],
    }

    await upsertConnectorInstallation(auth.db, auth.principal, {
      connectorId: "browser",
      installState: "guide_required",
      authMethod: "browser_session_oauth",
      scopes: ["browser_sessions", "audit", "screenshots", "external_tools"],
      secretRef: null,
      oauthSubject: null,
      config: {
        installPattern: "browser_gateway_pairing",
        activePairingSession: session,
      },
    })

    const capabilities = await getAgenticCapabilitySnapshot(auth.db, auth.principal)
    return Response.json({ session, capabilities })
  } catch (error: any) {
    console.error("Error creating Browser MCP session:", error)
    return Response.json(
      { error: error?.message ?? "Errore creazione sessione Browser MCP." },
      { status: 400 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const url = new URL(request.url)
    const requestedTarget = url.searchParams.get("target")
      ? normalizeBrowserTarget(String(url.searchParams.get("target")))
      : null
    const row = (await auth.db
      .prepare(
        `SELECT install_state, auth_method, config_json, updated_at, last_health_at, last_health_status
         FROM mcp_connector_installations
         WHERE organization_id = ?
           AND connector_id = 'browser'
         LIMIT 1`,
      )
      .bind(auth.principal.organizationId)
      .first()) as {
        install_state: string
        auth_method: string
        config_json: string | null
        updated_at: string | null
        last_health_at: string | null
        last_health_status: string | null
      } | null

    const config = row ? (JSON.parse(row.config_json || "{}") as Record<string, unknown>) : {}
    const activePairingSession = config.activePairingSession ?? null
    const connectedSessions = Array.isArray(config.connectedSessions) ? config.connectedSessions : []
    const filteredConnectedSessions = requestedTarget
      ? connectedSessions.filter((session) => asRecord(session).target === requestedTarget)
      : connectedSessions

    return Response.json({
      connector: row
        ? {
            installState: row.install_state,
            authMethod: row.auth_method,
            updatedAt: row.updated_at,
            lastHealthAt: row.last_health_at,
            lastHealthStatus: row.last_health_status,
          }
        : null,
      activePairingSession,
      connectedSessions: filteredConnectedSessions,
      gateway: {
        url: browserGatewayUrl() || null,
        fallbackUrl: browserGatewayUrl() ? browserGatewayFallbackUrl(browserGatewayUrl()) || null : null,
      },
    })
  } catch (error: any) {
    console.error("Error reading Browser MCP session:", error)
    return Response.json(
      { error: error?.message ?? "Errore lettura sessione Browser MCP." },
      { status: 400 },
    )
  }
}
