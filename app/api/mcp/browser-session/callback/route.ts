import { NextRequest } from "next/server"

import { getCloudflareDb } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export async function POST(request: NextRequest) {
  try {
    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })

    const url = new URL(request.url)
    const sessionId = url.searchParams.get("session") || ""
    const code = url.searchParams.get("code") || ""
    const body = await request.json().catch(() => ({}))
    const status = String(body.status || "opened")

    if (!/^bmcp_[a-f0-9]{32}$/.test(sessionId) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
      return Response.json({ error: "Sessione Browser MCP non valida." }, { status: 400 })
    }

    const row = (await db
      .prepare(
        `SELECT id, config_json
         FROM mcp_connector_installations
         WHERE connector_id = 'browser'
           AND json_extract(config_json, '$.activePairingSession.id') = ?
         LIMIT 1`,
      )
      .bind(sessionId)
      .first()) as { id: string; config_json: string | null } | null

    if (!row) return Response.json({ error: "Sessione Browser MCP non trovata." }, { status: 404 })

    const config = asRecord(JSON.parse(row.config_json || "{}"))
    const session = asRecord(config.activePairingSession)
    if (session.pairingCode !== code) {
      return Response.json({ error: "Codice pairing non valido." }, { status: 403 })
    }

    const updatedConfig = {
      ...config,
      activePairingSession: {
        ...session,
        status,
        lastEventAt: new Date().toISOString(),
        lastGatewayEvent: asRecord(body),
      },
    }

    await db
      .prepare(
        `UPDATE mcp_connector_installations
         SET config_json = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(JSON.stringify(updatedConfig), row.id)
      .run()

    return Response.json({ ok: true, status })
  } catch (error: any) {
    console.error("Error updating Browser MCP session:", error)
    return Response.json({ error: error?.message ?? "Errore callback Browser MCP." }, { status: 400 })
  }
}
