import { NextRequest } from "next/server"

import { upsertConnectorInstallation } from "@/lib/agentic-capabilities"
import { getStrategicMcpConnectors } from "@/lib/mcp-connectors"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

function html(title: string, body: string, status = 200) {
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
      h1 { margin: 0 0 12px; font-size: clamp(28px, 6vw, 44px); line-height: 1; }
      p { color: #cbd5e1; line-height: 1.7; }
      a { color: #67e8f9; font-weight: 800; }
      code { word-break: break-all; color: #f9a8d4; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      ${body}
    </main>
  </body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  )
}

export async function GET(request: NextRequest, context: { params: Promise<{ connectorId: string }> }) {
  const { connectorId } = await context.params
  const connector = getStrategicMcpConnectors().find((item) => item.id === connectorId)
  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!connector) {
    return html("Connector non supportato", "<p>Optima non riconosce questo connector MCP.</p>", 404)
  }
  if (error) {
    return html(
      "OAuth non autorizzato",
      `<p>Il provider ha restituito errore per <strong>${connector.label}</strong>: <code>${error}</code>.</p><p>Puoi chiudere questa finestra e riprovare da Optima.</p>`,
      400,
    )
  }
  if (!code || !state) {
    return html(
      "Callback incompleta",
      "<p>Il provider non ha restituito codice e state. Torna in Optima e riavvia il collegamento OAuth.</p>",
      400,
    )
  }

  try {
    const user = await requireClerkUser()
    const db = await getCloudflareDb()
    if (user && db) {
      const principal = await ensureWorkspacePrincipal(db, user)
      const existing = await db
        .prepare(
          `SELECT config_json
           FROM mcp_connector_installations
           WHERE organization_id = ? AND connector_id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, connector.id)
        .first()
      const existingConfig = existing?.config_json ? JSON.parse(String(existing.config_json)) : {}
      const existingOauth = typeof existingConfig?.oauth === "object" && existingConfig.oauth ? existingConfig.oauth : {}
      const expectedState = typeof existingOauth.state === "string" ? existingOauth.state : ""

      if (expectedState && expectedState !== state) {
        return html(
          "OAuth state non valido",
          "<p>Il consenso non corrisponde alla sessione OAuth avviata da Optima. Torna in Optima e riavvia il collegamento dal connector.</p>",
          400,
        )
      }

      await upsertConnectorInstallation(db, principal, {
        connectorId: connector.id,
        installState: "guide_required",
        authMethod: connector.authMethod,
        scopes: connector.graphUse,
        oauthSubject: null,
        secretRef: `${connector.id}:oauth_runtime_secret`,
        config: {
          ...existingConfig,
          oauth: {
            ...existingOauth,
            state,
            callbackReceivedAt: new Date().toISOString(),
            status: "authorization_code_received",
            codeReceived: true,
            stateVerified: Boolean(expectedState),
            codeVerifierAvailable: Boolean(existingOauth.codeVerifier),
          },
        },
      })
    }
  } catch (err) {
    console.error("Error recording MCP OAuth callback:", err)
  }

  return html(
    "OAuth ricevuto",
    `<p>Optima ha ricevuto il consenso per <strong>${connector.label}</strong>.</p><p>Se il runtime ha token exchange e secret vault configurati, ora puoi tornare in Optima ed eseguire l'health-check. Il codice OAuth non viene mostrato e non viene salvato in chiaro.</p><p><a href="/agenti">Torna alla pagina agenti</a></p>`,
  )
}
