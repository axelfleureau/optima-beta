"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Command,
  FileText,
  Gauge,
  Layers3,
  LineChart,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Feature = {
  icon: LucideIcon
  title: string
  body: string
  accent: string
}

const features: Feature[] = [
  {
    icon: Megaphone,
    title: "Crescita e contenuti",
    body: "Calendari editoriali, canali, asset e obiettivi restano collegati a clienti, prodotto e risultati.",
    accent: "#d6487e",
  },
  {
    icon: BriefcaseBusiness,
    title: "Clienti e progetti",
    body: "Ogni cliente puo avere piu progetti, task, fasi, allegati, referenti e stato operativo.",
    accent: "#06b6d4",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Dashboard, segnali, ritardi, margini e avanzamento trasformano il lavoro in decisioni.",
    accent: "#67e8f9",
  },
  {
    icon: Bot,
    title: "AI assistant",
    body: "L'assistente usa contesto, memoria e dati workspace per aiutare contenuti, priorita e preventivi.",
    accent: "#a855f7",
  },
  {
    icon: CalendarDays,
    title: "Editoriale",
    body: "Pianificazione mobile-first per pubblicazioni, consegne, validazioni e follow up.",
    accent: "#22c55e",
  },
  {
    icon: FileText,
    title: "Preventivi",
    body: "Dalla raccolta dati al preventivo, poi progetto, milestone, budget e assegnazioni.",
    accent: "#f59e0b",
  },
]

const method = [
  ["01", "Discovery", "Ascolta clienti, vincoli, asset, tempi e obiettivi."],
  ["02", "Planning", "Trasforma input e priorita in fasi, task, owner e scadenze."],
  ["03", "Execution", "Segue lavoro, allegati, commenti, ore, validazioni e follow up."],
  ["04", "Reporting", "Chiude il ciclo con output, margine, carico, ritardi e prossime azioni."],
]

const plans = [
  {
    name: "90",
    price: "14,99",
    summary: "Per partire con workspace, task, clienti e AI essenziale.",
    items: ["Clienti e progetti", "Calendario editoriale", "AI assistant base", "Report essenziali"],
  },
  {
    name: "180",
    price: "39,99",
    summary: "Per gestire davvero delivery, preventivi e team operativo.",
    items: ["Tutto il piano 90", "Preventivi AI", "Allegati e commenti cliente", "Tracciamento persone"],
    highlighted: true,
  },
  {
    name: "360",
    price: "79,99",
    summary: "Per direzione, automazioni, controllo aziendale e crescita.",
    items: ["Tutto il piano 180", "Controllo aziendale", "Segnali di rischio", "Automazioni avanzate"],
  },
]

const signalRows = [
  ["Fatin - Dev/Grafica", "5h su 7h nette", "71%", "#22c55e"],
  ["G&M Ambiente", "1 follow up aperto", "82%", "#d6487e"],
  ["Preventivi AI", "2 bozze da chiudere", "64%", "#06b6d4"],
]

const productStats: Array<[string, string, LucideIcon, string]> = [
  ["Campagne attive", "12", Target, "#d6487e"],
  ["Task aperte", "22", Layers3, "#67e8f9"],
  ["Ore tracciate", "31h", Clock3, "#22c55e"],
]

const productColumns: Array<[string, string, string, string[]]> = [
  ["To do", "6", "#9dbbff", ["Open day Tomasella", "Post fotovoltaico", "Brief nuovo sito"]],
  ["In corso", "4", "#ffcf70", ["Landing Sandstorm", "Preventivo A180", "Media task upload"]],
  ["Validation", "2", "#c4b5fd", ["Copy Instagram", "Report cliente"]],
]

function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string
  title: string
  body?: string
  align?: "left" | "center"
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="text-sm font-black uppercase text-[#ff75ac]">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-black leading-none text-white sm:text-6xl">{title}</h2>
      {body ? <p className="mt-5 text-base font-medium leading-7 text-white/64 sm:text-lg">{body}</p> : null}
    </div>
  )
}

function ProductVisual() {
  return (
    <div className="relative rounded-[8px] border border-white/14 bg-[#070a12] p-3 shadow-2xl shadow-black/50 sm:p-4">
      <div className="absolute inset-0 rounded-[8px] bg-[radial-gradient(circle_at_15%_15%,rgba(214,72,126,0.24),transparent_30%),radial-gradient(circle_at_88%_24%,rgba(6,182,212,0.18),transparent_34%)]" />
      <div className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[#0d1320]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-white/44">Optima cockpit</p>
            <h3 className="truncate text-xl font-black text-white">G&M Ambiente srl</h3>
          </div>
          <div className="hidden items-center gap-2 rounded-[8px] border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-2 text-sm font-black text-[#86efac] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            live
          </div>
        </div>

        <div className="grid gap-3 p-3 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {productStats.map(([label, value, Icon, color]) => (
              <div key={String(label)} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
                <Icon className="h-5 w-5" style={{ color }} />
                <div className="mt-5 text-4xl font-black text-white">{value}</div>
                <p className="text-sm font-semibold text-white/52">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[8px] border border-white/10 bg-black/25 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {productColumns.map(([title, count, color, cards]) => (
                <div key={String(title)} className="rounded-[8px] border border-white/10 bg-[#111827] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <p className="font-black text-white">{title}</p>
                    </div>
                    <span className="rounded-[8px] bg-white/10 px-2 py-1 text-xs font-black text-white/60">{count}</span>
                  </div>
                  <div className="space-y-3">
                    {cards.map((card, index) => (
                      <div
                        key={card}
                        className="rounded-[8px] border border-white/10 bg-[#fff7c9] p-3 text-[#0f172a]"
                        style={{ boxShadow: `inset 0 4px 0 ${color}` }}
                      >
                        <p className="text-sm font-black leading-5">{card}</p>
                        <div className="mt-4 flex items-center justify-between text-xs font-black text-[#5b6472]">
                          <span>{index === 0 ? "cliente" : "team"}</span>
                          <span>{index === 1 ? "domani" : "oggi"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-start gap-3 rounded-[8px] border border-[#d6487e]/28 bg-[#d6487e]/10 p-4">
            <Command className="mt-1 h-5 w-5 shrink-0 text-[#ff75ac]" />
            <div>
              <p className="font-black text-white">Command bar</p>
              <p className="mt-1 text-sm font-medium leading-6 text-white/64">
                "Mostrami ritardi, capacita disponibile e prossimi follow up cliente."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignalPanel() {
  return (
    <div className="rounded-[8px] border border-white/10 bg-[#0a0e18] p-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-sm font-bold text-white/46">Controllo aziendale</p>
          <h3 className="text-2xl font-black text-white">Pulse settimanale</h3>
        </div>
        <Gauge className="h-8 w-8 text-[#67e8f9]" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ["Capacita usata", "71%", "#22c55e"],
          ["Task critiche", "1", "#ff75ac"],
          ["Output chiusi", "18", "#67e8f9"],
          ["Margine stimato", "38%", "#f59e0b"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
            <div className="text-4xl font-black" style={{ color }}>
              {value}
            </div>
            <p className="mt-1 text-sm font-semibold text-white/52">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {signalRows.map(([name, label, value, color]) => (
          <div key={name} className="rounded-[8px] border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-black text-white">{name}</p>
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
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#05070b]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Optima home">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#d6487e] text-lg font-black text-white">
              O
            </span>
            <span className="min-w-0 leading-none">
              <span className="block text-xl font-black">Optima</span>
              <span className="block text-[10px] font-bold uppercase text-white/42">by Righello</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-white/64 md:flex">
            <Link href="#funzionalita" className="hover:text-white">
              Funzionalita
            </Link>
            <Link href="#metodo" className="hover:text-white">
              Metodo
            </Link>
            <Link href="#prezzi" className="hover:text-white">
              Prezzi
            </Link>
            <Link href="https://www.wearerighello.com/" className="hover:text-white">
              Righello
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" className="hidden h-10 rounded-[8px] border-white/14 bg-white/[0.04] px-5 font-bold text-white hover:bg-white hover:text-[#05070b] sm:inline-flex">
                Accedi
              </Button>
            </Link>
            <Link href="/register">
              <Button className="h-10 rounded-[8px] bg-[#d6487e] px-5 font-bold text-white hover:bg-white hover:text-[#05070b]">
                Entra
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#12060f_0%,#05070b_56%,#05070b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:84px_84px] opacity-20" />
        <div className="relative mx-auto grid min-h-[calc(100svh-80px)] max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-8">
          <FadeIn>
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-[8px] border border-[#d6487e]/34 bg-[#d6487e]/12 px-3 py-2 text-sm font-black text-[#ff75ac]">
                <Sparkles className="h-4 w-4" />
                Nuova versione, stessa precisione
              </div>
              <h1 className="text-5xl font-black leading-none text-white sm:text-7xl lg:text-8xl">
                Misura il lavoro. Governa l'azienda.
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-white/68">
                Optima nasce per dare precisione a tutto cio che Righello costruisce: prodotto, operazioni, clienti,
                persone, AI, preventivi e crescita. Un cockpit unico per decidere prima e lavorare meglio.
              </p>
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
                    className="h-12 w-full rounded-[8px] border-white/18 bg-white/[0.06] px-7 font-bold text-white hover:bg-white hover:text-[#05070b] sm:w-auto"
                  >
                    Accedi
                  </Button>
                </Link>
              </div>
              <div className="mt-9 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
                {[
                  ["clienti", "7"],
                  ["task", "22"],
                  ["AI ops", "on"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3 sm:p-4">
                    <div className="text-2xl font-black text-white sm:text-4xl">{value}</div>
                    <p className="mt-1 text-xs font-semibold text-white/48 sm:text-sm">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <ProductVisual />
          </FadeIn>
        </div>
      </section>

      <section id="funzionalita" className="border-y border-white/10 bg-white/[0.025] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <SectionTitle
              eyebrow="Funzionalita"
              title="La vecchia promessa era giusta. Ora parla di tutta Righello."
              body="La landing torna chiara: progetti, clienti, analytics, AI, calendario, preventivi e persone. Ogni modulo e collegato al lavoro reale dell'azienda."
            />
          </FadeIn>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <FadeIn key={feature.title} delay={index * 0.03}>
                  <article className="min-h-[250px] rounded-[8px] border border-white/10 bg-[#0b101b] p-5">
                    <div className="grid h-12 w-12 place-items-center rounded-[8px] border border-white/10 bg-white/[0.05]">
                      <Icon className="h-6 w-6" style={{ color: feature.accent }} />
                    </div>
                    <h3 className="mt-9 text-3xl font-black leading-none text-white">{feature.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-6 text-white/60">{feature.body}</p>
                  </article>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section id="metodo" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <FadeIn>
            <div>
              <SectionTitle
                eyebrow="Metodo Righello"
                title="Dal dato alla decisione, senza perdere il ritmo."
                body="Optima deve aiutare una realta giovane e agile a vedere prima i problemi, scegliere prima le priorita e chiudere meglio il lavoro."
              />
              <div className="mt-8 flex flex-wrap gap-2">
                {["al piu presto", "al piu tardi", "owner", "margine", "carico", "output"].map((item) => (
                  <span key={item} className="rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-white/62">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <div className="grid gap-3 sm:grid-cols-2">
              {method.map(([step, title, body]) => (
                <article key={step} className="rounded-[8px] border border-white/10 bg-[#0b101b] p-5">
                  <div className="text-sm font-black text-[#ff75ac]">{step}</div>
                  <h3 className="mt-8 text-3xl font-black leading-none text-white">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-white/60">{body}</p>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#080c15] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <FadeIn>
            <SignalPanel />
          </FadeIn>
          <FadeIn delay={0.06}>
            <div>
              <p className="text-sm font-black uppercase text-[#67e8f9]">Controllo aziendale</p>
              <h2 className="mt-3 text-4xl font-black leading-none text-white sm:text-6xl">
                Non solo comunicazione. Anche persone, tempi e capacita.
              </h2>
              <p className="mt-6 text-base font-medium leading-7 text-white/62">
                La parte manageriale legge presenza, rapportini, carico, approcci problematici, task in ritardo e
                finestre operative. Il punto non e sorvegliare: e capire dove l'azienda perde efficienza.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  ["Cliente commenta una task", "email al referente o assegnatario"],
                  ["Agenzia aggiorna lo stato", "email al cliente con contesto"],
                  ["Preventivo viene accettato", "progetto e fasi pronti da generare"],
                ].map(([label, body]) => (
                  <div key={label} className="flex gap-3 rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#22c55e]" />
                    <div>
                      <p className="font-black text-white">{label}</p>
                      <p className="text-sm font-medium text-white/56">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="prezzi" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <SectionTitle
              eyebrow="Piani"
              title="Semplice da provare, serio quando scala."
              body="La struttura 90, 180, 360 resta riconoscibile, ma senza promessa datata: AI moderna, workflow e controllo operativo."
              align="center"
            />
          </FadeIn>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <FadeIn key={plan.name} delay={index * 0.04}>
                <article
                  className={cn(
                    "rounded-[8px] border p-5",
                    plan.highlighted ? "border-[#d6487e]/55 bg-[#d6487e]/12" : "border-white/10 bg-[#0b101b]",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-white/46">Piano</p>
                      <h3 className="text-5xl font-black leading-none text-white">{plan.name}</h3>
                    </div>
                    {plan.highlighted ? (
                      <span className="rounded-[8px] bg-[#d6487e] px-3 py-2 text-xs font-black text-white">scelto</span>
                    ) : null}
                  </div>
                  <p className="mt-5 min-h-14 text-sm font-medium leading-6 text-white/62">{plan.summary}</p>
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-5xl font-black text-white">€{plan.price}</span>
                    <span className="pb-2 text-sm font-bold text-white/44">/mese</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm font-bold text-white/72">
                        <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-7 block">
                    <Button
                      className={cn(
                        "h-11 w-full rounded-[8px] font-bold",
                        plan.highlighted
                          ? "bg-[#d6487e] text-white hover:bg-white hover:text-[#05070b]"
                          : "bg-white text-[#05070b] hover:bg-[#67e8f9]",
                      )}
                    >
                      Inizia ora
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[8px] border border-[#d6487e]/36 bg-[#d6487e]/12 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3 text-[#ff75ac]">
                <Zap className="h-7 w-7" />
                <LineChart className="h-7 w-7" />
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-6 max-w-4xl text-4xl font-black leading-none text-white sm:text-6xl">
                Una piattaforma interna, con ambizione da prodotto vero.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/66">
                Prodotto, delivery, clienti, persone e AI nello stesso posto. Meno attrito, piu controllo, piu output.
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
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm font-semibold text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/assets/logos/righello-white.png" alt="Righello" width={120} height={30} className="h-auto w-[120px]" />
            <span className="hidden h-4 w-px bg-white/18 sm:block" />
            <span>Optima</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="https://www.wearerighello.com/" className="hover:text-white">
              wearerighello.com
            </Link>
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <span>Company operating OS</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
