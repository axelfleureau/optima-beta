"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Command,
  Compass,
  Eye,
  ListChecks,
  MessageSquareText,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

import { RighelloIcon } from "@/components/brand/righello-icon"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"
import { useAuth } from "@/lib/auth-context"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { cn } from "@/lib/utils"

type GuideRole = "all" | "leadership" | "junior"

type GuideAction = {
  label: string
  description?: string
  href?: string
  prompt?: string
}

type PageGuide = {
  id: string
  path: string
  allowSubpaths?: boolean
  title: string
  eyebrow: string
  summary: string
  role?: GuideRole
  steps: Array<{
    title: string
    body: string
  }>
  actions: GuideAction[]
}

const STORAGE_PREFIX = "optima-page-guide:v1"

const PAGE_GUIDES: PageGuide[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    eyebrow: "Cockpit operativo",
    title: "Qui leggi lo stato generale di Optima.",
    summary:
      "La dashboard serve a capire cosa richiede attenzione prima di entrare nei dettagli: task aperte, clienti, AI e prossime azioni.",
    steps: [
      {
        title: "Parti dai segnali",
        body: "Guarda task aperte, alert e attività recenti: sono gli indicatori rapidi per decidere dove intervenire.",
      },
      {
        title: "Usa la command bar",
        body: "Quando vuoi creare, cercare o pianificare qualcosa, scrivi il comando in linguaggio naturale invece di navigare a mano.",
      },
      {
        title: "Scendi nel modulo giusto",
        body: "Se il segnale riguarda persone vai su Controllo Aziendale o Presenze; se riguarda delivery vai su Workspace.",
      },
    ],
    actions: [
      { label: "Analizza progetti", prompt: "Analizza lo stato dei progetti e indicami cosa va presidiato oggi" },
      { label: "Apri workspace", href: "/workspace" },
    ],
  },
  {
    id: "workspace",
    path: "/workspace",
    eyebrow: "Delivery clienti",
    title: "Qui governi task, clienti e stato lavori.",
    summary:
      "Il workspace è il cuore operativo: selezioni un cliente, guardi le colonne kanban e muovi il lavoro fino alla chiusura.",
    steps: [
      {
        title: "Scegli il cliente",
        body: "La sidebar clienti filtra il contesto. Ogni task deve vivere dentro un cliente o progetto interno coerente.",
      },
      {
        title: "Leggi le colonne",
        body: "To Do, urgenze, in corso e validazione devono raccontare cosa è fermo, cosa è critico e cosa è pronto.",
      },
      {
        title: "Chiudi senza doppio lavoro",
        body: "Quando una card va in Done, Optima può usarla anche nei rapportini. Aggiungi extra solo quando serve dettaglio ulteriore.",
      },
    ],
    actions: [
      { label: "Crea task", prompt: "Crea una task operativa nel workspace" },
      { label: "Cerca task critiche", prompt: "Mostrami le task urgenti o in ritardo" },
    ],
  },
  {
    id: "management",
    path: "/management",
    eyebrow: "Controllo aziendale",
    title: "Qui guardi capacità, finestre temporali e rischi.",
    summary:
      "Questa pagina aiuta la direzione a capire se il carico è sostenibile, quali progetti slittano e dove inserire lavoro al più presto o al più tardi.",
    role: "leadership",
    steps: [
      {
        title: "Controlla il carico",
        body: "Il monitoraggio personale mostra ore, task e segnali anomali. Serve a vedere colli di bottiglia e capacità reale.",
      },
      {
        title: "Guarda le finestre",
        body: "La sezione progetti mette insieme scadenze, ritardi e avanzamento per capire cosa va anticipato o protetto.",
      },
      {
        title: "Trasforma segnali in azioni",
        body: "Se vedi sovraccarico o ritardi, passa subito a workspace, presenze o rapportini per correggere il flusso.",
      },
    ],
    actions: [
      { label: "Spiega segnali", prompt: "Spiegami i segnali di controllo aziendale e indicami le priorità" },
      { label: "Apri presenze", href: "/presenze" },
    ],
  },
  {
    id: "presenze",
    path: "/presenze",
    eyebrow: "Operatività persone",
    title: "Qui vedi chi è operativo e come si muove il mese.",
    summary:
      "Presenze serve a capire disponibilità, assenze, anomalie orarie e concentrazione operativa del team.",
    steps: [
      {
        title: "Leggi la giornata",
        body: "Le schede persona mostrano stato, ingresso, uscita e copertura. Per la direzione la presenza è default operativo.",
      },
      {
        title: "Usa il mese operativo",
        body: "La heatmap mensile aiuta a vedere assenze e giornate ad alta intensità senza aprire ogni dettaglio.",
      },
      {
        title: "Decidi inseribilità",
        body: "La vista deve aiutare a capire se una persona può prendere lavoro adesso, nelle prossime ore o più avanti.",
      },
    ],
    actions: [
      { label: "Analizza copertura", prompt: "Analizza presenze e capacità del team per oggi" },
      { label: "Apri calendario team", href: "/calendario-team" },
    ],
  },
  {
    id: "rapportini",
    path: "/rapportini",
    eyebrow: "Consuntivazione",
    title: "Qui trasformi lavoro svolto in report giornaliero.",
    summary:
      "I rapportini servono a rendere tracciabile cosa è stato fatto, quanto tempo ha richiesto e quali note operative restano aperte.",
    steps: [
      {
        title: "Parti dalle task completate",
        body: "Le card chiuse nel workspace dovrebbero essere proposte automaticamente, così non devi reinserire lavoro già tracciato.",
      },
      {
        title: "Aggiungi solo extra",
        body: "Usa l'aggiunta manuale per chiamate, blocchi, materiali mancanti o attività non nate come task.",
      },
      {
        title: "Chiudi con note utili",
        body: "Le note di fine giornata devono aiutare direzione e team a capire blocchi, dipendenze e prossima azione.",
      },
    ],
    actions: [
      { label: "Compila rapportino", prompt: "Aiutami a preparare il rapportino di oggi dalle task completate" },
      { label: "Apri workspace", href: "/workspace" },
    ],
  },
  {
    id: "team",
    path: "/team",
    eyebrow: "Persone e permessi",
    title: "Qui gestisci membri, ruoli e inviti.",
    summary:
      "La pagina team separa record dipendente, invito e ruolo operativo. Puoi creare un profilo oggi e invitare la persona più avanti.",
    role: "leadership",
    steps: [
      {
        title: "Distingui record e accesso",
        body: "Un dipendente può esistere in Optima anche senza account attivo. L'invito email abilita l'accesso quando serve.",
      },
      {
        title: "Controlla ruolo",
        body: "Admin e direzione vedono funzioni sensibili; junior deve vedere solo ciò che serve per lavorare.",
      },
      {
        title: "Verifica ultimo accesso",
        body: "Ultimo accesso e stato invito servono a capire se una persona è davvero agganciata al workspace Righello.",
      },
    ],
    actions: [
      { label: "Aggiungi membro", prompt: "Aggiungi un nuovo membro del team" },
      { label: "Controlla inviti", prompt: "Mostrami membri da invitare o inviti in sospeso" },
    ],
  },
  {
    id: "preventivi",
    path: "/preventivi",
    allowSubpaths: true,
    eyebrow: "Commerciale",
    title: "Qui costruisci e controlli i preventivi.",
    summary:
      "Preventivi deve aiutarti a passare da richiesta cliente a proposta ordinata, coerente nei prezzi e pronta da inviare.",
    role: "leadership",
    steps: [
      {
        title: "Raccogli bene il contesto",
        body: "Cliente, obiettivo, deliverable e urgenza sono più importanti della grafica: senza questi dati la proposta è debole.",
      },
      {
        title: "Usa l'AI sui testi",
        body: "L'AI deve migliorare chiarezza e storytelling, non inventare prezzi o condizioni commerciali.",
      },
      {
        title: "Segui stato e pagamenti",
        body: "Quote, milestone e approvazioni devono restare tracciabili per evitare dispersione tra chat, email e task.",
      },
    ],
    actions: [
      { label: "Genera preventivo", prompt: "Aiutami a creare un preventivo per un cliente interno alla piattaforma" },
      { label: "Analizza preventivi", prompt: "Mostrami preventivi aperti e prossime azioni" },
    ],
  },
  {
    id: "calendario-team",
    path: "/calendario-team",
    eyebrow: "Agenda operativa",
    title: "Qui pianifichi shooting, call e impegni del team.",
    summary:
      "Questo calendario è separato dal calendario editoriale: riguarda persone, appuntamenti, shooting e disponibilità operative.",
    steps: [
      {
        title: "Scegli il periodo",
        body: "Usa mese, settimana o giorno per passare da pianificazione generale a verifica operativa puntuale.",
      },
      {
        title: "Distingui visibilità",
        body: "Direzione e admin possono vedere il team; junior deve vedere il proprio calendario e gli eventi che lo coinvolgono.",
      },
      {
        title: "Sincronizza feed",
        body: "Il feed ICS serve a portare gli eventi su telefono o calendari esterni quando la sincronizzazione è configurata.",
      },
    ],
    actions: [
      { label: "Crea evento", prompt: "Crea un evento nel calendario team" },
      { label: "Apri presenze", href: "/presenze" },
    ],
  },
  {
    id: "calendario-editoriale",
    path: "/calendario-editoriale",
    eyebrow: "Piano contenuti",
    title: "Qui governi post, rubriche e pubblicazioni.",
    summary:
      "Il calendario editoriale serve a pianificare contenuti e canali, non appuntamenti interni. Deve restare simile a un planner social operativo.",
    steps: [
      {
        title: "Leggi il calendario",
        body: "Giorni, orari e piattaforme devono mostrare subito cosa è pianificato, cosa manca e cosa è pronto.",
      },
      {
        title: "Usa lista e libreria",
        body: "La lista aiuta a ritrovare post specifici; la libreria deve raccogliere asset e bozze riutilizzabili.",
      },
      {
        title: "Crea con contesto",
        body: "Quando crei un post, collega cliente, canale, formato, copy e media. Così il contenuto resta tracciabile.",
      },
    ],
    actions: [
      { label: "Crea post", prompt: "Crea un post social per un cliente" },
      { label: "Pianifica settimana", prompt: "Pianifica contenuti editoriali per questa settimana" },
    ],
  },
  {
    id: "clienti",
    path: "/clienti",
    eyebrow: "Portfolio clienti",
    title: "Qui tieni ordinati clienti, prospect e valore operativo.",
    summary:
      "La pagina clienti deve dire chi è attivo, dove ci sono task aperte e quali relazioni richiedono follow-up.",
    role: "leadership",
    steps: [
      {
        title: "Guarda stato e attività",
        body: "Un cliente con molte task o nessun follow-up va letto diversamente: il dato operativo conta più dell'anagrafica.",
      },
      {
        title: "Collega progetti",
        body: "Ogni progetto o prodotto interno deve essere classificato correttamente per non sporcare la vista clienti.",
      },
      {
        title: "Usa workspace per agire",
        body: "La scheda cliente serve a orientarsi; l'esecuzione vera passa dal workspace e dai preventivi.",
      },
    ],
    actions: [
      { label: "Cerca cliente", prompt: "Cerca un cliente e mostrami lo stato operativo" },
      { label: "Apri workspace", href: "/workspace" },
    ],
  },
  {
    id: "ai-assistant",
    path: "/ai-assistant",
    eyebrow: "Assistente operativo",
    title: "Qui chiedi analisi e supporto su dati e lavoro.",
    summary:
      "L'assistente AI deve aiutarti a ragionare su progetti, persone, preventivi e contenuti usando il contesto della piattaforma.",
    steps: [
      {
        title: "Chiedi con contesto",
        body: "Le richieste migliori indicano cliente, obiettivo e tipo di risposta attesa. Così l'assistente evita risposte generiche.",
      },
      {
        title: "Usa memoria e cronologia",
        body: "Le conversazioni devono restare recuperabili: se stai lavorando su un cliente, crea sessioni coerenti.",
      },
      {
        title: "Distingui analisi e azione",
        body: "Per eseguire comandi rapidi usa command bar; per ragionare e produrre contenuti usa chat assistant.",
      },
    ],
    actions: [
      { label: "Apri command bar", prompt: "Cosa posso fare adesso in questa pagina?" },
      { label: "Analizza workspace", prompt: "Analizza workspace, persone e priorità operative" },
    ],
  },
]

function normalizePath(pathname: string) {
  if (pathname.startsWith("/dashboard/ai-assistant")) return "/ai-assistant"
  return pathname
}

function getPageGuide(pathname: string) {
  const normalized = normalizePath(pathname)
  return PAGE_GUIDES.find((guide) => normalized === guide.path || (guide.allowSubpaths && normalized.startsWith(`${guide.path}/`)))
}

function isLeadershipRole(role?: string | null) {
  return role === "admin" || role === "super-admin" || role === "direzione"
}

function guideVisibleForRole(guide: PageGuide, role?: string | null) {
  if (!guide.role || guide.role === "all") return true
  if (guide.role === "leadership") return isLeadershipRole(role)
  if (guide.role === "junior") return !isLeadershipRole(role)
  return true
}

function storageKey(guideId: string) {
  return `${STORAGE_PREFIX}:${guideId}`
}

function hasSeenGuide(guideId: string) {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(storageKey(guideId)) === "seen"
}

function markGuideSeen(guideId: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey(guideId), "seen")
}

function resetGuideSeen(guideId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(storageKey(guideId))
}

export function AiPageGuide() {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const reduceMotion = useReducedMotion()
  const { userData } = useAuth()
  const { open: openCommandBar, setInput } = useCommandBarStore()

  const guide = useMemo(() => getPageGuide(pathname), [pathname])
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const canShowGuide = guide ? guideVisibleForRole(guide, userData?.role) : false
  const visibleGuide = canShowGuide ? guide : undefined

  useEffect(() => {
    setCurrentStep(0)

    if (!visibleGuide) return
    if (hasSeenGuide(visibleGuide.id)) return

    const timeout = window.setTimeout(() => setOpen(true), 800)
    return () => window.clearTimeout(timeout)
  }, [visibleGuide?.id])

  if (!visibleGuide) return null

  const activeGuide = visibleGuide
  const stepCount = activeGuide.steps.length
  const step = activeGuide.steps[currentStep]
  const progress = ((currentStep + 1) / stepCount) * 100

  function closeAndRemember() {
    markGuideSeen(activeGuide.id)
    setOpen(false)
  }

  function restartTour() {
    resetGuideSeen(activeGuide.id)
    setCurrentStep(0)
    setOpen(true)
  }

  function runAction(action: GuideAction) {
    if (action.prompt) {
      markGuideSeen(activeGuide.id)
      openCommandBar()
      setInput(action.prompt)
      setOpen(false)
      return
    }

    if (action.href) {
      markGuideSeen(activeGuide.id)
      setOpen(false)
      router.push(action.href)
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed left-3 z-[80] flex h-11 items-center gap-2 rounded-md border border-white/10 bg-[#070b12]/90 px-3 text-sm font-bold text-white shadow-2xl backdrop-blur-xl transition hover:border-righello-pink/40 hover:bg-[#111827]",
          "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-4 md:left-4"
        )}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        whileHover={reduceMotion ? undefined : { y: -1 }}
        aria-label="Apri guida pagina"
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-md bg-righello-pink/15">
          <Bot className="h-4 w-4 text-righello-pink" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-righello-cyan shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
        </span>
        <span className="hidden sm:inline">Guida pagina</span>
      </motion.button>

      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeAndRemember()
          else setOpen(true)
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "border-white/10 bg-[#070b12] p-0 text-white shadow-2xl",
            "[&>button]:rounded-md [&>button]:text-slate-400 [&>button:hover]:bg-white/10 [&>button:hover]:text-white",
            isMobile
              ? "max-h-[86svh] rounded-t-[10px]"
              : "w-[420px] max-w-[calc(100vw-2rem)] sm:max-w-[420px]"
          )}
        >
          <div className="max-h-[86svh] overflow-y-auto [-webkit-overflow-scrolling:touch]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(214,72,126,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-5">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={reduceMotion ? undefined : { rotate: [0, 2, -2, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <RighelloIcon className="h-11 w-11" imageClassName="h-[22px] w-[22px]" />
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-righello-pink">
                      <Sparkles className="h-3 w-3 text-white" />
                    </span>
                  </motion.div>
                  <SheetHeader className="space-y-1 text-left">
                    <SheetDescription className="text-xs font-black uppercase tracking-[0.24em] text-righello-pink">
                      {activeGuide.eyebrow}
                    </SheetDescription>
                    <SheetTitle className="text-xl font-black leading-tight text-white">Optima Guide</SheetTitle>
                  </SheetHeader>
                </div>
              </div>
              <p className="mt-4 text-lg font-black leading-tight text-white">{activeGuide.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{activeGuide.summary}</p>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    <Compass className="h-4 w-4 text-righello-cyan" />
                    Tour iniziale
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {currentStep + 1}/{stepCount}
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-righello-pink to-righello-cyan"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.25 }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeGuide.id}-${currentStep}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4"
                  >
                    <h3 className="text-base font-black text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.body}</p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep((value) => Math.max(0, value - 1))}
                    className="h-10 rounded-md border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    Indietro
                  </Button>
                  {currentStep < stepCount - 1 ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep((value) => Math.min(stepCount - 1, value + 1))}
                      className="h-10 rounded-md bg-righello-pink text-white hover:bg-righello-pink/90"
                    >
                      Avanti
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={closeAndRemember}
                      className="h-10 rounded-md bg-righello-pink text-white hover:bg-righello-pink/90"
                    >
                      Ho capito
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  <ListChecks className="h-4 w-4 text-righello-pink" />
                  Azioni rapide
                </div>
                <div className="mt-3 space-y-2">
                  {activeGuide.actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => runAction(action)}
                      className="group flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-righello-pink/40 hover:bg-righello-pink/10"
                    >
                      <span>
                        <span className="block text-sm font-bold text-white">{action.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">
                          {action.description || (action.prompt ? "Apre la command bar con un prompt pronto." : "Apre la pagina collegata.")}
                        </span>
                      </span>
                      {action.prompt ? (
                        <Command className="h-4 w-4 shrink-0 text-righello-cyan" />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm font-black text-white">
                  <MessageSquareText className="h-4 w-4 text-righello-cyan" />
                  Come usarla bene
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  La guida è il layer di orientamento. Per eseguire davvero un comando, usa le azioni rapide o <span className="font-bold text-white">⌘K</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={restartTour}
                    className="rounded-md border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
                  >
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Ripeti tour
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      runAction({
                        label: "Spiegami la pagina",
                        prompt: `Spiegami come usare questa pagina di Optima: ${activeGuide.title}`,
                      })
                    }
                    className="rounded-md border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
                  >
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    Chiedi all'AI
                  </Button>
                </div>
              </div>

              <div className="pb-2 text-xs leading-5 text-slate-500">
                Il tour compare una sola volta per pagina. Puoi riaprirlo dal pulsante Guida pagina.
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
