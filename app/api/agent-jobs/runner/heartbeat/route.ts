import { NextRequest } from "next/server"

import { upsertAgentRunnerHeartbeat } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"

function authorizeRunner(request: NextRequest): Response | null {
  const configured = process.env.AGENT_RUNNER_API_KEY
  if (!configured) {
    return Response.json({ error: "Runner API key non configurata." }, { status: 503 })
  }

  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : ""
  if (token !== configured) {
    return Response.json({ error: "Runner non autorizzato." }, { status: 401 })
  }

  return null
}

export async function POST(request: NextRequest) {
  const unauthorized = authorizeRunner(request)
  if (unauthorized) return unauthorized

  try {
    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })

    const body = await request.json().catch(() => ({}))
    const runner = await upsertAgentRunnerHeartbeat(db, {
      runnerId: String(body.runnerId ?? "codex-vps").slice(0, 80),
      status: body.status,
      mode: body.mode,
      version: body.version,
      lastClaimAt: typeof body.lastClaimAt === "string" ? body.lastClaimAt : null,
      errorMessage: body.errorMessage,
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : {},
    })

    return Response.json({ runner })
  } catch (error) {
    console.error("Error recording runner heartbeat:", error)
    return Response.json({ error: "Errore nel salvataggio heartbeat runner." }, { status: 500 })
  }
}
