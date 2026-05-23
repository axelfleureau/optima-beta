"use client"

import type { CSSProperties, ReactNode } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Command,
  FileText,
  Gauge,
  Layers3,
  LineChart,
  Menu,
  PanelLeftClose,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type WorkspaceModule = {
  id: "projects" | "people" | "ai" | "finance"
  label: string
  kicker: string
  icon: LucideIcon
  accent: string
  muted: string
  summary: string
  stats: Array<{ label: string; value: string; tone: string }>
  columns: Array<{
    title: string
    signal: string
    items: Array<{ title: string; meta: string; owner: string; score: string }>
  }>
  command: string
}

const workspaceModules: WorkspaceModule[] = [
  {
    id: "projects",
    label: "Progetti",
    kicker: "Delivery",
    icon: BriefcaseBusiness,
    accent: "#d6487e",
    muted: "rgba(214,72,126,0.14)",
    summary: "Kanban, ownership, scadenze, allegati e stato cliente in un'unica vista operativa.",
    stats: [
      { label: "task aperte", value: "22", tone: "text-[#ff75ac]" },
      { label: "clienti attivi", value: "7", tone: "text-white" },
      { label: "SLA critici", value: "1", tone: "text-[#ffcf70]" },
    ],
    columns: [
      {
        title: "To Do",
        signal: "6",
        items: [
          { title: "Open day Tomasella", meta: "Contenuto IG + asset", owner: "Fatin", score: "P2" },
          { title: "Brief G&M Ambiente", meta: "Planning produzione", owner: "Axel", score: "P1" },
        ],
      },
      {
        title: "In corso",
        signal: "4",
        items: [
          { title: "Landing Sandstorm", meta: "6 versioni visual", owner: "Team Design", score: "P2" },
          { title: "Preventivo custom app", meta: "Milestone e margine", owner: "Admin", score: "P3" },
        ],
      },
      {
        title: "Validation",
        signal: "2",
        items: [
          { title: "Post fotovoltaico Friuli", meta: "Copy, hashtag, CTA", owner: "Demo User", score: "P1" },
        ],
      },
    ],
    command: "Crea tre task per G&M Ambiente: copy, visual e validazione. Assegna owner e scadenze future.",
  },
  {
    id: "people",
    label: "Persone",
    kicker: "People ops",
    icon: UsersRound,
    accent: "#06b6d4",
    muted: "rgba(6,182,212,0.13)",
    summary: "Ore, rapportini, carico reale, scostamenti e capacita non utilizzata letti sul contesto dei progetti.",
    stats: [
      { label: "capacita usata", value: "62%", tone: "text-[#67e8f9]" },
      { label: "rapportini", value: "18", tone: "text-white" },
      { label: "segnali", value: "3", tone: "text-[#ff75ac]" },
    ],
    columns: [
      {
        title: "Oggi",
        signal: "5h",
        items: [
          { title: "Fatin - Dev/Grafica", meta: "09:15 - 17:30", owner: "5h attivita", score: "71%" },
          { title: "Axel - Direzione", meta: "Review clienti", owner: "3h 20m", score: "42%" },
        ],
      },
      {
        title: "Da presidiare",
        signal: "3",
        items: [
          { title: "Sovraccarico creativo", meta: "2 deadline vicine", owner: "Design", score: "Alert" },
          { title: "Task senza output", meta: "Da verificare", owner: "PM", score: "Check" },
        ],
      },
      {
        title: "Output",
        signal: "8",
        items: [
          { title: "Rapportini chiusi", meta: "Nessun blocco grave", owner: "Team", score: "OK" },
        ],
      },
    ],
    command: "Mostrami chi e scarico, chi e in ritardo e quali progetti rischiano slittamento questa settimana.",
  },
  {
    id: "ai",
    label: "AI",
    kicker: "Command",
    icon: Bot,
    accent: "#22c55e",
    muted: "rgba(34,197,94,0.12)",
    summary: "Una command bar con memoria aziendale per generare task, contenuti, analisi e decisioni operative.",
    stats: [
      { label: "memorie", value: "42", tone: "text-[#86efac]" },
      { label: "token usati", value: "31k", tone: "text-white" },
      { label: "azioni", value: "9", tone: "text-[#67e8f9]" },
    ],
    columns: [
      {
        title: "Prompt",
        signal: "AI",
        items: [
          { title: "Genera piano social", meta: "Cliente + piattaforma", owner: "GPT-5", score: "Live" },
          { title: "Breakdown task", meta: "Dipendenze e owner", owner: "AI Ops", score: "Auto" },
        ],
      },
      {
        title: "Memoria",
        signal: "on",
        items: [
          { title: "Preferenze Righello", meta: "Tono, clienti, workflow", owner: "Workspace", score: "RAG" },
          { title: "Cronologia chat", meta: "Contesto recuperabile", owner: "Utente", score: "OK" },
        ],
      },
      {
        title: "Azioni",
        signal: "4",
        items: [
          { title: "Task automatiche", meta: "Da confermare", owner: "Admin", score: "P2" },
        ],
      },
    ],
    command: "Analizza il workspace, proponi priorita e aggiorna le card senza bloccare la UI.",
  },
  {
    id: "finance",
    label: "Preventivi",
    kicker: "Revenue",
    icon: FileText,
    accent: "#f59e0b",
    muted: "rgba(245,158,11,0.13)",
    summary: "Preventivi, budget, allegati, pagamenti e marginalita collegati al delivery reale.",
    stats: [
      { label: "pipeline", value: "€48k", tone: "text-[#fbbf24]" },
      { label: "bozze", value: "5", tone: "text-white" },
      { label: "margine", value: "38%", tone: "text-[#86efac]" },
    ],
    columns: [
      {
        title: "Bozze",
        signal: "5",
        items: [
          { title: "App clienti premium", meta: "3 milestone", owner: "Sales", score: "€12k" },
          { title: "Retainer social", meta: "Q2 planning", owner: "Admin", score: "€4k" },
        ],
      },
      {
        title: "Inviati",
        signal: "2",
        items: [
          { title: "E-commerce consulting", meta: "In attesa firma", owner: "Axel", score: "€9k" },
        ],
      },
      {
        title: "Accettati",
        signal: "3",
        items: [
          { title: "Brand system", meta: "Pronto per kickoff", owner: "PM", score: "OK" },
        ],
      },
    ],
    command: "Trasforma il preventivo accettato in progetto, fasi, task e carico previsto per il team.",
  },
]

const operatingAreas = [
  {
    icon: BriefcaseBusiness,
    title: "Progetti e clienti",
    body: "Clienti, progetti, task, allegati e stati restano collegati. La priorita non vive piu in chat sparse.",
  },
  {
    icon: UsersRound,
    title: "People operations",
    body: "Ore utili, pause, rapportini e carico sono agganciati ai progetti, non a tabelle isolate.",
  },
  {
    icon: Bot,
    title: "AI contestuale",
    body: "L'assistente ragiona su workspace, memoria e obiettivi, poi propone azioni verificabili.",
  },
  {
    icon: LineChart,
    title: "Revenue control",
    body: "Preventivi, margini e tempi previsti aiutano a capire dove il lavoro produce davvero valore.",
  },
]

const methodSteps = [
  ["01", "Discovery", "Brief, vincoli, asset e obiettivo vengono normalizzati prima di produrre."],
  ["02", "Planning", "Ogni progetto diventa fasi, scadenze, finestre temporali, owner e carico previsto."],
  ["03", "Execution", "Il team lavora in kanban, allega materiali, chiude rapportini e aggiorna stati in tempo reale."],
  ["04", "Reporting", "Scostamenti, ritardi, saturazione e segnali critici diventano decisioni operative."],
]

const controlSignals = [
  { label: "Capacita produttiva", value: "62%", icon: Gauge, tone: "text-[#67e8f9]" },
  { label: "Ritardi reali", value: "1", icon: Clock3, tone: "text-[#ff75ac]" },
  { label: "Output tracciati", value: "18", icon: CheckCircle2, tone: "text-[#86efac]" },
  { label: "Finestre critiche", value: "3", icon: CalendarClock, tone: "text-[#fbbf24]" },
]

function AnimatedTitle({
  children,
  as = "h2",
  className,
}: {
  children: string
  as?: "h1" | "h2"
  className?: string
}) {
  const shouldReduceMotion = useReducedMotion()
  const Tag = as

  return (
    <Tag className={className}>
      {children.split(" ").map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="mr-[0.22em] inline-block"
            initial={shouldReduceMotion ? false : { y: "105%", opacity: 0 }}
            whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.72, delay: Math.min(index * 0.028, 0.34), ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { y: 26, opacity: 0 }}
      whileInView={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function ProductPreview() {
  const [activeId, setActiveId] = useState<WorkspaceModule["id"]>("projects")
  const active = useMemo(
    () => workspaceModules.find((module) => module.id === activeId) ?? workspaceModules[0],
    [activeId],
  )
  const ActiveIcon = active.icon
  const accentStyle = { "--module-accent": active.accent } as CSSProperties

  return (
    <div
      className="relative overflow-hidden rounded-[8px] border border-white/12 bg-[#080b13] shadow-2xl shadow-black/45"
      style={accentStyle}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--module-accent),transparent_34%)] opacity-[0.12]" />
      <div className="relative border-b border-white/10 bg-black/20 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/12 bg-white/[0.06]">
              <ActiveIcon className="h-5 w-5" style={{ color: active.accent }} />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-white/44">{active.kicker}</p>
              <h3 className="text-lg font-black text-white sm:text-2xl">{active.label} cockpit</h3>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/58 sm:flex">
            <Command className="h-4 w-4" />
            live UI
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {workspaceModules.map((module) => {
            const Icon = module.icon
            const selected = module.id === active.id
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => setActiveId(module.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-black transition",
                  selected
                    ? "border-white/20 bg-white text-[#05070b]"
                    : "border-white/10 bg-white/[0.045] text-white/62 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" style={{ color: selected ? module.accent : undefined }} />
                {module.label}
              </button>
            )
          })}
        </div>
      </div>

      <motion.div
        key={active.id}
        className="relative p-3 sm:p-4 lg:p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {active.stats.map((stat) => (
            <div key={stat.label} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
              <div className={cn("text-2xl font-black sm:text-3xl", stat.tone)}>{stat.value}</div>
              <div className="mt-1 text-xs font-semibold text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-white/66">{active.summary}</p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.55fr_0.85fr]">
          <div className="overflow-x-auto rounded-[8px] border border-white/10 bg-black/20 p-3 [scrollbar-width:thin]">
            <div className="grid min-w-[760px] grid-cols-3 gap-3">
              {active.columns.map((column) => (
                <div key={column.title} className="rounded-[8px] border border-white/10 bg-[#0d1320] p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-[8px]" style={{ backgroundColor: active.accent }} />
                      <h4 className="font-black text-white">{column.title}</h4>
                    </div>
                    <span className="rounded-[8px] bg-white/10 px-2 py-1 text-xs font-black text-white/62">
                      {column.signal}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {column.items.map((item) => (
                      <div key={item.title} className="rounded-[8px] border border-white/10 bg-[#f7f1c8] p-3 text-[#10131a] shadow-lg shadow-black/20">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-black leading-5">{item.title}</p>
                          <span className="rounded-[8px] bg-black/10 px-2 py-1 text-[11px] font-black">
                            {item.score}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-bold text-[#526073]">{item.meta}</p>
                        <div className="mt-4 flex items-center justify-between text-xs font-black text-[#526073]">
                          <span>{item.owner}</span>
                          <span>oggi</span>
                        </div>
                      </div>
                    ))}
                    <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-white/18 text-sm font-bold text-white/48">
                      <Zap className="h-4 w-4" />
                      Nuova task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <Sparkles className="h-4 w-4" style={{ color: active.accent }} />
                Command bar
              </div>
              <div className="mt-3 rounded-[8px] border border-white/10 bg-black/35 p-3 text-sm font-medium leading-6 text-white/68">
                {active.command}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-white/42">
                <span>memoria attiva</span>
                <span style={{ color: active.accent }}>azione pronta</span>
              </div>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black">Pulse operativo</p>
                <span className="rounded-[8px] px-2 py-1 text-xs font-black" style={{ backgroundColor: active.muted, color: active.accent }}>
                  realtime
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {["al piu presto", "al piu tardi", "owner chiaro"].map((label, index) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-bold text-white/50">
                      <span>{label}</span>
                      <span>{[82, 64, 91][index]}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-[8px] bg-white/10">
                      <motion.div
                        className="h-full rounded-[8px]"
                        style={{ backgroundColor: active.accent }}
                        initial={{ width: 0 }}
                        animate={{ width: `${[82, 64, 91][index]}%` }}
                        transition={{ duration: 0.5, delay: index * 0.08 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#05070b]/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Optima home">
            <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#d6487e] text-xl font-black text-white">
              O
            </span>
            <span>
              <span className="block text-xl font-black leading-5">Optima</span>
              <span className="block text-[10px] font-black uppercase text-white/42">by Righello</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/68 md:flex">
            <Link href="#cockpit" className="transition-colors hover:text-white">
              Cockpit
            </Link>
            <Link href="#metodo" className="transition-colors hover:text-white">
              Metodo
            </Link>
            <Link href="#controllo" className="transition-colors hover:text-white">
              Controllo
            </Link>
            <Link href="https://www.wearerighello.com/" className="transition-colors hover:text-white">
              Righello
            </Link>
            <Link href="/login" className="transition-colors hover:text-white">
              Accedi
            </Link>
            <Link href="/register">
              <Button className="h-10 rounded-[8px] bg-[#d6487e] px-5 font-bold text-white hover:bg-white hover:text-[#05070b]">
                Entra
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-[8px] border border-white/12 p-2 text-white md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Apri menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-white/10 bg-[#05070b] px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold text-white/80">
              <Link href="#cockpit" onClick={() => setMobileMenuOpen(false)}>
                Cockpit
              </Link>
              <Link href="#metodo" onClick={() => setMobileMenuOpen(false)}>
                Metodo
              </Link>
              <Link href="#controllo" onClick={() => setMobileMenuOpen(false)}>
                Controllo
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                Accedi
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="h-11 w-full rounded-[8px] bg-[#d6487e] font-bold text-white">
                  Entra in piattaforma
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </header>

      <section className="relative border-b border-white/10 pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#160713_0%,#05070b_44%,#05070b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

        <div className="relative mx-auto grid min-h-[calc(100svh-80px)] max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
          <div>
            <Reveal>
              <div className="mb-5 inline-flex items-center gap-2 rounded-[8px] border border-[#d6487e]/38 bg-[#d6487e]/12 px-3 py-2 text-sm font-black text-[#ff75ac]">
                <Sparkles className="h-4 w-4" />
                Product operating system
              </div>
            </Reveal>

            <AnimatedTitle
              as="h1"
              className="max-w-4xl text-5xl font-black leading-[0.92] text-white sm:text-7xl lg:text-[6.9rem]"
            >
              Il sistema operativo per rendere Righello piu efficiente.
            </AnimatedTitle>

            <Reveal delay={0.08}>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-white/68">
                Óptima porta progetti, persone, clienti, preventivi e AI in una cabina di regia unica: meno attrito,
                piu controllo operativo, decisioni prese sui dati reali.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="h-12 w-full rounded-[8px] bg-[#d6487e] px-7 font-bold text-white hover:bg-white hover:text-[#05070b] sm:w-auto">
                    Entra in piattaforma
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full rounded-[8px] border-white/18 bg-white/8 px-7 font-bold text-white hover:bg-white hover:text-[#05070b] sm:w-auto"
                  >
                    Accedi
                  </Button>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-9 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
                {[
                  ["22", "task aperte"],
                  ["7", "clienti attivi"],
                  ["62%", "capacita"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3 sm:p-4">
                    <div className="text-2xl font-black text-white sm:text-4xl">{value}</div>
                    <div className="mt-1 text-xs font-semibold text-white/48 sm:text-sm">{label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.08} className="lg:pt-10">
            <ProductPreview />
          </Reveal>
        </div>
      </section>

      <section id="cockpit" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="mb-4 text-sm font-black uppercase text-[#67e8f9]">Cockpit operativo</p>
              <AnimatedTitle className="text-4xl font-black leading-[0.98] sm:text-6xl">
                La grafica e il prodotto sono la stessa cosa.
              </AnimatedTitle>
            </div>
            <p className="text-base font-medium leading-7 text-white/62 lg:max-w-2xl">
              La landing non mostra piu screenshot morti: usa pattern reali della piattaforma, cosi il primo impatto
              racconta workspace, AI, task e people ops senza peso visivo inutile.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {operatingAreas.map((area, index) => {
              const Icon = area.icon
              return (
                <Reveal key={area.title} delay={index * 0.04}>
                  <article className="min-h-[280px] rounded-[8px] border border-white/10 bg-[#0b101b] p-5">
                    <Icon className="h-7 w-7 text-[#ff75ac]" />
                    <h3 className="mt-10 text-3xl font-black leading-none">{area.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-6 text-white/60">{area.body}</p>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section id="metodo" className="border-y border-white/10 bg-white/[0.025] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-4 text-sm font-black uppercase text-[#86efac]">Metodo Righello</p>
            <AnimatedTitle className="text-4xl font-black leading-[0.98] sm:text-6xl">
              Management agile, ma misurabile.
            </AnimatedTitle>
            <p className="mt-6 text-base font-medium leading-7 text-white/62">
              Una tech company giovane deve muoversi veloce, ma il sistema deve indicare presto cosa blocca crescita,
              margine e qualita del lavoro.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {methodSteps.map(([step, title, body], index) => (
              <Reveal key={step} delay={index * 0.05}>
                <article className="rounded-[8px] border border-white/10 bg-[#080c15] p-5">
                  <div className="text-sm font-black text-[#d6487e]">{step}</div>
                  <h3 className="mt-7 text-3xl font-black">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-white/60">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="controllo" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-black uppercase text-[#67e8f9]">Controllo aziendale</p>
            <AnimatedTitle className="text-4xl font-black leading-[0.98] sm:text-6xl">
              Ottimizzare tempo, carico e finestre critiche.
            </AnimatedTitle>
            <p className="mt-6 text-base font-medium leading-7 text-white/62">
              Óptima deve segnalare capacita inutilizzata, sovraccarichi, ritardi e approcci problematici sul personale
              dentro il contesto dei progetti: al piu presto, al piu tardi, chi fa cosa e con quale output.
            </p>
          </div>

          <Reveal>
            <div className="rounded-[8px] border border-white/10 bg-[#080c15] p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-bold text-white/48">Settimana operativa</p>
                  <h3 className="text-2xl font-black sm:text-3xl">Team pulse</h3>
                </div>
                <PanelLeftClose className="h-8 w-8 text-[#67e8f9]" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {controlSignals.map((signal) => {
                  const Icon = signal.icon
                  return (
                    <div key={signal.label} className="rounded-[8px] border border-white/10 bg-black/25 p-4">
                      <Icon className={cn("h-5 w-5", signal.tone)} />
                      <div className={cn("mt-4 text-4xl font-black", signal.tone)}>{signal.value}</div>
                      <div className="mt-1 text-sm font-semibold text-white/50">{signal.label}</div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ["Fatin", "5h operative su 7h nette", "71%", "#22c55e"],
                  ["Design", "2 task in validation", "58%", "#06b6d4"],
                  ["Delivery", "1 finestra da presidiare", "82%", "#d6487e"],
                ].map(([name, label, value, color]) => (
                  <div key={name} className="rounded-[8px] border border-white/10 bg-black/25 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black">{name}</p>
                        <p className="text-sm font-medium text-white/50">{label}</p>
                      </div>
                      <span className="text-sm font-black" style={{ color }}>
                        {value}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-[8px] bg-white/10">
                      <div className="h-full rounded-[8px]" style={{ width: value, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[8px] border border-[#d6487e]/40 bg-[#d6487e]/12 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3 text-[#ff75ac]">
                <Sparkles className="h-7 w-7" />
                <Layers3 className="h-7 w-7" />
                <Gauge className="h-7 w-7" />
              </div>
              <h2 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] sm:text-6xl">
                La prossima versione di Righello si governa da qui.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/66">
                Un prodotto interno, ma con ambizione da piattaforma: meno attrito, piu output, piu chiarezza.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/register">
                <Button size="lg" className="h-12 w-full rounded-[8px] bg-white px-7 font-bold text-[#05070b] hover:bg-[#67e8f9]">
                  Entra in piattaforma
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-[8px] border-white/20 bg-transparent px-7 font-bold text-white hover:bg-white hover:text-[#05070b]"
                >
                  Accedi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#d6487e] font-black text-white">O</span>
            <span>Óptima by Righello</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="https://www.wearerighello.com/" className="hover:text-white">
              wearerighello.com
            </Link>
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <span>Project operating system</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
