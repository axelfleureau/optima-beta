"use client"

import { useMemo, useState } from "react"
import { Bot, CheckCircle2, Clock, GitBranch, Loader2, Play, ShieldCheck, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AgentJob } from "@/lib/agent-jobs"

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
  jobType: "codex_patch",
  priority: 3,
  repoUrl: "https://github.com/axelfleureau/optima-beta",
  repoBranch: "main",
  contextSummary: "",
  brief: "",
}

export function AgentJobsClient({ initialJobs }: { initialJobs: AgentJob[] }) {
  const [jobs, setJobs] = useState(initialJobs)
  const [form, setForm] = useState(initialForm)
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

  async function refreshJobs() {
    const response = await fetch("/api/agent-jobs")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Errore refresh job")
    setJobs(data.jobs ?? [])
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
            requestedOutput: ["patch", "report", "pull-request", "task-update"],
            guardrails: [
              "non eseguire deploy senza approvazione admin",
              "non stampare secret",
              "mantenere worktree isolato",
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
              Brief, repository, contesto e output attesi finiscono nel control plane. Il runner VPS prende in carico il lavoro in polling.
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
              placeholder="Es. Genera preventivo DICO/SYSTEMDOC"
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
                <option value="codex_patch">Codex patch/PR</option>
                <option value="quote_pdf">Preventivo PDF</option>
                <option value="research">Ricerca operativa</option>
                <option value="deploy">Deploy controllato</option>
                <option value="task_update">Aggiorna task</option>
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

          <label className="grid gap-2 text-sm font-bold text-white">
            Repository
            <input
              className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
              value={form.repoUrl}
              onChange={(event) => setForm((current) => ({ ...current, repoUrl: event.target.value }))}
              placeholder="https://github.com/axelfleureau/..."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-white">
              Branch
              <input
                className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                value={form.repoBranch}
                onChange={(event) => setForm((current) => ({ ...current, repoBranch: event.target.value }))}
                placeholder="main"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-white">
              Contesto breve
              <input
                className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                value={form.contextSummary}
                onChange={(event) => setForm((current) => ({ ...current, contextSummary: event.target.value }))}
                placeholder="Cliente, feature o area"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-white">
            Brief operativo
            <textarea
              className="min-h-44 rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/70"
              value={form.brief}
              onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
              placeholder="Descrivi cosa deve fare il runner, cosa deve produrre e quali limiti rispettare..."
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
            onClick={() => refreshJobs().catch((err) => setError(err?.message ?? "Errore refresh"))}
            className="rounded-lg border-white/15 bg-transparent text-white hover:bg-white/10"
          >
            Aggiorna
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            ["In coda", stats.queued],
            ["In esecuzione", stats.running],
            ["Review", stats.review],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-[#060a15] p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black text-white">{value}</p>
            </div>
          ))}
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
