"use client"

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Activity, AlarmClock, AlertCircle, ArrowRight, Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flame, LogIn, LogOut, Minus, PanelLeftClose, PanelLeftOpen, RefreshCw, Sparkles, TimerOff, UserCheck, Users, X, XCircle } from "lucide-react"
import { gsap } from "gsap"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type PresenceStatus = "present" | "closed" | "absent" | "missing" | "holiday"

type PersonPresence = {
  id: string
  name: string
  email: string
  role: string
  status: PresenceStatus
  checkInAt: string | null
  checkOutAt: string | null
  absenceReason: string
  notes: string
  assumedPresence?: boolean
  grossPresenceMinutes: number
  presenceMinutes: number
  activityMinutes: number
  dailyCapacityMinutes: number
  expectedOfficeMinutes: number
  lunchBreakMinutes: number
  workStartTime: string
  expectedCheckOutTime: string
  minutesLate: number
  minutesEarly: number
  presenceSignal: "late" | "early-exit" | null
  coverageRatio: number
  activityRatio: number
  upcomingTasks: Array<{
    id: string
    title: string
    clientName: string
    projectName: string
    status: string
    priority: string
    dueAt: string | null
    estimatedMinutes: number
  }>
  nextTask: {
    id: string
    title: string
    clientName: string
    projectName: string
    status: string
    priority: string
    dueAt: string | null
    estimatedMinutes: number
  } | null
  plannedSoonMinutes: number
  urgentSoonCount: number
  availability: {
    status: "asap" | "today" | "later" | "protected" | "not-available" | "unknown"
    label: string
    detail: string
  }
}

type PresencePayload = {
  role: string
  isManager: boolean
  date: string
  generatedAt: string
  self: PersonPresence | null
  people: PersonPresence[]
  calendar: {
    monthStart: string
    monthEnd: string
    days: string[]
    people: Array<{
      id: string
      name: string
      email: string
      role: string
      days: Array<{
        date: string
        status: PresenceStatus
        checkInAt: string | null
        checkOutAt: string | null
        absenceReason: string
        activityMinutes: number
        entryCount: number
        taskMinutes: number
        taskCount: number
        completedTaskMinutes: number
        completedTaskCount: number
        missingDurationTaskCount: number
        taskTitles: string[]
        loadMinutes: number
        intensity: number
        minutesLate: number
        minutesEarly: number
        signal: "late" | "early-exit" | null
      }>
    }>
  }
  summary: {
    total: number
    present: number
    closed: number
    absent: number
    missing: number
    holiday: number
    presenceMinutes: number
    activityMinutes: number
  }
}

type CalendarPerson = PresencePayload["calendar"]["people"][number]
type CalendarPersonDay = CalendarPerson["days"][number]
type HeatmapSignalSelection = {
  person: CalendarPerson
  day: CalendarPersonDay
}
type HeatmapCellSelection = HeatmapSignalSelection
type HeatmapDaySelection = {
  date: string
  records: Array<{ person: CalendarPerson; day: CalendarPersonDay }>
}

const pageClass =
  "h-[calc(100svh-73px)] min-h-0 w-full overflow-x-clip overflow-y-auto overscroll-contain bg-[#050914] text-white [-webkit-overflow-scrolling:touch] [touch-action:pan-y] md:h-auto md:min-h-screen md:overflow-x-hidden md:overflow-y-visible"
const panelClass = "rounded-[8px] border border-white/10 bg-[#0a1020]/90 shadow-[0_18px_70px_rgba(0,0,0,0.26)]"
const nativeDateTimeInputClass =
  "optima-native-date-time min-w-0 max-w-full shrink border-white/10 bg-black/25 text-center text-white [color-scheme:dark] focus-visible:ring-righello-pink"
const defaultWorkStartTime = "09:00"

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthInputValue(value: string) {
  return value.slice(0, 7)
}

function dateFromMonthInput(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : today()
}

function shiftMonth(value: string, delta: number) {
  const [year = "0", month = "1"] = value.slice(0, 7).split("-")
  const next = new Date(Number(year), Number(month) - 1 + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value
}

const ROLE_SORT_ORDER: Record<string, number> = {
  admin: 0,
  direzione: 1,
  director: 1,
  manager: 2,
  responsabile: 2,
  junior: 3,
  dipendente: 4,
  employee: 4,
}

function roleWeight(role?: string | null) {
  return ROLE_SORT_ORDER[String(role || "").trim().toLowerCase()] ?? 9
}

function sortByOperationalRole<T extends { name: string; role?: string | null; email?: string | null }>(people: T[]) {
  return [...people].sort((a, b) => {
    const roleDelta = roleWeight(a.role) - roleWeight(b.role)
    if (roleDelta !== 0) return roleDelta
    return (a.name || a.email || "").localeCompare(b.name || b.email || "", "it", { sensitivity: "base" })
  })
}

function compactPersonLabel(value: string) {
  return firstName(value).slice(0, 13)
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

function formatTime(value?: string | null) {
  if (!value) return "--:--"
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDayNumber(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`))
}

function formatWeekdayShort(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDueDate(value?: string | null) {
  if (!value) return "senza scadenza"
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value))
}

function statusMeta(status: PresenceStatus) {
  switch (status) {
    case "present":
      return {
        label: "Presente",
        icon: UserCheck,
        className: "border-emerald-400/25 bg-emerald-400/12 text-emerald-200",
        dot: "bg-emerald-400",
      }
    case "closed":
      return {
        label: "Uscito",
        icon: CheckCircle2,
        className: "border-cyan-300/25 bg-cyan-300/12 text-cyan-200",
        dot: "bg-cyan-300",
      }
    case "absent":
      return {
        label: "Assente",
        icon: XCircle,
        className: "border-red-300/25 bg-red-300/12 text-red-200",
        dot: "bg-red-300",
      }
    case "holiday":
      return {
        label: "Festivo",
        icon: CalendarDays,
        className: "border-slate-300/20 bg-slate-300/10 text-slate-200",
        dot: "bg-slate-300",
      }
    default:
      return {
        label: "Non segnato",
        icon: AlertCircle,
        className: "border-amber-300/25 bg-amber-300/12 text-amber-200",
        dot: "bg-amber-300",
      }
  }
}

function availabilityClass(status?: PersonPresence["availability"]["status"]) {
  switch (status) {
    case "asap":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    case "today":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
    case "later":
      return "border-violet-300/25 bg-violet-300/10 text-violet-100"
    case "protected":
      return "border-righello-pink/35 bg-righello-pink/12 text-righello-pink"
    case "not-available":
      return "border-red-300/25 bg-red-300/10 text-red-100"
    default:
      return "border-amber-300/25 bg-amber-300/10 text-amber-100"
  }
}

function presenceSignalLabel(person: PersonPresence) {
  if (person.presenceSignal === "late") return `Entrata +${formatMinutes(person.minutesLate)}`
  if (person.presenceSignal === "early-exit") return `Uscita -${formatMinutes(person.minutesEarly)}`
  return ""
}

function dayTimeSignalLabel(day: CalendarPersonDay) {
  if (day.signal === "late") return `Entrata +${formatMinutes(day.minutesLate)}`
  if (day.signal === "early-exit") return `Uscita -${formatMinutes(day.minutesEarly)}`
  return ""
}

function dayTimeSignalMeta(day: CalendarPersonDay) {
  if (day.signal === "late") {
    return {
      label: "Ritardo",
      short: `+${formatMinutes(day.minutesLate)}`,
      description: `Entrata registrata alle ${formatTime(day.checkInAt)} con ${formatMinutes(day.minutesLate)} di ritardo rispetto alla soglia operativa.`,
      Icon: AlarmClock,
      tone: "border-amber-200/70 bg-amber-300/16 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.24)]",
      chipTone: "border-amber-200/75 bg-amber-300 text-[#171106]",
      cellTone: "ring-1 ring-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.2)]",
    }
  }

  if (day.signal === "early-exit") {
    return {
      label: "Uscita anticipata",
      short: `-${formatMinutes(day.minutesEarly)}`,
      description: `Uscita registrata alle ${formatTime(day.checkOutAt)} con ${formatMinutes(day.minutesEarly)} di anticipo rispetto alla giornata indicativa.`,
      Icon: TimerOff,
      tone: "border-cyan-200/65 bg-cyan-300/14 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.2)]",
      chipTone: "border-cyan-200/75 bg-cyan-300 text-[#03131d]",
      cellTone: "ring-1 ring-cyan-300/65 shadow-[0_0_18px_rgba(34,211,238,0.18)]",
    }
  }

  return null
}

function calendarCellClass(day: PresencePayload["calendar"]["people"][number]["days"][number]) {
  if (day.status === "absent") return "border-red-300/75 bg-red-500/75 text-white shadow-[0_0_20px_rgba(248,113,113,0.22)]"
  if (day.status === "holiday") return "border-slate-300/25 bg-slate-400/16 text-slate-300"
  if (day.status === "missing" && day.intensity === 0) return "border-white/10 bg-white/[0.075] text-slate-500"
  if (day.missingDurationTaskCount > 0) return "border-amber-300/70 bg-amber-300/20 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.18)]"

  const intensityClasses = [
    "border-white/12 bg-white/[0.09] text-slate-400",
    "border-emerald-300/40 bg-emerald-400/34 text-emerald-50",
    "border-teal-300/55 bg-teal-400/52 text-white shadow-[0_0_15px_rgba(45,212,191,0.16)]",
    "border-cyan-300/70 bg-cyan-400/72 text-[#03131d] shadow-[0_0_20px_rgba(34,211,238,0.22)]",
    "border-righello-pink/80 bg-righello-pink/85 text-white shadow-[0_0_24px_rgba(224,64,133,0.32)]",
  ]

  return intensityClasses[Math.max(0, Math.min(4, day.intensity || 0))]
}

function calendarCellSignal(day: PresencePayload["calendar"]["people"][number]["days"][number]) {
  if (day.status === "absent") {
    return { label: "Assenza", short: "OFF", Icon: XCircle }
  }
  if (day.status === "holiday") {
    return { label: "Festivo", short: "F", Icon: CalendarDays }
  }
  if (day.missingDurationTaskCount > 0) {
    return { label: "Durate mancanti", short: String(day.missingDurationTaskCount), Icon: AlertCircle }
  }
  if (day.intensity >= 4) return { label: "Sprint", short: day.taskCount > 0 ? String(day.taskCount) : "MAX", Icon: Flame }
  if (day.intensity >= 3) return { label: "Focus", short: day.taskCount > 0 ? String(day.taskCount) : "F", Icon: Activity }
  if (day.intensity >= 2) return { label: "Operativo", short: day.taskCount > 0 ? String(day.taskCount) : "ON", Icon: Activity }
  if (day.intensity >= 1) return { label: "Leggero", short: day.taskCount > 0 ? String(day.taskCount) : "", Icon: UserCheck }
  return { label: "Vuoto", short: "-", Icon: Minus }
}

function calendarDayTitle(person: PresencePayload["calendar"]["people"][number], day: PresencePayload["calendar"]["people"][number]["days"][number]) {
  const signal = calendarCellSignal(day)
  const parts = [
    person.name,
    formatDateLabel(day.date),
    `Stato: ${statusMeta(day.status).label}`,
    `Segnale: ${signal.label}`,
    `Time entry registrate: ${formatMinutes(day.activityMinutes)}`,
    `Task collegate: ${day.taskCount}`,
  ]
  if (day.completedTaskCount > 0) parts.push(`Task completate/importate: ${day.completedTaskCount}`)
  if (day.missingDurationTaskCount > 0) parts.push(`Task senza durata: ${day.missingDurationTaskCount}`)
  if (day.signal) parts.push(`Indicatore orario: ${dayTimeSignalLabel(day)}`)
  if (day.checkInAt) parts.push(`Entrata: ${formatTime(day.checkInAt)}`)
  if (day.checkOutAt) parts.push(`Uscita: ${formatTime(day.checkOutAt)}`)
  if (day.signal === "late") parts.push(`Ritardo: ${formatMinutes(day.minutesLate)}`)
  if (day.signal === "early-exit") parts.push(`Uscita anticipata: ${formatMinutes(day.minutesEarly)}`)
  if (day.absenceReason) parts.push(`Motivo: ${day.absenceReason}`)
  return parts.join("\n")
}

function personMonthStats(person: PresencePayload["calendar"]["people"][number]) {
  return person.days.reduce(
    (acc, day) => {
  if (day.status === "present" || day.status === "closed") acc.presenceDays += 1
      if (day.status === "absent") acc.absenceDays += 1
      if (day.signal) acc.anomalyDays += 1
      acc.taskCount += day.taskCount
      acc.activityMinutes += day.activityMinutes
      return acc
    },
    { presenceDays: 0, absenceDays: 0, anomalyDays: 0, taskCount: 0, activityMinutes: 0 },
  )
}

function getMonthCalendarCells(days: string[]) {
  if (days.length === 0) return []

  const firstDay = new Date(`${days[0]}T00:00:00`)
  const leadingEmptyCells = (firstDay.getDay() + 6) % 7
  const cells: Array<string | null> = [
    ...Array.from({ length: leadingEmptyCells }, () => null),
    ...days,
  ]

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function getCalendarDayRecords(people: CalendarPerson[], date: string) {
  return people
    .map((person) => {
      const day = person.days.find((item) => item.date === date) || null
      return { person, day }
    })
    .filter((record): record is { person: CalendarPerson; day: CalendarPersonDay } => Boolean(record.day))
}

function calendarDayTone(records: Array<{ person: CalendarPerson; day: CalendarPersonDay }>) {
  const hasAbsence = records.some(({ day }) => day.status === "absent")
  const hasSignal = records.some(({ day }) => day.signal)
  const hasPresence = records.some(({ day }) => day.status === "present" || day.status === "closed")
  const hasHoliday = records.some(({ day }) => day.status === "holiday")

  if (hasAbsence) return "border-red-300/35 bg-red-500/[0.08]"
  if (hasSignal) return "border-amber-300/35 bg-amber-300/[0.08]"
  if (hasPresence) return "border-emerald-300/25 bg-emerald-300/[0.05]"
  if (hasHoliday) return "border-slate-300/15 bg-slate-300/[0.04]"
  return "border-white/10 bg-white/[0.035]"
}

function attendanceEventTone(day: CalendarPersonDay) {
  if (day.status === "absent") return "border-red-300/30 bg-red-500/15 text-red-100"
  if (day.status === "holiday") return "border-slate-300/20 bg-slate-300/10 text-slate-200"
  if (day.signal === "late") return "border-amber-300/35 bg-amber-300/15 text-amber-100"
  if (day.signal === "early-exit") return "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
  if (day.status === "closed") return "border-slate-300/20 bg-slate-300/10 text-slate-200"
  return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
}

function attendanceEventLabel(day: CalendarPersonDay) {
  if (day.status === "absent") return day.absenceReason ? `Assente: ${day.absenceReason}` : "Assente"
  if (day.status === "holiday") return day.absenceReason || "Festivo"
  if (day.signal === "late") return `Ritardo +${formatMinutes(day.minutesLate)}`
  if (day.signal === "early-exit") return `Uscita -${formatMinutes(day.minutesEarly)}`
  if (day.status === "closed") return "Uscito"
  if (day.status === "present") return "Presente"
  return "Non segnato"
}

function calendarDaySummary(records: Array<{ person: CalendarPerson; day: CalendarPersonDay }>) {
  return records.reduce(
    (acc, { day }) => {
      if (day.status === "present" || day.status === "closed") acc.present += 1
      if (day.status === "absent") acc.absent += 1
      if (day.status === "missing") acc.missing += 1
      if (day.status === "holiday") acc.holiday += 1
      if (day.signal === "late") acc.late += 1
      if (day.signal === "early-exit") acc.earlyExit += 1
      return acc
    },
    { present: 0, absent: 0, missing: 0, holiday: 0, late: 0, earlyExit: 0 },
  )
}

export default function PresenzePage() {
  const [date, setDate] = useState(today())
  const [checkInTime, setCheckInTime] = useState(defaultWorkStartTime)
  const [checkOutTime, setCheckOutTime] = useState(currentTime())
  const [payload, setPayload] = useState<PresencePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true)
    setRefreshing(true)
    setError("")

    try {
      const response = await fetch(`/api/time-tracking/presence?date=${date}`, { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Errore nel caricamento presenze")
      setPayload(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Errore nel caricamento presenze")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [date])

  useEffect(() => {
    load("initial")
  }, [load])

  useEffect(() => {
    const interval = window.setInterval(() => load("refresh"), 30000)
    return () => window.clearInterval(interval)
  }, [load])

  const self = payload?.self || null
  const presentPeople = useMemo(() => payload?.people.filter((person) => person.status === "present") || [], [payload])
  const pendingPeople = useMemo(
    () => payload?.people.filter((person) => person.status === "missing" || person.status === "absent" || person.presenceSignal) || [],
    [payload],
  )
  const availabilityPeople = useMemo(
    () =>
      [...(payload?.people || [])].sort((a, b) => {
        const order: Record<string, number> = { asap: 0, today: 1, later: 2, protected: 3, unknown: 4, "not-available": 5 }
        return (order[a.availability?.status] ?? 9) - (order[b.availability?.status] ?? 9)
      }),
    [payload],
  )

  useEffect(() => {
    if (self?.workStartTime && self.status === "missing") setCheckInTime(self.workStartTime)
    if (self?.expectedCheckOutTime && self.status !== "present") setCheckOutTime(self.expectedCheckOutTime)
  }, [self?.expectedCheckOutTime, self?.status, self?.workStartTime])

  const mutateSelf = async (action: "check-in" | "check-out" | "absence", time?: string) => {
    const response = await fetch("/api/time-tracking/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, date, time, reason: "Assenza" }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore aggiornamento presenza")
    await load("refresh")
  }

  const mutateMemberAbsence = async (memberId: string, memberName: string) => {
    const response = await fetch("/api/time-tracking/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "absence", date, memberId, reason: "Assenza" }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Errore aggiornamento presenza")
    await load("refresh")
    toast.success(`${memberName} segnata assente`)
  }

  if (loading && !payload) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-righello-pink" />
        </div>
      </div>
    )
  }

  return (
    <div className={pageClass}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(226,55,133,0.18),transparent_34%),radial-gradient(circle_at_82%_6%,rgba(40,206,218,0.16),transparent_28%)]" />
      <div className="relative mx-auto w-full max-w-7xl space-y-5 overflow-x-clip px-4 py-5 md:px-8 md:py-8">
        <header className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Badge className="mb-3 w-fit rounded-[8px] border border-righello-pink/30 bg-righello-pink/15 text-righello-pink">
              <Building2 className="mr-2 h-3.5 w-3.5" />
              Presenza ufficio
            </Badge>
            <h1 className="text-3xl font-black tracking-normal text-white md:text-5xl">
              Chi è operativo adesso.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Vista rapida per verificare chi è in ufficio, chi ha segnato assenze e come sta andando la copertura delle ore nette. La giornata parte di norma alle 09:00 e termina alle 18:00, con entrata reale anticipabile o posticipabile.
            </p>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,11rem)] md:w-auto">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={cn("h-11 rounded-[8px]", nativeDateTimeInputClass)}
            />
            <Button
              variant="outline"
              className="h-11 w-full min-w-0 rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => load("refresh")}
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Aggiorna
            </Button>
          </div>
        </header>

        {error && (
          <Alert className="border-red-500/40 bg-red-950/35 text-red-100">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={cn(panelClass, "overflow-hidden")}>
            <div className="border-b border-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-righello-pink">{formatDateLabel(date)}</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">{self?.name || "La tua presenza"}</h2>
                  <p className="mt-1 text-sm text-slate-400">{payload?.isManager ? "La tua giornata" : "Vista dipendente"}</p>
                </div>
                {self && <PresenceBadge status={self.status} />}
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Entrata</p>
                  <p className="mt-1 text-3xl font-black text-white">{formatTime(self?.checkInAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Prevista {self?.workStartTime || defaultWorkStartTime}</p>
                  <Input
                    type="time"
                    value={checkInTime}
                    onChange={(event) => setCheckInTime(event.target.value)}
                    className={cn("mt-3 h-10 rounded-[8px]", nativeDateTimeInputClass)}
                  />
                </div>
                <div className="min-w-0 overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Uscita</p>
                  <p className="mt-1 text-3xl font-black text-white">{formatTime(self?.checkOutAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Indicativa {self?.expectedCheckOutTime || "17:00"}</p>
                  <Input
                    type="time"
                    value={checkOutTime}
                    onChange={(event) => setCheckOutTime(event.target.value)}
                    className={cn("mt-3 h-10 rounded-[8px]", nativeDateTimeInputClass)}
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <Button
                  className="min-h-12 min-w-0 rounded-[8px] bg-righello-pink text-white hover:bg-righello-pink-dark"
                  onClick={() => mutateSelf("check-in", checkInTime).then(() => toast.success("Check-in registrato")).catch((err) => toast.error(err.message))}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Check-in
                </Button>
                <Button
                  variant="outline"
                  className="min-h-12 min-w-0 rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => mutateSelf("check-out", checkOutTime).then(() => toast.success("Check-out registrato")).catch((err) => toast.error(err.message))}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Check-out
                </Button>
                <Button
                  variant="outline"
                  className="min-h-12 min-w-0 rounded-[8px] border-red-400/30 bg-red-950/25 text-red-100 hover:bg-red-500/15"
                  onClick={() => mutateSelf("absence").then(() => toast.success("Assenza registrata")).catch((err) => toast.error(err.message))}
                >
                  Assenza
                </Button>
              </div>

              <div className="rounded-[8px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Copertura giornata netta</p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {formatMinutes(self?.presenceMinutes || 0)} / {formatMinutes(self?.expectedOfficeMinutes || 420)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-cyan-200" />
                </div>
                <Progress className="mt-4 h-2 bg-white/10" value={(self?.coverageRatio || 0) * 100} />
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Calcolo ufficio: {formatMinutes(self?.dailyCapacityMinutes || 480)} lorde, meno{" "}
                  {formatMinutes(self?.lunchBreakMinutes || 60)} di pausa pranzo. Le entrate prima/dopo le 09:00 vengono tracciate senza forzare il dato.
                </p>
                {self?.assumedPresence && (
                  <div className="mt-3 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
                    Presenza direzione assunta: nessuna timbratura richiesta finche non viene segnata un'assenza.
                  </div>
                )}
                {self?.presenceSignal && (
                  <div className="mt-3 rounded-[8px] border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                    {self.presenceSignal === "late"
                      ? `Entrata oltre la tolleranza di ${formatMinutes(self.minutesLate)}.`
                      : `Uscita anticipata di ${formatMinutes(self.minutesEarly)} rispetto alla giornata indicativa.`}
                  </div>
                )}
              </div>

              <Button asChild variant="outline" className="w-full rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Link href="/rapportini">
                  Apri rapportino attività
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Presenti ora" value={payload?.summary.present || 0} tone="green" />
            <SummaryCard label="Usciti" value={payload?.summary.closed || 0} tone="cyan" />
            <SummaryCard label="Non segnati" value={payload?.summary.missing || 0} tone="amber" />
            <SummaryCard label="Assenti" value={payload?.summary.absent || 0} tone="red" />
            <div className={cn(panelClass, "p-4 sm:col-span-2 lg:col-span-4")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Ore presenza team</p>
                  <p className="mt-1 text-3xl font-black text-white">{formatMinutes(payload?.summary.presenceMinutes || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Ore attività</p>
                  <p className="mt-1 text-2xl font-black text-cyan-200">{formatMinutes(payload?.summary.activityMinutes || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {payload?.calendar && (
          <PresenceCalendarHeatmap
            calendar={payload.calendar}
            isManager={payload.isManager}
            selectedDate={date}
            onDateChange={setDate}
          />
        )}

        {payload?.isManager ? (
          <section className={cn(panelClass, "overflow-hidden")}>
            <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Board presenze team</h2>
                <p className="mt-1 text-sm text-slate-400">Aggiornamento automatico ogni 30 secondi.</p>
              </div>
              <Badge className="w-fit rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                <Users className="mr-2 h-3.5 w-3.5" />
                {payload.people.length} persone
              </Badge>
            </div>

            <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
              <PresenceColumn
                title="In ufficio adesso"
                people={presentPeople}
                empty="Nessuno risulta in ufficio adesso."
                onMarkAbsent={mutateMemberAbsence}
              />
              <PresenceColumn
                title="Da presidiare"
                people={pendingPeople}
                empty="Nessun segnale da presidiare."
                muted
                onMarkAbsent={mutateMemberAbsence}
              />
            </div>

            <div className="border-t border-white/10">
              <div className="grid gap-3 border-b border-white/10 p-5">
                <div>
                  <h3 className="text-lg font-black text-white">Prossime finestre operative</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Lettura rapida per capire chi può prendere qualcosa al più presto e chi va lasciato sul carico già pianificato.
                  </p>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {availabilityPeople.map((person) => (
                    <OperationalOutlookCard key={person.id} person={person} />
                  ))}
                </div>
              </div>
              {payload.people.map((person) => (
                <PersonRow key={person.id} person={person} onMarkAbsent={mutateMemberAbsence} />
              ))}
            </div>
          </section>
        ) : (
          <section className={cn(panelClass, "p-5")}>
            <h2 className="text-2xl font-black text-white">Per chi lavora in ufficio</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Questa vista tiene separato il concetto di presenza dal rapportino: prima segni entrata/uscita, poi colleghi le ore alle attività quando serve.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

function PresenceCalendarHeatmap({
  calendar,
  isManager,
  selectedDate,
  onDateChange,
}: {
  calendar: PresencePayload["calendar"]
  isManager: boolean
  selectedDate: string
  onDateChange: (date: string) => void
}) {
  const [personFilter, setPersonFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"heatmap" | "calendar">("heatmap")
  const [compactPeopleColumn, setCompactPeopleColumn] = useState(false)
  const [activeSignal, setActiveSignal] = useState<HeatmapSignalSelection | null>(null)
  const [activeCell, setActiveCell] = useState<HeatmapCellSelection | null>(null)
  const [activeDay, setActiveDay] = useState<HeatmapDaySelection | null>(null)

  const orderedCalendarPeople = useMemo(() => sortByOperationalRole(calendar.people), [calendar.people])

  useEffect(() => {
    if (personFilter !== "all" && !orderedCalendarPeople.some((person) => person.id === personFilter)) {
      setPersonFilter("all")
    }
  }, [orderedCalendarPeople, personFilter])

  const visiblePeople = useMemo(() => {
    if (!isManager || personFilter === "all") return orderedCalendarPeople
    return orderedCalendarPeople.filter((person) => person.id === personFilter)
  }, [orderedCalendarPeople, isManager, personFilter])

  const monthStats = useMemo(() => {
    return visiblePeople.reduce(
      (acc, person) => {
        for (const day of person.days) {
          if (day.status === "present" || day.status === "closed") acc.presenceDays += 1
          if (day.status === "absent") acc.absenceDays += 1
          if (day.signal) acc.anomalyDays += 1
          acc.taskCount += day.taskCount
          acc.activityMinutes += day.activityMinutes
        }
        return acc
      },
      { presenceDays: 0, absenceDays: 0, anomalyDays: 0, taskCount: 0, activityMinutes: 0 },
    )
  }, [visiblePeople])

  const peopleColumnWidth = compactPeopleColumn ? 112 : 220
  const dayCellWidth = compactPeopleColumn ? 38 : 42
  const heatmapGridStyle: CSSProperties = {
    gridTemplateColumns: `${peopleColumnWidth}px repeat(${calendar.days.length}, ${dayCellWidth}px)`,
    minWidth: `${peopleColumnWidth + calendar.days.length * dayCellWidth}px`,
  }
  const selectedDayRecords = useMemo(
    () => getCalendarDayRecords(visiblePeople, selectedDate),
    [visiblePeople, selectedDate],
  )
  const activeHeatmapSelection = useMemo(() => {
    if (
      activeCell &&
      activeCell.day.date === selectedDate &&
      visiblePeople.some((person) => person.id === activeCell.person.id)
    ) {
      return activeCell
    }

    const meaningfulRecord =
      selectedDayRecords.find(({ day }) => day.taskCount > 0 || day.activityMinutes > 0 || day.signal || day.status === "absent") ??
      selectedDayRecords[0]
    return meaningfulRecord ? { person: meaningfulRecord.person, day: meaningfulRecord.day } : null
  }, [activeCell, selectedDate, selectedDayRecords, visiblePeople])

  return (
    <section className={cn(panelClass, "overflow-hidden")}>
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Badge className="mb-3 w-fit rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <CalendarDays className="mr-2 h-3.5 w-3.5" />
            Calendario presenze
          </Badge>
          <h2 className="text-2xl font-black text-white">
            {isManager ? "Mese operativo del team" : "Il tuo mese operativo"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {isManager
              ? "Direzione e admin vedono tutto il team. Junior e dipendenti vedono solo il proprio calendario."
              : "Vista personale: direzione e admin possono consultarla nel calendario team."}
            {" "}
            {viewMode === "heatmap"
              ? "Ogni giorno mostra l'intensità operativa; eventuali anomalie orarie restano indicatori secondari aggregabili."
              : "La vista calendario legge il mese come registro: presenti, assenti, ritardi e uscite anticipate."}
          </p>
          <div className="mt-4 grid w-full max-w-md grid-cols-2 rounded-[8px] border border-white/10 bg-black/30 p-1 text-sm">
            <button
              type="button"
              onClick={() => setViewMode("heatmap")}
              className={cn(
                "rounded-[7px] px-3 py-2 font-bold text-slate-400 transition",
                viewMode === "heatmap" && "bg-righello-pink text-white shadow-[0_10px_28px_rgba(224,64,133,0.24)]",
              )}
            >
              Heatmap
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "rounded-[7px] px-3 py-2 font-bold text-slate-400 transition",
                viewMode === "calendar" && "bg-righello-cyan text-[#041118] shadow-[0_10px_28px_rgba(34,211,238,0.18)]",
              )}
            >
              Calendario
            </button>
          </div>
          {isManager && orderedCalendarPeople.length > 1 && (
            <select
              value={personFilter}
              onChange={(event) => setPersonFilter(event.target.value)}
              className="mt-3 h-10 w-full max-w-sm rounded-[8px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-righello-cyan"
            >
              <option value="all">Tutte le persone</option>
              {orderedCalendarPeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="w-full space-y-2 text-sm text-slate-300 lg:min-w-[34rem] lg:max-w-[38rem]">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Seleziona mese</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDateChange(today())}
                className="h-8 rounded-[8px] border-righello-cyan/25 bg-righello-cyan/10 px-3 text-xs text-righello-cyan hover:bg-righello-cyan/15"
              >
                Oggi
              </Button>
            </div>
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label="Mese precedente"
                onClick={() => onDateChange(shiftMonth(calendar.monthStart, -1))}
                className="h-10 rounded-[8px] border-white/10 bg-black/20 p-0 text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="month"
                value={monthInputValue(selectedDate)}
                onChange={(event) => onDateChange(dateFromMonthInput(event.target.value))}
                className={cn("h-10 rounded-[8px] text-left", nativeDateTimeInputClass)}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Mese successivo"
                onClick={() => onDateChange(shiftMonth(calendar.monthStart, 1))}
                className="h-10 rounded-[8px] border-white/10 bg-black/20 p-0 text-white hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Periodo</p>
              <p className="mt-1 font-black capitalize text-white">{formatMonthLabel(calendar.monthStart)}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Persone</p>
              <p className="mt-1 font-black text-white">{visiblePeople.length}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Presenze</p>
              <p className="mt-1 font-black text-emerald-100">{monthStats.presenceDays}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Assenze</p>
              <p className="mt-1 font-black text-red-100">{monthStats.absenceDays}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Anomalie</p>
              <p className="mt-1 font-black text-amber-100">{monthStats.anomalyDays}</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
          <PresenceMonthCalendar
            calendar={calendar}
            people={visiblePeople}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onShowDay={setActiveDay}
          />
      ) : (
        <>
      <div className="space-y-4 p-4 md:hidden">
        {visiblePeople.map((person) => {
          const stats = personMonthStats(person)

          return (
            <article key={person.id} className="overflow-hidden rounded-[8px] border border-white/10 bg-black/20">
              <div className="border-b border-white/10 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-white">{person.name}</h3>
                    <p className="mt-1 truncate text-sm text-slate-400">{person.role}</p>
                  </div>
                  <div className="shrink-0 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Ore</p>
                    <p className="mt-1 text-sm font-black text-cyan-100">{formatMinutes(stats.activityMinutes)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-[8px] border border-emerald-300/15 bg-emerald-300/10 px-2 py-2">
                    <p className="text-slate-400">Presenze</p>
                    <p className="mt-1 text-base font-black text-emerald-100">{stats.presenceDays}</p>
                  </div>
                  <div className="rounded-[8px] border border-red-300/15 bg-red-300/10 px-2 py-2">
                    <p className="text-slate-400">Assenze</p>
                    <p className="mt-1 text-base font-black text-red-100">{stats.absenceDays}</p>
                  </div>
                  <div className="rounded-[8px] border border-cyan-300/15 bg-cyan-300/10 px-2 py-2">
                    <p className="text-slate-400">Task</p>
                    <p className="mt-1 text-base font-black text-cyan-100">{stats.taskCount}</p>
                  </div>
                  <div className="rounded-[8px] border border-amber-300/15 bg-amber-300/10 px-2 py-2">
                    <p className="text-slate-400">Orari</p>
                    <p className="mt-1 text-base font-black text-amber-100">{stats.anomalyDays}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto overscroll-x-contain p-3 [-webkit-overflow-scrolling:touch] [touch-action:pan-x]">
                <div className="grid auto-cols-[58px] grid-flow-col gap-2">
                  {person.days.map((day) => (
                    <CalendarHeatmapCell
                      key={`${person.id}-mobile-${day.date}`}
                      day={day}
                      person={person}
                      selected={day.date === selectedDate}
                      compact={false}
                      onDateChange={onDateChange}
                      onShowSignal={setActiveSignal}
                      onShowDetails={setActiveCell}
                    />
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain p-4 [-webkit-overflow-scrolling:touch] [touch-action:pan-x] md:block">
        <div className="w-max min-w-full">
          <div className="grid items-end gap-1" style={heatmapGridStyle}>
            <div
              className={cn(
                "sticky left-0 z-20 flex items-center gap-2 rounded-[7px] bg-[#0a1020] px-2 pb-2 pt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-[12px_0_24px_rgba(5,9,20,0.85)]",
                compactPeopleColumn ? "justify-center px-1" : "justify-between",
              )}
            >
              {!compactPeopleColumn && <span>Persona</span>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={compactPeopleColumn}
                aria-label={compactPeopleColumn ? "Espandi nominativi" : "Comprimi nominativi"}
                onClick={() => setCompactPeopleColumn((current) => !current)}
                className="h-8 w-8 rounded-[8px] border-white/10 bg-white/[0.04] p-0 text-slate-300 hover:border-righello-cyan/35 hover:bg-righello-cyan/10 hover:text-righello-cyan"
              >
                {compactPeopleColumn ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>
            {calendar.days.map((day) => (
              <div
                key={day}
                className={cn(
                  "rounded-[7px] px-1 pb-2 pt-1 text-center",
                  day === selectedDate && "bg-righello-pink/15 ring-1 ring-righello-pink/35",
                )}
              >
                <p className="text-[13px] font-black leading-none text-slate-100">{formatDayNumber(day)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-none text-slate-500">{formatWeekdayShort(day)}</p>
              </div>
            ))}

            {visiblePeople.map((person) => (
              <div key={person.id} className="contents">
                <div
                  title={`${person.name} - ${person.role}`}
                  className={cn(
                    "sticky left-0 z-10 min-w-0 rounded-[8px] border border-white/10 bg-[#0a1020] shadow-[12px_0_24px_rgba(5,9,20,0.85)]",
                    compactPeopleColumn
                      ? "flex min-h-12 items-center justify-center px-1.5 py-2 text-center"
                      : "px-3 py-3",
                  )}
                >
                  <p
                    className={cn(
                      "truncate font-black text-white",
                      compactPeopleColumn ? "max-w-[96px] text-xs leading-tight" : "text-sm",
                    )}
                  >
                    {compactPeopleColumn ? compactPersonLabel(person.name) : person.name}
                  </p>
                  {!compactPeopleColumn && <p className="mt-0.5 truncate text-xs text-slate-500">{person.role}</p>}
                </div>
                {person.days.map((day) => (
                  <CalendarHeatmapCell
                    key={`${person.id}-${day.date}`}
                    day={day}
                    person={person}
                    selected={day.date === selectedDate}
                    compact
                    onDateChange={onDateChange}
                    onShowSignal={setActiveSignal}
                    onShowDetails={setActiveCell}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <HeatmapCellContextBanner
        selection={activeHeatmapSelection}
        dayRecords={selectedDayRecords}
        onOpenDay={() => {
          if (selectedDayRecords.length) {
            setActiveDay({ date: selectedDate, records: selectedDayRecords })
          }
        }}
        onClose={() => setActiveCell(null)}
      />

      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 px-5 py-4 text-xs text-slate-300">
        <span className="font-black uppercase tracking-[0.14em] text-slate-400">Legenda</span>
        <span className="inline-flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-4 w-4 rounded-[5px] border border-white/10 bg-white/[0.09]" />
            <span className="h-4 w-4 rounded-[5px] border border-emerald-300/35 bg-emerald-400/30" />
            <span className="h-4 w-4 rounded-[5px] border border-teal-300/45 bg-teal-400/45" />
            <span className="h-4 w-4 rounded-[5px] border border-cyan-300/60 bg-cyan-400/62" />
            <span className="h-4 w-4 rounded-[5px] border border-righello-pink/75 bg-righello-pink/78" />
          </span>
          <span>leggero · operativo · focus · sprint</span>
        </span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded-[5px] border border-red-300/70 bg-red-500/70" /> assenza</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-7 items-center justify-center rounded-[5px] border border-amber-200/70 bg-amber-300 text-[9px] font-black text-[#171106]">
            +20
          </span>
          ritardo / orario da leggere insieme alla produzione
        </span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded-[5px] outline outline-2 outline-righello-pink/70" /> giorno selezionato</span>
      </div>
        </>
      )}
      <HeatmapSignalDialog selection={activeSignal} onClose={() => setActiveSignal(null)} />
      <HeatmapDayDialog selection={activeDay} onClose={() => setActiveDay(null)} />
    </section>
  )
}

function PresenceMonthCalendar({
  calendar,
  people,
  selectedDate,
  onDateChange,
  onShowDay,
}: {
  calendar: PresencePayload["calendar"]
  people: CalendarPerson[]
  selectedDate: string
  onDateChange: (date: string) => void
  onShowDay: (selection: HeatmapDaySelection) => void
}) {
  const cells = useMemo(() => getMonthCalendarCells(calendar.days), [calendar.days])
  const weekdayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

  return (
    <div className="p-4">
      <div className="mb-4 rounded-[8px] border border-white/10 bg-black/20 p-4">
        <h3 className="text-lg font-black text-white">Registro mensile presenze</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Click su un giorno per vedere presenze e task del giorno. Il colore indica stato HR, i badge indicano anomalie orarie o carico.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">Presente</span>
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-amber-100">Ritardo / uscita anticipata</span>
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-red-300/30 bg-red-500/10 px-2.5 py-1 text-red-100">Assenza</span>
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-slate-300/20 bg-slate-300/10 px-2.5 py-1 text-slate-200">Festivo non lavorativo</span>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {calendar.days.map((date) => {
          const records = getCalendarDayRecords(people, date)
          const summary = calendarDaySummary(records)
          const importantRecords = records.filter(({ day }) => day.status === "absent" || day.signal)
          const visibleRecords = importantRecords.length > 0 ? importantRecords : records

          return (
            <button
              key={`agenda-${date}`}
              type="button"
              onClick={() => {
                onDateChange(date)
                onShowDay({ date, records })
              }}
              className={cn(
                "w-full rounded-[8px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-righello-pink",
                calendarDayTone(records),
                date === selectedDate && "border-righello-pink/65 shadow-[0_0_0_1px_rgba(224,64,133,0.35)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-righello-pink">{formatWeekdayShort(date)}</p>
                  <p className="mt-1 text-lg font-black text-white">{formatDateLabel(date)}</p>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
                  <span className="rounded-[6px] border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-emerald-100">{summary.present} P</span>
                  <span className="rounded-[6px] border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-amber-100">{summary.late + summary.earlyExit} !</span>
                  <span className="rounded-[6px] border border-red-300/20 bg-red-500/10 px-2 py-1 text-red-100">{summary.absent} A</span>
                  <span className="rounded-[6px] border border-slate-300/15 bg-slate-300/10 px-2 py-1 text-slate-200">{summary.holiday} F</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {visibleRecords.slice(0, 6).map(({ person, day }) => (
                  <div
                    key={`${date}-${person.id}`}
                    className={cn("rounded-[7px] border px-3 py-2 text-sm", attendanceEventTone(day))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-black">{person.name}</span>
                      <span className="shrink-0 text-xs font-bold opacity-80">{attendanceEventLabel(day)}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                      {day.checkInAt ? formatTime(day.checkInAt) : "--:--"} - {day.checkOutAt ? formatTime(day.checkOutAt) : "--:--"}
                    </p>
                  </div>
                ))}
                {visibleRecords.length > 6 && <p className="text-xs font-bold text-slate-400">+{visibleRecords.length - 6} altri record</p>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-2 pb-2">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="min-h-[148px] rounded-[8px] border border-white/[0.04] bg-white/[0.015]" />
            }

            const records = getCalendarDayRecords(people, date)
            const summary = calendarDaySummary(records)
            const importantRecords = records.filter(({ day }) => day.status === "absent" || day.signal)
            const visibleRecords = importantRecords.length > 0 ? importantRecords : records

            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  onDateChange(date)
                  onShowDay({ date, records })
                }}
                className={cn(
                  "min-h-[148px] rounded-[8px] border p-3 text-left transition hover:border-white/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-righello-pink",
                  calendarDayTone(records),
                  date === selectedDate && "border-righello-pink/70 shadow-[0_0_0_1px_rgba(224,64,133,0.35)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-black text-white">{Number(formatDayNumber(date))}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{formatWeekdayShort(date)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 text-[10px] font-black">
                    <span className="rounded-[6px] bg-emerald-300/12 px-1.5 py-1 text-emerald-100">{summary.present}</span>
                    {(summary.late > 0 || summary.earlyExit > 0) && (
                      <span className="rounded-[6px] bg-amber-300/14 px-1.5 py-1 text-amber-100">!</span>
                    )}
                    {summary.absent > 0 && <span className="rounded-[6px] bg-red-500/16 px-1.5 py-1 text-red-100">{summary.absent}</span>}
                    {summary.holiday > 0 && <span className="rounded-[6px] bg-slate-300/12 px-1.5 py-1 text-slate-200">{summary.holiday}F</span>}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {visibleRecords.slice(0, 4).map(({ person, day }) => (
                    <div
                      key={`${date}-${person.id}`}
                      className={cn("min-w-0 rounded-[6px] border px-2 py-1.5 text-[11px]", attendanceEventTone(day))}
                    >
                      <p className="truncate font-black">{person.name}</p>
                      <p className="mt-0.5 truncate opacity-75">{attendanceEventLabel(day)}</p>
                    </div>
                  ))}
                  {visibleRecords.length === 0 && <p className="text-xs text-slate-500">Nessun dato</p>}
                  {visibleRecords.length > 4 && <p className="text-[11px] font-bold text-slate-400">+{visibleRecords.length - 4} altri</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CalendarHeatmapCell({
  day,
  person,
  selected,
  compact,
  onDateChange,
  onShowSignal,
  onShowDetails,
}: {
  day: PresencePayload["calendar"]["people"][number]["days"][number]
  person: PresencePayload["calendar"]["people"][number]
  selected: boolean
  compact?: boolean
  onDateChange: (date: string) => void
  onShowSignal?: (selection: HeatmapSignalSelection) => void
  onShowDetails?: (selection: HeatmapCellSelection) => void
}) {
  const signal = calendarCellSignal(day)
  const Icon = signal.Icon
  const timeSignal = dayTimeSignalMeta(day)
  const TimeSignalIcon = timeSignal?.Icon
  const handleSelect = () => {
    onDateChange(day.date)
    onShowDetails?.({ person, day })
  }

  if (compact) {
    return (
      <button
        type="button"
        title={calendarDayTitle(person, day)}
        aria-label={calendarDayTitle(person, day)}
        onClick={handleSelect}
        className={cn(
          "group relative flex h-12 flex-col items-center justify-center overflow-hidden rounded-[7px] border text-[10px] font-black transition hover:z-20 hover:scale-[1.08] hover:border-white/55 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-righello-pink",
          calendarCellClass(day),
          timeSignal && day.status !== "absent" && timeSignal.cellTone,
          selected && "outline outline-2 outline-offset-1 outline-righello-pink/70",
        )}
      >
        {timeSignal && day.status !== "absent" && TimeSignalIcon && (
          <span
            className={cn("absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border", timeSignal.chipTone)}
            aria-hidden="true"
          >
            <TimeSignalIcon className="h-2.5 w-2.5" />
          </span>
        )}
        <Icon className="mb-0.5 h-3.5 w-3.5 opacity-90 transition group-hover:scale-110" />
        <span className="leading-none">{signal.short}</span>
        {timeSignal && day.status !== "absent" && (
          <span className={cn("absolute bottom-0.5 left-1/2 max-w-[92%] -translate-x-1/2 rounded-[5px] border px-1 text-[8px] font-black leading-3", timeSignal.chipTone)}>
            {timeSignal.short}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      title={calendarDayTitle(person, day)}
      aria-label={calendarDayTitle(person, day)}
      onClick={handleSelect}
      className={cn(
        "group relative flex h-[86px] flex-col items-center justify-center overflow-hidden rounded-[8px] border px-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-righello-pink",
        calendarCellClass(day),
        timeSignal && day.status !== "absent" && timeSignal.cellTone,
        selected && "outline outline-2 outline-offset-2 outline-righello-pink",
      )}
    >
      <span className="absolute left-1.5 top-1.5 text-[10px] font-black leading-none opacity-70">{formatDayNumber(day.date)}</span>
      {timeSignal && day.status !== "absent" && TimeSignalIcon && (
        <span
          className={cn("absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border", timeSignal.chipTone)}
          aria-hidden="true"
        >
          <TimeSignalIcon className="h-3.5 w-3.5" />
        </span>
      )}
      <Icon className="mb-1 h-[18px] w-[18px] transition group-hover:scale-110" />
      <span className="text-[12px] font-black leading-none">{signal.short}</span>
      <span className="mt-1 max-w-full truncate text-[9px] font-bold uppercase leading-none opacity-80">{signal.label}</span>
      {timeSignal && day.status !== "absent" && (
        <span className={cn("absolute bottom-1.5 inline-flex max-w-[90%] items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[9px] font-black leading-none", timeSignal.chipTone)}>
          {timeSignal.label} {timeSignal.short}
        </span>
      )}
    </button>
  )
}

function HeatmapCellContextBanner({
  selection,
  dayRecords,
  onOpenDay,
  onClose,
}: {
  selection: HeatmapCellSelection | null
  dayRecords: Array<{ person: CalendarPerson; day: CalendarPersonDay }>
  onOpenDay: () => void
  onClose: () => void
}) {
  if (!selection) return null

  const day = selection.day
  const signal = calendarCellSignal(day)
  const SignalIcon = signal.Icon
  const timeSignal = dayTimeSignalMeta(day)
  const TimeSignalIcon = timeSignal?.Icon || Clock
  const daySummary = calendarDaySummary(dayRecords)
  const taskTitles = day.taskTitles || []
  const contextTone = timeSignal
    ? timeSignal.tone
    : day.missingDurationTaskCount > 0
      ? "border-amber-300/55"
      : "border-cyan-300/25"

  return (
    <div className="border-t border-white/10 px-4 py-4">
      <div className={cn("overflow-hidden rounded-[8px] border bg-[#07101d]/95 text-white shadow-[0_20px_70px_rgba(0,0,0,0.28)]", contextTone)}>
        <div className="relative border-b border-white/10 p-4">
          <div className="absolute -right-8 -top-12 h-28 w-28 rounded-full bg-righello-cyan/12 blur-2xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-righello-pink">Giorno selezionato</p>
              <h3 className="mt-1 flex min-w-0 items-center gap-2 text-xl font-black text-white">
                <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border", timeSignal?.chipTone ?? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100")}>
                  {timeSignal ? <TimeSignalIcon className="h-5 w-5" /> : <SignalIcon className="h-5 w-5" />}
                </span>
                <span className="min-w-0 truncate">
                  {selection.person.name} · {formatDateLabel(day.date)}
                </span>
              </h3>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onOpenDay}
                className="h-9 rounded-[8px] border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/15"
              >
                Apri giorno
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Chiudi dettaglio cella"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Segnale</p>
              <p className="mt-1 text-base font-black text-white">{timeSignal?.label ?? signal.label}</p>
              {timeSignal ? <p className="mt-1 text-xs leading-5 text-slate-400">{timeSignal.description}</p> : null}
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Ore e task</p>
              <p className="mt-1 text-base font-black text-white">
                {formatMinutes(day.activityMinutes)} · {day.taskCount} task
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {day.completedTaskCount} completate/importate
                {day.missingDurationTaskCount > 0 ? ` · ${day.missingDurationTaskCount} senza durata` : ""}
              </p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">Team nel giorno</p>
              <p className="mt-1 text-base font-black text-white">
                {daySummary.present} presenti · {daySummary.absent} assenti · {daySummary.holiday} festivi
              </p>
            </div>
          </div>

          <div className="rounded-[8px] border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Task del giorno</p>
              <span className="rounded-[7px] border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-slate-300">
                {taskTitles.length}
              </span>
            </div>
            {taskTitles.length ? (
              <ul className="mt-3 grid gap-2">
                {taskTitles.map((title, index) => (
                  <li key={`${day.date}-${selection.person.id}-${index}`} className="rounded-[7px] border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-5 text-slate-100">
                    {title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-[7px] border border-dashed border-white/12 px-3 py-3 text-sm leading-6 text-slate-400">
                Nessuna task collegata a questa persona nel giorno selezionato.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatmapSignalDialog({
  selection,
  onClose,
}: {
  selection: HeatmapSignalSelection | null
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const meta = selection ? dayTimeSignalMeta(selection.day) : null
  const Icon = meta?.Icon || Clock

  useEffect(() => {
    if (!selection || !dialogRef.current) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        dialogRef.current,
        { autoAlpha: 0, y: 18, scale: 0.94, rotate: -0.8 },
        { autoAlpha: 1, y: 0, scale: 1, rotate: 0, duration: 0.42, ease: "back.out(1.7)" },
      )
      gsap.fromTo(
        "[data-signal-pop]",
        { autoAlpha: 0, y: 8, scale: 0.86 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "power2.out", stagger: 0.05, delay: 0.08 },
      )
    }, dialogRef)

    return () => ctx.revert()
  }, [selection])

  if (!selection || !meta) return null

  const day = selection.day
  const productivityLabel =
    day.activityMinutes > 0 || day.taskCount > 0
      ? `${formatMinutes(day.activityMinutes)} registrate · ${day.taskCount} task collegate${day.missingDurationTaskCount > 0 ? ` · ${day.missingDurationTaskCount} da consuntivare` : ""}`
      : "Nessuna attività collegata nel giorno"

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[80] md:bottom-auto md:left-auto md:right-8 md:top-28 md:w-[24rem]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-live="polite"
        aria-label={`Dettaglio ${meta.label} di ${selection.person.name}`}
        className={cn(
          "pointer-events-auto overflow-hidden rounded-[8px] border bg-[#070d1a]/95 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl",
          meta.tone,
        )}
      >
        <div className="relative border-b border-white/10 p-4">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-righello-pink/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-righello-pink">Segnale orario</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-black text-white">
                <span data-signal-pop className={cn("inline-flex h-9 w-9 items-center justify-center rounded-[8px] border", meta.chipTone)}>
                  <Icon className="h-5 w-5" />
                </span>
                {meta.label}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="relative rounded-[8px] border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Chiudi dettaglio segnale"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div data-signal-pop className="rounded-[8px] border border-white/10 bg-black/24 p-3">
            <p className="text-sm font-bold text-white">{selection.person.name}</p>
            <p className="mt-1 text-xs capitalize text-slate-400">{formatDateLabel(day.date)}</p>
          </div>
          <p data-signal-pop className="text-sm leading-6 text-slate-200">
            {meta.description}
          </p>
          <div data-signal-pop className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-500">Entrata</p>
              <p className="mt-1 text-base font-black text-white">{formatTime(day.checkInAt)}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-slate-500">Uscita</p>
              <p className="mt-1 text-base font-black text-white">{formatTime(day.checkOutAt)}</p>
            </div>
          </div>
          <div data-signal-pop className="rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-righello-cyan" />
              <p>
                Indicatore secondario: l'orario va letto insieme alla produzione del giorno. Output rilevato:{" "}
                <span className="font-black">{productivityLabel}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatmapDayDialog({
  selection,
  onClose,
}: {
  selection: HeatmapDaySelection | null
  onClose: () => void
}) {
  if (!selection) return null

  const summary = calendarDaySummary(selection.records)
  const taskTitles = selection.records.flatMap(({ day }) => day.taskTitles || [])

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/55 p-3 backdrop-blur-sm md:items-center md:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Dettaglio giornata ${formatDateLabel(selection.date)}`}
        className="max-h-[86dvh] w-full max-w-3xl overflow-hidden rounded-[8px] border border-white/10 bg-[#070d1a] text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-righello-pink">Dettaglio giorno</p>
            <h3 className="mt-1 text-2xl font-black capitalize text-white">{formatDateLabel(selection.date)}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Chiudi dettaglio giorno"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(86dvh-96px)] overflow-y-auto p-5">
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 p-3">
              <p className="text-xs text-slate-400">Presenti</p>
              <p className="mt-1 text-xl font-black text-emerald-100">{summary.present}</p>
            </div>
            <div className="rounded-[8px] border border-red-300/20 bg-red-500/10 p-3">
              <p className="text-xs text-slate-400">Assenze</p>
              <p className="mt-1 text-xl font-black text-red-100">{summary.absent}</p>
            </div>
            <div className="rounded-[8px] border border-slate-300/15 bg-slate-300/10 p-3">
              <p className="text-xs text-slate-400">Festivi</p>
              <p className="mt-1 text-xl font-black text-slate-100">{summary.holiday}</p>
            </div>
            <div className="rounded-[8px] border border-amber-300/20 bg-amber-300/10 p-3">
              <p className="text-xs text-slate-400">Anomalie</p>
              <p className="mt-1 text-xl font-black text-amber-100">{summary.late + summary.earlyExit}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {selection.records.map(({ person, day }) => (
              <div key={`${person.id}-${day.date}`} className={cn("rounded-[8px] border p-4", attendanceEventTone(day))}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-black">{person.name}</p>
                    <p className="mt-1 text-xs opacity-75">{person.role}</p>
                  </div>
                  <span className="w-fit rounded-[7px] border border-white/10 bg-black/15 px-2 py-1 text-xs font-black">
                    {attendanceEventLabel(day)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <span>Entrata {formatTime(day.checkInAt)}</span>
                  <span>Uscita {formatTime(day.checkOutAt)}</span>
                  <span>Attività {formatMinutes(day.activityMinutes)}</span>
                  <span>Task {day.taskCount}</span>
                </div>
                {day.completedTaskCount > 0 ? (
                  <p className="mt-2 text-xs opacity-75">
                    {day.completedTaskCount} task completate/importate nel giorno
                    {day.missingDurationTaskCount > 0 ? ` · ${day.missingDurationTaskCount} senza durata` : ""}
                  </p>
                ) : null}
                {day.taskTitles?.length ? (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">Task del giorno</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {day.taskTitles.map((title, index) => (
                        <li key={`${title}-${index}`} className="leading-5">
                          {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {!taskTitles.length ? (
            <p className="mt-4 rounded-[8px] border border-dashed border-white/12 p-4 text-sm text-slate-400">
              Nessuna task collegata a questa giornata.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PresenceBadge({ status }: { status: PresenceStatus }) {
  const meta = statusMeta(status)
  const Icon = meta.icon
  return (
    <Badge className={cn("w-fit rounded-[8px] border px-3 py-1.5", meta.className)}>
      <span className={cn("mr-2 h-2 w-2 rounded-full", meta.dot)} />
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "green" | "cyan" | "amber" | "red" }) {
  const tones = {
    green: "text-emerald-200 bg-emerald-400/10 border-emerald-400/20",
    cyan: "text-cyan-200 bg-cyan-400/10 border-cyan-400/20",
    amber: "text-amber-200 bg-amber-400/10 border-amber-400/20",
    red: "text-red-200 bg-red-400/10 border-red-400/20",
  }

  return (
    <div className={cn("rounded-[8px] border p-4", tones[tone])}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function PresenceColumn({
  title,
  people,
  empty,
  muted = false,
  onMarkAbsent,
}: {
  title: string
  people: PersonPresence[]
  empty: string
  muted?: boolean
  onMarkAbsent?: (memberId: string, memberName: string) => Promise<void>
}) {
  return (
    <div className={cn("min-w-0 p-5", muted && "border-t border-white/10 md:border-l md:border-t-0")}>
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      <div className="mt-4 space-y-3">
        {people.length ? (
          people.map((person) => <PresenceMiniCard key={person.id} person={person} onMarkAbsent={onMarkAbsent} />)
        ) : (
          <div className="rounded-[8px] border border-dashed border-white/10 p-5 text-sm text-slate-500">{empty}</div>
        )}
      </div>
    </div>
  )
}

function PresenceMiniCard({
  person,
  onMarkAbsent,
}: {
  person: PersonPresence
  onMarkAbsent?: (memberId: string, memberName: string) => Promise<void>
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black text-white">{person.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{person.role}</p>
        </div>
        <PresenceBadge status={person.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <span>Entrata {formatTime(person.checkInAt)}</span>
        <span>Uscita {formatTime(person.checkOutAt)}</span>
      </div>
      {person.assumedPresence && <p className="mt-2 text-xs text-cyan-100">Presenza direzione assunta</p>}
      {person.presenceSignal && (
        <Badge className="mt-3 rounded-[8px] border border-amber-300/25 bg-amber-300/10 text-amber-100">
          {presenceSignalLabel(person)}
        </Badge>
      )}
      <div className={cn("mt-3 rounded-[8px] border px-3 py-2 text-xs font-semibold", availabilityClass(person.availability?.status))}>
        {person.availability?.label}
      </div>
      {onMarkAbsent && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={person.status === "absent"}
          onClick={() => onMarkAbsent(person.id, person.name).catch((err) => toast.error(err.message))}
          className="mt-3 h-9 w-full rounded-[8px] border-red-400/30 bg-red-950/25 text-red-100 hover:bg-red-500/15 disabled:opacity-45"
        >
          {person.status === "absent" ? "Assenza già segnata" : "Segna assenza"}
        </Button>
      )}
    </div>
  )
}

function OperationalOutlookCard({ person }: { person: PersonPresence }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-white/10 bg-[#070d1a] p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{person.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{person.email}</p>
        </div>
        <Badge className={cn("w-fit rounded-[8px] border px-3 py-1", availabilityClass(person.availability?.status))}>
          {person.availability?.label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sta facendo a breve</p>
          {person.nextTask ? (
            <div className="mt-2">
              <p className="break-words text-sm font-bold leading-5 text-white">{person.nextTask.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {person.nextTask.projectName || person.nextTask.clientName || "Task operativa"} · {formatDueDate(person.nextTask.dueAt)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Nessuna task imminente collegata.</p>
          )}
        </div>
        <div className="rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-left sm:text-right">
          <p className="text-xs text-slate-500">Carico breve</p>
          <p className="text-lg font-black text-white">{formatMinutes(person.plannedSoonMinutes || 0)}</p>
        </div>
      </div>

      {person.upcomingTasks?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {person.upcomingTasks.slice(0, 3).map((task) => (
            <span key={task.id} className="max-w-full truncate rounded-[8px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
              {task.priority === "urgent" ? "Urgente · " : ""}
              {task.title}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PersonRow({
  person,
  onMarkAbsent,
}: {
  person: PersonPresence
  onMarkAbsent?: (memberId: string, memberName: string) => Promise<void>
}) {
  return (
    <div className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-[1.1fr_0.65fr_0.75fr_0.85fr_1.2fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-black text-white">{person.name}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{person.email}</p>
      </div>
      <PresenceBadge status={person.status} />
      <div className="text-sm text-slate-300">
        <p>{formatTime(person.checkInAt)} - {formatTime(person.checkOutAt)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {person.assumedPresence ? "Direzione reperibile" : "Rif."} {person.workStartTime} - {person.expectedCheckOutTime}
        </p>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{formatMinutes(person.presenceMinutes)}</span>
          <span>{Math.round(person.coverageRatio * 100)}%</span>
        </div>
        <Progress className="mt-2 h-2 bg-white/10" value={person.coverageRatio * 100} />
        {person.presenceSignal && <p className="mt-1 text-xs text-amber-200">{presenceSignalLabel(person)}</p>}
      </div>
      <div className="min-w-0 rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
        <p className="truncate text-xs font-semibold text-slate-400">{person.availability?.label}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{person.nextTask?.title || person.availability?.detail}</p>
      </div>
      {onMarkAbsent && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={person.status === "absent"}
          onClick={() => onMarkAbsent(person.id, person.name).catch((err) => toast.error(err.message))}
          className="h-9 rounded-[8px] border-red-400/30 bg-red-950/25 px-3 text-red-100 hover:bg-red-500/15 disabled:opacity-45"
        >
          Assenza
        </Button>
      )}
    </div>
  )
}
