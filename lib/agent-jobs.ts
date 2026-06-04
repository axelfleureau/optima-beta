import { createId } from "@/lib/cloudflare-db"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

export const AGENT_ADMIN_ROLES = new Set(["admin", "direzione", "capo-reparto", "super-admin"])

export const AGENT_JOB_STATUSES = [
  "queued",
  "running",
  "needs_review",
  "approved",
  "rejected",
  "cancelled",
  "failed",
] as const

export const AGENT_JOB_TYPES = [
  "general",
  "codex_patch",
  "quote_pdf",
  "research",
  "deploy",
  "task_update",
] as const

export type AgentJobStatus = (typeof AGENT_JOB_STATUSES)[number]
export type AgentJobType = (typeof AGENT_JOB_TYPES)[number]

export interface AgentJob {
  id: string
  organizationId: string
  createdByMemberId: string | null
  assignedRunner: string
  title: string
  jobType: AgentJobType
  brief: string
  contextSummary: string
  repoUrl: string | null
  repoBranch: string | null
  workspaceHint: string | null
  status: AgentJobStatus
  priority: number
  input: Record<string, unknown>
  contextR2Key: string | null
  resultR2Key: string | null
  resultSummary: string | null
  errorMessage: string | null
  claimedBy: string | null
  approvedByMemberId: string | null
  approvedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentJobArtifact {
  id: string
  jobId: string
  organizationId: string
  artifactType: string
  label: string
  url: string | null
  r2Key: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "string") return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value && typeof value === "object" ? value : {})
}

function normalizeJobType(value: unknown): AgentJobType {
  return AGENT_JOB_TYPES.includes(value as AgentJobType) ? (value as AgentJobType) : "general"
}

function normalizeStatus(value: unknown): AgentJobStatus {
  return AGENT_JOB_STATUSES.includes(value as AgentJobStatus) ? (value as AgentJobStatus) : "queued"
}

function normalizePriority(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 3
  return Math.min(5, Math.max(1, Math.round(numeric)))
}

export function mapAgentJobRow(row: any): AgentJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdByMemberId: row.created_by_member_id ?? null,
    assignedRunner: row.assigned_runner ?? "codex-vps",
    title: row.title,
    jobType: normalizeJobType(row.job_type),
    brief: row.brief,
    contextSummary: row.context_summary ?? "",
    repoUrl: row.repo_url ?? null,
    repoBranch: row.repo_branch ?? null,
    workspaceHint: row.workspace_hint ?? null,
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    input: parseJsonObject(row.input_json),
    contextR2Key: row.context_r2_key ?? null,
    resultR2Key: row.result_r2_key ?? null,
    resultSummary: row.result_summary ?? null,
    errorMessage: row.error_message ?? null,
    claimedBy: row.claimed_by ?? null,
    approvedByMemberId: row.approved_by_member_id ?? null,
    approvedAt: row.approved_at ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapAgentJobArtifactRow(row: any): AgentJobArtifact {
  return {
    id: row.id,
    jobId: row.job_id,
    organizationId: row.organization_id,
    artifactType: row.artifact_type ?? "report",
    label: row.label,
    url: row.url ?? null,
    r2Key: row.r2_key ?? null,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
  }
}

export async function listAgentJobs(db: any, organizationId: string, limit = 80): Promise<AgentJob[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM agent_jobs
       WHERE organization_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(organizationId, Math.min(Math.max(limit, 1), 200))
    .all()

  return (rows.results ?? []).map(mapAgentJobRow)
}

export async function getAgentJob(db: any, organizationId: string, id: string): Promise<AgentJob | null> {
  const row = await db
    .prepare(`SELECT * FROM agent_jobs WHERE organization_id = ? AND id = ? LIMIT 1`)
    .bind(organizationId, id)
    .first()

  return row ? mapAgentJobRow(row) : null
}

export async function getAgentJobById(db: any, id: string): Promise<AgentJob | null> {
  const row = await db.prepare(`SELECT * FROM agent_jobs WHERE id = ? LIMIT 1`).bind(id).first()
  return row ? mapAgentJobRow(row) : null
}

export async function listAgentJobArtifacts(
  db: any,
  organizationId: string,
  jobId: string,
): Promise<AgentJobArtifact[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM agent_job_artifacts
       WHERE organization_id = ? AND job_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(organizationId, jobId)
    .all()

  return (rows.results ?? []).map(mapAgentJobArtifactRow)
}

export async function appendAgentJobEvent(
  db: any,
  input: {
    jobId: string
    organizationId: string
    actorMemberId?: string | null
    actorType?: "system" | "user" | "runner"
    eventType: string
    message?: string
    payload?: Record<string, unknown>
  },
) {
  await db
    .prepare(
      `INSERT INTO agent_job_events (
        id, job_id, organization_id, actor_member_id, actor_type, event_type, message, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      createId("agevt"),
      input.jobId,
      input.organizationId,
      input.actorMemberId ?? null,
      input.actorType ?? "system",
      input.eventType,
      input.message ?? "",
      stringifyJson(input.payload),
    )
    .run()
}

export async function createAgentJob(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    id?: string
    title: string
    jobType?: unknown
    brief: string
    contextSummary?: string
    repoUrl?: string | null
    repoBranch?: string | null
    workspaceHint?: string | null
    assignedRunner?: string | null
    priority?: unknown
    input?: Record<string, unknown>
    contextR2Key?: string | null
  },
): Promise<AgentJob> {
  const title = input.title?.trim()
  const brief = input.brief?.trim()

  if (!title || title.length < 4) {
    throw new Error("Inserisci un titolo operativo leggibile.")
  }

  if (!brief || brief.length < 20) {
    throw new Error("Inserisci un brief operativo di almeno 20 caratteri.")
  }

  const id = input.id ?? createId("agjob")
  const jobType = normalizeJobType(input.jobType)
  const priority = normalizePriority(input.priority)

  await db
    .prepare(
      `INSERT INTO agent_jobs (
        id, organization_id, created_by_member_id, assigned_runner, title, job_type, brief,
        context_summary, repo_url, repo_branch, workspace_hint, status, priority, input_json,
        context_r2_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`,
    )
    .bind(
      id,
      principal.organizationId,
      principal.memberId,
      input.assignedRunner?.trim() || "codex-vps",
      title,
      jobType,
      brief,
      input.contextSummary?.trim() ?? "",
      input.repoUrl?.trim() || null,
      input.repoBranch?.trim() || null,
      input.workspaceHint?.trim() || null,
      priority,
      stringifyJson(input.input),
      input.contextR2Key ?? null,
    )
    .run()

  await appendAgentJobEvent(db, {
    jobId: id,
    organizationId: principal.organizationId,
    actorMemberId: principal.memberId,
    actorType: "user",
    eventType: "job.created",
    message: "Job operativo creato in Óptima.",
  })

  const job = await getAgentJob(db, principal.organizationId, id)
  if (!job) throw new Error("Job creato ma non recuperabile.")
  return job
}

export async function claimNextAgentJob(db: any, runnerId: string): Promise<AgentJob | null> {
  const row = await db
    .prepare(
      `SELECT * FROM agent_jobs
       WHERE status = 'queued'
       ORDER BY priority ASC, created_at ASC
       LIMIT 1`,
    )
    .first()

  if (!row) return null

  const job = mapAgentJobRow(row)
  const result = await db
    .prepare(
      `UPDATE agent_jobs
       SET status = 'running', claimed_by = ?, started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'queued'`,
    )
    .bind(runnerId, job.id)
    .run()

  if ((result.meta?.changes ?? 0) < 1) return null

  await appendAgentJobEvent(db, {
    jobId: job.id,
    organizationId: job.organizationId,
    actorType: "runner",
    eventType: "runner.claimed",
    message: `Job preso in carico da ${runnerId}.`,
    payload: { runnerId },
  })

  return getAgentJobById(db, job.id)
}

export async function completeAgentJob(
  db: any,
  input: {
    job: AgentJob
    runnerId: string
    status: "needs_review" | "failed"
    resultSummary?: string
    resultR2Key?: string | null
    errorMessage?: string | null
  },
): Promise<AgentJob> {
  await db
    .prepare(
      `UPDATE agent_jobs
       SET status = ?, result_summary = ?, result_r2_key = ?, error_message = ?,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'running'`,
    )
    .bind(
      input.status,
      input.resultSummary ?? null,
      input.resultR2Key ?? null,
      input.errorMessage ?? null,
      input.job.id,
    )
    .run()

  await appendAgentJobEvent(db, {
    jobId: input.job.id,
    organizationId: input.job.organizationId,
    actorType: "runner",
    eventType: input.status === "failed" ? "runner.failed" : "runner.completed",
    message:
      input.status === "failed"
        ? input.errorMessage ?? "Il runner ha segnalato un errore."
        : "Il runner ha completato il lavoro e richiede revisione.",
    payload: { runnerId: input.runnerId, resultR2Key: input.resultR2Key ?? null },
  })

  const updated = await getAgentJobById(db, input.job.id)
  if (!updated) throw new Error("Job completato ma non recuperabile.")
  return updated
}

export async function createAgentJobArtifact(
  db: any,
  input: {
    jobId: string
    organizationId: string
    artifactType?: string
    label: string
    url?: string | null
    r2Key?: string | null
    metadata?: Record<string, unknown>
  },
) {
  await db
    .prepare(
      `INSERT INTO agent_job_artifacts (
        id, job_id, organization_id, artifact_type, label, url, r2_key, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      createId("agart"),
      input.jobId,
      input.organizationId,
      input.artifactType ?? "report",
      input.label,
      input.url ?? null,
      input.r2Key ?? null,
      stringifyJson(input.metadata),
    )
    .run()
}
