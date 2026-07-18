"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clapperboard,
  Command,
  FileText,
  Gauge,
  LineChart,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { RighelloIcon } from "@/components/brand/righello-icon"

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
    label: "Progetti",
    title: "Clienti, progetti e task",
    body: "Ogni cliente ha il suo spazio: progetti, fasi, task, allegati, commenti e responsabili in un'unica regia.",
    accent: "#67e8f9",
  },
  {
    icon: Clapperboard,
    label: "Contenuti",
    title: "Contenuti e video",
    body: "Calendario editoriale, tracker dei contenuti per cliente e review video con approvazione del cliente al secondo esatto.",
    accent: "#d6487e",
  },
  {
    icon: UsersRound,
    label: "Team",
    title: "Persone e tempi",
    body: "Presenze, rapportini, ore e carico del team: sai chi sta lavorando a cosa e quanta capacità resta.",
    accent: "#22c55e",
  },
  {
    icon: FileText,
    label: "Preventivi",
    title: "Preventivi e ricavi",
    body: "Dal preventivo al progetto: proposta, budget, milestone e follow-up collegati, senza reinserire i dati.",
    accent: "#f59e0b",
  },
]

const method: MethodStep[] = [
  {
    index: "01",
    title: "Brief",
    body: "Cliente, referente, budget e scadenze in un punto solo: il progetto parte con tutto il contesto.",
  },
  {
    index: "02",
    title: "Pianificazione",
    body: "Fasi, task, responsabili e finestre temporali su una timeline chiara, dal più presto al più tardi.",
  },
  {
    index: "03",
    title: "Esecuzione",
    body: "Commenti, revisioni, allegati, ore e rapportini giornalieri: ogni passaggio resta tracciato.",
  },
  {
    index: "04",
    title: "Report",
    body: "Margini, ritardi, carico e capacità sempre leggibili, per decidere prima che sia tardi.",
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
    body: "Clienti, task, calendario e assistente AI per iniziare a lavorare ordinati.",
    features: ["Clienti e workspace", "Task e allegati", "Assistente AI"],
  },
  {
    name: "180",
    price: "39,99",
    body: "Delivery, preventivi, contenuti e team con ore e rapportini.",
    features: ["Preventivi e commenti cliente", "Calendario e video review", "Rapportini e presenze"],
    highlighted: true,
  },
  {
    name: "360",
    price: "79,99",
    body: "Controllo su margini, carico e segnali di rischio per chi dirige.",
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

/** Numero che conta da 0 quando entra nel viewport (fallback: valore finale). */
function CountNumber({ value, className = "" }: { value: string; className?: string }) {
  const match = value.match(/^([\d.,]+)(.*)$/)
  const to = match ? match[1].replace(",", ".") : "0"
  const suffix = match ? match[2] : value
  return (
    <span className={`js-count ${className}`} data-to={to} data-suffix={suffix}>
      {value}
    </span>
  )
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
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff6aa6]">{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-bold leading-[0.98] text-white sm:text-6xl">{title}</h2>
      {body ? <p className="mt-5 text-base font-medium leading-8 text-white/66 sm:text-lg">{body}</p> : null}
    </div>
  )
}

/** Cornici d'angolo: richiama il "righello" / l'inquadratura del brand Righello. */
function FrameCorners() {
  const base = "frame-corner pointer-events-none absolute h-7 w-7 border-[#67e8f9]/55"
  return (
    <>
      <span className={`${base} -left-2.5 -top-2.5 border-l-2 border-t-2`} />
      <span className={`${base} -right-2.5 -top-2.5 border-r-2 border-t-2`} />
      <span className={`${base} -bottom-2.5 -left-2.5 border-b-2 border-l-2`} />
      <span className={`${base} -bottom-2.5 -right-2.5 border-b-2 border-r-2`} />
    </>
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
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/36">Óptima · anteprima</p>
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
            <RighelloIcon className="h-11 w-11" imageClassName="h-6 w-6" />
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
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#67e8f9]">Workspace cliente</p>
              <h3 className="mt-1 truncate text-2xl font-bold text-white sm:text-3xl">G&amp;M Ambiente srl</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              {[
                ["22", "task"],
                ["71%", "capacità"],
                ["1", "rischio"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[8px] border border-white/10 bg-black/24 px-3 py-2 text-center">
                  <p className="text-lg font-black text-white">
                    <CountNumber value={value} />
                  </p>
                  <p className="text-xs font-bold uppercase text-white/38">{label}</p>
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
                    <p className="text-sm font-bold text-[#ff8fbd]">Command bar</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-white/68">
                      "Mostrami ritardi, capacità disponibile e follow-up critici."
                    </p>
                  </div>
                  <Command className="h-8 w-8 text-[#ff6aa6]" />
                </div>
              </div>

              <div className="rounded-[8px] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/44">Andamento</p>
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
                        <div className="bar-fill h-full rounded-full" style={{ width: value, backgroundColor: color }} />
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
      <h3 className="mt-3 text-3xl font-bold leading-tight text-white">{module.title}</h3>
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

      const root = rootRef.current
      const pointerCleanups: Array<() => void> = []

      // Conta i numeri da 0 quando entrano (usato anche in reduced-motion, ma lì istantaneo).
      const runCounters = (instant = false) => {
        gsap.utils.toArray<HTMLElement>(".js-count").forEach((el) => {
          const to = parseFloat(el.dataset.to || "0")
          const suffix = el.dataset.suffix || ""
          if (instant) {
            el.textContent = `${Math.round(to)}${suffix}`
            return
          }
          ScrollTrigger.create({
            trigger: el,
            start: "top 92%",
            once: true,
            onEnter: () => {
              const obj = { v: 0 }
              gsap.to(obj, {
                v: to,
                duration: 1.25,
                ease: "power2.out",
                onUpdate: () => {
                  el.textContent = `${Math.round(obj.v)}${suffix}`
                },
              })
            },
          })
        })
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (reduceMotion) {
        gsap.set(".boot-screen", { display: "none" })
        gsap.set(".hero-word, .module-card, .reveal-section, .product-shell", { clearProps: "all" })
        runCounters(true)
        return
      }

      const ctx = gsap.context(() => {
        gsap.set(".boot-line", { yPercent: 110 })
        gsap.set(".hero-word", { yPercent: 118, skewY: 5, opacity: 0 })
        gsap.set(".product-shell", { y: 40, scale: 0.94, opacity: 0 })
        gsap.set(".module-card", { y: 44, opacity: 0, rotateX: 16, transformOrigin: "center top" })

        // --- Intro cinematografico ---
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } })
        intro
          .to(".boot-line", { yPercent: 0, duration: 0.72, stagger: 0.06 })
          .to(".boot-progress", { scaleX: 1, duration: 1.0, ease: "power4.inOut" }, "<0.1")
          .to(".boot-screen", { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "power4.inOut" }, "+=0.15")
          .to(".hero-word", { yPercent: 0, skewY: 0, opacity: 1, duration: 0.95, stagger: 0.028 }, "-=0.28")
          .to(".product-shell", { y: 0, scale: 1, opacity: 1, duration: 1.0, ease: "power4.out" }, "<0.15")
          .from(
            ".floating-metric-a, .floating-metric-b",
            { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 },
            "-=0.5",
          )
          .from(
            ".frame-corner",
            { opacity: 0, scale: 0.5, transformOrigin: "center", duration: 0.5, stagger: 0.05 },
            "-=0.45",
          )

        // --- Reveal delle sezioni ---
        gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
          gsap.from(section, {
            y: 46,
            opacity: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 84%", once: true },
          })
        })

        // --- Module card: entrata 3D in stagger ---
        ScrollTrigger.batch(".module-card", {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              rotateX: 0,
              duration: 0.85,
              stagger: 0.09,
              ease: "power3.out",
              overwrite: true,
            }),
        })

        // --- Numeri che contano + barre che crescono ---
        runCounters(false)
        gsap.utils.toArray<HTMLElement>(".bar-fill").forEach((el) => {
          gsap.from(el, {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
          })
        })

        // --- Barra di avanzamento scroll in cima ---
        gsap.to(".scroll-progress", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 },
        })

        // --- Zoom cinematografico pinnato (desktop) ---
        ScrollTrigger.matchMedia({
          "(min-width: 900px)": () => {
            const zoom = gsap.timeline({
              scrollTrigger: { trigger: ".system-stage", start: "top top", end: "+=1100", scrub: 0.8, pin: true },
            })
            zoom
              .to(".system-bg", { yPercent: -18, scale: 1.12, ease: "none" }, 0)
              .to(".product-shell", { scale: 1.06, y: -14, ease: "none" }, 0)
              .to(".hero-glow", { scale: 1.4, opacity: 0.3, ease: "none" }, 0)
              .to(".floating-metric-a", { y: -120, x: 34, ease: "none" }, 0)
              .to(".floating-metric-b", { y: 130, x: -38, ease: "none" }, 0)
          },
        })
      }, rootRef)

      // --- Interazioni al puntatore (solo desktop con mouse) ---
      const finePointer = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches
      if (finePointer) {
        const cockpit = root.querySelector<HTMLElement>(".cockpit-3d")
        const glow = root.querySelector<HTMLElement>(".hero-glow")
        const rotX = cockpit ? gsap.quickTo(cockpit, "rotationX", { duration: 0.7, ease: "power3" }) : null
        const rotY = cockpit ? gsap.quickTo(cockpit, "rotationY", { duration: 0.7, ease: "power3" }) : null
        const glowX = glow ? gsap.quickTo(glow, "xPercent", { duration: 1.1, ease: "power3" }) : null
        const glowY = glow ? gsap.quickTo(glow, "yPercent", { duration: 1.1, ease: "power3" }) : null

        const onMove = (event: PointerEvent) => {
          const nx = event.clientX / window.innerWidth - 0.5
          const ny = event.clientY / window.innerHeight - 0.5
          rotY?.(nx * 6)
          rotX?.(-ny * 6)
          glowX?.(nx * 40)
          glowY?.(ny * 30)
        }
        window.addEventListener("pointermove", onMove)
        pointerCleanups.push(() => window.removeEventListener("pointermove", onMove))

        // Pulsanti magnetici
        root.querySelectorAll<HTMLElement>(".magnetic").forEach((btn) => {
          const qx = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" })
          const qy = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" })
          const move = (event: PointerEvent) => {
            const rect = btn.getBoundingClientRect()
            qx((event.clientX - (rect.left + rect.width / 2)) * 0.3)
            qy((event.clientY - (rect.top + rect.height / 2)) * 0.4)
          }
          const leave = () => {
            qx(0)
            qy(0)
          }
          btn.addEventListener("pointermove", move)
          btn.addEventListener("pointerleave", leave)
          pointerCleanups.push(() => {
            btn.removeEventListener("pointermove", move)
            btn.removeEventListener("pointerleave", leave)
          })
        })

        // Tilt 3D sulle module card
        root.querySelectorAll<HTMLElement>(".module-card").forEach((card) => {
          const qrx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3" })
          const qry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3" })
          const move = (event: PointerEvent) => {
            const rect = card.getBoundingClientRect()
            const px = (event.clientX - rect.left) / rect.width - 0.5
            const py = (event.clientY - rect.top) / rect.height - 0.5
            qry(px * 9)
            qrx(-py * 9)
          }
          const leave = () => {
            qrx(0)
            qry(0)
          }
          card.addEventListener("pointermove", move)
          card.addEventListener("pointerleave", leave)
          pointerCleanups.push(() => {
            card.removeEventListener("pointermove", move)
            card.removeEventListener("pointerleave", leave)
          })
        })
      }

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
        pointerCleanups.forEach((fn) => fn())
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
    <main ref={rootRef} className="font-degular min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="boot-screen fixed inset-0 z-[90] flex flex-col justify-between bg-[#05070b] px-5 py-5 text-white [clip-path:inset(0_0_0_0)] sm:px-8">
        <div className="grid gap-4 text-xs font-black uppercase tracking-[0.22em] text-white/46 sm:grid-cols-4">
          {["Óptima", "by Righello", "Clienti · Progetti · Contenuti", "Caricamento…"].map(
            (item) => (
              <div key={item} className="overflow-hidden">
                <p className="boot-line">{item}</p>
              </div>
            ),
          )}
        </div>
        <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border border-white/14">
          <RighelloIcon className="h-24 w-24" imageClassName="h-14 w-14" />
        </div>
        <div>
          <div className="h-1 overflow-hidden rounded-full bg-white/12">
            <div className="boot-progress h-full origin-left scale-x-0 rounded-full bg-white" />
          </div>
          <div className="mt-4 grid gap-3 text-xs font-black uppercase tracking-[0.2em] text-white/46 sm:grid-cols-3">
            <div className="overflow-hidden">
              <p className="boot-line">Carico clienti e progetti</p>
            </div>
            <div className="overflow-hidden">
              <p className="boot-line">Carico team e presenze</p>
            </div>
            <div className="overflow-hidden sm:text-right">
              <p className="boot-line">Apro il gestionale</p>
            </div>
          </div>
        </div>
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#05070b]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Optima home">
            <RighelloIcon className="h-10 w-10" imageClassName="h-5 w-5" priority />
            <span className="min-w-0 leading-none">
              <span className="block text-xl font-black">Optima</span>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-white/42">by Righello</span>
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
                className="hidden h-10 rounded-full border-white/14 bg-white/[0.04] px-5 font-bold text-white hover:bg-white hover:text-[#05070b] sm:inline-flex"
              >
                Accedi
              </Button>
            </Link>
            <Link href="/register">
              <Button className="magnetic h-10 rounded-full bg-[#d6487e] px-5 font-bold text-white hover:bg-white hover:text-[#05070b]">
                Entra
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="scroll-progress fixed inset-x-0 top-0 z-[100] h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[#d6487e] via-[#ff6aa6] to-[#67e8f9]" />

      <section className="system-stage relative min-h-screen overflow-hidden pt-20">
        <div className="system-bg absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,72,126,0.24),transparent_32%),radial-gradient(circle_at_18%_28%,rgba(103,232,249,0.13),transparent_28%),linear-gradient(180deg,#140712_0%,#05070b_62%)]" />
        <div className="hero-glow pointer-events-none absolute left-1/2 top-[28%] -z-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,72,126,0.28),transparent_68%)] opacity-70 blur-[40px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d6487e]/34 bg-[#d6487e]/12 px-4 py-2 text-sm font-bold text-[#ff8fbd]">
              <Sparkles className="h-4 w-4" />
              Il gestionale AI per agenzie e studi creativi
            </div>
            <h1 className="text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
              {splitWords("Tutto il lavoro dell'agenzia")}
              <span className="bg-[linear-gradient(135deg,#d6487e_0%,#06b6d4_100%)] bg-clip-text text-transparent">
                {splitWords("in un solo posto.")}
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg font-medium leading-8 text-white/72">
              Clienti, progetti, contenuti, preventivi e team in un unico gestionale, con un assistente AI che conosce
              il tuo lavoro. Nato dentro un'agenzia che costruisce software, contenuti e campagne — per chi gestisce
              clienti e consegne ogni giorno.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="magnetic h-12 w-full rounded-full bg-[#d6487e] px-7 font-bold text-white hover:bg-white hover:text-[#05070b] sm:w-auto"
                >
                  Entra in piattaforma
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="magnetic h-12 w-full rounded-full border-white/18 bg-white/[0.06] px-7 font-bold text-white hover:bg-white hover:text-[#05070b] sm:w-auto"
                >
                  Accedi
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mt-12">
            <div className="floating-metric-a pointer-events-none absolute left-0 top-10 z-10 hidden rounded-[8px] border border-[#22c55e]/25 bg-[#06150f]/90 p-4 shadow-2xl shadow-black/30 lg:block">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#86efac]">Capacity</p>
              <p className="mt-2 text-4xl font-black text-white">
                <CountNumber value="71%" />
              </p>
              <p className="mt-1 text-sm font-semibold text-white/50">netto dopo pausa</p>
            </div>
            <div className="floating-metric-b pointer-events-none absolute bottom-12 right-0 z-10 hidden rounded-[8px] border border-[#d6487e]/28 bg-[#1c0711]/90 p-4 shadow-2xl shadow-black/30 lg:block">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">Signals</p>
              <p className="mt-2 text-4xl font-black text-white">
                <CountNumber value="1" />
              </p>
              <p className="mt-1 text-sm font-semibold text-white/50">da presidiare</p>
            </div>
            <div className="hero-cockpit relative" style={{ perspective: "1600px" }}>
              <div className="cockpit-3d [transform-style:preserve-3d]">
                <ProductCockpit />
              </div>
              <FrameCorners />
            </div>
          </div>
        </div>
      </section>

      <section id="sistema" className="border-y border-white/10 bg-white/[0.025] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="reveal-section">
            <SectionTitle
              eyebrow="Il sistema"
              title="Un solo posto per clienti, contenuti, team e numeri."
              body="Óptima nasce dentro un'agenzia che costruisce software, contenuti e campagne: per questo gestisce il lavoro reale — non slide di funzioni, ma clienti, consegne, ore e margini — senza saltare tra dieci strumenti diversi."
            />
          </div>

          <div
            className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            style={{ perspective: "1200px" }}
          >
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
              eyebrow="Come si lavora"
              title="Dal brief alla consegna, ogni passaggio lascia traccia."
              body="Progetti al centro, con planning, persone, budget, scadenze e segnali di rischio in un'unica lettura. Niente file sparsi: cosa è stato fatto, da chi e con quanto tempo è sempre sotto mano."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {["al più presto", "al più tardi", "owner", "margine", "carico", "output"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/62"
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
                <h3 className="mt-8 text-3xl font-bold leading-tight text-white">{step.title}</h3>
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
                <h3 className="text-2xl font-black text-white">I numeri della settimana</h3>
              </div>
              <Gauge className="h-8 w-8 text-[#67e8f9]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Capacità usata", "71%", "#22c55e"],
                ["Task critiche", "1", "#ff6aa6"],
                ["Output chiusi", "18", "#67e8f9"],
                ["Margine stimato", "38%", "#f59e0b"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-4xl font-black" style={{ color }}>
                    <CountNumber value={value} />
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
                    <div className="bar-fill h-full rounded-[8px]" style={{ width: value, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal-section">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#67e8f9]">Team e tempi</p>
            <h2 className="mt-4 text-4xl font-bold leading-[0.98] text-white sm:text-6xl">
              Sai chi sta lavorando a cosa, e quanta capacità resta.
            </h2>
            <p className="mt-6 text-base font-medium leading-8 text-white/66">
              Presenze, rapportini, ore e carico del team diventano numeri leggibili: capacità disponibile,
              sovraccarichi e ritardi si vedono prima che diventino un problema, non dopo.
            </p>
            <div className="mt-8 space-y-3">
              {[
                ["Assegnazioni orizzontali", "Chi riceve una task da un pari la accetta prima che diventi ufficiale."],
                ["Rapportini", "Il responsabile vede cosa è stato fatto, da chi, su quale progetto e con quale tempo."],
                ["Notifiche operative", "Cliente e agenzia ricevono aggiornamenti quando commenti e follow-up cambiano una task."],
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
              title="Un piano per ogni fase dello studio."
              body="Da chi gestisce i primi clienti a chi guida un team con occhio su ore e margini. Stessa piattaforma, funzioni che crescono con te: 90 per partire, 180 per gestire delivery e team, 360 per la direzione."
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
                    className={`magnetic h-11 w-full rounded-full font-bold ${
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
                <BriefcaseBusiness className="h-7 w-7" />
                <Clapperboard className="h-7 w-7" />
                <Gauge className="h-7 w-7" />
              </div>
              <h2 className="mt-6 max-w-4xl text-4xl font-bold leading-[0.98] text-white sm:text-6xl">
                Meno strumenti sparsi, più lavoro sotto controllo.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/70">
                Clienti, progetti, contenuti, persone e AI nello stesso posto: il team esegue senza rincorrere i file,
                la direzione vede ore, margini e ritardi in tempo reale.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/register">
                <Button
                  size="lg"
                  className="magnetic h-12 w-full rounded-full bg-white px-7 font-bold text-[#05070b] hover:bg-[#67e8f9]"
                >
                  Entra in piattaforma
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="magnetic h-12 w-full rounded-full border-white/20 bg-transparent px-7 font-bold text-white hover:bg-white hover:text-[#05070b]"
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
            <span>Gestionale AI per agenzie e studi</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
