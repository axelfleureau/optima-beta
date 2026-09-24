import type { LucideIcon } from "lucide-react"
import {
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Clapperboard,
  CreditCard,
  FileText,
  Gauge,
  Kanban,
  LayoutDashboard,
  Settings,
  Target,
  UserCheck,
  Users,
  Workflow,
} from "lucide-react"

export type AppRouteMeta = {
  label: string
  eyebrow: string
  description: string
  icon: LucideIcon
}

const routeMeta: Array<{ match: string; meta: AppRouteMeta }> = [
  {
    match: "/dashboard",
    meta: {
      label: "Panoramica",
      eyebrow: "Óptima workspace",
      description: "Priorità, capacità e prossime azioni.",
      icon: LayoutDashboard,
    },
  },
  {
    match: "/workspace",
    meta: {
      label: "Workspace",
      eyebrow: "Delivery",
      description: "Task, progetti e responsabilità in corso.",
      icon: Kanban,
    },
  },
  {
    match: "/clienti",
    meta: {
      label: "Clienti",
      eyebrow: "Relazioni",
      description: "Anagrafiche, account e valore dei clienti.",
      icon: Users,
    },
  },
  {
    match: "/campagne",
    meta: {
      label: "Campagne",
      eyebrow: "Marketing",
      description: "Pianificazione e avanzamento delle campagne.",
      icon: Target,
    },
  },
  {
    match: "/preventivi",
    meta: {
      label: "Preventivi",
      eyebrow: "Commerciale",
      description: "Proposte, revisioni e opportunità aperte.",
      icon: FileText,
    },
  },
  {
    match: "/calendario-editoriale",
    meta: {
      label: "Calendario editoriale",
      eyebrow: "Contenuti",
      description: "Produzione e pubblicazioni per ogni cliente.",
      icon: CalendarDays,
    },
  },
  {
    match: "/video",
    meta: {
      label: "Post Review",
      eyebrow: "Media review",
      description: "Video, feedback e approvazioni cliente.",
      icon: Clapperboard,
    },
  },
  {
    match: "/management",
    meta: {
      label: "Controllo aziendale",
      eyebrow: "Direzione",
      description: "Carico, marginalità e segnali operativi.",
      icon: Gauge,
    },
  },
  {
    match: "/presenze",
    meta: {
      label: "Presenze",
      eyebrow: "Persone",
      description: "Ingresso, uscita e anomalie del team.",
      icon: UserCheck,
    },
  },
  {
    match: "/calendario-team",
    meta: {
      label: "Calendario team",
      eyebrow: "Persone",
      description: "Disponibilità, scadenze e appuntamenti.",
      icon: CalendarClock,
    },
  },
  {
    match: "/team",
    meta: {
      label: "Team",
      eyebrow: "Organizzazione",
      description: "Ruoli, accessi e carico delle persone.",
      icon: BriefcaseBusiness,
    },
  },
  {
    match: "/ai-assistant",
    meta: {
      label: "AI Assistant",
      eyebrow: "Intelligence",
      description: "Domande e azioni sul contesto operativo.",
      icon: Bot,
    },
  },
  {
    match: "/agenti",
    meta: {
      label: "AI Ops",
      eyebrow: "Automazioni",
      description: "Agenti, esecuzioni e stato dei flussi.",
      icon: Workflow,
    },
  },
  {
    match: "/crediti",
    meta: {
      label: "Crediti clienti",
      eyebrow: "Amministrazione",
      description: "Plafond, consumi e disponibilità.",
      icon: CreditCard,
    },
  },
  {
    match: "/settings",
    meta: {
      label: "Impostazioni",
      eyebrow: "Amministrazione",
      description: "Configurazione, integrazioni e sicurezza.",
      icon: Settings,
    },
  },
]

const fallbackMeta: AppRouteMeta = {
  label: "Óptima",
  eyebrow: "Workspace operativo",
  description: "Tutto il lavoro dell'agenzia, in un solo posto.",
  icon: LayoutDashboard,
}

export function getAppRouteMeta(pathname: string): AppRouteMeta {
  const exact = routeMeta.find(({ match }) => pathname === match)
  if (exact) return exact.meta

  return (
    routeMeta
      .filter(({ match }) => pathname.startsWith(`${match}/`))
      .sort((a, b) => b.match.length - a.match.length)[0]?.meta || fallbackMeta
  )
}
