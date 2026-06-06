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
    lane: string
    authMethod: string
    defaultModel: string
  }>
  mcpConnectorCatalog: Array<{
    id: string
    label: string
    status: string
  }>
  providerInstallations: Array<{ providerId: string; installState: string }>
  connectorInstallations: Array<{ connectorId: string; installState: string }>
  subagents: Array<{
    id: string
    name: string
    lane: string
    status: string
    primaryProviderId: string
    connectorIds: string[]
  }>
  oauthGuidance: {
    pattern: string
    rules: string[]
  }
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
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(capabilities?.providerCatalog ?? []).slice(0, 6).map((provider) => (
                <div key={provider.id} className="rounded-lg border border-white/10 bg-[#060a15] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{provider.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {provider.lane} · {provider.authMethod}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        installedProviderIds.has(provider.id)
                          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      {installedProviderIds.has(provider.id) ? "attivo" : "guida"}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs text-cyan-100">{provider.defaultModel}</p>
                </div>
              ))}
              {!capabilities ? (
                <div className="rounded-lg border border-white/10 bg-[#060a15] p-3 text-sm text-slate-400">
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
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <p className="font-black text-white">Subagenti</p>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {(capabilities?.mcpConnectorCatalog ?? []).map((connector) => (
                  <span
                    key={connector.id}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                      connector.status === "enabled" || installedConnectorIds.has(connector.id)
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        : connector.status === "partial"
                          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    {connector.label}
                  </span>
                ))}
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
