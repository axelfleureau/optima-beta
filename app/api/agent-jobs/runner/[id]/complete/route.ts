import { NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { completeAgentJob, createAgentJobArtifact, getAgentJobById } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

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

async function writeResultToR2(
  organizationId: string,
  jobId: string,
  payload: unknown,
): Promise<string | null> {
  if (!payload) return null

  try {
    const { env } = await getCloudflareContext({ async: true })
    const bucket = (env as any).TASK_MEDIA
    if (!bucket) return null

    const key = `agent-jobs/${organizationId}/${jobId}/result.json`
    await bucket.put(key, JSON.stringify(payload, null, 2), {
      httpMetadata: { contentType: "application/json" },
    })
    return key
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = authorizeRunner(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await context.params
    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })

    const job = await getAgentJobById(db, id)
    if (!job) return Response.json({ error: "Job non trovato." }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const status = body.status === "failed" ? "failed" : "needs_review"
    const runnerId = String(body.runnerId ?? job.claimedBy ?? "codex-vps").slice(0, 80)
    const resultR2Key =
      body.resultR2Key ??
      (await writeResultToR2(job.organizationId, job.id, body.resultPayload ?? body.result ?? null))

    const artifacts = Array.isArray(body.artifacts) ? body.artifacts.slice(0, 20) : []
    for (const artifact of artifacts) {
      if (!artifact?.label) continue
      await createAgentJobArtifact(db, {
        jobId: job.id,
        organizationId: job.organizationId,
        artifactType: artifact.type ?? "report",
        label: String(artifact.label).slice(0, 140),
        url: artifact.url ?? null,
        r2Key: artifact.r2Key ?? null,
        metadata: artifact.metadata ?? {},
      })
    }

    const updated = await completeAgentJob(db, {
      job,
      runnerId,
      status,
      resultSummary: body.resultSummary ?? body.summary ?? null,
      resultR2Key,
      errorMessage: body.errorMessage ?? null,
    })

    return Response.json({ job: updated })
  } catch (error) {
    console.error("Error completing agent job:", error)
    return Response.json({ error: "Errore nel completamento del job agentico." }, { status: 500 })
  }
}
