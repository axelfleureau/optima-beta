"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, ClipboardPaste, Loader2, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ParsedTaskReportItem } from "@/lib/task-report-import"

type PreviewItem = ParsedTaskReportItem & {
  duplicate?: boolean
  existingTaskId?: string | null
}

type ImportResponse = {
  items: PreviewItem[]
  summary: {
    total: number
    duplicates?: number
    creatable?: number
    created?: number
    skipped?: number
  }
  error?: string
}

const sampleHint = `## 3 giugno 2026 mattina

### Progetto: Optima
Repo: axelfleureau/optima-beta

Task svolti:
- Corretta UX mobile del workspace.
- Migliorata command bar operativa.

Aree: gestionale interno, mobile UX, command bar.`

export function TaskReportImporter() {
  const [content, setContent] = useState("")
  const [preview, setPreview] = useState<ImportResponse | null>(null)
  const [loading, setLoading] = useState<"preview" | "import" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem("optima:task-import:draft")
    if (saved) {
      setContent(saved)
      window.localStorage.removeItem("optima:task-import:draft")
    }
  }, [])

  const groupedPreview = useMemo(() => {
    const groups = new Map<string, PreviewItem[]>()
    for (const item of preview?.items || []) {
      const key = item.dateLabel || item.dateIso
      groups.set(key, [...(groups.get(key) || []), item])
    }
    return Array.from(groups.entries())
  }, [preview])

  const analyze = async () => {
    setError(null)
    setSuccess(null)
    setLoading("preview")

    try {
      const response = await fetch("/api/tasks/import-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, dryRun: true }),
      })
      const payload = (await response.json().catch(() => ({}))) as ImportResponse
      if (!response.ok) {
        throw new Error(payload.error || "Non riesco ad analizzare il report")
      }
      setPreview(payload)
    } catch (err: any) {
      setError(err.message || "Errore durante l'analisi del report")
      setPreview(null)
    } finally {
      setLoading(null)
    }
  }

  const importTasks = async () => {
    setError(null)
    setSuccess(null)
    setLoading("import")

    try {
      const response = await fetch("/api/tasks/import-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, dryRun: false }),
      })
      const payload = (await response.json().catch(() => ({}))) as ImportResponse
      if (!response.ok) {
        throw new Error(payload.error || "Non riesco a creare le task")
      }
      setPreview(payload)
      setSuccess(`Create ${payload.summary.created || 0} task. Duplicate ignorate: ${payload.summary.skipped || 0}.`)
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione delle task")
    } finally {
      setLoading(null)
    }
  }

  const canAnalyze = content.trim().length > 120 && loading !== "preview"
  const canImport = Boolean(preview?.summary.creatable || (preview?.summary.total && !preview.summary.created)) && loading !== "import"

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
      <section className="rounded-lg border border-white/10 bg-[#0b1220] shadow-[0_18px_80px_rgba(0,0,0,0.24)]">
        <div className="border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg border border-righello-pink/30 bg-righello-pink/12 text-righello-pink">
              <ClipboardPaste className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Incolla report operativo</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Optima legge report markdown con data, progetto e task in elenco. Funziona anche senza la label "Task svolti": le attivita vengono create come blocchi operativi reali e collegate al progetto corretto.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              setPreview(null)
              setError(null)
              setSuccess(null)
            }}
            placeholder={sampleHint}
            className="min-h-[420px] w-full resize-y rounded-lg border border-white/10 bg-[#050914] p-4 text-[15px] leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-righello-cyan/70 focus:ring-2 focus:ring-righello-cyan/15"
          />

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
              <p>{success}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              disabled={!canAnalyze}
              onClick={analyze}
              className="h-12 rounded-lg bg-white text-[#06101f] hover:bg-slate-200"
            >
              {loading === "preview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analizza report
            </Button>
            <Button
              type="button"
              disabled={!preview || !canImport}
              onClick={importTasks}
              className="h-12 rounded-lg bg-righello-pink text-white hover:bg-righello-pink-dark"
            >
              {loading === "import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Crea task operative
            </Button>
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-white/10 bg-[#0b1220] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.18)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Anteprima</h2>
            <p className="mt-1 text-sm text-slate-400">Controllo duplicati, date e collegamenti.</p>
          </div>
          <div className="rounded-lg border border-righello-cyan/25 bg-righello-cyan/10 px-3 py-2 text-right text-sm text-righello-cyan">
            {preview?.summary.total || 0}
            <span className="ml-1 text-slate-400">blocchi</span>
          </div>
        </div>

        {preview ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="text-lg font-black text-white">{preview.summary.total}</div>
                <div className="mt-1 text-slate-500">totali</div>
              </div>
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="text-lg font-black text-emerald-200">{preview.summary.creatable ?? preview.summary.created ?? 0}</div>
                <div className="mt-1 text-emerald-100/55">nuove</div>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
                <div className="text-lg font-black text-amber-100">{preview.summary.duplicates ?? preview.summary.skipped ?? 0}</div>
                <div className="mt-1 text-amber-100/55">duplicate</div>
              </div>
            </div>

            <div className="max-h-[620px] space-y-5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {groupedPreview.map(([date, items]) => (
                <div key={date} className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-righello-pink">{date}</h3>
                  {items.map((item) => (
                    <article
                      key={`${item.dateIso}-${item.projectId}-${item.title}`}
                      className={cn(
                        "rounded-lg border p-3",
                        item.duplicate
                          ? "border-amber-300/20 bg-amber-300/[0.08]"
                          : "border-white/10 bg-[#060b16]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold leading-5 text-white">{item.projectName}</h4>
                          <p className="mt-1 text-xs text-slate-500">{item.clientName}</p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-bold",
                            item.duplicate ? "bg-amber-300/15 text-amber-100" : "bg-emerald-400/12 text-emerald-200"
                          )}
                        >
                          {item.duplicate ? "duplicata" : "nuova"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span>{item.taskBullets.length} attivita</span>
                        {item.repo && <span>{item.repo}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
            Incolla il report e premi <span className="font-bold text-white">Analizza report</span>. Se arrivi dalla command bar, il testo incollato viene recuperato automaticamente.
          </div>
        )}
      </aside>
    </div>
  )
}
