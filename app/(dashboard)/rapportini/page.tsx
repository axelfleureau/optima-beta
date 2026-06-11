"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { notifyOperationalDataChanged, useLiveRefresh } from "@/hooks/use-live-refresh"
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  ListChecks,
  LogIn,
  LogOut,
  Plus,
  Undo2,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

type Member = {
  id: string
  name: string
  email: string
  role: string
}

type Entry = {
  id: string
  projectId: string | null
  taskId: string | null
  clientId: string | null
  minutes: number
  note: string
  taskTitle: string
  clientName: string
  projectName: string
}

type Option = {
  id: string
  label: string
  title?: string
  name?: string
  company?: string
  clientId?: string | null
  clientName?: string
  projectName?: string
  projectId?: string | null
  status?: string
  priority?: string
  dueAt?: string | null
  subItems?: Array<{
    id: string
    title: string
    completed: boolean
    createdAt?: string | null
  }>
}

type TargetOption = Option & {
  value: string
  kind: "task" | "project"
}

type TimeTrackingPayload = {
  isManager: boolean
  selectedMember: Member
  members: Member[]
  day: null | {
    id: string
    checkInAt: string | null
    checkOutAt: string | null
    status: string
    absenceReason: string | null
    notes: string
    reviewStatus: string
    submittedAt: string | null
    reviewedAt: string | null
    reviewNotes: string
  }
  entries: Entry[]
  submittedReports: Array<{
    id: string
    date: string
    reviewStatus: string
    submittedAt: string | null
    memberId: string
    memberName: string
    memberEmail: string
    role: string
    activityMinutes: number
    entryCount: number
    reviewNotes: string
  }>
  totals: {
    activityMinutes: number
    presenceMinutes: number
    grossPresenceMinutes?: number
    expectedOfficeMinutes?: number
    lunchBreakMinutes?: number
  }
  options: {
    tasks: Option[]
    projects: Option[]
    clients: Option[]
  }
}

const pageClass =
  "h-[calc(100svh-73px)] w-full max-w-full overflow-y-auto overflow-x-clip overscroll-contain bg-[#0b1323] text-slate-100 touch-pan-y md:h-auto md:min-h-screen md:overflow-x-clip md:overflow-y-visible"
const panelClass =
  "w-full min-w-0 max-w-full overflow-hidden rounded-[8px] border border-white/10 bg-[#151d2c] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.28)] sm:p-5"
const fieldClass =
  "h-11 w-full min-w-0 max-w-full border-white/10 bg-[#222a31] text-slate-100 placeholder:text-slate-400 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"
const selectClass =
  "h-11 w-full min-w-0 max-w-full truncate rounded-md border border-white/10 bg-[#222a31] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-righello-pink/70"

const statusLabel: Record<string, string> = {
  todo: "To Do",
  "to-do": "To Do",
  "in-progress": "In corso",
  review: "Review",
  validation: "Validation",
  done: "Completata",
  completed: "Completata",
  urgent: "Urgenze",
  onhold: "In pausa",
  "on-hold": "In pausa",
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatTime(value?: string | null) {
  if (!value) return "--:--"
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function formatDueDate(value?: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(new Date(value))
}

function TimePickerField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <label className="relative flex h-14 min-w-0 items-center justify-center overflow-hidden rounded-[8px] border border-white/10 bg-[#222a31] px-3 text-base font-semibold text-slate-100">
        <span className="pointer-events-none truncate">{value || "--:--"}</span>
        <Input
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-0"
          type="time"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  )
}

function DailyMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: "green" | "cyan" | "amber" | "pink"
}) {
  const tones = {
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    pink: "border-righello-pink/30 bg-righello-pink/12 text-righello-pink",
  }

  return (
    <div className={`rounded-[8px] border p-4 ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
    </div>
  )
}

export default function RapportiniPage() {
  const [date, setDate] = useState(today())
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [payload, setPayload] = useState<TimeTrackingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [checkInTime, setCheckInTime] = useState(currentTime())
  const [checkOutTime, setCheckOutTime] = useState(currentTime())
  const [absenceReason, setAbsenceReason] = useState("Assenza")
  const [selectedTarget, setSelectedTarget] = useState("")
  const [selectedClientId, setSelectedClientId] = useState("")
  const [targetPickerOpen, setTargetPickerOpen] = useState(false)
  const [targetSearch, setTargetSearch] = useState("")
  const [activity, setActivity] = useState("")
  const [minutes, setMinutes] = useState("60")
  const [notes, setNotes] = useState("")
  const hasLoadedRef = useRef(false)

  const shiftDate = (days: number) => {
    const [year, month, day] = date.split("-").map(Number)
    const next = new Date(year, month - 1, day)
    next.setDate(next.getDate() + days)
    setDate(toDateInputValue(next))
  }

  const load = useCallback(async () => {
    setLoading(!hasLoadedRef.current)
    setError("")

    const params = new URLSearchParams({ date })
    if (selectedMemberId) params.set("memberId", selectedMemberId)

    try {
      const response = await fetch(`/api/time-tracking?${params.toString()}`, { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Errore nel caricamento rapportino")

      setPayload(data)
      setNotes(data.day?.notes || "")
      if (!selectedMemberId && data.selectedMember?.id) {
        setSelectedMemberId(data.selectedMember.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento rapportino")
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [date, selectedMemberId])

  useEffect(() => {
    load()
  }, [load])

  useLiveRefresh(load, {
    enabled: Boolean(payload || !loading),
    intervalMs: 15000,
  })

  const targetOptions = useMemo<TargetOption[]>(() => {
    if (!payload) return []
    return [
      ...payload.options.tasks.map((task) => ({
        ...task,
        value: `task:${task.id}`,
        kind: "task" as const,
        projectId: task.projectId || null,
      })),
      ...payload.options.projects.map((project) => ({
        ...project,
        value: `project:${project.id}`,
        kind: "project" as const,
        projectId: project.id,
      })),
    ]
  }, [payload])

  const clientOptions = payload?.options.clients || []

  const matchClientIdByName = useCallback(
    (clientName?: string | null) => {
      const normalized = String(clientName || "").trim().toLowerCase()
      if (!normalized) return ""
      return clientOptions.find((client) => String(client.name || client.label).trim().toLowerCase() === normalized)?.id || ""
    },
    [clientOptions],
  )

  const resolveClientId = useCallback(
    (option?: Option | null) => option?.clientId || matchClientIdByName(option?.clientName),
    [matchClientIdByName],
  )

  const selectedOption = useMemo(
    () => targetOptions.find((option) => option.value === selectedTarget) || null,
    [selectedTarget, targetOptions],
  )

  const filteredTargets = useMemo(() => {
    const query = targetSearch.trim().toLowerCase()
    if (!query) return targetOptions
    return targetOptions.filter((option) => {
      const haystack = [
        option.label,
        option.title,
        option.name,
        option.clientName,
        option.projectName,
        option.status,
        ...(option.subItems || []).map((item) => item.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [targetOptions, targetSearch])

  const groupedTargets = useMemo(() => {
    const tasks = filteredTargets.filter((option) => option.kind === "task")
    const projects = filteredTargets.filter((option) => option.kind === "project")
    const groups = new Map<string, TargetOption[]>()

    for (const task of tasks) {
      const groupName = task.projectName || task.clientName || "Task senza progetto"
      groups.set(groupName, [...(groups.get(groupName) || []), task])
    }

    return { taskGroups: Array.from(groups.entries()), projects }
  }, [filteredTargets])

  const suggestedTargets = useMemo(
    () =>
      targetOptions
        .filter((option) => option.kind === "task")
        .filter((option) => !["done", "completed", "validation"].includes(String(option.status || "").toLowerCase()))
        .sort((a, b) => {
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY
          if (aDue !== bDue) return aDue - bDue
          const priority: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
          return (priority[String(a.priority || "medium").toLowerCase()] ?? 2) - (priority[String(b.priority || "medium").toLowerCase()] ?? 2)
        })
        .slice(0, 5),
    [targetOptions],
  )

  const reportDeltaMinutes = (payload?.totals.presenceMinutes || 0) - (payload?.totals.activityMinutes || 0)
  const hasPresence = Boolean(payload?.day?.checkInAt || payload?.day?.status === "closed")
  const isDayClosed = payload?.day?.status === "closed" && Boolean(payload.day.checkOutAt)
  const completionRatio =
    payload?.totals.presenceMinutes && payload.totals.presenceMinutes > 0
      ? Math.min(100, Math.round((payload.totals.activityMinutes / payload.totals.presenceMinutes) * 100))
      : 0

  const selectTarget = (option: TargetOption, nextActivity?: string) => {
    setSelectedTarget(option.value)
    const nextClientId = resolveClientId(option)
    if (nextClientId) setSelectedClientId(nextClientId)
    if (nextActivity && !activity.trim()) setActivity(nextActivity)
    setTargetPickerOpen(false)
  }

  const handleToggleSubItem = async (taskOption: TargetOption, subItemId: string) => {
    const nextSubItems = (taskOption.subItems || []).map((item) =>
      item.id === subItemId ? { ...item, completed: !item.completed } : item,
    )

    const response = await fetch(`/api/tasks/${taskOption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subItems: nextSubItems }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore aggiornamento checklist")

    setPayload((current) => {
      if (!current) return current
      return {
        ...current,
        options: {
          ...current.options,
          tasks: current.options.tasks.map((task) => (task.id === taskOption.id ? { ...task, subItems: nextSubItems } : task)),
        },
      }
    })
  }

  const mutateDay = async (action: string, body: Record<string, unknown> = {}) => {
    const response = await fetch("/api/time-tracking/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, date, memberId: selectedMemberId, ...body }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore aggiornamento giornata")
    await load()
    notifyOperationalDataChanged()
  }

  const undoCheckOut = async () => {
    await mutateDay("undo-check-out")
    toast.success("Checkout annullato: la giornata è di nuovo aperta")
  }

  const handleAddEntry = async () => {
    const selected = targetOptions.find((option) => option.value === selectedTarget)
    const [kind, id] = selectedTarget.split(":")
    const clientId = selectedClientId || resolveClientId(selected) || null

    const response = await fetch("/api/time-tracking/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        memberId: selectedMemberId,
        taskId: kind === "task" ? id : null,
        projectId: kind === "project" ? id : selected?.projectId || null,
        clientId,
        note: activity,
        minutes: Number(minutes),
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore salvataggio attività")

    setActivity("")
    setMinutes("60")
    setSelectedTarget("")
    setSelectedClientId("")
    await load()
    notifyOperationalDataChanged()
  }

  const handleDeleteEntry = async (id: string) => {
    const response = await fetch(`/api/time-tracking/entries/${id}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore rimozione attività")
    await load()
    notifyOperationalDataChanged()
  }

  const handleSubmitReport = async () => {
    const response = await fetch("/api/time-tracking/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, memberId: selectedMemberId, notes }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore invio rapportino")
    await load()
    notifyOperationalDataChanged()
    toast.success(data.emailSent ? "Rapportino inviato e riepilogo email spedito" : "Rapportino inviato per revisione")
  }

  const handleReviewReport = async (workDayId: string, action: "approved" | "changes_requested") => {
    const response = await fetch("/api/time-tracking/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workDayId, action }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore revisione rapportino")
    await load()
    toast.success(action === "approved" ? "Rapportino approvato" : "Revisione richiesta")
  }

  if (loading && !payload) {
    return (
      <div className={pageClass}>
        <div className="mx-auto w-full max-w-[100vw] overflow-x-clip px-4 py-5 md:max-w-7xl md:px-6 md:py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-righello-pink" />
        </div>
      </div>
    )
  }

  return (
    <div className={pageClass}>
      <div className="mx-auto w-full max-w-[100vw] space-y-6 overflow-x-clip px-4 py-5 [overflow-anchor:none] [&_*]:min-w-0 md:max-w-7xl md:px-6 md:py-8">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-3 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              <UserCheck className="h-7 w-7 shrink-0 text-slate-400 md:h-8 md:w-8" />
              Rapportini
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              {payload?.isManager
                ? "Traccia presenze, attività e progetto dei tuoi subordinati."
                : "Registra la tua giornata e collega le attività ai task assegnati."}
            </p>
          </div>
          <Badge className="w-fit border-0 bg-righello-pink/20 px-3 py-1 text-righello-pink">
            {payload?.isManager ? "Vista responsabile" : "Vista dipendente"}
          </Badge>
        </div>

        {error && (
          <Alert className="border-red-500/40 bg-red-950/30 text-red-100">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-3 md:grid-cols-4">
          <DailyMetricCard
            label="Stato giornata"
            value={payload?.day?.status === "closed" ? "Chiusa" : payload?.day?.status === "absent" ? "Assenza" : hasPresence ? "Aperta" : "Da aprire"}
            detail={hasPresence ? `${formatTime(payload?.day?.checkInAt)} - ${formatTime(payload?.day?.checkOutAt)}` : "Segna prima entrata/assenza"}
            tone={hasPresence ? "green" : "amber"}
          />
          <DailyMetricCard
            label="Presenza netta"
            value={formatMinutes(payload?.totals.presenceMinutes || 0)}
            detail={`Pausa stimata ${formatMinutes(payload?.totals.lunchBreakMinutes || 60)}`}
            tone="cyan"
          />
          <DailyMetricCard
            label="Attività registrate"
            value={formatMinutes(payload?.totals.activityMinutes || 0)}
            detail={`${completionRatio}% della presenza coperta`}
            tone={completionRatio >= 80 ? "green" : "amber"}
          />
          <DailyMetricCard
            label="Da spiegare"
            value={reportDeltaMinutes > 0 ? formatMinutes(reportDeltaMinutes) : "0m"}
            detail={reportDeltaMinutes > 30 ? "Aggiungi attività o nota blocco" : "Rapportino coerente"}
            tone={reportDeltaMinutes > 30 ? "pink" : "green"}
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className={panelClass}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-righello-pink">Fine giornata</div>
                <h2 className="mt-1 text-2xl font-bold text-white">Controllo rapido prima dell'invio</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Entrata, uscita e attività devono raccontare la giornata senza interpretazioni: se manca qualcosa, correggilo qui prima di inviare il rapportino.
                </p>
              </div>
              {isDayClosed && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 rounded-[8px] border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                  onClick={() => undoCheckOut().catch((err) => toast.error(err.message))}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Annulla checkout
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Entrata</p>
                <p className="mt-2 text-2xl font-black text-white">{formatTime(payload?.day?.checkInAt)}</p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Uscita</p>
                <p className="mt-2 text-2xl font-black text-white">{formatTime(payload?.day?.checkOutAt)}</p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Task registrate</p>
                <p className="mt-2 text-2xl font-black text-white">{payload?.entries.length || 0}</p>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-righello-cyan">Metodo Righello</div>
            <h2 className="mt-1 text-2xl font-bold text-white">Come collegare bene il lavoro</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="font-black text-white">1. Se esiste una task, collega la task.</p>
                <p className="mt-1 text-slate-400">È il dato migliore: porta con sé progetto, cliente, priorità e checklist.</p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="font-black text-white">2. Se non esiste la task, collega almeno il progetto.</p>
                <p className="mt-1 text-slate-400">Serve per mantenere puliti consuntivi, preventivi e lettura per cliente.</p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="font-black text-white">3. Progetti e nuove task si creano dal workspace.</p>
                <p className="mt-1 text-slate-400">Poi tornano disponibili nel selettore del rapportino senza scrivere due volte la stessa cosa.</p>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-4 min-h-10 rounded-[8px] border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
              <Link href="/workspace">
                Apri workspace
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {payload?.isManager && payload.submittedReports?.length ? (
          <section className={panelClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-righello-pink">Review responsabili</div>
                <h2 className="mt-1 text-2xl font-bold text-white">Rapportini da revisionare</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Giornate inviate dai dipendenti per controllo operativo e amministrazione.
                </p>
              </div>
              <Badge className="w-fit border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                {payload.submittedReports.length} in attesa
              </Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {payload.submittedReports.map((report) => (
                <div key={report.id} className="rounded-[8px] border border-white/10 bg-[#0d1524] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => setSelectedMemberId(report.memberId)}
                    >
                      <p className="truncate font-black text-white">{report.memberName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {report.role} · {report.entryCount} attività · {formatMinutes(report.activityMinutes)}
                        {report.submittedAt ? ` · inviato ${formatTime(report.submittedAt)}` : ""}
                      </p>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-[8px] bg-emerald-500 text-white hover:bg-emerald-400"
                        onClick={() => handleReviewReport(report.id, "approved").catch((err) => toast.error(err.message))}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Approva
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[8px] border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                        onClick={() => handleReviewReport(report.id, "changes_requested").catch((err) => toast.error(err.message))}
                      >
                        Richiedi modifica
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
          <section className={panelClass}>
            <div className="mb-5">
              <div className="break-words text-xs font-black uppercase tracking-[0.12em] text-righello-pink sm:tracking-[0.24em]">
                {formatDateLabel(date)}
              </div>
              <h2 className="mt-1 break-words text-2xl font-bold text-white">{payload?.selectedMember?.name || "Dipendente"}</h2>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-400">Giornata</label>
                <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-[8px] border border-white/10 bg-[#222a31]">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Giorno precedente"
                    className="h-11 rounded-none border-r border-white/10 text-slate-100 hover:bg-white/10 hover:text-white"
                    onClick={() => shiftDate(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <label className="relative flex min-w-0 items-center justify-center px-3 text-sm font-semibold text-slate-100">
                    <span className="pointer-events-none truncate">{formatShortDate(date)}</span>
                    <Input
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      type="date"
                      value={date}
                      aria-label="Seleziona giornata"
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Giorno successivo"
                    className="h-11 rounded-none border-l border-white/10 text-slate-100 hover:bg-white/10 hover:text-white"
                    onClick={() => shiftDate(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {payload?.isManager && (
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                    <Users className="h-4 w-4" />
                    Dipendente
                  </label>
                  <select className={selectClass} value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
                    {payload.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                <Button
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal bg-righello-pink px-3 text-white hover:bg-righello-pink-dark"
                  onClick={() => mutateDay("check-in", { time: checkInTime }).then(() => toast.success("Check-in registrato")).catch((err) => toast.error(err.message))}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Check-in
                </Button>
                <Button
                  variant="outline"
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal border-white/10 bg-[#0a0f1d] px-3 text-slate-100 hover:bg-white/10 hover:text-white"
                  onClick={() => mutateDay("check-out", { time: checkOutTime }).then(() => toast.success("Check-out registrato")).catch((err) => toast.error(err.message))}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Check-out
                </Button>
                <Button
                  variant="outline"
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal border-red-400/30 bg-red-950/20 px-3 text-red-100 hover:bg-red-500/15 hover:text-red-50"
                  onClick={() => mutateDay("absence", { reason: absenceReason }).then(() => toast.success("Assenza registrata")).catch((err) => toast.error(err.message))}
                >
                  Segna assenza
                </Button>
              </div>

              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <TimePickerField label="Entrata" value={checkInTime} onChange={setCheckInTime} />
                <TimePickerField label="Uscita" value={checkOutTime} onChange={setCheckOutTime} />
              </div>

              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-400">Attività svolta</label>
                  <Input
                    className={fieldClass}
                    placeholder="Es. montaggio video, call cliente, sviluppo landing..."
                    value={activity}
                    onChange={(event) => setActivity(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-400">Minuti</label>
                  <Input className={fieldClass} type="number" min={1} max={1440} value={minutes} onChange={(event) => setMinutes(event.target.value)} />
                </div>
              </div>

              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Compilazione rapida HR</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Presenza, attività collegate e note di blocco devono restare separati: così il dato è leggibile anche a fine mese.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[15, 30, 45, 60, 90, 120].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-[8px] border-white/10 bg-white/[0.04] px-2.5 text-xs text-slate-100 hover:bg-white/10"
                        onClick={() => setMinutes(String(value))}
                      >
                        {formatMinutes(value)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-400">Progetto o task collegato</label>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-12 w-full justify-start gap-3 border-white/10 bg-[#222a31] px-3 py-3 text-left text-slate-100 hover:bg-white/10 hover:text-white"
                    onClick={() => setTargetPickerOpen(true)}
                  >
                    {selectedOption?.kind === "task" ? <ClipboardList className="h-4 w-4 shrink-0 text-righello-pink" /> : <FolderKanban className="h-4 w-4 shrink-0 text-righello-cyan" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{selectedOption?.label || "Attività generale"}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {selectedOption
                          ? selectedOption.kind === "task"
                            ? `${selectedOption.projectName || selectedOption.clientName || "Task"}${selectedOption.subItems?.length ? ` · ${selectedOption.subItems.filter((item) => item.completed).length}/${selectedOption.subItems.length} checklist` : ""}`
                            : selectedOption.clientName
                              ? `Progetto · ${selectedOption.clientName}`
                              : "Progetto"
                          : "Nessun collegamento obbligatorio"}
                      </span>
                    </span>
                  </Button>
                  {selectedOption && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-fit px-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                      onClick={() => setSelectedTarget("")}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Rimuovi collegamento
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                  <Building2 className="h-4 w-4" />
                  Cliente collegato
                </label>
                <select className={selectClass} value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                  <option value="">Nessun cliente specifico</option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.label || client.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-slate-500">
                  Se scegli una task o un progetto, il cliente viene compilato automaticamente quando disponibile.
                </p>
              </div>

              <Dialog open={targetPickerOpen} onOpenChange={setTargetPickerOpen}>
                <DialogContent className="max-h-[86dvh] w-[calc(100vw-24px)] max-w-3xl overflow-hidden rounded-[8px] border-white/10 bg-[#070b14] p-0 text-slate-100 shadow-2xl sm:w-full">
                  <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-5">
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
                      <ListChecks className="h-5 w-5 text-righello-pink" />
                      Collega attività
                    </DialogTitle>
                    <p className="text-sm text-slate-400">
                      Cerca task, progetto o checklist. Le task sono raggruppate per progetto/cliente.
                    </p>
                  </DialogHeader>

                  <div className="border-b border-white/10 p-4 sm:p-5">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        className="h-12 border-white/10 bg-[#111827] pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"
                        placeholder="Cerca: cliente, progetto, task, sub-attività..."
                        value={targetSearch}
                        onChange={(event) => setTargetSearch(event.target.value)}
                        autoFocus
                      />
                    </label>
                  </div>

                  <div className="max-h-[58dvh] space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    <button
                      type="button"
                      className="w-full rounded-[8px] border border-dashed border-white/15 bg-white/[0.03] p-4 text-left transition hover:border-righello-pink/50 hover:bg-righello-pink/10"
                      onClick={() => {
                        setSelectedTarget("")
                        setTargetPickerOpen(false)
                      }}
                    >
                      <div className="font-bold text-white">Attività generale</div>
                      <div className="mt-1 text-sm text-slate-400">Usala per lavoro non associato a un progetto o task specifica.</div>
                    </button>

                    {groupedTargets.taskGroups.map(([groupName, tasks]) => (
                      <div key={groupName} className="space-y-2">
                        <div className="sticky top-[-1rem] z-10 -mx-4 border-y border-white/10 bg-[#070b14]/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur sm:-mx-5 sm:px-5">
                          {groupName}
                        </div>
                        <div className="grid gap-2">
                          {tasks.map((option) => {
                            const completed = option.subItems?.filter((item) => item.completed).length || 0
                            const total = option.subItems?.length || 0
                            return (
                              <div
                                key={option.value}
                                className={`rounded-[8px] border p-3 transition ${
                                  selectedTarget === option.value
                                    ? "border-righello-pink/70 bg-righello-pink/10"
                                    : "border-white/10 bg-[#111827] hover:border-white/25"
                                }`}
                              >
                                <button type="button" className="w-full text-left" onClick={() => selectTarget(option)}>
                                  <div className="flex min-w-0 items-start gap-3">
                                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-righello-pink" />
                                    <div className="min-w-0 flex-1">
                                      <div className="break-words text-sm font-bold leading-5 text-white">{option.title || option.label}</div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                        <span>{statusLabel[option.status || ""] || option.status || "Task"}</span>
                                        {option.dueAt ? <span>Scade {formatDueDate(option.dueAt)}</span> : null}
                                        {total ? <span>{completed}/{total} checklist</span> : null}
                                      </div>
                                    </div>
                                  </div>
                                </button>

                                {option.subItems?.length ? (
                                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                    {option.subItems.map((item) => (
                                      <div key={item.id} className="flex items-start gap-2 rounded-md bg-black/20 p-2">
                                        <Checkbox
                                          checked={item.completed}
                                          className="mt-0.5 border-white/30 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500"
                                          onCheckedChange={() =>
                                            handleToggleSubItem(option, item.id)
                                              .then(() => toast.success("Checklist aggiornata"))
                                              .catch((err) => toast.error(err.message))
                                          }
                                        />
                                        <button
                                          type="button"
                                          className={`min-w-0 flex-1 text-left text-sm leading-5 ${
                                            item.completed ? "text-slate-500 line-through" : "text-slate-200 hover:text-white"
                                          }`}
                                          onClick={() => selectTarget(option, item.title)}
                                        >
                                          {item.title}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {groupedTargets.projects.length ? (
                      <div className="space-y-2">
                        <div className="sticky top-[-1rem] z-10 -mx-4 border-y border-white/10 bg-[#070b14]/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur sm:-mx-5 sm:px-5">
                          Progetti
                        </div>
                        <div className="grid gap-2">
                          {groupedTargets.projects.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`rounded-[8px] border p-3 text-left transition ${
                                selectedTarget === option.value
                                  ? "border-righello-cyan/70 bg-righello-cyan/10"
                                  : "border-white/10 bg-[#111827] hover:border-white/25"
                              }`}
                              onClick={() => selectTarget(option)}
                            >
                              <div className="flex items-start gap-3">
                                <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-righello-cyan" />
                                <div className="min-w-0">
                                  <div className="break-words text-sm font-bold text-white">{option.name || option.label}</div>
                                  {option.clientName ? <div className="mt-1 text-xs text-slate-400">{option.clientName}</div> : null}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!filteredTargets.length && (
                      <div className="rounded-[8px] border border-dashed border-white/15 p-8 text-center text-slate-400">
                        Nessuna task o progetto trovato.
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                className="h-auto min-h-11 w-full min-w-0 whitespace-normal bg-righello-pink px-3 text-white hover:bg-righello-pink-dark"
                onClick={() => handleAddEntry().then(() => toast.success("Attività aggiunta")).catch((err) => toast.error(err.message))}
              >
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi attività
              </Button>

              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-[#1b242b] p-4">
                  <div className="text-sm text-slate-400">Ore presenza nette</div>
                  <div className="mt-1 text-3xl font-black text-white">{formatMinutes(payload?.totals.presenceMinutes || 0)}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {formatTime(payload?.day?.checkInAt)} - {formatTime(payload?.day?.checkOutAt)}
                    {payload?.totals.lunchBreakMinutes ? ` · pausa ${formatMinutes(payload.totals.lunchBreakMinutes)}` : ""}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#1b242b] p-4">
                  <div className="text-sm text-slate-400">Ore attività</div>
                  <div className="mt-1 text-3xl font-black text-white">{formatMinutes(payload?.totals.activityMinutes || 0)}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {payload?.day?.status || "da aprire"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={panelClass}>
            <div className="mb-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-righello-pink sm:tracking-[0.24em]">Rapportino</div>
              <h2 className="mt-1 text-2xl font-bold text-white">Cosa è stato fatto</h2>
            </div>

            <div className="w-full min-w-0 max-w-full space-y-3">
              <div className="rounded-[8px] border border-white/10 bg-[#0d1524] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-righello-pink" />
                  <div>
                    <p className="font-bold text-white">Suggerimenti da workspace</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Parti dalle task assegnate: riduce scrittura manuale, errori di consuntivo e attività non collegata.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {suggestedTargets.length ? (
                    suggestedTargets.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="w-full rounded-[8px] border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-righello-pink/40 hover:bg-righello-pink/10"
                        onClick={() => {
                          setSelectedTarget(option.value)
                          const nextClientId = resolveClientId(option)
                          if (nextClientId) setSelectedClientId(nextClientId)
                          setActivity(option.title || option.label)
                          setMinutes("60")
                        }}
                      >
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-white">{option.title || option.label}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {option.projectName || option.clientName || "Task"}{option.dueAt ? ` · scade ${formatDueDate(option.dueAt)}` : ""}
                            </p>
                          </div>
                          <Badge className="w-fit rounded-[8px] border border-white/10 bg-white/10 text-slate-200">
                            Usa nel rapportino
                          </Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[8px] border border-dashed border-white/10 p-4 text-sm text-slate-500">
                      Nessuna task aperta assegnata per questa giornata.
                    </div>
                  )}
                </div>
              </div>

              {payload?.entries.length ? (
                payload.entries.map((entry) => (
                  <div key={entry.id} className="min-w-0 rounded-[8px] border border-white/10 bg-[#222a31] p-4">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="break-words font-bold leading-6 text-white">
                          {entry.projectName ? `${entry.projectName}: ` : ""}
                          {entry.note || "Attività registrata"}
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-400">
                          <Clock className="h-4 w-4 shrink-0" />
                          {formatMinutes(entry.minutes)}
                          {entry.clientName ? (
                            <Badge className="gap-1 rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                              <Building2 className="h-3.5 w-3.5" />
                              {entry.clientName}
                            </Badge>
                          ) : null}
                          {entry.taskTitle ? <span className="min-w-0 break-words">· {entry.taskTitle}</span> : null}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full shrink-0 border-white/10 bg-white/5 text-slate-100 hover:bg-red-500/15 hover:text-red-100 sm:w-auto"
                        onClick={() => handleDeleteEntry(entry.id).then(() => toast.success("Attività rimossa")).catch((err) => toast.error(err.message))}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 bg-[#111b2d] p-8 text-center text-slate-400">
                  <FileText className="mx-auto mb-3 h-8 w-8" />
                  Nessuna attività registrata per questa giornata.
                </div>
              )}

              <div className="grid gap-2 pt-3">
                <label className="text-sm font-semibold text-slate-400">Note fine giornata</label>
                <Textarea
                  className="min-h-24 min-w-0 border-white/10 bg-[#222a31] text-slate-100 placeholder:text-slate-400 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"
                  placeholder="Blocchi, materiali mancanti, note utili"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-[#0a0f1d] text-slate-100 hover:bg-white/10 hover:text-white sm:w-fit"
                  onClick={() => mutateDay("notes", { notes }).then(() => toast.success("Note salvate")).catch((err) => toast.error(err.message))}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Salva note
                </Button>
                <div className="rounded-[8px] border border-white/10 bg-[#101827] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-white">
                        Stato review: {payload?.day?.reviewStatus === "submitted" ? "Inviato" : payload?.day?.reviewStatus === "approved" ? "Approvato" : payload?.day?.reviewStatus === "changes_requested" ? "Da correggere" : "Bozza"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        L'invio chiude il riepilogo giornaliero e lo mette nella coda dei responsabili.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="h-10 rounded-[8px] bg-righello-pink px-4 text-white hover:bg-righello-pink-dark"
                      onClick={() => handleSubmitReport().catch((err) => toast.error(err.message))}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Invia rapportino
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
