import { NextRequest } from "next/server"

import { getAgentRunnerControlState } from "@/lib/agent-runner-control"
import { claimNextAgentJob, upsertAgentRunnerHeartbeat } from "@/lib/agent-jobs"
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
    const runnerMeta = {
      event: "claim.poll",
      label: typeof body.label === "string" ? body.label.slice(0, 120) : null,
    }
    const runnerControl = getAgentRunnerControlState()

    await upsertAgentRunnerHeartbeat(db, {
      runnerId,
      status: "online",
      mode: body.mode,
      version: body.version,
      metadata: runnerMeta,
    }).catch((error) => console.warn("Unable to record runner poll:", error))

    if (!runnerControl.enabled) {
      await upsertAgentRunnerHeartbeat(db, {
        runnerId,
        status: "idle",
        mode: body.mode,
        version: body.version,
        metadata: {
          ...runnerMeta,
          event: "claim.suspended",
          suspended: true,
          reason: runnerControl.reason,
        },
      }).catch((error) => console.warn("Unable to record suspended runner poll:", error))

      return Response.json({ job: null, suspended: true, runnerControl })
    }

    const job = await claimNextAgentJob(db, runnerId)

    await upsertAgentRunnerHeartbeat(db, {
      runnerId,
      status: job ? "running" : "idle",
      mode: body.mode,
      version: body.version,
      lastClaimAt: job ? new Date().toISOString() : null,
      metadata: {
        ...runnerMeta,
        event: job ? "claim.accepted" : "claim.empty",
        jobId: job?.id ?? null,
      },
    }).catch((error) => console.warn("Unable to record runner claim:", error))

    return Response.json({ job, suspended: false, runnerControl })
  } catch (error) {
    console.error("Error claiming agent job:", error)
    return Response.json({ error: "Errore nel claim del job agentico." }, { status: 500 })
  }
}
