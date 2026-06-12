import { NextRequest } from "next/server"

import {
  AGENT_ADMIN_ROLES,
  appendAgentJobEvent,
  createAgentJob,
  type AgentJob,
  getAgentJob,
  listAgentJobArtifacts,
  listAgentJobEvents,
} from "@/lib/agent-jobs"
import {
  canUseGitHubOwnerCapability,
  githubOwnerPolicySummary,
  type GitHubOwnerPolicy,
} from "@/lib/agentic-owner-policy"
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

function shouldCreateApprovedPublishJob(job: AgentJob, canUseGitHubOwner: boolean) {
  if (!canUseGitHubOwner) return false
  if (!job.repoUrl) return false
  if (job.input?.approvalFollowUpJobId) return false
  if (job.jobType === "codex_patch") return true
  if (job.jobType === "deploy" && job.input?.approvalStage !== "execution") return true
  return false
}

function approvedPublishBrief(job: AgentJob, policy: GitHubOwnerPolicy) {
  return [
    `La direzione ha approvato il risultato del job ${job.id}: "${job.title}".`,
    "",
    "Obiettivo: collegare l'approvazione a GitHub e deploy in modo controllato.",
    "",
    "Azioni richieste:",
    "- recupera output, artefatti, report e result_r2_key del job approvato;",
    "- verifica lo stato git del repository e applica solo patch/istruzioni effettivamente presenti nell'output approvato;",
    "- esegui controlli minimi: git diff, install/build/test disponibili e health check essenziali;",
    "- crea commit descrittivo, push su GitHub e deploy Cloudflare production quando il lavoro riguarda Optima ed e sicuro;",
    "- se l'output approvato non contiene patch applicabile o il repository non e coerente, non inventare modifiche: torna in review con errore operativo chiaro;",
    "- registra nel risultato commit, branch, deploy/version id, comandi eseguiti, warning e rollback plan.",
    "",
    "Guardrail:",
    `- ${githubOwnerPolicySummary(policy)}`,
    "- non fare force push;",
    "- non modificare segreti o file non pertinenti;",
    "- non deployare se build o controlli falliscono;",
    "- mantieni ogni azione tracciabile e tenant-scoped.",
  ].join("\n")
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

      const githubCapability = await canUseGitHubOwnerCapability(auth.db, auth.principal, job.repoUrl)
      const githubPublishBlockedReason =
        githubCapability.allowed && !githubCapability.policy.deployEnabled
          ? "deploy_disabled_by_policy"
          : githubCapability.reason
      const canUseGitHubOwner = githubCapability.allowed && githubCapability.policy.deployEnabled
      let followUpJobId: string | null = null
      if (shouldCreateApprovedPublishJob(job, canUseGitHubOwner)) {
        const followUp = await createAgentJob(auth.db, auth.principal, {
          title: `Pubblica output approvato: ${job.title}`.slice(0, 140),
          jobType: "deploy",
          priority: Math.min(job.priority, 2),
          repoUrl: job.repoUrl,
          repoBranch: job.repoBranch ?? "main",
          workspaceHint: job.workspaceHint,
          contextSummary: `Approvazione direzione -> GitHub/deploy per ${job.title}`,
          brief: approvedPublishBrief(job, githubCapability.policy),
          input: {
            approvalStage: "execution",
            parentJobId: job.id,
            parentJobType: job.jobType,
            parentResultR2Key: job.resultR2Key,
            approvalRequestedByMemberId: auth.principal.memberId,
            approvalRequestedAt: new Date().toISOString(),
            requiredActions: ["apply-approved-output", "commit", "push", "deploy-if-safe", "return-audit"],
            githubOwnerPolicy: githubOwnerPolicySummary(githubCapability.policy),
          },
        })
        followUpJobId = followUp.id
      }

      const nextInput = followUpJobId
        ? {
            ...job.input,
            approvalFollowUpJobId: followUpJobId,
            approvalFollowUpKind: "github_deploy",
          }
        : job.input

      await auth.db
        .prepare(
          `UPDATE agent_jobs
           SET status = 'approved', approved_by_member_id = ?, approved_at = CURRENT_TIMESTAMP, input_json = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(auth.principal.memberId, JSON.stringify(nextInput), auth.principal.organizationId, id)
        .run()

      await appendAgentJobEvent(auth.db, {
        jobId: id,
        organizationId: auth.principal.organizationId,
        actorMemberId: auth.principal.memberId,
        actorType: "user",
        eventType: "job.approved",
        message: followUpJobId
          ? body.message ?? `Risultato approvato: creato job di pubblicazione ${followUpJobId}.`
          : !canUseGitHubOwner && shouldCreateApprovedPublishJob(job, true)
            ? body.message ?? `Risultato approvato, ma nessun job GitHub/deploy creato: ${githubPublishBlockedReason}.`
          : body.message ?? "Risultato approvato dalla direzione.",
        payload: followUpJobId
          ? { followUpJobId, followUpKind: "github_deploy", githubOwnerPolicy: githubOwnerPolicySummary(githubCapability.policy) }
          : !canUseGitHubOwner && shouldCreateApprovedPublishJob(job, true)
            ? {
                followUpBlocked: true,
                reason: githubPublishBlockedReason,
                githubOwnerPolicy: githubOwnerPolicySummary(githubCapability.policy),
              }
            : undefined,
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
