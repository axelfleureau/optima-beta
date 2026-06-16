"use client"

import Link from "next/link"
import {
  Bot,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  KanbanSquare,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const staffFlows = [
  {
    title: "Inizio giornata",
    body: "Apri Rapportini, verifica entrata e cosa hai in carico. Se manca una task, creala o collegala al progetto prima di lavorarci.",
    href: "/rapportini",
    action: "Apri rapportini",
    icon: CalendarCheck,
  },
  {
    title: "Lavoro operativo",
    body: "Usa Workspace come sorgente unica: cliente, progetto, stato, priorita, checklist e deliverable devono vivere nella card.",
    href: "/workspace",
    action: "Vai al workspace",
    icon: KanbanSquare,
  },
  {
    title: "Fine giornata",
    body: "Fai checkout solo quando hai controllato ore e task. Il rapportino deve spiegare cosa e stato fatto e cosa resta bloccato.",
    href: "/rapportini",
    action: "Chiudi giornata",
    icon: ClipboardCheck,
  },
  {
    title: "Direzione e review",
    body: "Presenze, preventivi e AI Ops servono alla direzione per verificare capacita, approvare output e trasformare richieste in job revisionabili.",
    href: "/presenze",
    action: "Controlla team",
    icon: Users,
  },
]

const quickLinks = [
  { label: "Preventivi", href: "/preventivi", icon: FileText },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
]

export function StaffPremiereGuide({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-righello-cyan/20 bg-[#07121c]/92 shadow-[0_24px_90px_rgba(0,0,0,0.24)]",
        className
      )}
    >
      <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="border-b border-white/10 p-5 md:p-7 lg:border-b-0 lg:border-r">
          <div className="optima-kicker text-righello-cyan">Premiere personale</div>
          <h2 className="mt-3 max-w-xl text-2xl font-black leading-tight text-white md:text-3xl">
            Come si usa Optima in una giornata reale.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 md:text-base">
            Per domani il percorso deve essere semplice: ogni attivita parte da una task o da un progetto, il lavoro si
            consuntiva nel rapportino e la direzione controlla eccezioni, preventivi e output agentici.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-xl bg-righello-pink px-5 font-bold text-white hover:bg-righello-pink/90">
              <Link href="/rapportini">Parti da qui</Link>
            </Button>
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Button
                  key={link.href}
                  asChild
                  variant="outline"
                  className="rounded-xl border-white/14 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                >
                  <Link href={link.href} className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5">
          {staffFlows.map((flow, index) => {
            const Icon = flow.icon
            return (
              <Link
                key={flow.title}
                href={flow.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-righello-cyan/45 hover:bg-white/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-righello-cyan/25 bg-righello-cyan/10 text-righello-cyan">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-righello-pink">
                      Step {index + 1}
                    </div>
                    <h3 className="mt-1 text-base font-black text-white">{flow.title}</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/58">{flow.body}</p>
                <div className="mt-4 text-sm font-black text-righello-cyan transition group-hover:translate-x-1">
                  {flow.action}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
