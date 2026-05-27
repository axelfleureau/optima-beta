"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
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
  minutes: number
  note: string
  taskTitle: string
  projectName: string
}

type Option = {
  id: string
  label: string
  title?: string
  name?: string
  clientName?: string
  projectName?: string
  projectId?: string | null
  status?: string
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
    checkInAt: string | null
    checkOutAt: string | null
    status: string
    absenceReason: string | null
    notes: string
  }
  entries: Entry[]
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
  const [targetPickerOpen, setTargetPickerOpen] = useState(false)
  const [targetSearch, setTargetSearch] = useState("")
  const [activity, setActivity] = useState("")
  const [minutes, setMinutes] = useState("60")
  const [notes, setNotes] = useState("")

  const shiftDate = (days: number) => {
    const [year, month, day] = date.split("-").map(Number)
    const next = new Date(year, month - 1, day)
    next.setDate(next.getDate() + days)
    setDate(toDateInputValue(next))
  }

  const load = useCallback(async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [date, selectedMemberId])

  useEffect(() => {
    load()
  }, [load])

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

  const selectTarget = (option: TargetOption, nextActivity?: string) => {
    setSelectedTarget(option.value)
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
  }

  const handleAddEntry = async () => {
    const selected = targetOptions.find((option) => option.value === selectedTarget)
    const [kind, id] = selectedTarget.split(":")

    const response = await fetch("/api/time-tracking/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        memberId: selectedMemberId,
        taskId: kind === "task" ? id : null,
        projectId: kind === "project" ? id : selected?.projectId || null,
        note: activity,
        minutes: Number(minutes),
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore salvataggio attività")

    setActivity("")
    setMinutes("60")
    await load()
  }

  const handleDeleteEntry = async (id: string) => {
    const response = await fetch(`/api/time-tracking/entries/${id}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore rimozione attività")
    await load()
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
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
