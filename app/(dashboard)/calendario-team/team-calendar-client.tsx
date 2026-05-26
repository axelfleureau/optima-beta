"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  CalendarClock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Copy,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

type CalendarOption = {
  id: string
  name: string
  email?: string
  role?: string
  clientId?: string | null
  clientName?: string
}

type TeamCalendarEvent = {
  id: string
  title: string
  description: string
  location: string
  eventType: string
  status: string
  startsAt: string
  endsAt: string
  allDay: boolean
  clientId: string | null
  clientName: string
  projectId: string | null
  projectName: string
  ownerMemberId: string | null
  ownerName: string
  attendees: string[]
}

type CalendarForm = {
  id?: string
  title: string
  eventType: string
  status: string
  startsAt: string
  endsAt: string
  allDay: boolean
  location: string
  clientId: string
  projectId: string
  ownerMemberId: string
  attendees: string[]
  description: string
}

const EVENT_TYPES = [
  { value: "meeting", label: "Riunione", icon: Users, className: "border-cyan-400/35 bg-cyan-400/12 text-cyan-100" },
  { value: "shooting", label: "Shooting", icon: Camera, className: "border-pink-400/40 bg-pink-500/14 text-pink-100" },
  { value: "call", label: "Call", icon: Phone, className: "border-blue-400/35 bg-blue-500/14 text-blue-100" },
  { value: "delivery", label: "Delivery", icon: CalendarClock, className: "border-emerald-400/35 bg-emerald-500/14 text-emerald-100" },
  { value: "internal", label: "Interno", icon: Video, className: "border-violet-400/35 bg-violet-500/14 text-violet-100" },
  { value: "travel", label: "Trasferta", icon: MapPin, className: "border-amber-300/35 bg-amber-400/12 text-amber-100" },
]

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toInputDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function monthRange(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

function defaultForm(memberId = "", date = new Date()): CalendarForm {
  const start = new Date(date)
  start.setMinutes(0, 0, 0)
  if (start.getHours() < 8) start.setHours(9)
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  return {
    title: "",
    eventType: "meeting",
    status: "confirmed",
    startsAt: toInputDateTime(start),
    endsAt: toInputDateTime(end),
    allDay: false,
    location: "",
    clientId: "",
    projectId: "",
    ownerMemberId: memberId,
    attendees: memberId ? [memberId] : [],
    description: "",
  }
}

function eventTypeConfig(type: string) {
  return EVENT_TYPES.find((item) => item.value === type) || EVENT_TYPES[0]
}

function formatTimeRange(event: TeamCalendarEvent) {
  if (event.allDay) return "Tutto il giorno"
  const formatter = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" })
  return `${formatter.format(new Date(event.startsAt))} - ${formatter.format(new Date(event.endsAt))}`
}

function formatMonth(cursor: Date) {
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(cursor)
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(value))
}

export default function TeamCalendarClient() {
  const { toast } = useToast()
  const [cursor, setCursor] = useState(() => new Date())
  const [events, setEvents] = useState<TeamCalendarEvent[]>([])
  const [members, setMembers] = useState<CalendarOption[]>([])
  const [clients, setClients] = useState<CalendarOption[]>([])
  const [projects, setProjects] = useState<CalendarOption[]>([])
  const [memberId, setMemberId] = useState("")
  const [scope, setScope] = useState<"team" | "mine">("team")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFeedOpen, setIsFeedOpen] = useState(false)
  const [feedUrl, setFeedUrl] = useState("")
  const [form, setForm] = useState<CalendarForm>(() => defaultForm())

  const loadCalendar = useCallback(async () => {
    setIsLoading(true)
    try {
      const { start, end } = monthRange(cursor)
      const response = await fetch(
        `/api/team-calendar?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}&scope=${scope}`,
      )
      if (!response.ok) throw new Error("Errore nel caricamento del calendario")
      const data = await response.json()
      setEvents(data.events || [])
      setMembers(data.options?.members || [])
      setClients(data.options?.clients || [])
      setProjects(data.options?.projects || [])
      setMemberId(data.memberId || "")
    } catch (error) {
      toast({
        title: "Calendario non disponibile",
        description: error instanceof Error ? error.message : "Riprova tra qualche secondo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [cursor, scope, toast])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  useEffect(() => {
    setForm((current) =>
      current.ownerMemberId
        ? current
        : {
            ...current,
            ownerMemberId: memberId,
            attendees: current.attendees.length ? current.attendees : memberId ? [memberId] : [],
          },
    )
  }, [memberId])

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, TeamCalendarEvent[]>()
    for (const event of events) {
      const key = localDateKey(event.startsAt)
      grouped.set(key, [...(grouped.get(key) || []), event])
    }
    return grouped
  }, [events])

  const agenda = useMemo(() => [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [events])

  const calendarCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const mondayOffset = (first.getDay() + 6) % 7
    const cells: Array<{ date: Date; inMonth: boolean }> = []

    for (let index = mondayOffset; index > 0; index -= 1) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), 1 - index), inMonth: false })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const nextDate = new Date(cursor.getFullYear(), cursor.getMonth(), daysInMonth + (cells.length % 7))
      cells.push({ date: nextDate, inMonth: false })
    }
    return cells
  }, [cursor])

  const openCreateDialog = (date = new Date()) => {
    setForm(defaultForm(memberId, date))
    setIsDialogOpen(true)
  }

  const openEditDialog = (event: TeamCalendarEvent) => {
    setForm({
      id: event.id,
      title: event.title,
      eventType: event.eventType,
      status: event.status,
      startsAt: toInputDateTime(new Date(event.startsAt)),
      endsAt: toInputDateTime(new Date(event.endsAt)),
      allDay: event.allDay,
      location: event.location || "",
      clientId: event.clientId || "",
      projectId: event.projectId || "",
      ownerMemberId: event.ownerMemberId || memberId,
      attendees: event.attendees || [],
      description: event.description || "",
    })
    setIsDialogOpen(true)
  }

  const updateForm = (patch: Partial<CalendarForm>) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const submitEvent = async () => {
    if (!form.title.trim()) {
      toast({ title: "Titolo obbligatorio", description: "Inserisci un titolo per l'evento.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: form.title,
        eventType: form.eventType,
        status: form.status,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        allDay: form.allDay,
        location: form.location,
        clientId: form.clientId || null,
        projectId: form.projectId || null,
        ownerMemberId: form.ownerMemberId || memberId,
        attendees: form.attendees,
        description: form.description,
      }
      const response = await fetch(form.id ? `/api/team-calendar/${form.id}` : "/api/team-calendar", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Errore durante il salvataggio")
      }
      setIsDialogOpen(false)
      await loadCalendar()
      toast({ title: form.id ? "Evento aggiornato" : "Evento creato", description: "Il calendario team è stato aggiornato." })
    } catch (error) {
      toast({
        title: "Salvataggio non riuscito",
        description: error instanceof Error ? error.message : "Controlla i dati e riprova.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteEvent = async () => {
    if (!form.id || !window.confirm("Eliminare questo evento dal calendario team?")) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/team-calendar/${form.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Eliminazione non riuscita")
      setIsDialogOpen(false)
      await loadCalendar()
      toast({ title: "Evento eliminato" })
    } catch (error) {
      toast({
        title: "Evento non eliminato",
        description: error instanceof Error ? error.message : "Riprova tra qualche secondo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getFeed = async () => {
    try {
      const response = await fetch("/api/team-calendar/feed")
      if (!response.ok) throw new Error("Feed iCloud non disponibile")
      const data = await response.json()
      setFeedUrl(data.url || "")
      setIsFeedOpen(true)
    } catch (error) {
      toast({
        title: "Link iCloud non generato",
        description: error instanceof Error ? error.message : "Riprova tra qualche secondo.",
        variant: "destructive",
      })
    }
  }

  const copyFeed = async () => {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    toast({ title: "Link copiato", description: "Puoi incollarlo in Calendario iCloud come calendario in abbonamento." })
  }

  return (
    <div className="min-h-[calc(100dvh-73px)] overflow-y-auto bg-[#07111f] text-white">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-righello-pink/18 text-righello-pink ring-1 ring-righello-pink/30">
              <CalendarClock className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-righello-cyan">Operazioni interne</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Calendario Team</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
              Pianifica shooting, call, appuntamenti, delivery e impegni del team. Il feed iCalendar lo puoi collegare a
              iCloud per averlo sul telefono.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScope((current) => (current === "team" ? "mine" : "team"))}
              className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
            >
              {scope === "team" ? "Vista team" : "Solo miei"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={getFeed}
              className="border-righello-cyan/25 bg-righello-cyan/10 text-righello-cyan hover:bg-righello-cyan/15"
            >
              <Cloud className="h-4 w-4" />
              iCloud
            </Button>
            <Button
              type="button"
              onClick={() => openCreateDialog()}
              className="bg-righello-pink text-white hover:bg-righello-pink/90"
            >
              <Plus className="h-4 w-4" />
              Nuovo evento
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035]">
            <div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="min-w-[180px] text-center text-lg font-black capitalize">{formatMonth(cursor)}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadCalendar()}
                className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Aggiorna
              </Button>
            </div>

            <div className="hidden lg:block">
              <div className="grid grid-cols-7 border-b border-white/10">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white/42">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map((cell) => {
                  const key = localDateKey(cell.date)
                  const dayEvents = eventsByDay.get(key) || []
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openCreateDialog(cell.date)}
                      className={cn(
                        "min-h-[150px] border-b border-r border-white/10 p-2 text-left transition hover:bg-white/[0.055]",
                        !cell.inMonth && "bg-black/15 text-white/25",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-bold">{cell.date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">{dayEvents.length}</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dayEvents.slice(0, 3).map((event) => {
                          const config = eventTypeConfig(event.eventType)
                          return (
                            <div
                              key={event.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditDialog(event)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") openEditDialog(event)
                              }}
                              className={cn("rounded-md border px-2 py-1.5 text-xs", config.className)}
                            >
                              <p className="truncate font-bold">{event.title}</p>
                              <p className="mt-0.5 truncate opacity-70">{formatTimeRange(event)}</p>
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && <p className="text-xs text-white/42">+{dayEvents.length - 3} altri</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {agenda.length === 0 && !isLoading ? (
                <div className="rounded-lg border border-dashed border-white/12 p-5 text-center text-sm text-white/50">
                  Nessun evento nel mese. Aggiungi shooting, call o appuntamenti.
                </div>
              ) : (
                agenda.map((event) => <EventRow key={event.id} event={event} onClick={() => openEditDialog(event)} />)
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Prossimi eventi</p>
              <div className="mt-4 space-y-3">
                {agenda.slice(0, 7).map((event) => (
                  <EventRow key={event.id} event={event} onClick={() => openEditDialog(event)} compact />
                ))}
                {agenda.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/12 p-4 text-sm text-white/50">Nessun evento pianificato.</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-righello-cyan/20 bg-righello-cyan/10 p-4">
              <p className="font-bold text-righello-cyan">Sync iCloud</p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                Il primo step è un calendario in abbonamento: lo vedi su iPhone e Mac, mentre le modifiche restano governate da Optima.
              </p>
            </div>
          </aside>
        </section>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#050914] p-0 text-white sm:max-w-3xl">
          <DialogHeader className="border-b border-white/10 p-5">
            <DialogTitle>{form.id ? "Modifica evento" : "Nuovo evento team"}</DialogTitle>
            <DialogDescription className="text-white/50">
              Collega l'impegno a cliente, progetto e referente quando serve tracciamento operativo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Titolo *" className="sm:col-span-2">
              <Input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} className="border-white/10 bg-black/30 text-white" />
            </Field>

            <Field label="Tipo">
              <NativeSelect value={form.eventType} onChange={(value) => updateForm({ eventType: value })}>
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Stato">
              <NativeSelect value={form.status} onChange={(value) => updateForm({ status: value })}>
                <option value="confirmed">Confermato</option>
                <option value="tentative">Da confermare</option>
                <option value="cancelled">Annullato</option>
              </NativeSelect>
            </Field>

            <Field label="Inizio">
              <Input type="datetime-local" value={form.startsAt} onChange={(event) => updateForm({ startsAt: event.target.value })} className="border-white/10 bg-black/30 text-white" />
            </Field>

            <Field label="Fine">
              <Input type="datetime-local" value={form.endsAt} onChange={(event) => updateForm({ endsAt: event.target.value })} className="border-white/10 bg-black/30 text-white" />
            </Field>

            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/72 sm:col-span-2">
              <input type="checkbox" checked={form.allDay} onChange={(event) => updateForm({ allDay: event.target.checked })} />
              Tutto il giorno
            </label>

            <Field label="Luogo" className="sm:col-span-2">
              <Input value={form.location} onChange={(event) => updateForm({ location: event.target.value })} placeholder="Studio, ufficio, indirizzo shooting..." className="border-white/10 bg-black/30 text-white placeholder:text-white/28" />
            </Field>

            <Field label="Cliente">
              <NativeSelect value={form.clientId} onChange={(value) => updateForm({ clientId: value })}>
                <option value="">Nessun cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Progetto">
              <NativeSelect value={form.projectId} onChange={(value) => updateForm({ projectId: value })}>
                <option value="">Nessun progetto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.clientName ? `${project.clientName} - ` : ""}
                    {project.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Referente">
              <NativeSelect value={form.ownerMemberId} onChange={(value) => updateForm({ ownerMemberId: value })}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Partecipanti">
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={form.attendees.includes(member.id)}
                      onChange={(event) => {
                        updateForm({
                          attendees: event.target.checked
                            ? [...new Set([...form.attendees, member.id])]
                            : form.attendees.filter((id) => id !== member.id),
                        })
                      }}
                    />
                    <span className="truncate">{member.name}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Note" className="sm:col-span-2">
              <Textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={4} className="border-white/10 bg-black/30 text-white placeholder:text-white/28" />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {form.id && (
                <Button type="button" variant="ghost" onClick={deleteEvent} disabled={isSaving} className="text-red-200 hover:bg-red-500/10 hover:text-red-100">
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                Annulla
              </Button>
              <Button type="button" onClick={submitEvent} disabled={isSaving} className="bg-righello-pink text-white hover:bg-righello-pink/90">
                {isSaving ? "Salvo..." : form.id ? "Salva" : "Crea evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFeedOpen} onOpenChange={setIsFeedOpen}>
        <DialogContent className="border-white/10 bg-[#050914] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Collega a iCloud</DialogTitle>
            <DialogDescription className="text-white/55">
              Usa questo URL come calendario in abbonamento su iPhone, Mac o Google Calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/70 break-all">{feedUrl}</div>
          <ol className="space-y-2 text-sm leading-6 text-white/62">
            <li>1. iPhone: Impostazioni &gt; Calendario &gt; Account &gt; Aggiungi account &gt; Altro.</li>
            <li>2. Scegli “Aggiungi calendario con iscrizione”.</li>
            <li>3. Incolla il link e salva. Gli eventi si aggiornano da Optima.</li>
          </ol>
          <Button type="button" onClick={copyFeed} className="bg-righello-cyan text-slate-950 hover:bg-righello-cyan/90">
            <Copy className="h-4 w-4" />
            Copia link
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventRow({ event, onClick, compact = false }: { event: TeamCalendarEvent; onClick: () => void; compact?: boolean }) {
  const config = eventTypeConfig(event.eventType)
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-white/10 bg-[#0b1626] p-3 text-left transition hover:border-righello-cyan/30 hover:bg-[#101d30]"
    >
      <div className="flex gap-3">
        <div className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border", config.className)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 font-bold text-white">{event.title}</p>
            <span className="flex-shrink-0 rounded-full bg-white/8 px-2 py-1 text-[11px] text-white/56">{formatTimeRange(event)}</span>
          </div>
          {!compact && <p className="mt-1 text-xs capitalize text-white/38">{formatDay(event.startsAt)}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/50">
            {event.ownerName && <span className="rounded-full bg-white/7 px-2 py-0.5">{event.ownerName}</span>}
            {event.clientName && <span className="rounded-full bg-white/7 px-2 py-0.5">{event.clientName}</span>}
            {event.projectName && <span className="rounded-full bg-white/7 px-2 py-0.5">{event.projectName}</span>}
          </div>
        </div>
      </div>
    </button>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs font-bold uppercase tracking-[0.12em] text-white/42">{label}</Label>
      {children}
    </div>
  )
}

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-righello-cyan"
    >
      {children}
    </select>
  )
}
