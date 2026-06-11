import { NextRequest } from "next/server"

import {
  AGENT_ADMIN_ROLES,
  appendAgentJobEvent,
  getAgentJob,
  listAgentJobArtifacts,
  listAgentJobEvents,
} from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const job = await getAgentJob(auth.db, auth.principal.organizationId, id)
    if (!job) return Response.json({ error: "Job non trovato." }, { status: 404 })

    const [artifacts, events] = await Promise.all([
      listAgentJobArtifacts(auth.db, auth.principal.organizationId, id),
      listAgentJobEvents(auth.db, auth.principal.organizationId, id),
    ])
    return Response.json({ job, artifacts, events })
  } catch (error) {
    console.error("Error loading agent job:", error)
    return Response.json({ error: "Errore nel caricamento del job agentico." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? "")
    const job = await getAgentJob(auth.db, auth.principal.organizationId, id)
    if (!job) return Response.json({ error: "Job non trovato." }, { status: 404 })

    if (action === "approve") {
      if (job.status !== "needs_review") {
        return Response.json({ error: "Puoi approvare solo job in revisione." }, { status: 409 })
      }

      await auth.db
        .prepare(
          `UPDATE agent_jobs
           SET status = 'approved', approved_by_member_id = ?, approved_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(auth.principal.memberId, auth.principal.organizationId, id)
        .run()

      await appendAgentJobEvent(auth.db, {
        jobId: id,
        organizationId: auth.principal.organizationId,
        actorMemberId: auth.principal.memberId,
        actorType: "user",
        eventType: "job.approved",
        message: body.message ?? "Risultato approvato dalla direzione.",
      })
    } else if (action === "reject") {
      if (!["needs_review", "failed"].includes(job.status)) {
        return Response.json({ error: "Puoi respingere solo job già elaborati." }, { status: 409 })
      }

      await auth.db
        .prepare(
          `UPDATE agent_jobs
           SET status = 'rejected', error_message = ?, updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(body.message ?? "Risultato respinto.", auth.principal.organizationId, id)
        .run()

      await appendAgentJobEvent(auth.db, {
        jobId: id,
        organizationId: auth.principal.organizationId,
        actorMemberId: auth.principal.memberId,
        actorType: "user",
        eventType: "job.rejected",
        message: body.message ?? "Risultato respinto.",
      })
    } else if (action === "revise") {
      if (!["needs_review", "failed", "approved"].includes(job.status)) {
        return Response.json({ error: "Puoi chiedere revisioni solo su job già elaborati." }, { status: 409 })
      }

      const message = String(body.message ?? "").trim()
      if (message.length < 12) {
        return Response.json({ error: "Scrivi una richiesta di revisione chiara." }, { status: 400 })
      }

      const revisionRequest = {
        requestedByMemberId: auth.principal.memberId,
        requestedAt: new Date().toISOString(),
        message,
        previousStatus: job.status,
        previousCompletedAt: job.completedAt,
      }
      const previousRequests = Array.isArray((job.input as any).revisionRequests)
        ? ((job.input as any).revisionRequests as unknown[])
        : []
      const nextInput = {
        ...job.input,
        revisionRequests: [...previousRequests, revisionRequest],
      }
      const nextBrief = `${job.brief.trim()}\n\n## Richiesta di revisione direzione ${revisionRequest.requestedAt}\n${message}`

      await auth.db
        .prepare(
          `UPDATE agent_jobs
           SET status = 'queued',
               brief = ?,
               input_json = ?,
               result_summary = NULL,
               error_message = NULL,
               result_r2_key = NULL,
               claimed_by = NULL,
               started_at = NULL,
               completed_at = NULL,
               approved_by_member_id = NULL,
               approved_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(
          nextBrief,
          JSON.stringify(nextInput),
          auth.principal.organizationId,
          id,
        )
        .run()

      await appendAgentJobEvent(auth.db, {
        jobId: id,
        organizationId: auth.principal.organizationId,
        actorMemberId: auth.principal.memberId,
        actorType: "user",
        eventType: "job.revision_requested",
        message,
        payload: revisionRequest,
      })
    } else if (action === "cancel") {
      if (!["queued", "running"].includes(job.status)) {
        return Response.json({ error: "Questo job non è più annullabile." }, { status: 409 })
      }

      await auth.db
        .prepare(
          `UPDATE agent_jobs
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(auth.principal.organizationId, id)
        .run()

      await appendAgentJobEvent(auth.db, {
        jobId: id,
        organizationId: auth.principal.organizationId,
        actorMemberId: auth.principal.memberId,
        actorType: "user",
        eventType: "job.cancelled",
        message: body.message ?? "Job annullato.",
      })
    } else {
      return Response.json({ error: "Azione non supportata." }, { status: 400 })
    }

    const updated = await getAgentJob(auth.db, auth.principal.organizationId, id)
    return Response.json({ job: updated })
  } catch (error) {
    console.error("Error updating agent job:", error)
    return Response.json({ error: "Errore nell'aggiornamento del job agentico." }, { status: 500 })
  }
}
