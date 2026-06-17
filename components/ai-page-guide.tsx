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
  X,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

import { RighelloIcon } from "@/components/brand/righello-icon"
import { Button } from "@/components/ui/button"
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

const STORAGE_PREFIX = "optima-page-guide:v2"
const ASSISTANT_HINT_KEY = "optima-ai-sidekick:v1:hint-dismissed"

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
    allowSubpaths: true,
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
      { label: "Crea follow-up", prompt: "Crea una task di follow-up per il cliente aperto o indicato" },
      { label: "Apri workspace", href: "/workspace" },
    ],
  },
  {
    id: "agenti",
    path: "/agenti",
    eyebrow: "Sistema agentico",
    title: "Qui governi runner, grafo, provider e job revisionabili.",
    summary:
      "La pagina agenti e il control plane dell'OS: crea job, controlla heartbeat del VPS, verifica MCP/provider e usa il grafo come memoria aziendale.",
    role: "leadership",
    steps: [
      {
        title: "Parti dallo stato runner",
        body: "Se il runner e offline o sospeso, i job restano fermi. Controlla heartbeat, coda e stato prima di aspettarti output.",
      },
      {
        title: "Crea job revisionabili",
        body: "Le richieste operative complesse devono diventare job con output, artefatti e review room. La direzione approva o rimanda modifiche.",
      },
      {
        title: "Usa grafo e provider",
        body: "MCP, provider AI, sorgenti Hermes/Notion/know-how e graph memory devono alimentare decisioni e azioni, non restare solo configurazioni statiche.",
      },
    ],
    actions: [
      { label: "Crea job agentico", prompt: "Crea un job agentico revisionabile per questa esigenza operativa" },
      { label: "Diagnostica runner", prompt: "Controlla stato runner, heartbeat, coda e prossime azioni per sbloccare AI Ops" },
      { label: "Sincronizza grafo", prompt: "Prepara un job per sincronizzare know-how, Notion, clienti e sorgenti nel grafo operativo" },
    ],
  },
  {
    id: "campagne",
    path: "/campagne",
    eyebrow: "Marketing operativo",
    title: "Qui trasformi obiettivi cliente in campagne eseguibili.",
    summary:
      "Campagne deve collegare cliente, obiettivo, canali, asset, calendario editoriale e task di produzione.",
    steps: [
      {
        title: "Definisci obiettivo",
        body: "Ogni campagna deve avere risultato atteso, pubblico, canali e vincoli. Senza questi dati diventa solo una lista di contenuti.",
      },
      {
        title: "Collega asset e calendario",
        body: "Post, visual, video, newsletter e landing devono rientrare nel piano editoriale o nel workspace, non restare scollegati.",
      },
      {
        title: "Trasforma in task",
        body: "La parte agentica deve spezzare la campagna in produzione, review, pubblicazione e misurazione.",
      },
    ],
    actions: [
      { label: "Pianifica campagna", prompt: "Pianifica una campagna per un cliente con canali, asset, task e calendario" },
      { label: "Crea contenuti", prompt: "Crea una scaletta di contenuti editoriali per la campagna selezionata" },
      { label: "Apri calendario", href: "/calendario-editoriale" },
    ],
  },
  {
    id: "importa-task",
    path: "/importa-task",
    eyebrow: "Import operativo",
    title: "Qui trasformi report e attivita esterne in task Optima.",
    summary:
      "Importa task serve a evitare duplicati: legge report operativi, Github o consuntivi e propone task collegate a cliente, progetto e data.",
    steps: [
      {
        title: "Incolla la fonte",
        body: "Usa report GitHub, rapportini sintetici o liste operative. Optima deve riconoscere cliente, progetto, repository e periodo.",
      },
      {
        title: "Controlla duplicati",
        body: "Prima di inserire, verifica task gia presenti e ore stimate. L'import deve arricchire, non duplicare.",
      },
      {
        title: "Collega al grafo",
        body: "Quando la fonte introduce conoscenza riutilizzabile, salvala anche come nodo verificabile della graph memory.",
      },
    ],
    actions: [
      { label: "Importa report", prompt: "Importa questo report operativo creando task senza duplicati e collegandole a cliente e progetto" },
      { label: "Controlla duplicati", prompt: "Confronta le attivita incollate con le task esistenti e segnala duplicati o ore mancanti" },
      { label: "Apri workspace", href: "/workspace" },
    ],
  },
  {
    id: "settings",
    path: "/settings",
    eyebrow: "Configurazione tenant",
    title: "Qui rendi Optima configurabile e sicura per l'azienda.",
    summary:
      "Settings deve governare identita, email, billing, permessi e integrazioni con una logica multi-tenant chiara.",
    role: "leadership",
    steps: [
      {
        title: "Verifica tenant e ruoli",
        body: "Ogni configurazione deve essere tenant-scoped: utenti, clienti, segreti e provider non devono contaminarsi tra organizzazioni.",
      },
      {
        title: "Controlla canali email",
        body: "Inviti, preventivi e riepiloghi rapportini dipendono da email configurate bene e auditabili.",
      },
      {
        title: "Trasforma setup in job",
        body: "Quando manca una configurazione tecnica, crea un job setup revisionabile invece di lasciare pulsanti non operativi.",
      },
    ],
    actions: [
      { label: "Audit configurazione", prompt: "Esegui un audit della configurazione tenant, email, ruoli e integrazioni mancanti" },
      { label: "Crea job setup", prompt: "Crea un job agentico per configurare il setup mancante in modo verificabile" },
    ],
  },
  {
    id: "super-admin",
    path: "/super-admin",
    allowSubpaths: true,
    eyebrow: "Super admin",
    title: "Qui controlli tenant, agenzie, token e integrita piattaforma.",
    summary:
      "Questa sezione deve restare amministrativa: audit, cleanup, utilizzo AI e configurazioni globali vanno tracciati con prudenza.",
    role: "leadership",
    steps: [
      {
        title: "Leggi uso e limiti",
        body: "Token AI, tenant, agenzie e stato database aiutano a capire se Optima sta lavorando in modo sostenibile.",
      },
      {
        title: "Non fare azioni cieche",
        body: "Cleanup e modifiche globali devono essere revisionabili: prima report, poi approvazione, poi intervento.",
      },
      {
        title: "Crea audit agentico",
        body: "Per problemi trasversali usa AI Ops: produce evidenze, query e piano di correzione senza cambiare dati al buio.",
      },
    ],
    actions: [
      { label: "Audit piattaforma", prompt: "Crea un audit super-admin su tenant, token AI, database e rischi operativi" },
      { label: "Crea job cleanup", prompt: "Prepara un job agentico di cleanup database con output revisionabile e nessuna modifica distruttiva automatica" },
    ],
  },
  {
    id: "client-workspace",
    path: "/client-workspace",
    eyebrow: "Portale cliente",
    title: "Qui il cliente deve vedere solo cio che e utile e autorizzato.",
    summary:
      "Il client workspace deve esporre avanzamento, materiali, richieste e approvazioni senza rivelare dati interni di Righello.",
    steps: [
      {
        title: "Mostra stato leggibile",
        body: "Il cliente deve capire consegne, richieste aperte e prossime decisioni senza leggere il kanban interno.",
      },
      {
        title: "Mantieni confini chiari",
        body: "Commenti interni, costi, persone e dati di altri clienti non devono entrare nel portale.",
      },
      {
        title: "Usa AI come supporto",
        body: "Le azioni agentiche devono preparare sintesi e richieste cliente, ma restare tracciabili in Optima.",
      },
    ],
    actions: [
      { label: "Sintesi cliente", prompt: "Prepara una sintesi cliente sicura dello stato progetto senza dati interni" },
      { label: "Crea richiesta", prompt: "Crea una richiesta cliente da trasformare in task interna" },
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
  if (pathname.startsWith("/dashboard/settings")) return "/settings"
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

function hasDismissedAssistantHint() {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(ASSISTANT_HINT_KEY) === "true"
}

function dismissAssistantHint() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ASSISTANT_HINT_KEY, "true")
}

export function AiPageGuide() {
  const pathname = usePathname()
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const { userData } = useAuth()
  const { open: openCommandBar, setInput } = useCommandBarStore()

  const guide = useMemo(() => getPageGuide(pathname), [pathname])
  const [panelOpen, setPanelOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const canShowGuide = guide ? guideVisibleForRole(guide, userData?.role) : false
  const visibleGuide = canShowGuide ? guide : undefined
  const isAssistantWorkspace = pathname.startsWith("/ai-assistant") || pathname.startsWith("/dashboard/ai-assistant")

  useEffect(() => {
    setCurrentStep(0)

    if (!visibleGuide) return

    const timeout = window.setTimeout(() => {
      setHintOpen(!hasDismissedAssistantHint())
    }, 1200)

    return () => window.clearTimeout(timeout)
  }, [visibleGuide?.id])

  if (!visibleGuide || isAssistantWorkspace) return null

  const activeGuide = visibleGuide
  const stepCount = activeGuide.steps.length
  const step = activeGuide.steps[currentStep]
  const progress = ((currentStep + 1) / stepCount) * 100
  const guideSeen = hasSeenGuide(activeGuide.id)

  function closeAndRemember() {
    markGuideSeen(activeGuide.id)
    setPanelOpen(false)
  }

  function openTour() {
    setCurrentStep(0)
    setPanelOpen(true)
    setHintOpen(false)
    dismissAssistantHint()
  }

  function runAction(action: GuideAction) {
    if (action.prompt) {
      markGuideSeen(activeGuide.id)
      openCommandBar()
      setInput(action.prompt)
      setPanelOpen(false)
      setHintOpen(false)
      return
    }

    if (action.href) {
      markGuideSeen(activeGuide.id)
      setPanelOpen(false)
      setHintOpen(false)
      router.push(action.href)
    }
  }

  function dismissHint() {
    dismissAssistantHint()
    setHintOpen(false)
  }

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-3 z-[80] md:bottom-[5rem] md:right-4">
        <AnimatePresence>
          {hintOpen && !panelOpen ? (
            <motion.div
              key="sidekick-hint"
              initial={reduceMotion ? false : { opacity: 0, x: 8, y: 8, scale: 0.96 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 8, y: 8, scale: 0.96 }}
              className="mb-3 max-w-[280px] rounded-md border border-righello-pink/25 bg-[#080b12]/95 p-3 text-white shadow-2xl backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={dismissHint}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Nascondi suggerimento"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="pr-5 text-sm font-black leading-5">Ciao, sono Opi.</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Ti spiego questa pagina solo quando mi chiami. Niente tour obbligatori.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => {
            setPanelOpen((value) => !value)
            setHintOpen(false)
            dismissAssistantHint()
          }}
          className="group relative flex h-14 min-w-14 items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-[#070b12]/95 px-1.5 text-white shadow-2xl backdrop-blur-xl transition hover:border-righello-pink/50 md:min-w-[10.5rem] md:justify-start md:px-3"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          aria-label="Apri assistente pagina"
          aria-expanded={panelOpen}
        >
          <motion.span
            className="absolute -inset-1 rounded-[10px] bg-righello-pink/20 blur-lg"
            animate={reduceMotion ? undefined : { opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="relative grid h-11 w-11 place-items-center rounded-[8px] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(214,72,126,0.45),transparent_42%),#0b1220]">
            <RighelloIcon className="h-8 w-8" imageClassName="h-[18px] w-[18px]" />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-[#070b12] bg-righello-pink">
              <Bot className="h-3 w-3 text-white" />
            </span>
          </span>
          <span className="relative hidden min-w-0 text-left md:block">
            <span className="block text-sm font-black leading-4 text-white">Guida pagina</span>
            <span className="mt-0.5 block max-w-[7rem] truncate text-[0.68rem] font-bold uppercase tracking-[0.12em] text-righello-cyan/75">
              {activeGuide.eyebrow}
            </span>
          </span>
        </motion.button>

        <AnimatePresence>
          {panelOpen ? (
            <motion.div
              key="sidekick-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-[4.25rem] right-0 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-[8px] border border-white/10 bg-[#070b12]/95 text-white shadow-2xl backdrop-blur-xl"
            >
              <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(214,72,126,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <motion.div
                      animate={reduceMotion ? undefined : { rotate: [0, 2, -2, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="relative shrink-0"
                    >
                      <RighelloIcon className="h-10 w-10" imageClassName="h-[20px] w-[20px]" />
                      <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-righello-pink">
                        <Sparkles className="h-3 w-3 text-white" />
                      </span>
                    </motion.div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-righello-pink">{activeGuide.eyebrow}</p>
                      <h2 className="mt-1 text-base font-black leading-tight text-white">Guida operativa pagina</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeAndRemember}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="Chiudi assistente pagina"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm font-black leading-5 text-white">{activeGuide.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{activeGuide.summary}</p>
              </div>

              <div className="max-h-[min(62svh,560px)] space-y-4 overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
                <div className="rounded-md border border-righello-cyan/20 bg-righello-cyan/[0.055] p-3">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-righello-cyan">Cosa fare qui</div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{activeGuide.summary}</p>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      <Compass className="h-4 w-4 text-righello-cyan" />
                      Tour manuale
                    </div>
                    {guideSeen ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                        visto
                      </span>
                    ) : null}
                  </div>

                <div className="flex items-center justify-between gap-3">
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
                  <Button type="button" variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep((value) => Math.max(0, value - 1))} className="h-10 rounded-md border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white disabled:opacity-40">
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
                  Opi resta chiuso finche non lo chiami. Per eseguire davvero un comando, usa le azioni rapide o <span className="font-bold text-white">⌘K</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openTour}
                    className="rounded-md border-white/10 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white"
                  >
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Riparti
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
                Non parte piu da solo: e una mascotte contestuale, non un onboarding obbligatorio.
              </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  )
}
