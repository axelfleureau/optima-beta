"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  GitBranch,
  Loader2,
  MessageSquareText,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { AgentJob, AgentJobArtifact, AgentJobEvent, AgentRunnerHeartbeat } from "@/lib/agent-jobs"

interface AgentRunnerControlState {
  enabled: boolean
  status: "enabled" | "suspended"
  reason: string | null
}

const statusCopy: Record<string, string> = {
  queued: "In coda",
  running: "In esecuzione",
  needs_review: "Da approvare",
  approved: "Approvato",
  rejected: "Respinto",
  cancelled: "Annullato",
  failed: "Errore",
}

const statusClass: Record<string, string> = {
  queued: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  running: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  needs_review: "border-righello-pink/40 bg-righello-pink/10 text-pink-100",
  approved: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  rejected: "border-red-300/30 bg-red-300/10 text-red-100",
  cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  failed: "border-red-300/30 bg-red-300/10 text-red-100",
}

interface AgentJobDetails {
  job: AgentJob
  artifacts: AgentJobArtifact[]
  events: AgentJobEvent[]
}

interface AgenticCapabilities {
  providerCatalog: Array<{
    id: string
    label: string
    kind: string
    lane: string
    authMethod: string
    defaultModel: string
    installPattern: string
    tenantUse: string
    strengths: string[]
    requiredSecrets: string[]
    recommendedMcpConnectors: string[]
    notes: string
  }>
  mcpConnectorCatalog: Array<{
    id: string
    label: string
    status: string
    category: string
    purpose: string
    graphUse: string[]
    requiredEnv: string[]
    optionalEnv?: string[]
    notes: string
  }>
  providerInstallations: Array<{
    providerId: string
    installState: string
    authMethod: string
    secretRef: string | null
    updatedAt: string
  }>
  connectorInstallations: Array<{
    connectorId: string
    installState: string
    authMethod: string
    scopes: string[]
    secretRef: string | null
    updatedAt: string
  }>
  subagents: Array<{
    id: string
    name: string
    slug: string
    lane: string
    status: string
    primaryProviderId: string
    modelHint: string | null
    connectorIds: string[]
  }>
  oauthGuidance: {
    pattern: string
    rules: string[]
  }
}

interface AgenticGraphSnapshot {
  stats: {
    nodes: number
    edges: number
    sessions: number
    byType: Record<string, number>
  }
  nodes: Array<{
    id: string
    nodeType: string
    title: string
    confidence: string
    summary: string
  }>
  edges: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
    edgeType: string
    confidence: string
    weight: number
  }>
  referenceSources: Array<{
    id: string
    label: string
    importPolicy: string
    sourceType: string
  }>
}

const initialForm = {
  title: "",
  jobType: "task_update",
  priority: 3,
  repoUrl: "",
  repoBranch: "",
  contextSummary: "",
  brief: "",
}

const jobTypesRequiringRepository = new Set(["codex_patch", "deploy"])

const graphNodeTypeTone: Record<string, string> = {
  system: "border-righello-pink/65 bg-righello-pink/18 text-pink-50",
  capability: "border-cyan-300/45 bg-cyan-300/14 text-cyan-50",
  reference_source: "border-emerald-300/40 bg-emerald-300/12 text-emerald-50",
  subagent: "border-violet-300/45 bg-violet-300/14 text-violet-50",
  connector: "border-amber-300/45 bg-amber-300/12 text-amber-50",
}

const graphConfidenceStroke: Record<string, string> = {
  manual: "#f472b6",
  extracted: "#22d3ee",
  inferred: "#34d399",
  ambiguous: "#f59e0b",
}

const installStateCopy: Record<string, string> = {
  not_installed: "Non configurato",
  guide_required: "Setup guidato",
  configured: "Configurato",
  healthy: "Operativo",
  blocked: "Bloccato",
}

const installStateTone: Record<string, string> = {
  not_installed: "border-white/10 bg-white/5 text-slate-400",
  guide_required: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  configured: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  healthy: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  blocked: "border-red-300/25 bg-red-300/10 text-red-100",
}

const recommendedSubagents = [
  {
    name: "Codex Engineer",
    slug: "codex-engineer",
    lane: "code",
    primaryProviderId: "codex",
    modelHint: "codex-cli",
    connectorIds: ["github", "cloudflare", "vercel", "hostinger"],
    systemPrompt: "Produce patch, report e PR in worktree isolato. Non fa deploy o push senza approvazione esplicita del control plane.",
    permissions: { canCreatePatch: true, canCreatePullRequest: true, canDeploy: false, requiresReview: true },
    handoffPolicy: { onMissingRepository: "ask_or_infer_from_graph", onRiskyAction: "return_to_review" },
  },
  {
    name: "Research Analyst",
    slug: "research-analyst",
    lane: "research",
    primaryProviderId: "qwen",
    modelHint: "qwen-long-context",
    connectorIds: ["github", "cloudinary"],
    systemPrompt: "Raccoglie contesto, fonti e sintesi operative. Non inventa dati: segnala lacune e produce output revisionabile.",
    permissions: { canReadGraph: true, canWriteTasks: false, requiresSources: true },
    handoffPolicy: { onInsufficientSources: "return_to_review" },
  },
  {
    name: "Media Operator",
    slug: "media-operator",
    lane: "media",
    primaryProviderId: "minimax",
    modelHint: "minimax-media",
    connectorIds: ["cloudinary"],
    systemPrompt: "Gestisce generazione e trasformazione asset collegati a clienti, campagne e task, usando solo asset autorizzati.",
    permissions: { canCreateMedia: true, canMutateAssets: false, requiresReview: true },
    handoffPolicy: { onCopyrightRisk: "return_to_review" },
  },
  {
    name: "Office Ops",
    slug: "office-ops",
    lane: "operations",
    primaryProviderId: "gemma",
    modelHint: "gemma-local",
    connectorIds: ["sendgrid", "telegram"],
    systemPrompt: "Classifica richieste operative, rapportini e comunicazioni interne con modello leggero o locale quando basta.",
    permissions: { canSendEmail: false, canDraftEmail: true, canCreateJob: true, requiresReview: true },
    handoffPolicy: { onExternalMessage: "create_job_or_draft" },
  },
]

function installTone(state: string) {
  return installStateTone[state] ?? installStateTone.not_installed
}

function installLabel(state: string) {
  return installStateCopy[state] ?? state
}

function getRequestedOutput(jobType: string) {
  if (jobType === "task_update") return ["report", "task-update", "sql-seed"]
  if (jobType === "quote_pdf") return ["quote", "pdf", "report"]
  if (jobType === "research") return ["report", "sources"]
  return ["patch", "report", "pull-request", "task-update"]
}

function getTitlePlaceholder(jobType: string) {
  if (jobType === "task_update") return "Es. Aggiorna task Axel da attivita GitHub"
  if (jobType === "quote_pdf") return "Es. Genera preventivo DICO/SYSTEMDOC"
  if (jobType === "research") return "Es. Analizza stato progetto Solero"
  if (jobType === "deploy") return "Es. Deploy controllato Optima production"
  return "Es. Patch UI rapportini"
}

function getBriefPlaceholder(jobType: string) {
  if (jobType === "task_update") {
    return "Es. Leggi le attivita GitHub di axelfleureau dall'ultimo aggiornamento task, raggruppale per progetto/cliente e produci uno script SQL idempotente con task e time entry da revisionare. Non fare deploy, commit o push."
  }

  return "Descrivi cosa deve fare il runner, cosa deve produrre e quali limiti rispettare..."
}

function getGraphNodeLayout(nodes: AgenticGraphSnapshot["nodes"]) {
  const laneOrder = ["system", "capability", "subagent", "connector", "reference_source"]
  const laneY: Record<string, number> = {
    system: 16,
    capability: 46,
    subagent: 46,
    connector: 46,
    reference_source: 76,
  }
  const visibleNodes = [...nodes]
    .sort((a, b) => {
      const aLane = laneOrder.includes(a.nodeType) ? laneOrder.indexOf(a.nodeType) : laneOrder.indexOf("capability")
      const bLane = laneOrder.includes(b.nodeType) ? laneOrder.indexOf(b.nodeType) : laneOrder.indexOf("capability")
      const laneDelta = aLane - bLane
      if (laneDelta !== 0) return laneDelta
      return a.title.localeCompare(b.title)
    })
    .slice(0, 12)

  const grouped = visibleNodes.reduce<Record<string, typeof visibleNodes>>((acc, node) => {
    const lane = laneY[node.nodeType] ? node.nodeType : "capability"
    acc[lane] = acc[lane] ?? []
    acc[lane].push(node)
    return acc
  }, {})

  return visibleNodes.map((node) => {
    const lane = laneY[node.nodeType] ? node.nodeType : "capability"
    const laneNodes = grouped[lane] ?? [node]
    const index = laneNodes.findIndex((item) => item.id === node.id)
    const total = laneNodes.length
    const x = total <= 1 ? 50 : 16 + index * (68 / Math.max(1, total - 1))
    return {
      node,
      x,
      y: laneY[lane],
    }
  })
}

function GraphMemoryMap({ graphMemory }: { graphMemory: AgenticGraphSnapshot | null }) {
  const layout = useMemo(() => getGraphNodeLayout(graphMemory?.nodes ?? []), [graphMemory?.nodes])
  const nodePosition = new Map(layout.map((item) => [item.node.id, item]))
  const visibleEdges = (graphMemory?.edges ?? [])
    .map((edge) => ({
      edge,
      from: nodePosition.get(edge.fromNodeId),
      to: nodePosition.get(edge.toNodeId),
    }))
    .filter((item): item is { edge: AgenticGraphSnapshot["edges"][number]; from: (typeof layout)[number]; to: (typeof layout)[number] } =>
      Boolean(item.from && item.to),
    )
    .slice(0, 18)
  const featuredEdges = visibleEdges.slice(0, 4)

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#050914]/85">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Mappa nodi</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">
          {visibleEdges.length} archi visibili
        </span>
      </div>

      {layout.length ? (
        <div className="relative h-[250px] overflow-hidden sm:h-[290px]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {visibleEdges.map(({ edge, from, to }) => (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={graphConfidenceStroke[edge.confidence] ?? "#64748b"}
                strokeWidth={Math.max(0.7, Math.min(2.4, Number(edge.weight || 1)))}
                strokeOpacity={edge.confidence === "ambiguous" ? 0.45 : 0.64}
                strokeDasharray={edge.confidence === "inferred" ? "3 3" : edge.confidence === "ambiguous" ? "2 4" : undefined}
              />
            ))}
          </svg>

          {layout.map(({ node, x, y }) => (
            <div
              key={node.id}
              className="absolute w-[8.5rem] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className={`rounded-lg border px-2.5 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.28)] ${graphNodeTypeTone[node.nodeType] ?? "border-white/15 bg-white/[0.06] text-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
                  <p className="min-w-0 truncate text-xs font-black">{node.title}</p>
                </div>
                <p className="mt-1 truncate text-[10px] font-bold uppercase opacity-70">{node.nodeType}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 text-sm leading-6 text-slate-500">
          Nessun nodo visualizzabile. Usa “Sincronizza base” per creare o aggiornare i riferimenti agentici iniziali.
        </div>
      )}

      {featuredEdges.length ? (
        <div className="grid gap-1.5 border-t border-white/10 p-3">
          {featuredEdges.map(({ edge, from, to }) => (
            <div key={`label-${edge.id}`} className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: graphConfidenceStroke[edge.confidence] ?? "#64748b" }}
              />
              <span className="min-w-0 truncate">
                <span className="font-bold text-slate-200">{from.node.title}</span> → {to.node.title}
              </span>
              <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px]">{edge.edgeType}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function parseServerDate(value: string | null) {
  if (!value) return NaN
  const normalized = /Z$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : NaN
}

function formatRelativeTime(value: string | null) {
  if (!value) return "mai"
  const timestamp = parseServerDate(value)
  if (!Number.isFinite(timestamp)) return "data non valida"
  const diffMs = Date.now() - timestamp
  const absMs = Math.abs(diffMs)
  if (absMs < 60_000) return "ora"
  const minutes = Math.round(absMs / 60_000)
  if (minutes < 60) return `${minutes} min fa`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h fa`
  const days = Math.round(hours / 24)
  return `${days} g fa`
}

export function AgentJobsClient({
  initialJobs,
  initialRunners,
  initialRunnerControl,
}: {
  initialJobs: AgentJob[]
  initialRunners: AgentRunnerHeartbeat[]
  initialRunnerControl: AgentRunnerControlState
}) {
  const [jobs, setJobs] = useState(initialJobs)
  const [runners, setRunners] = useState(initialRunners)
  const [runnerControl, setRunnerControl] = useState(initialRunnerControl)
  const [form, setForm] = useState(initialForm)
  const [showRepositoryOverride, setShowRepositoryOverride] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [busyJobId, setBusyJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewJobId, setReviewJobId] = useState<string | null>(null)
  const [reviewDetails, setReviewDetails] = useState<AgentJobDetails | null>(null)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [revisionMessage, setRevisionMessage] = useState("")
  const [mobilePanel, setMobilePanel] = useState<"jobs" | "create" | "stack">("jobs")
  const [capabilities, setCapabilities] = useState<AgenticCapabilities | null>(null)
  const [graphMemory, setGraphMemory] = useState<AgenticGraphSnapshot | null>(null)
  const [isSeedingGraph, setIsSeedingGraph] = useState(false)
  const [capabilityAction, setCapabilityAction] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/agentic-capabilities")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setCapabilities(data)
      })
      .catch(() => {
        if (active) setCapabilities(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/agentic-graph")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setGraphMemory(data)
      })
      .catch(() => {
        if (active) setGraphMemory(null)
      })

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    return {
      queued: jobs.filter((job) => job.status === "queued").length,
      running: jobs.filter((job) => job.status === "running").length,
      review: jobs.filter((job) => job.status === "needs_review").length,
    }
  }, [jobs])

  const runnerHealth = useMemo(() => {
    if (!runnerControl.enabled) {
      return {
        latest: runners[0] ?? null,
        label: "Runner sospeso",
        detail: runnerControl.reason ?? "Il claim dei job e sospeso lato server.",
        tone: "suspended" as const,
        isOnline: false,
      }
    }

    const latest = runners[0] ?? null
    if (!latest) {
      return {
        latest,
        label: "Runner mai visto",
        detail: "Nessun heartbeat ricevuto dal VPS.",
        tone: "offline" as const,
        isOnline: false,
      }
    }

    const lastSeenMs = parseServerDate(latest.lastSeenAt)
    const ageMs = Date.now() - lastSeenMs
    const fresh = Number.isFinite(ageMs) && ageMs < 90_000
    const stale = Number.isFinite(ageMs) && ageMs >= 90_000 && ageMs < 300_000

    if (latest.status === "error") {
      return {
        latest,
        label: "Runner in errore",
        detail: latest.lastErrorMessage ?? `Errore segnalato ${formatRelativeTime(latest.lastErrorAt)}`,
        tone: "error" as const,
        isOnline: false,
      }
    }

    if (fresh && latest.status !== "offline") {
      return {
        latest,
        label: latest.status === "running" ? "Runner al lavoro" : "Runner online",
        detail: `${latest.id} · ${latest.status} · visto ${formatRelativeTime(latest.lastSeenAt)}`,
        tone: "online" as const,
        isOnline: true,
      }
    }

    if (stale) {
      return {
        latest,
        label: "Runner in ritardo",
        detail: `${latest.id} non aggiorna da ${formatRelativeTime(latest.lastSeenAt)}.`,
        tone: "stale" as const,
        isOnline: false,
      }
    }

    return {
      latest,
      label: "Runner offline",
      detail: `${latest.id} non aggiorna da ${formatRelativeTime(latest.lastSeenAt)}.`,
      tone: "offline" as const,
      isOnline: false,
    }
  }, [runnerControl, runners])

  async function refreshJobs() {
    const response = await fetch("/api/agent-jobs")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Errore refresh job")
    setJobs(data.jobs ?? [])
  }

  async function refreshRunners() {
    const response = await fetch("/api/agent-jobs/runners")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Errore refresh runner")
    setRunners(data.runners ?? [])
    if (data.runnerControl) setRunnerControl(data.runnerControl)
  }

  async function refreshControlPlane() {
    await Promise.all([refreshJobs(), refreshRunners()])
  }

  async function mutateCapabilities(body: Record<string, unknown>, actionKey: string) {
    try {
      setCapabilityAction(actionKey)
      setError(null)
      const response = await fetch("/api/agentic-capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore aggiornamento capability")
      setCapabilities(data)
    } catch (err: any) {
      setError(err?.message ?? "Errore aggiornamento capability")
    } finally {
      setCapabilityAction(null)
    }
  }

  async function configureProvider(provider: AgenticCapabilities["providerCatalog"][number]) {
    const selfHosted = provider.authMethod === "runner_env" || provider.authMethod === "local_install" || provider.authMethod === "none"
    await mutateCapabilities(
      {
        action: "install_provider",
        providerId: provider.id,
        installState: selfHosted ? "configured" : "guide_required",
        tenantPolicy: {
          dataScope: "tenant",
          requiresReview: true,
          allowedLane: provider.lane,
          notes: provider.notes,
        },
        config: {
          installPattern: provider.installPattern,
          requiredSecrets: provider.requiredSecrets,
          recommendedMcpConnectors: provider.recommendedMcpConnectors,
          defaultModel: provider.defaultModel,
        },
      },
      `provider:${provider.id}`,
    )
  }

  async function configureConnector(connector: AgenticCapabilities["mcpConnectorCatalog"][number]) {
    const installState = connector.status === "enabled" ? "healthy" : connector.status === "external" ? "configured" : "guide_required"
    await mutateCapabilities(
      {
        action: "install_connector",
        connectorId: connector.id,
        installState,
        authMethod: connector.requiredEnv.length ? "api_key_secret" : "external_oauth",
        scopes: connector.graphUse,
        config: {
          category: connector.category,
          requiredEnv: connector.requiredEnv,
          optionalEnv: connector.optionalEnv ?? [],
          purpose: connector.purpose,
          notes: connector.notes,
        },
      },
      `connector:${connector.id}`,
    )
  }

  async function createRecommendedSubagent(template: (typeof recommendedSubagents)[number]) {
    await mutateCapabilities(
      {
        action: "create_subagent",
        ...template,
      },
      `subagent:${template.slug}`,
    )
  }

  async function createRecommendedSubagents() {
    try {
      setCapabilityAction("subagents:base")
      setError(null)
      let latest: AgenticCapabilities | null = null
      for (const template of recommendedSubagents) {
        const response = await fetch("/api/agentic-capabilities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_subagent", ...template }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error ?? `Errore creazione ${template.name}`)
        latest = data
      }
      if (latest) setCapabilities(latest)
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione subagenti")
    } finally {
      setCapabilityAction(null)
    }
  }

  async function createJob() {
    setError(null)
    setIsCreating(true)
    try {
      const response = await fetch("/api/agent-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          input: {
            requestedOutput: getRequestedOutput(form.jobType),
            guardrails: [
              "non eseguire deploy senza approvazione admin",
              "non stampare secret",
              "mantenere worktree isolato",
              form.jobType === "task_update"
                ? "per aggiornamento task usa GitHub come fonte multi-repository e produci output idempotente revisionabile"
                : "rispetta il repository risolto dal grafo o indicato manualmente",
            ],
          },
          context: {
            source: "optima-ai-ops",
            createdFrom: "admin-control-room",
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore creazione job")
      setJobs((current) => [data.job, ...current])
      setForm(initialForm)
      setShowRepositoryOverride(false)
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione job")
    } finally {
      setIsCreating(false)
    }
  }

  async function loadReview(job: AgentJob) {
    setReviewJobId(job.id)
    setReviewDetails(null)
    setRevisionMessage("")
    setIsLoadingReview(true)
    setError(null)
    try {
      const response = await fetch(`/api/agent-jobs/${job.id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore caricamento revisione")
      setReviewDetails(data)
    } catch (err: any) {
      setError(err?.message ?? "Errore caricamento revisione")
    } finally {
      setIsLoadingReview(false)
    }
  }

  async function mutateJob(id: string, action: "approve" | "reject" | "cancel" | "revise", message?: string) {
    setBusyJobId(id)
    setError(null)
    try {
      const response = await fetch(`/api/agent-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore aggiornamento job")
      setJobs((current) => current.map((job) => (job.id === id ? data.job : job)))
      if (reviewJobId === id) {
        if (action === "revise") {
          setReviewJobId(null)
          setReviewDetails(null)
          setRevisionMessage("")
        } else {
          await loadReview(data.job)
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Errore aggiornamento job")
    } finally {
      setBusyJobId(null)
    }
  }

  const activeReviewJob = reviewDetails?.job ?? jobs.find((job) => job.id === reviewJobId) ?? null
  const installedProviderIds = new Set(capabilities?.providerInstallations.map((item) => item.providerId) ?? [])
  const installedConnectorIds = new Set(capabilities?.connectorInstallations.map((item) => item.connectorId) ?? [])
  const providerInstallationsById = new Map((capabilities?.providerInstallations ?? []).map((item) => [item.providerId, item]))
  const connectorInstallationsById = new Map((capabilities?.connectorInstallations ?? []).map((item) => [item.connectorId, item]))
  const subagentsBySlug = new Map((capabilities?.subagents ?? []).map((item) => [item.slug, item]))
  const graphTypes = Object.entries(graphMemory?.stats.byType ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)

  async function seedGraphReferences() {
    try {
      setIsSeedingGraph(true)
      setError(null)
    const response = await fetch("/api/agentic-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_references" }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error ?? "Errore sincronizzazione grafo")
    setGraphMemory(data)
  } catch (err: any) {
    setError(err?.message ?? "Errore sincronizzazione grafo")
  } finally {
    setIsSeedingGraph(false)
  }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] lg:gap-6">
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-1 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobilePanel("jobs")}
          className={`h-10 rounded-md text-sm font-black ${
            mobilePanel === "jobs" ? "bg-righello-pink text-white" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Coda
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobilePanel("create")}
          className={`h-10 rounded-md text-sm font-black ${
            mobilePanel === "create" ? "bg-righello-pink text-white" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          <Plus className="mr-2 h-4 w-4" />
          Crea
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobilePanel("stack")}
          className={`h-10 rounded-md text-sm font-black ${
            mobilePanel === "stack" ? "bg-righello-pink text-white" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          <Network className="mr-2 h-4 w-4" />
          Stack
        </Button>
      </div>

      <div
        className={`rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-5 lg:order-1 ${
          mobilePanel === "create" ? "block" : "hidden"
        } lg:block`}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-righello-pink/30 bg-righello-pink/15 text-righello-pink sm:h-11 sm:w-11">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-righello-pink">AI Ops</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Crea job operativo</h2>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Brief, contesto e output attesi finiscono nel control plane. Optima risolve grafo, subagente e strumenti; il runner VPS prende in carico il lavoro in polling.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
          <label className="grid gap-2 text-sm font-bold text-white">
            Titolo
            <input
              className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={getTitlePlaceholder(form.jobType)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-white">
              Tipo job
              <select
                className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                value={form.jobType}
                onChange={(event) => setForm((current) => ({ ...current, jobType: event.target.value }))}
              >
                <option value="task_update">Aggiorna task da GitHub</option>
                <option value="codex_patch">Codex patch/PR</option>
                <option value="quote_pdf">Preventivo PDF</option>
                <option value="research">Ricerca operativa</option>
                <option value="deploy">Deploy controllato</option>
                <option value="general">Generale</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-white">
              Priorità
              <select
                className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))}
              >
                <option value={1}>1 - urgente</option>
                <option value={2}>2 - alta</option>
                <option value={3}>3 - normale</option>
                <option value={4}>4 - bassa</option>
                <option value={5}>5 - backlog</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-3 sm:p-4">
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {form.jobType === "task_update" ? "Fonte GitHub multi-repository" : "Repository automatico"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {jobTypesRequiringRepository.has(form.jobType)
                      ? "Per patch e deploy serve un repository. Optima prova a risolverlo dal grafo; se non basta puoi forzarlo qui."
                      : form.jobType === "task_update"
                        ? "Non serve scegliere un repository: il runner usa le attivita GitHub e il grafo clienti/progetti per preparare task e time entry."
                        : "Per questo job il repository resta opzionale e viene usato solo se il grafo lo suggerisce."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRepositoryOverride((current) => !current)}
                className="h-9 w-full shrink-0 rounded-lg border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 min-[420px]:w-auto"
              >
                {showRepositoryOverride ? "Nascondi override" : "Forza repository"}
              </Button>
            </div>
          </div>

          {showRepositoryOverride ? (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="grid gap-2 text-sm font-bold text-white">
                Repository override
                <input
                  className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                  value={form.repoUrl}
                  onChange={(event) => setForm((current) => ({ ...current, repoUrl: event.target.value }))}
                  placeholder="https://github.com/axelfleureau/..."
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Branch
                <input
                  className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                  value={form.repoBranch}
                  onChange={(event) => setForm((current) => ({ ...current, repoBranch: event.target.value }))}
                  placeholder="Auto / main"
                />
              </label>
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-bold text-white">
            Contesto breve
            <input
              className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
              value={form.contextSummary}
              onChange={(event) => setForm((current) => ({ ...current, contextSummary: event.target.value }))}
              placeholder="Cliente, feature o area"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-white">
            Brief operativo
            <textarea
              className="min-h-36 rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/70 sm:min-h-44"
              value={form.brief}
              onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
              placeholder={getBriefPlaceholder(form.jobType)}
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={createJob}
            disabled={isCreating}
            className="h-12 rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90"
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Crea job agentico
          </Button>
        </div>
      </div>

      <div
        className={`rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-5 lg:order-3 ${
          mobilePanel === "stack" ? "block" : "hidden"
        } lg:col-span-2 lg:block`}
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Agentic OS</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Provider, MCP e subagenti</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ogni capability e tenant-scoped: OAuth/PKCE dove possibile, installazione guidata per runner locali, secret solo come riferimento protetto.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
            multi-tenant
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3">
            <div className="rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">Provider AI operativi</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Attiva provider per lane: codice, ricerca, media, operations e chat. Optima salva policy e secret_ref, non token in chiaro.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {(capabilities?.providerCatalog ?? []).slice(0, 6).map((provider) => {
                  const installation = providerInstallationsById.get(provider.id)
                  const state = installation?.installState ?? "not_installed"
                  const busy = capabilityAction === `provider:${provider.id}`
                  return (
                    <div key={provider.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{provider.label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {provider.lane} · {provider.authMethod}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${installTone(state)}`}>
                          {installLabel(state)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs font-bold text-cyan-100">{provider.defaultModel}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{provider.tenantUse}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {provider.requiredSecrets.length ? (
                          provider.requiredSecrets.slice(0, 2).map((secret) => (
                            <span key={secret} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                              {secret}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                            no secret
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => configureProvider(provider)}
                        disabled={busy}
                        className="mt-3 h-8 w-full rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10"
                      >
                        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                        {installedProviderIds.has(provider.id) ? "Aggiorna policy" : "Configura"}
                      </Button>
                    </div>
                  )
                })}
              </div>
              {!capabilities ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-[#060a15] p-3 text-sm text-slate-400">
                  Caricamento stack agentico...
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] p-3 sm:p-4">
              <p className="font-black text-cyan-50">OAuth e installazioni guidate</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {capabilities?.oauthGuidance.pattern ??
                  "Authorization Code + PKCE per installazioni utente, GitHub App per repository, secret_ref per API key e local_install per runner self-hosted."}
              </p>
            </div>

            <div className="rounded-lg border border-fuchsia-300/15 bg-fuchsia-300/[0.055] p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                <div>
                  <p className="font-black text-white">Graph memory aziendale</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Nodi, archi e sessioni collegano persone, task, repo, clienti, subagenti e sorgenti. Le relazioni hanno confidence esplicita: manual, extracted, inferred o ambiguous.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={seedGraphReferences}
                  disabled={isSeedingGraph}
                  className="h-9 w-full shrink-0 rounded-lg border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 min-[460px]:w-auto"
                  title="Crea o aggiorna i nodi base della graph memory. Non cancella dati esistenti."
                >
                  {isSeedingGraph ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                  Sincronizza base
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Nodi", graphMemory?.stats.nodes ?? 0],
                  ["Archi", graphMemory?.stats.edges ?? 0],
                  ["Sessioni", graphMemory?.stats.sessions ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-[#060a15]/70 p-2">
                    <p className="truncate text-[11px] text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <GraphMemoryMap graphMemory={graphMemory} />

              <div className="mt-3 flex flex-wrap gap-2">
                {graphTypes.length ? (
                  graphTypes.map(([type, count]) => (
                    <span key={type} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {type}: {count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Nessun nodo ancora indicizzato.</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                <div>
                  <p className="font-black text-white">Subagenti</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Profili operativi con provider, connector e permessi espliciti.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={createRecommendedSubagents}
                  disabled={capabilityAction === "subagents:base"}
                  className="h-8 w-full shrink-0 rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10 min-[460px]:w-auto"
                >
                  {capabilityAction === "subagents:base" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bot className="mr-1.5 h-3.5 w-3.5" />}
                  Crea set base
                </Button>
              </div>
              <div className="mt-3 grid gap-2">
                {recommendedSubagents.map((template) => {
                  const subagent = subagentsBySlug.get(template.slug)
                  const busy = capabilityAction === `subagent:${template.slug}`
                  return (
                    <div key={template.slug} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-black text-white">{subagent?.name ?? template.name}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${subagent ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-400"}`}>
                          {subagent ? "attivo" : "da creare"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {(subagent?.primaryProviderId ?? template.primaryProviderId)} · {(subagent?.connectorIds ?? template.connectorIds).join(", ")}
                      </p>
                      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
                        <p className="truncate text-xs text-slate-400">{template.lane} · {template.modelHint}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => createRecommendedSubagent(template)}
                          disabled={busy}
                          className="h-7 rounded-lg border-white/10 bg-transparent px-2 text-[11px] text-white hover:bg-white/10"
                        >
                          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                          {subagent ? "Aggiorna" : "Crea"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 grid gap-2">
                {(capabilities?.subagents ?? []).slice(0, 5).map((subagent) => (
                  <div key={subagent.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black text-white">{subagent.name}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {subagent.lane}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {subagent.primaryProviderId} · {subagent.connectorIds.join(", ") || "nessun connector"}
                    </p>
                  </div>
                ))}
                {capabilities && capabilities.subagents.length === 0 ? (
                  <p className="text-sm text-slate-500">Nessun subagente configurato per questo tenant.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <p className="font-black text-white">MCP strategici</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Ogni connector diventa un nodo installabile con scope, env richieste e uso nel grafo.
              </p>
              <div className="mt-3 grid gap-2">
                {(capabilities?.mcpConnectorCatalog ?? []).map((connector) => {
                  const installation = connectorInstallationsById.get(connector.id)
                  const state = installation?.installState ?? (connector.status === "enabled" ? "healthy" : "not_installed")
                  const busy = capabilityAction === `connector:${connector.id}`
                  return (
                    <div key={connector.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{connector.label}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{connector.category} · {connector.requiredEnv.length ? connector.requiredEnv.join(", ") : "oauth/reference"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${installTone(state)}`}>
                          {installLabel(state)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{connector.purpose}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {connector.graphUse.slice(0, 4).map((scope) => (
                          <span key={scope} className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                            {scope}
                          </span>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => configureConnector(connector)}
                        disabled={busy}
                        className="mt-3 h-8 w-full rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10"
                      >
                        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1.5 h-3.5 w-3.5" />}
                        {installedConnectorIds.has(connector.id) ? "Aggiorna setup" : "Collega"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <p className="font-black text-white">Sorgenti agentiche</p>
              <div className="mt-3 grid gap-2">
                {(graphMemory?.referenceSources ?? []).map((source) => (
                  <div key={source.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black text-white">{source.label}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {source.sourceType}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{source.importPolicy}</p>
                  </div>
                ))}
                {!graphMemory ? (
                  <p className="text-sm text-slate-500">Caricamento graph memory...</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-5 lg:order-2 ${
          mobilePanel === "jobs" ? "block" : "hidden"
        } lg:block`}
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Control plane</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Coda runner</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshControlPlane().catch((err) => setError(err?.message ?? "Errore refresh"))}
            className="w-full rounded-lg border-white/15 bg-transparent text-white hover:bg-white/10 sm:w-auto"
          >
            Aggiorna
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
          {[
            ["In coda", stats.queued],
            ["In esecuzione", stats.running],
            ["Review", stats.review],
            [
              "Runner",
              runnerControl.enabled
                ? runnerHealth.isOnline
                  ? "Online"
                  : runnerHealth.tone === "stale"
                    ? "Stale"
                    : "Offline"
                : "Sospeso",
            ],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-2.5 sm:p-3">
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">{label}</p>
              <p className="mt-1 truncate text-base font-black text-white sm:text-xl">{value}</p>
            </div>
          ))}
        </div>

        {stats.queued > 0 && !runnerControl.enabled ? (
          <div className="mt-4 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ci sono job in coda, ma il claim e sospeso da configurazione server. Imposta AGENT_RUNNER_ENABLED=true solo quando vuoi riattivare il VPS.
              </p>
            </div>
          </div>
        ) : stats.queued > 0 && !runnerHealth.isOnline ? (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ci sono job in coda, ma il runner VPS non risulta online. Il lavoro resta fermo finche il servizio sul VPS non torna a fare polling.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-lg border ${
                  runnerHealth.isOnline
                    ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-300/30 bg-amber-300/10 text-amber-100"
                }`}
              >
                {runnerHealth.isOnline ? <Radio className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-white">{runnerHealth.label}</h3>
                <p className="mt-1 break-words text-sm leading-6 text-slate-400">{runnerHealth.detail}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
              {runnerHealth.latest?.mode ?? "no runner"}
            </span>
          </div>

          {runners.length > 0 ? (
            <div className="mt-4 space-y-2">
              {runners.slice(0, 3).map((runner) => (
                <div
                  key={runner.id}
                  className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 min-[420px]:flex min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3"
                >
                  <span className="break-all font-bold text-white">{runner.id}</span>
                  <span>
                    {runner.status} · {formatRelativeTime(runner.lastSeenAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:max-h-[720px] lg:overflow-y-auto lg:pr-1">
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
              Nessun job agentico ancora creato.
            </div>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-white/10 bg-[#070c19] p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[job.status]}`}>
                        {statusCopy[job.status] ?? job.status}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        P{job.priority}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-black leading-snug text-white sm:text-lg">{job.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{job.brief}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 min-[520px]:flex sm:justify-end">
                    {["needs_review", "approved", "rejected", "failed"].includes(job.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadReview(job)}
                        className="rounded-lg border-cyan-300/30 bg-cyan-300/5 text-cyan-50 hover:bg-cyan-300/10"
                      >
                        <Eye className="mr-1.5 h-4 w-4" />
                        Revisiona
                      </Button>
                    ) : null}
                    {job.status === "needs_review" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => mutateJob(job.id, "approve")}
                          disabled={busyJobId === job.id}
                          className="rounded-lg bg-emerald-500 text-white hover:bg-emerald-400"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Approva
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => mutateJob(job.id, "reject")}
                          disabled={busyJobId === job.id}
                          className="rounded-lg border-red-400/30 bg-transparent text-red-100 hover:bg-red-500/10"
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Respingi
                        </Button>
                      </>
                    ) : null}
                    {["queued", "running"].includes(job.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => mutateJob(job.id, "cancel")}
                        disabled={busyJobId === job.id}
                        className="rounded-lg border-white/15 bg-transparent text-slate-200 hover:bg-white/10"
                      >
                        Annulla
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p className="flex min-w-0 items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {job.repoUrl ? `${job.repoUrl.replace("https://github.com/", "")} · ${job.repoBranch ?? "main"}` : "Repo non indicata"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {new Date(parseServerDate(job.createdAt)).toLocaleString("it-IT")}
                  </p>
                </div>

                {job.resultSummary ? (
                  <div className="mt-4 max-h-36 overflow-hidden break-words rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-3 text-sm leading-6 text-cyan-50 sm:max-h-44">
                    {job.resultSummary}
                  </div>
                ) : null}

                {job.errorMessage ? (
                  <div className="mt-4 rounded-lg border border-red-300/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                    {job.errorMessage}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <Dialog
          open={Boolean(reviewJobId)}
          onOpenChange={(open) => {
            if (!open) {
              setReviewJobId(null)
              setReviewDetails(null)
              setRevisionMessage("")
            }
          }}
        >
          <DialogContent className="max-h-[94svh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-[#080d19] p-4 text-white sm:max-w-4xl sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl font-black sm:text-2xl">Revisione job agentico</DialogTitle>
              <DialogDescription className="text-slate-400">
                Leggi output e audit, poi approva, respingi o rimanda al runner con istruzioni precise.
              </DialogDescription>
            </DialogHeader>

            {isLoadingReview || !activeReviewJob ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento revisione...
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[activeReviewJob.status]}`}>
                      {statusCopy[activeReviewJob.status] ?? activeReviewJob.status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      {activeReviewJob.jobType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      P{activeReviewJob.priority}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-tight sm:text-xl">{activeReviewJob.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{activeReviewJob.brief}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <div className="grid gap-4">
                    <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-3 sm:p-4">
                      <div className="flex items-center gap-2 text-cyan-50">
                        <FileText className="h-4 w-4" />
                        <h4 className="font-black">Output runner</h4>
                      </div>
                      <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-200 sm:max-h-96">
                        {activeReviewJob.resultSummary || activeReviewJob.errorMessage || "Nessun output ancora disponibile."}
                      </div>
                    </section>

                    <section className="rounded-lg border border-white/10 bg-[#050914] p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-righello-pink" />
                        <h4 className="font-black">Richiedi modifiche al runner</h4>
                      </div>
                      <Textarea
                        className="mt-3 min-h-32 border-white/10 bg-[#080d19] text-sm leading-6 text-white"
                        value={revisionMessage}
                        onChange={(event) => setRevisionMessage(event.target.value)}
                        placeholder="Es. Ricrea lo script usando le tabelle canoniche tasks/time_entries, non staging. Non inventare durate: lascia actual_minutes=0 e tag needs-duration. Aggiungi dettaglio per righello-site solo se verificato."
                      />
                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <Button
                          type="button"
                          onClick={() => mutateJob(activeReviewJob.id, "revise", revisionMessage)}
                          disabled={busyJobId === activeReviewJob.id || revisionMessage.trim().length < 12}
                          className="rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90"
                        >
                          <RefreshCw className="mr-1.5 h-4 w-4" />
                          Rimanda in revisione
                        </Button>
                        {activeReviewJob.status === "needs_review" ? (
                          <>
                            <Button
                              type="button"
                              onClick={() => mutateJob(activeReviewJob.id, "approve", "Approvato dalla review room.")}
                              disabled={busyJobId === activeReviewJob.id}
                              className="rounded-lg bg-emerald-500 text-white hover:bg-emerald-400"
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Approva
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => mutateJob(activeReviewJob.id, "reject", revisionMessage || "Risultato respinto dalla review room.")}
                              disabled={busyJobId === activeReviewJob.id}
                              className="rounded-lg border-red-400/30 bg-transparent text-red-100 hover:bg-red-500/10"
                            >
                              <XCircle className="mr-1.5 h-4 w-4" />
                              Respingi
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </section>
                  </div>

                  <aside className="grid content-start gap-4">
                    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                      <h4 className="font-black">Artefatti</h4>
                      <div className="mt-3 grid gap-2">
                        {reviewDetails?.artifacts?.length ? (
                          reviewDetails.artifacts.map((artifact) => (
                            <div key={artifact.id} className="rounded-lg border border-white/10 bg-[#050914] p-3 text-xs leading-5 text-slate-300">
                              <p className="font-bold text-white">{artifact.label}</p>
                              <p className="mt-1">{artifact.artifactType}</p>
                              {artifact.r2Key ? <p className="mt-1 break-all text-slate-500">{artifact.r2Key}</p> : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Nessun artefatto indicizzato.</p>
                        )}
                      </div>
                    </section>

                    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                      <h4 className="font-black">Timeline audit</h4>
                      <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
                        {reviewDetails?.events?.length ? (
                          reviewDetails.events.map((event) => (
                            <div key={event.id} className="rounded-lg border border-white/10 bg-[#050914] p-3 text-xs leading-5 text-slate-300">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-white">{event.eventType}</p>
                                <span className="text-slate-500">{formatRelativeTime(event.createdAt)}</span>
                              </div>
                              {event.message ? <p className="mt-1 text-slate-400">{event.message}</p> : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Nessun evento registrato.</p>
                        )}
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm leading-6 text-emerald-50">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <p>
            Il runner non riceve privilegi di deploy automatico: produce output, PR o report e rimanda il risultato a Óptima per approvazione.
          </p>
        </div>
      </div>
    </section>
  )
}
