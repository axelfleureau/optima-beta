import { createAgentJob, type AgentJob } from "@/lib/agent-jobs"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

type QueryResult<T> = { results?: T[] }

export type SelfImprovementSignal = {
  id: string
  label: string
  severity: "critical" | "high" | "medium" | "low"
  count: number
  detail: string
}

export type SelfImprovementSnapshot = {
  generatedAt: string
  windowDays: number
  score: number
  summary: string
  signals: SelfImprovementSignal[]
  metrics: {
    aiCalls: number
    aiTokens: number
    negativeFeedback: number
    failedJobs: number
    reviewJobs: number
    staleQueuedJobs: number
    recentTasks: number
    recentQuotes: number
  }
  recommendedJob: {
    title: string
    contextSummary: string
    brief: string
    priority: number
  }
}

function toNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

async function first<T extends Record<string, unknown>>(db: any, sql: string, ...binds: unknown[]): Promise<T | null> {
  try {
    return (await db.prepare(sql).bind(...binds).first()) as T | null
  } catch (error) {
    console.warn("Self-improvement metric unavailable:", error)
    return null
  }
}

async function all<T extends Record<string, unknown>>(db: any, sql: string, ...binds: unknown[]): Promise<T[]> {
  try {
    const result = (await db.prepare(sql).bind(...binds).all()) as QueryResult<T>
    return result.results ?? []
  } catch (error) {
    console.warn("Self-improvement metric list unavailable:", error)
    return []
  }
}

function signalScore(signal: SelfImprovementSignal) {
  if (signal.severity === "critical") return 25
  if (signal.severity === "high") return 18
  if (signal.severity === "medium") return 10
  return 5
}

export async function getSelfImprovementSnapshot(
  db: any,
  organizationId: string,
  windowDays = 7,
): Promise<SelfImprovementSnapshot> {
  const days = Math.min(Math.max(Math.round(windowDays), 1), 30)
  const sinceExpr = `-${days} days`
  const [aiUsage, feedback, jobStats, staleJobs, taskStats, quoteStats, topFeatures, failedJobs] = await Promise.all([
    first<{ calls: number; tokens: number }>(
      db,
      `SELECT COUNT(*) AS calls, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens
       FROM ai_usage
       WHERE organization_id = ? AND datetime(created_at) >= datetime('now', ?)`,
      organizationId,
      sinceExpr,
    ),
    first<{ negative: number; positive: number }>(
      db,
      `SELECT
         SUM(CASE WHEN feedback = 'negative' THEN 1 ELSE 0 END) AS negative,
         SUM(CASE WHEN feedback = 'positive' THEN 1 ELSE 0 END) AS positive
       FROM ai_feedback
       WHERE organization_id = ? AND datetime(created_at) >= datetime('now', ?)`,
      organizationId,
      sinceExpr,
    ),
    first<{ failed: number; review: number; queued: number; running: number }>(
      db,
      `SELECT
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN status = 'needs_review' THEN 1 ELSE 0 END) AS review,
         SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
         SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running
       FROM agent_jobs
       WHERE organization_id = ? AND datetime(created_at) >= datetime('now', ?)`,
      organizationId,
      sinceExpr,
    ),
    first<{ stale: number }>(
      db,
      `SELECT COUNT(*) AS stale
       FROM agent_jobs
       WHERE organization_id = ?
         AND status = 'queued'
         AND datetime(created_at) < datetime('now', '-30 minutes')`,
      organizationId,
    ),
    first<{ recent: number }>(
      db,
      `SELECT COUNT(*) AS recent
       FROM tasks
       WHERE organization_id = ? AND datetime(updated_at) >= datetime('now', ?)`,
      organizationId,
      sinceExpr,
    ),
    first<{ recent: number }>(
      db,
      `SELECT COUNT(*) AS recent
       FROM quotes
       WHERE organization_id = ? AND datetime(created_at) >= datetime('now', ?)`,
      organizationId,
      sinceExpr,
    ),
    all<{ feature: string; calls: number; tokens: number }>(
      db,
      `SELECT feature, COUNT(*) AS calls, COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens
       FROM ai_usage
       WHERE organization_id = ? AND datetime(created_at) >= datetime('now', ?)
       GROUP BY feature
       ORDER BY calls DESC, tokens DESC
       LIMIT 5`,
      organizationId,
      sinceExpr,
    ),
    all<{ title: string; error_message: string | null }>(
      db,
      `SELECT title, error_message
       FROM agent_jobs
       WHERE organization_id = ? AND status = 'failed'
       ORDER BY datetime(updated_at) DESC
       LIMIT 5`,
      organizationId,
    ),
  ])

  const metrics = {
    aiCalls: toNumber(aiUsage?.calls),
    aiTokens: toNumber(aiUsage?.tokens),
    negativeFeedback: toNumber(feedback?.negative),
    failedJobs: toNumber(jobStats?.failed),
    reviewJobs: toNumber(jobStats?.review),
    staleQueuedJobs: toNumber(staleJobs?.stale),
    recentTasks: toNumber(taskStats?.recent),
    recentQuotes: toNumber(quoteStats?.recent),
  }

  const signals: SelfImprovementSignal[] = []

  if (metrics.negativeFeedback > 0) {
    signals.push({
      id: "negative-ai-feedback",
      label: "Feedback AI negativo",
      severity: metrics.negativeFeedback >= 3 ? "high" : "medium",
      count: metrics.negativeFeedback,
      detail: "Rivedere prompt, contesto RAG e fallback delle risposte vuote o poco utili.",
    })
  }

  if (metrics.failedJobs > 0) {
    signals.push({
      id: "failed-agent-jobs",
      label: "Job agentici falliti",
      severity: metrics.failedJobs >= 2 ? "high" : "medium",
      count: metrics.failedJobs,
      detail: failedJobs.map((job) => `${job.title}: ${job.error_message || "errore non dettagliato"}`).join(" | "),
    })
  }

  if (metrics.staleQueuedJobs > 0) {
    signals.push({
      id: "stale-queued-jobs",
      label: "Coda runner ferma",
      severity: "high",
      count: metrics.staleQueuedJobs,
      detail: "Ci sono job in coda da oltre 30 minuti: verificare heartbeat, flag runner e capacità VPS.",
    })
  }

  if (metrics.reviewJobs > 3) {
    signals.push({
      id: "review-backlog",
      label: "Backlog review",
      severity: "medium",
      count: metrics.reviewJobs,
      detail: "Molti job attendono review: serve una UX di triage o riepilogo più efficiente.",
    })
  }

  if (metrics.recentQuotes > 0 && topFeatures.some((item) => String(item.feature).includes("quote"))) {
    signals.push({
      id: "quote-flow-active",
      label: "Flusso preventivi attivo",
      severity: "low",
      count: metrics.recentQuotes,
      detail: "Usare i dati del flusso preventivi per migliorare template, PDF, budget guard e link pubblico.",
    })
  }

  if (topFeatures.length > 0) {
    signals.push({
      id: "top-ai-surfaces",
      label: "Superfici AI più usate",
      severity: "low",
      count: topFeatures.reduce((sum, item) => sum + toNumber(item.calls), 0),
      detail: topFeatures.map((item) => `${item.feature}: ${item.calls} chiamate`).join(", "),
    })
  }

  const score = Math.max(0, 100 - signals.reduce((sum, signal) => sum + signalScore(signal), 0))
  const summary = signals.length
    ? `${signals.length} segnali di miglioramento rilevati negli ultimi ${days} giorni.`
    : `Nessun segnale critico negli ultimi ${days} giorni; mantenere monitoraggio e test di regressione.`

  const brief = [
    "Analizza i dati d'uso Optima e produci una patch o un piano tecnico revisionabile per migliorare il prodotto.",
    "",
    `Finestra analizzata: ultimi ${days} giorni.`,
    `Metriche: AI calls ${metrics.aiCalls}, token ${metrics.aiTokens}, feedback negativi ${metrics.negativeFeedback}, job falliti ${metrics.failedJobs}, job in review ${metrics.reviewJobs}, job queued stale ${metrics.staleQueuedJobs}, task recenti ${metrics.recentTasks}, preventivi recenti ${metrics.recentQuotes}.`,
    "",
    "Segnali:",
    ...(signals.length
      ? signals.map((signal) => `- ${signal.label} (${signal.severity}, ${signal.count}): ${signal.detail}`)
      : ["- Nessun segnale critico; cerca comunque miglioramenti piccoli su osservabilità, UX e test."]),
    "",
    "Regole:",
    "- usa solo dati tenant-scoped e non esportare segreti;",
    "- non modificare produzione e non fare deploy automatico;",
    "- proponi patch conservative, test, rollback e criteri di successo;",
    "- se mancano dati, aggiungi prima telemetry/eventi espliciti invece di inventare conclusioni;",
    "- lascia output revisionabile in Optima per approvazione direzione.",
  ].join("\n")

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    score,
    summary,
    signals,
    metrics,
    recommendedJob: {
      title: "Auto-miglioramento Optima da dati d'uso",
      contextSummary: "Usage analytics, feedback, agent jobs, workspace",
      brief,
      priority: signals.some((signal) => signal.severity === "critical" || signal.severity === "high") ? 2 : 3,
    },
  }
}

export async function createSelfImprovementJob(
  db: any,
  principal: WorkspacePrincipal,
  snapshot: SelfImprovementSnapshot,
): Promise<{ job: AgentJob; reused: boolean }> {
  const existing = await db
    .prepare(
      `SELECT *
       FROM agent_jobs
       WHERE organization_id = ?
         AND title = ?
         AND status IN ('queued', 'running', 'needs_review')
       ORDER BY datetime(created_at) DESC
       LIMIT 1`,
    )
    .bind(principal.organizationId, snapshot.recommendedJob.title)
    .first()

  if (existing?.id) {
    const { mapAgentJobRow } = await import("@/lib/agent-jobs")
    return { job: mapAgentJobRow(existing), reused: true }
  }

  const job = await createAgentJob(db, principal, {
    title: snapshot.recommendedJob.title,
    jobType: "codex_patch",
    priority: snapshot.recommendedJob.priority,
    repoUrl: "https://github.com/axelfleureau/optima-beta",
    repoBranch: "main",
    contextSummary: snapshot.recommendedJob.contextSummary,
    brief: snapshot.recommendedJob.brief,
    input: {
      source: "optima-self-improvement-loop",
      generatedAt: snapshot.generatedAt,
      metrics: snapshot.metrics,
      signals: snapshot.signals,
      requestedOutput: ["diagnostic-report", "implementation-patch", "tests", "rollback-plan"],
      guardrails: [
        "no automatic deploy",
        "no secret logging",
        "human review required",
        "tenant scoped data only",
        "prefer telemetry before assumptions",
      ],
    },
  })

  return { job, reused: false }
}
