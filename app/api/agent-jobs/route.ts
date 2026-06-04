import { NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { AGENT_ADMIN_ROLES, createAgentJob, listAgentJobs } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono gestire AI Ops.", status: 403 as const }
  }

  return { db, principal }
}

async function writeContextToR2(
  organizationId: string,
  jobId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  if (!payload || Object.keys(payload).length === 0) return null

  try {
    const { env } = await getCloudflareContext({ async: true })
    const bucket = (env as any).TASK_MEDIA
    if (!bucket) return null

    const key = `agent-jobs/${organizationId}/${jobId}/context.json`
    await bucket.put(key, JSON.stringify(payload, null, 2), {
      httpMetadata: { contentType: "application/json" },
    })

    return key
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    const jobs = await listAgentJobs(auth.db, auth.principal.organizationId)
    return Response.json({ jobs })
  } catch (error) {
    console.error("Error loading agent jobs:", error)
    return Response.json({ error: "Errore nel caricamento dei job agentici." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const id = `agjob_${crypto.randomUUID().replace(/-/g, "")}`
    const contextR2Key = await writeContextToR2(auth.principal.organizationId, id, {
      brief: body.brief,
      context: body.context ?? null,
      input: body.input ?? null,
      createdAt: new Date().toISOString(),
    })

    const job = await createAgentJob(auth.db, auth.principal, {
      id,
      title: body.title,
      jobType: body.jobType,
      brief: body.brief,
      contextSummary: body.contextSummary,
      repoUrl: body.repoUrl,
      repoBranch: body.repoBranch,
      workspaceHint: body.workspaceHint,
      assignedRunner: body.assignedRunner,
      priority: body.priority,
      input: body.input,
      contextR2Key,
    })

    return Response.json({ job }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating agent job:", error)
    return Response.json(
      { error: error?.message ?? "Errore nella creazione del job agentico." },
      { status: 400 },
    )
  }
}
