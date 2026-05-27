"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, Building2, CalendarDays, CheckCircle2, Clock, LogIn, LogOut, RefreshCw, UserCheck, Users, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type PresenceStatus = "present" | "closed" | "absent" | "missing"

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
}

type PresencePayload = {
  role: string
  isManager: boolean
  date: string
  generatedAt: string
  self: PersonPresence | null
  people: PersonPresence[]
  summary: {
    total: number
    present: number
    closed: number
    absent: number
    missing: number
    presenceMinutes: number
    activityMinutes: number
  }
}

const pageClass =
  "h-[calc(100dvh-73px)] min-h-0 w-full overflow-x-clip overflow-y-auto overscroll-contain bg-[#050914] text-white [-webkit-overflow-scrolling:touch] [touch-action:pan-y] md:h-auto md:min-h-screen md:overflow-x-hidden md:overflow-y-visible"
const panelClass = "rounded-[8px] border border-white/10 bg-[#0a1020]/90 shadow-[0_18px_70px_rgba(0,0,0,0.26)]"
const nativeDateTimeInputClass =
  "optima-native-date-time min-w-0 max-w-full shrink border-white/10 bg-black/25 text-center text-white [color-scheme:dark] focus-visible:ring-righello-pink"
const defaultWorkStartTime = "09:00"

function today() {
  return new Date().toISOString().slice(0, 10)
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
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
    default:
      return {
        label: "Non segnato",
        icon: AlertCircle,
        className: "border-amber-300/25 bg-amber-300/12 text-amber-200",
        dot: "bg-amber-300",
      }
  }
}

function presenceSignalLabel(person: PersonPresence) {
  if (person.presenceSignal === "late") return `Entrata +${formatMinutes(person.minutesLate)}`
  if (person.presenceSignal === "early-exit") return `Uscita -${formatMinutes(person.minutesEarly)}`
  return ""
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
              Vista rapida per verificare chi è in ufficio, chi ha segnato assenze e come sta andando la copertura delle ore nette. La giornata parte di norma alle 09:00, ma l'entrata reale può essere anticipata o posticipata.
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
              <PresenceColumn title="In ufficio adesso" people={presentPeople} empty="Nessuno risulta in ufficio adesso." />
              <PresenceColumn title="Da presidiare" people={pendingPeople} empty="Nessun segnale da presidiare." muted />
            </div>

            <div className="border-t border-white/10">
              {payload.people.map((person) => (
                <PersonRow key={person.id} person={person} />
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

function PresenceColumn({ title, people, empty, muted = false }: { title: string; people: PersonPresence[]; empty: string; muted?: boolean }) {
  return (
    <div className={cn("min-w-0 p-5", muted && "border-t border-white/10 md:border-l md:border-t-0")}>
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      <div className="mt-4 space-y-3">
        {people.length ? (
          people.map((person) => <PresenceMiniCard key={person.id} person={person} />)
        ) : (
          <div className="rounded-[8px] border border-dashed border-white/10 p-5 text-sm text-slate-500">{empty}</div>
        )}
      </div>
    </div>
  )
}

function PresenceMiniCard({ person }: { person: PersonPresence }) {
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
      {person.presenceSignal && (
        <Badge className="mt-3 rounded-[8px] border border-amber-300/25 bg-amber-300/10 text-amber-100">
          {presenceSignalLabel(person)}
        </Badge>
      )}
    </div>
  )
}

function PersonRow({ person }: { person: PersonPresence }) {
  return (
    <div className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-black text-white">{person.name}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{person.email}</p>
      </div>
      <PresenceBadge status={person.status} />
      <div className="text-sm text-slate-300">
        <p>{formatTime(person.checkInAt)} - {formatTime(person.checkOutAt)}</p>
        <p className="mt-1 text-xs text-slate-500">
          Rif. {person.workStartTime} - {person.expectedCheckOutTime}
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
    </div>
  )
}
