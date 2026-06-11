import { createAgentJob, type AgentJob } from "@/lib/agent-jobs"
import type { AgenticCapabilitySnapshot } from "@/lib/agentic-capabilities"
import type { AgenticGraphSnapshot } from "@/lib/agentic-graph"
import type { AgenticProductionReadinessSnapshot } from "@/lib/agentic-production-readiness"
import type { SelfImprovementSnapshot } from "@/lib/agentic-self-improvement"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

export type AgenticRecoveryPhaseStatus = "healthy" | "recovering" | "blocked"
export type AgenticRecoveryPhaseSeverity = "critical" | "high" | "medium" | "low"

export interface AgenticRecoveryPhase {
  id: string
  label: string
  status: AgenticRecoveryPhaseStatus
  severity: AgenticRecoveryPhaseSeverity
  score: number
  current: string
  target: string
  actions: string[]
}

export interface AgenticRecoverySnapshot {
  generatedAt: string
  score: number
  headline: string
  nextAction: string
  metrics: {
    graphNodes: number
    graphEdges: number
    knowhowNodes: number
    providerConfigured: number
    providerTotal: number
    connectorConfigured: number
    connectorTotal: number
    subagents: number
    readyRuntimeHosts: number
    runtimeHosts: number
    readinessScore: number
    selfImprovementScore: number | null
    recoveryJobActive: boolean
  }
  phases: AgenticRecoveryPhase[]
  recommendedJob: {
    title: string
    contextSummary: string
    brief: string
    priority: number
  }
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function phaseScore(status: AgenticRecoveryPhaseStatus) {
  if (status === "healthy") return 100
  if (status === "recovering") return 55
  return 15
}

function average(values: number[]) {
  if (!values.length) return 0
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function activeRecoveryJob(job: any) {
  return job && ["queued", "running", "needs_review"].includes(String(job.status))
}

export async function findActiveAgenticRecoveryJob(db: any, organizationId: string) {
  return db
    .prepare(
      `SELECT *
       FROM agent_jobs
       WHERE organization_id = ?
         AND title = ?
         AND status IN ('queued', 'running', 'needs_review')
       ORDER BY datetime(created_at) DESC
       LIMIT 1`,
    )
    .bind(organizationId, "Recovery anima agentica Optima")
    .first()
}

export function buildAgenticRecoverySnapshot(input: {
  readiness: AgenticProductionReadinessSnapshot
  capabilities: AgenticCapabilitySnapshot
  graph: AgenticGraphSnapshot
  selfImprovement: SelfImprovementSnapshot | null
  runnerEnabled: boolean
  runnerStatus: string
  latestRunnerSeenAt: string | null
  activeRecoveryJob?: unknown
}): AgenticRecoverySnapshot {
  const byType = input.graph.stats.byType ?? {}
  const knowhowNodes =
    Number(byType.knowledge_file ?? 0) +
    Number(byType.development_knowhow ?? 0) +
    Number(byType.codex_skill ?? 0) +
    Number(byType.knowledge_base ?? 0)
  const providerConfigured = input.capabilities.providerInstallations.filter((item) => item.installState !== "not_installed").length
  const connectorConfigured = input.capabilities.connectorInstallations.filter(
    (item) => item.connectorId !== "hermes-agent" && item.installState !== "not_installed",
  ).length
  const connectorTotal = input.capabilities.mcpConnectorCatalog.filter((item) => item.id !== "hermes-agent").length
  const readyRuntimeHosts = input.capabilities.modelRuntime.hosts.filter((host) => host.runtimeStatus === "ready").length
  const phases: AgenticRecoveryPhase[] = [
    {
      id: "control-plane",
      label: "Control plane e runner",
      status: input.runnerEnabled && input.latestRunnerSeenAt ? "recovering" : "blocked",
      severity: input.runnerEnabled ? "medium" : "critical",
      score: phaseScore(input.runnerEnabled && input.latestRunnerSeenAt ? "recovering" : "blocked"),
      current: `Runner ${input.runnerStatus}; ultimo heartbeat ${input.latestRunnerSeenAt ?? "non rilevato"}.`,
      target: "Runner VPS sempre osservabile, claim protetto da AGENT_RUNNER_ENABLED, job revisionabili e heartbeat affidabile.",
      actions: [
        "Verificare che il runner scriva solo in /srv/optima-agent e non tocchi Hermes.",
        "Rendere visibili stale job, ultimo errore e stato disk/RAM nella pagina agenti.",
        "Lasciare deploy e patch sempre in review umana.",
      ],
    },
    {
      id: "mcp-oauth",
      label: "MCP, OAuth e connector",
      status: input.readiness.metrics.mcpOAuthAuthorizationCodeConfigured ? "healthy" : providerConfigured || connectorConfigured ? "recovering" : "blocked",
      severity: input.readiness.metrics.mcpOAuthAuthorizationCodeConfigured ? "low" : "high",
      score: phaseScore(input.readiness.metrics.mcpOAuthAuthorizationCodeConfigured ? "healthy" : providerConfigured || connectorConfigured ? "recovering" : "blocked"),
      current: `${connectorConfigured}/${connectorTotal} connector installati; OAuth code flow ${input.readiness.metrics.mcpOAuthAuthorizationCodeConfigured ? "presente" : "mancante"}.`,
      target: "GitHub, Notion, Cloudflare, SendGrid, Telegram, Cloudinary, Hostinger e Codex con installazioni guidate, health check e secret_ref.",
      actions: [
        "Trasformare i setup statici in wizard OAuth/secret_ref per tenant.",
        "Aggiungere health check per scope, token endpoint e principal risolto.",
        "Bloccare azioni irreversibili senza review.",
      ],
    },
    {
      id: "graph-memory",
      label: "Graphify, Obsidian e memoria",
      status: input.graph.stats.nodes >= 500 && knowhowNodes >= 300 ? "healthy" : input.graph.stats.nodes > 0 ? "recovering" : "blocked",
      severity: input.graph.stats.nodes >= 500 ? "medium" : "high",
      score: phaseScore(input.graph.stats.nodes >= 500 && knowhowNodes >= 300 ? "healthy" : input.graph.stats.nodes > 0 ? "recovering" : "blocked"),
      current: `${input.graph.stats.nodes} nodi, ${input.graph.stats.edges} archi, ${knowhowNodes} nodi scibile.`,
      target: "Grafo aziendale tenant-scoped con sorgenti, confidence, Obsidian vault, Notion/Hermes redatti e azioni contestuali da nodo.",
      actions: [
        "Mantenere sync knowhow completo e import redatti idempotenti.",
        "Collegare ogni nodo utile ad azioni: crea task, crea job, collega cliente, collega repository.",
        "Separare Graphify come motore dati e Obsidian come vista umana nativa.",
      ],
    },
    {
      id: "runtime-subagents",
      label: "Runtime AI e subagenti",
      status: readyRuntimeHosts > 0 && input.capabilities.subagents.length >= 4 ? "recovering" : "blocked",
      severity: readyRuntimeHosts > 0 ? "medium" : "high",
      score: phaseScore(readyRuntimeHosts > 0 && input.capabilities.subagents.length >= 4 ? "recovering" : "blocked"),
      current: `${readyRuntimeHosts}/${input.capabilities.modelRuntime.hosts.length} runtime ready; ${input.capabilities.subagents.length} subagenti.`,
      target: "Lane operative per code, chat, research, media e operations con provider fallback e policy tool per subagente.",
      actions: [
        "Rendere Qwen/Gemma/MiniMax/OpenAI route tenant reali con health check.",
        "Associare subagenti a connector concessi e audit log.",
        "Usare MiniMax/Cloudinary per media solo tramite handoff tracciato.",
      ],
    },
    {
      id: "business-surfaces",
      label: "Funzioni aziendali agentiche",
      status: input.readiness.summary.score >= 70 ? "recovering" : "blocked",
      severity: "high",
      score: phaseScore(input.readiness.summary.score >= 70 ? "recovering" : "blocked"),
      current: `Readiness ${input.readiness.summary.score}/100; ${input.readiness.summary.blockedCount} blocchi e ${input.readiness.summary.missingCount} mancanze.`,
      target: "Ogni pagina core deve poter trasformare contesto in azioni agentiche: task, presenze, rapportini, preventivi, clienti, workspace e chat.",
      actions: [
        "Aggiungere affordance agentica contestuale nelle pagine core, non solo in /agenti.",
        "Rendere le risposte AI immediate quando i dati sono presenti, job revisionabile quando mancano.",
        "Usare eventi d'uso e feedback per priorizzare patch Codex.",
      ],
    },
  ]

  const recoveryJobActive = activeRecoveryJob(input.activeRecoveryJob)
  const score = average([
    input.readiness.summary.score,
    input.selfImprovement?.score ?? 50,
    ...phases.map((phase) => phase.score),
  ])
  const nextPhase = [...phases].sort((a, b) => a.score - b.score || a.severity.localeCompare(b.severity))[0]
  const brief = [
    "Esegui un recovery profondo dell'anima agentica di Optima: non limitarti alla UI, ricomponi control plane, MCP/OAuth, grafo, runner, Obsidian, self-improvement e superfici aziendali.",
    "",
    "Contesto produzione rilevato:",
    `- readiness: ${input.readiness.summary.score}/100`,
    `- graph: ${input.graph.stats.nodes} nodi, ${input.graph.stats.edges} archi, scibile ${knowhowNodes} nodi`,
    `- provider: ${providerConfigured}/${input.capabilities.providerCatalog.length}`,
    `- connector MCP: ${connectorConfigured}/${connectorTotal}`,
    `- runtime ready: ${readyRuntimeHosts}/${input.capabilities.modelRuntime.hosts.length}`,
    `- subagenti: ${input.capabilities.subagents.length}`,
    `- self-improvement: ${input.selfImprovement ? `${input.selfImprovement.score}/100` : "non disponibile"}`,
    "",
    "Fasi da recuperare:",
    ...phases.map((phase) => `- ${phase.label} (${phase.status}, ${phase.score}/100): ${phase.actions.join(" ")}`),
    "",
    "Regole non negoziabili:",
    "- non toccare servizi o dati Hermes attivi se non in sola lettura e con redazione;",
    "- non scrivere segreti in D1, log, job o output;",
    "- nessun deploy automatico senza review;",
    "- ogni patch deve avere test o health check verificabile;",
    "- se mancano dati, aggiungi telemetry esplicita prima di inventare conclusioni;",
    "- mantieni multi-tenant e organization_id in ogni query o azione.",
    "",
    "Output richiesto: audit puntuale, patch implementabile, test, rollback, cosa resta fuori produzione e criteri per portare Optima al 90% agentic-ready.",
  ].join("\n")

  return {
    generatedAt: new Date().toISOString(),
    score,
    headline:
      score >= 80
        ? "Anima agentica recuperata in modo operativo: resta da consolidare produzione e installazioni."
        : "Anima agentica in recovery: esiste il motore, ma serve chiudere runner, OAuth, runtime e azioni contestuali.",
    nextAction: nextPhase?.actions[0] ?? "Mantenere osservabilita e review umana.",
    metrics: {
      graphNodes: input.graph.stats.nodes,
      graphEdges: input.graph.stats.edges,
      knowhowNodes,
      providerConfigured,
      providerTotal: input.capabilities.providerCatalog.length,
      connectorConfigured,
      connectorTotal,
      subagents: input.capabilities.subagents.length,
      readyRuntimeHosts,
      runtimeHosts: input.capabilities.modelRuntime.hosts.length,
      readinessScore: input.readiness.summary.score,
      selfImprovementScore: input.selfImprovement?.score ?? null,
      recoveryJobActive,
    },
    phases,
    recommendedJob: {
      title: "Recovery anima agentica Optima",
      contextSummary: "Optima Agentic OS recovery / MCP / Graphify / Codex CLI",
      brief,
      priority: phases.some((phase) => phase.status === "blocked" && phase.severity === "critical") ? 1 : 2,
    },
  }
}

export async function createAgenticRecoveryJob(
  db: any,
  principal: WorkspacePrincipal,
  snapshot: AgenticRecoverySnapshot,
): Promise<{ job: AgentJob; reused: boolean }> {
  const existing = await findActiveAgenticRecoveryJob(db, principal.organizationId)
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
      source: "agentic-recovery-control-plane",
      generatedAt: snapshot.generatedAt,
      score: snapshot.score,
      metrics: snapshot.metrics,
      phases: snapshot.phases,
      requestedOutput: ["audit", "implementation-patch", "tests", "rollback-plan", "90-percent-roadmap"],
    },
  })

  return { job, reused: false }
}
