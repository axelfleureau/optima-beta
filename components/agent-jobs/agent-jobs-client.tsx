"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  GitBranch,
  Loader2,
  Play,
  Radio,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AgentJob, AgentRunnerHeartbeat } from "@/lib/agent-jobs"

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

function formatRelativeTime(value: string | null) {
  if (!value) return "mai"
  const timestamp = new Date(value).getTime()
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

    const lastSeenMs = new Date(latest.lastSeenAt).getTime()
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

  async function mutateJob(id: string, action: "approve" | "reject" | "cancel") {
    setBusyJobId(id)
    setError(null)
    try {
      const response = await fetch(`/api/agent-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore aggiornamento job")
      setJobs((current) => current.map((job) => (job.id === id ? data.job : job)))
    } catch (err: any) {
      setError(err?.message ?? "Errore aggiornamento job")
    } finally {
      setBusyJobId(null)
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-righello-pink/30 bg-righello-pink/15 text-righello-pink">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-righello-pink">AI Ops</p>
            <h2 className="mt-1 text-2xl font-black text-white">Crea job operativo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Brief, contesto e output attesi finiscono nel control plane. Optima risolve il grafo operativo, il runner VPS prende in carico il lavoro in polling.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
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

          <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                className="h-9 shrink-0 rounded-lg border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10"
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
              className="min-h-44 rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/70"
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

      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Control plane</p>
            <h2 className="mt-1 text-2xl font-black text-white">Coda runner</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshControlPlane().catch((err) => setError(err?.message ?? "Errore refresh"))}
            className="rounded-lg border-white/15 bg-transparent text-white hover:bg-white/10"
          >
            Aggiorna
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
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
            <div key={label} className="rounded-lg border border-white/10 bg-[#060a15] p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black text-white">{value}</p>
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

        <div className="mt-4 rounded-lg border border-white/10 bg-[#060a15] p-4">
          <div className="flex items-start justify-between gap-4">
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
              <div>
                <h3 className="font-black text-white">{runnerHealth.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{runnerHealth.detail}</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
              {runnerHealth.latest?.mode ?? "no runner"}
            </span>
          </div>

          {runners.length > 0 ? (
            <div className="mt-4 space-y-2">
              {runners.slice(0, 3).map((runner) => (
                <div
                  key={runner.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
                >
                  <span className="font-bold text-white">{runner.id}</span>
                  <span>
                    {runner.status} · {formatRelativeTime(runner.lastSeenAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid max-h-[720px] gap-3 overflow-y-auto pr-1">
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
              Nessun job agentico ancora creato.
            </div>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-white/10 bg-[#070c19] p-4">
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
                    <h3 className="mt-3 text-lg font-black leading-snug text-white">{job.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{job.brief}</p>
                  </div>
                  <div className="flex gap-2">
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
                  <p className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" />
                    {job.repoUrl ? `${job.repoUrl.replace("https://github.com/", "")} · ${job.repoBranch ?? "main"}` : "Repo non indicata"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(job.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>

                {job.resultSummary ? (
                  <div className="mt-4 rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-3 text-sm leading-6 text-cyan-50">
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
