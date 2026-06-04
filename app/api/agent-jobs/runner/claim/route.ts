import { NextRequest } from "next/server"

import { claimNextAgentJob } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"

function authorizeRunner(request: NextRequest): Response | null {
  const expected = process.env.AGENT_RUNNER_API_KEY
  if (!expected) {
    return Response.json({ error: "AGENT_RUNNER_API_KEY non configurata." }, { status: 503 })
  }

  const auth = request.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : ""
  if (!token || token !== expected) {
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
    const runnerId = String(body.runnerId ?? "codex-vps").slice(0, 80)
    const job = await claimNextAgentJob(db, runnerId)

    return Response.json({ job })
  } catch (error) {
    console.error("Error claiming agent job:", error)
    return Response.json({ error: "Errore nel claim del job agentico." }, { status: 500 })
  }
}
