"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Command,
  FileText,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type Module = {
  icon: LucideIcon
  label: string
  title: string
  body: string
  accent: string
}

type MethodStep = {
  index: string
  title: string
  body: string
}

const modules: Module[] = [
  {
    icon: BriefcaseBusiness,
    label: "Delivery",
    title: "Progetti e clienti",
    body: "Clienti, progetti, fasi, task, allegati e commenti vivono nello stesso contesto operativo.",
    accent: "#67e8f9",
  },
  {
    icon: UsersRound,
    label: "People",
    title: "Persone e capacita",
    body: "Presenze, rapportini, carico netto, segnali e responsabilita diventano dati decisionali.",
    accent: "#22c55e",
  },
  {
    icon: Bot,
    label: "AI",
    title: "Assistente operativo",
    body: "AI con memoria, cronologia, contesto clienti, task e preventivi per lavorare piu veloce.",
    accent: "#a855f7",
  },
  {
    icon: FileText,
    label: "Sales",
    title: "Preventivi",
    body: "Dalla raccolta informazioni al documento, poi milestone, budget, progetto e follow up.",
    accent: "#f59e0b",
  },
]

const method: MethodStep[] = [
  {
    index: "01",
    title: "Discovery",
    body: "Raccoglie input, vincoli, asset, referente, cliente, budget e finestre temporali.",
  },
  {
    index: "02",
    title: "Planning",
    body: "Trasforma priorita in fasi, owner, task, media, scadenze e date al piu presto/al piu tardi.",
  },
  {
    index: "03",
    title: "Execution",
    body: "Segue commenti, revisioni, allegati, assegnazioni orizzontali, ore e rapportini giornalieri.",
  },
  {
    index: "04",
    title: "Reporting",
    body: "Mostra output, margini, ritardi, carico, capacita, approcci problematici e prossime mosse.",
  },
]

const workRows = [
  ["G&M Ambiente", "Workspace cliente", "82%", "#67e8f9"],
  ["Fatin - Dev/Grafica", "5h su 7h nette", "71%", "#22c55e"],
  ["Website A180", "Preventivo in review", "64%", "#d6487e"],
  ["AI content", "3 asset generati", "90%", "#a855f7"],
]

const kanbanColumns = [
  {
    title: "To do",
    accent: "#9dbbff",
    tasks: ["Open day Tomasella", "Brief nuova dashboard", "Post energia Friuli"],
  },
  {
    title: "In corso",
    accent: "#ffcf70",
    tasks: ["Preventivo A180", "Landing Righello", "Upload media task"],
  },
  {
    title: "Validation",
    accent: "#c4b5fd",
    tasks: ["Report cliente", "Copy Instagram", "Contratto progetto"],
  },
]

const pricing = [
  {
    name: "90",
    price: "14,99",
    body: "Per partire con clienti, task, calendario e assistente AI.",
    features: ["Clienti e workspace", "Task e allegati", "AI assistant base"],
  },
  {
    name: "180",
    price: "39,99",
    body: "Per gestire delivery, preventivi e team con controllo reale.",
    features: ["Preventivi AI", "Commenti cliente", "Rapportini e presenze"],
    highlighted: true,
  },
  {
    name: "360",
    price: "79,99",
    body: "Per direzione, automazioni, segnali e ottimizzazione aziendale.",
    features: ["Controllo aziendale", "Segnali di rischio", "Automazioni avanzate"],
  },
]

function splitWords(text: string) {
  return text.split(" ").map((word, index) => (
    <span key={`${word}-${index}`} className="inline-block overflow-hidden align-top">
      <span className="hero-word inline-block will-change-transform">{word}&nbsp;</span>
    </span>
  ))
}

function SectionTitle({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string
  title: string
  body?: string
  center?: boolean
}) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6aa6]">{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-black leading-[0.9] text-white sm:text-6xl">{title}</h2>
      {body ? <p className="mt-5 text-base font-medium leading-7 text-white/62 sm:text-lg">{body}</p> : null}
    </div>
  )
}

function ChromeShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[8px] border border-white/12 bg-[#080b12] shadow-2xl shadow-black/40 ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6aa6]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#67e8f9]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/36">Optima live system</p>
      </div>
      {children}
    </div>
  )
}

function ProductCockpit() {
  return (
    <ChromeShell className="product-shell mx-auto w-full max-w-6xl overflow-hidden">
      <div className="grid min-h-[500px] gap-0 lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/[0.025] p-4 lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#d6487e] text-xl font-black">O</span>
            <div>
              <p className="text-lg font-black text-white">Optima</p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/38">by Righello</p>
            </div>
          </div>

          <div className="mt-7 space-y-2">
            {[
              ["Workspace", BriefcaseBusiness],
              ["Persone", UsersRound],
              ["Preventivi", FileText],
              ["AI assistant", Bot],
              ["Analytics", LineChart],
            ].map(([label, Icon]) => {
              const SidebarIcon = Icon as LucideIcon
              return (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 rounded-[8px] border border-white/8 bg-white/[0.035] px-3 py-3 text-sm font-bold text-white/70"
                >
                  <SidebarIcon className="h-4 w-4 text-[#67e8f9]" />
                  {label as string}
                </div>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 bg-[#0d1320]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#67e8f9]">Project operating system</p>
              <h3 className="mt-1 truncate text-2xl font-black text-white sm:text-3xl">G&M Ambiente srl</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              {[
                ["22", "task"],
                ["71%", "capacita"],
                ["1", "rischio"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[8px] border border-white/10 bg-black/24 px-3 py-2 text-center">
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="text-[11px] font-bold uppercase text-white/38">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0">
              <div className="grid gap-3 md:grid-cols-3">
                {kanbanColumns.map((column) => (
                  <div key={column.title} className="rounded-[8px] border border-white/10 bg-[#111827] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.accent }} />
                        <p className="font-black text-white">{column.title}</p>
                      </div>
                      <span className="rounded-[8px] bg-white/10 px-2 py-1 text-xs font-black text-white/54">
                        {column.tasks.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {column.tasks.map((task) => (
                        <div
                          key={task}
                          className="rounded-[8px] border border-[#0f172a]/10 bg-[#fff7c9] p-3 text-[#111827]"
                          style={{ boxShadow: `inset 0 4px 0 ${column.accent}` }}
                        >
                          <p className="text-sm font-black leading-5">{task}</p>
                          <div className="mt-4 flex items-center justify-between text-xs font-black text-[#64748b]">
                            <span>cliente</span>
                            <span>oggi</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[8px] border border-[#d6487e]/25 bg-[#d6487e]/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-[#ff8fbd]">Command bar</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-white/68">
                      "Mostrami ritardi, capacita disponibile e follow up critici."
                    </p>
                  </div>
                  <Command className="h-8 w-8 text-[#ff6aa6]" />
                </div>
              </div>

              <div className="rounded-[8px] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/44">Pulse aziendale</p>
                    <h4 className="text-xl font-black text-white">Questa settimana</h4>
                  </div>
                  <Gauge className="h-7 w-7 text-[#67e8f9]" />
                </div>
                <div className="space-y-3">
                  {workRows.map(([name, label, value, color]) => (
                    <div key={name} className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{name}</p>
                          <p className="text-xs font-semibold text-white/44">{label}</p>
                        </div>
                        <span className="text-sm font-black" style={{ color }}>
                          {value}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: value, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChromeShell>
  )
}

function ModuleCard({ module, index }: { module: Module; index: number }) {
  const Icon = module.icon
  return (
    <article
      className="module-card rounded-[8px] border border-white/10 bg-[#0b101b] p-5"
      style={{ "--accent": module.accent } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
          <Icon className="h-6 w-6" style={{ color: module.accent }} />
        </div>
        <span className="text-sm font-black text-white/28">0{index + 1}</span>
      </div>
      <p className="mt-8 text-xs font-black uppercase tracking-[0.2em]" style={{ color: module.accent }}>
        {module.label}
      </p>
      <h3 className="mt-3 text-3xl font-black leading-none text-white">{module.title}</h3>
      <p className="mt-4 text-sm font-medium leading-6 text-white/60">{module.body}</p>
    </article>
  )
}

export default function HomePage() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!rootRef.current) return

    let active = true
    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")])

      if (!active || !rootRef.current) return

      gsap.registerPlugin(ScrollTrigger)

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (reduceMotion) {
        gsap.set(".boot-screen", { display: "none" })
        gsap.set(".hero-word, .module-card, .reveal-section, .product-shell", { clearProps: "all" })
        return
      }

      const ctx = gsap.context(() => {
        gsap.set(".boot-line", { yPercent: 110 })
        gsap.set(".hero-word", { yPercent: 112, skewY: 4 })
        gsap.set(".product-shell", { y: 34, scale: 0.96, opacity: 0 })
        gsap.set(".module-card", { y: 28, opacity: 0 })

        const intro = gsap.timeline({ defaults: { ease: "power3.out" } })
        intro
          .to(".boot-line", { yPercent: 0, duration: 0.68, stagger: 0.08 })
          .to(".boot-progress", { scaleX: 1, duration: 0.95, ease: "power4.inOut" }, "<0.1")
          .to(".boot-screen", { clipPath: "inset(0 0 100% 0)", duration: 0.85, ease: "power4.inOut" }, "+=0.12")
          .to(".hero-word", { yPercent: 0, skewY: 0, duration: 0.82, stagger: 0.025 }, "-=0.18")
          .to(".product-shell", { y: 0, scale: 1, opacity: 1, duration: 0.85, ease: "power4.out" }, "<0.1")
          .to(".module-card", { y: 0, opacity: 1, duration: 0.58, stagger: 0.055 }, "-=0.35")

        gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
          gsap.from(section, {
            y: 42,
            opacity: 0,
            duration: 0.82,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              once: true,
            },
          })
        })

        ScrollTrigger.matchMedia({
          "(min-width: 900px)": () => {
            const zoom = gsap.timeline({
              scrollTrigger: {
                trigger: ".system-stage",
                start: "top top",
                end: "+=1100",
                scrub: 0.8,
                pin: true,
              },
            })

            zoom
              .to(".system-bg", { yPercent: -18, scale: 1.1, ease: "none" }, 0)
              .to(".product-shell", { scale: 1.05, y: -12, ease: "none" }, 0)
              .to(".floating-metric-a", { y: -110, x: 30, ease: "none" }, 0)
              .to(".floating-metric-b", { y: 120, x: -35, ease: "none" }, 0)
          },
        })
      }, rootRef)

      let lenis: { raf: (time: number) => void; destroy: () => void } | null = null
      let ticker: ((time: number) => void) | null = null

      if (window.innerWidth >= 900) {
        const { default: Lenis } = await import("lenis")
        if (!active || !rootRef.current) return
        const scrollController = new Lenis({ lerp: 0.08, wheelMultiplier: 0.85 })
        scrollController.on("scroll", ScrollTrigger.update)
        lenis = scrollController
        ticker = (time: number) => lenis?.raf(time * 1000)
        gsap.ticker.add(ticker)
        gsap.ticker.lagSmoothing(0)
      }

      cleanup = () => {
        ctx.revert()
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        if (ticker) gsap.ticker.remove(ticker)
        lenis?.destroy()
      }
    })()

    return () => {
      active = false
      cleanup?.()
    }
  }, [])

  return (
    <main ref={rootRef} className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="boot-screen fixed inset-0 z-[90] flex flex-col justify-between bg-[#05070b] px-5 py-5 text-white [clip-path:inset(0_0_0_0)] sm:px-8">
        <div className="grid gap-4 text-xs font-black uppercase tracking-[0.22em] text-white/46 sm:grid-cols-4">
          {["Optima / Company OS", "Righello operating layer", "Delivery / People / AI", "Status / booting"].map(
            (item) => (
              <div key={item} className="overflow-hidden">
                <p className="boot-line">{item}</p>
              </div>
            ),
          )}
        </div>
        <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border border-white/14">
          <div className="grid h-24 w-24 place-items-center rounded-[8px] bg-[#d6487e] text-5xl font-black">O</div>
        </div>
        <div>
          <div className="h-1 overflow-hidden rounded-full bg-white/12">
            <div className="boot-progress h-full origin-left scale-x-0 rounded-full bg-white" />
          </div>
          <div className="mt-4 grid gap-3 text-xs font-black uppercase tracking-[0.2em] text-white/46 sm:grid-cols-3">
            <div className="overflow-hidden">
              <p className="boot-line">Sync task graph</p>
            </div>
            <div className="overflow-hidden">
              <p className="boot-line">Read team capacity</p>
            </div>
            <div className="overflow-hidden sm:text-right">
              <p className="boot-line">Open cockpit</p>
            </div>
          </div>
        </div>
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#05070b]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Optima home">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#d6487e] text-lg font-black text-white">
              O
            </span>
            <span className="min-w-0 leading-none">
              <span className="block text-xl font-black">Optima</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">by Righello</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-white/64 md:flex">
            <Link href="#sistema" className="hover:text-white">
              Sistema
            </Link>
            <Link href="#metodo" className="hover:text-white">
              Metodo
            </Link>
            <Link href="#prezzi" className="hover:text-white">
              Piani
            </Link>
            <Link href="https://www.wearerighello.com/" className="hover:text-white">
              Righello
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="outline"
                className="hidden h-10 rounded-[8px] border-white/14 bg-white/[0.04] px-5 font-bold text-white hover:bg-white hover:text-[#05070b] sm:inline-flex"
              >
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

      <section className="system-stage relative min-h-screen overflow-hidden pt-20">
        <div className="system-bg absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,72,126,0.24),transparent_32%),radial-gradient(circle_at_18%_28%,rgba(103,232,249,0.13),transparent_28%),linear-gradient(180deg,#140712_0%,#05070b_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-[8px] border border-[#d6487e]/34 bg-[#d6487e]/12 px-3 py-2 text-sm font-black text-[#ff8fbd]">
              <Sparkles className="h-4 w-4" />
              Il sistema operativo interno di Righello
            </div>
            <h1 className="text-5xl font-black leading-[0.86] tracking-[-0.02em] text-white sm:text-7xl lg:text-8xl">
              {splitWords("Misura il lavoro. Governa l'azienda.")}
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg font-medium leading-8 text-white/68">
              Optima unisce progetti, clienti, persone, AI, preventivi e segnali operativi in un cockpit pensato per
              una tech company giovane, veloce e ossessionata dall'efficienza.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-12 w-full rounded-[8px] bg-[#d6487e] px-7 font-bold text-white hover:bg-white hover:text-[#05070b] sm:w-auto"
                >
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
          </div>

          <div className="relative mt-12">
            <div className="floating-metric-a pointer-events-none absolute left-0 top-10 z-10 hidden rounded-[8px] border border-[#22c55e]/25 bg-[#06150f]/90 p-4 shadow-2xl shadow-black/30 lg:block">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#86efac]">Capacity</p>
              <p className="mt-2 text-4xl font-black text-white">71%</p>
              <p className="mt-1 text-sm font-semibold text-white/50">netto dopo pausa</p>
            </div>
            <div className="floating-metric-b pointer-events-none absolute bottom-12 right-0 z-10 hidden rounded-[8px] border border-[#d6487e]/28 bg-[#1c0711]/90 p-4 shadow-2xl shadow-black/30 lg:block">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">Signals</p>
              <p className="mt-2 text-4xl font-black text-white">1</p>
              <p className="mt-1 text-sm font-semibold text-white/50">da presidiare</p>
            </div>
            <ProductCockpit />
          </div>
        </div>
      </section>

      <section id="sistema" className="border-y border-white/10 bg-white/[0.025] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="reveal-section">
            <SectionTitle
              eyebrow="Sistema"
              title="Non una landing marketing. Un prodotto per gestire l'azienda."
              body="Righello non e solo comunicazione: produce tecnologia, servizi, contenuti, consulenza e operazioni. Optima serve a tenere insieme tutto il lavoro reale."
            />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module, index) => (
              <ModuleCard key={module.title} module={module} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section id="metodo" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="reveal-section">
            <SectionTitle
              eyebrow="Metodo Righello"
              title="Decisioni prima, meno attrito durante, output piu chiaro dopo."
              body="Il cuore resta la gestione dei progetti, ma il vantaggio nasce dal collegare planning, persone, budget, finestre temporali e segnali di rischio."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {["al piu presto", "al piu tardi", "owner", "margine", "carico", "output"].map((item) => (
                <span
                  key={item}
                  className="rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-white/62"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {method.map((step) => (
              <article key={step.index} className="reveal-section rounded-[8px] border border-white/10 bg-[#0b101b] p-5">
                <div className="text-sm font-black text-[#ff6aa6]">{step.index}</div>
                <h3 className="mt-8 text-3xl font-black leading-none text-white">{step.title}</h3>
                <p className="mt-4 text-sm font-medium leading-6 text-white/60">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#080c15] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="reveal-section rounded-[8px] border border-white/10 bg-[#0a0e18] p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-bold text-white/46">Controllo aziendale</p>
                <h3 className="text-2xl font-black text-white">Pulse operativo</h3>
              </div>
              <Gauge className="h-8 w-8 text-[#67e8f9]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Capacita usata", "71%", "#22c55e"],
                ["Task critiche", "1", "#ff6aa6"],
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
              {workRows.map(([name, label, value, color]) => (
                <div key={name} className="rounded-[8px] border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{name}</p>
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

          <div className="reveal-section">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#67e8f9]">People operations</p>
            <h2 className="mt-4 text-4xl font-black leading-[0.9] text-white sm:text-6xl">
              Persone, tempi e responsabilita sono parte del progetto.
            </h2>
            <p className="mt-6 text-base font-medium leading-7 text-white/62">
              Il monitoraggio non deve essere burocratico: deve aiutare a vedere capacita non usata, sovraccarichi,
              ritardi, assenze, rapportini e lavori che rischiano di uscire dal controllo.
            </p>
            <div className="mt-8 space-y-3">
              {[
                ["Assegnazioni orizzontali", "Chi riceve una task da un pari la accetta prima che diventi ufficiale."],
                ["Rapportini", "Il responsabile vede cosa e stato fatto, da chi, su quale progetto e con che tempo."],
                ["Notifiche", "Cliente e agenzia ricevono mail quando commenti e follow up cambiano una task."],
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
        </div>
      </section>

      <section id="prezzi" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="reveal-section">
            <SectionTitle
              eyebrow="Piani"
              title="Semplice da provare, serio quando scala."
              body="La struttura 90, 180, 360 resta riconoscibile, ma ora racconta workflow, AI moderna e controllo operativo."
              center
            />
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricing.map((plan) => (
              <article
                key={plan.name}
                className={`reveal-section rounded-[8px] border p-5 ${
                  plan.highlighted ? "border-[#d6487e]/55 bg-[#d6487e]/12" : "border-white/10 bg-[#0b101b]"
                }`}
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
                <p className="mt-5 min-h-14 text-sm font-medium leading-6 text-white/62">{plan.body}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-black text-white">EUR {plan.price}</span>
                  <span className="pb-2 text-sm font-bold text-white/44">/mese</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-bold text-white/72">
                      <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-7 block">
                  <Button
                    className={`h-11 w-full rounded-[8px] font-bold ${
                      plan.highlighted
                        ? "bg-[#d6487e] text-white hover:bg-white hover:text-[#05070b]"
                        : "bg-white text-[#05070b] hover:bg-[#67e8f9]"
                    }`}
                  >
                    Inizia ora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="reveal-section mx-auto max-w-7xl rounded-[8px] border border-[#d6487e]/36 bg-[#d6487e]/12 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3 text-[#ff8fbd]">
                <Zap className="h-7 w-7" />
                <ShieldCheck className="h-7 w-7" />
                <Target className="h-7 w-7" />
              </div>
              <h2 className="mt-6 max-w-4xl text-4xl font-black leading-[0.9] text-white sm:text-6xl">
                Una piattaforma interna, con ambizione da prodotto vero.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/66">
                Prodotto, delivery, clienti, persone e AI nello stesso posto. Meno attrito, piu controllo, piu output.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-12 w-full rounded-[8px] bg-white px-7 font-bold text-[#05070b] hover:bg-[#67e8f9]"
                >
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
