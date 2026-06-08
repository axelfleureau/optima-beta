export type RighelloQuoteAreaId =
  | "website"
  | "annual_management"
  | "communication_plan"
  | "photo_video"
  | "seo"
  | "advertising"
  | "crm_sige"
  | "automation_ai"
  | "extra"

export interface RighelloQuoteArea {
  id: RighelloQuoteAreaId
  label: string
  shortLabel: string
  summary: string
  keywords: string[]
  examples: string[]
  pricingNotes: string[]
}

export interface RighelloQuoteHistoricalPattern {
  id: string
  label: string
  source: "notion_rig_work"
  sourceTitle: string
  summary: string
  pricingSignal: string
  caution: string
}

export const RIGHELLO_QUOTE_FLOW_STEPS = [
  {
    id: "package",
    label: "Pacchetto o configurazione",
    summary: "Scelta tra pacchetto predefinito e configurazione personalizzata.",
  },
  {
    id: "services",
    label: "Servizi",
    summary: "Selezione modulare per macro-area con totale una tantum e ricorrente aggiornato live.",
  },
  {
    id: "client",
    label: "Dati cliente",
    summary: "Cliente piattaforma o esterno, referenti, note, materiali e distanza operativa.",
  },
  {
    id: "summary",
    label: "Riepilogo",
    summary: "Validazione di servizi, costi, sconti, IVA, materiali mancanti e condizioni.",
  },
  {
    id: "quote",
    label: "Preventivo",
    summary: "PDF/landing pubblica con firma, scadenza, pagamenti e revisione interna.",
  },
] as const

export const RIGHELLO_QUOTE_SERVICE_AREAS: RighelloQuoteArea[] = [
  {
    id: "website",
    label: "Sito web e piattaforme",
    shortLabel: "Sito web",
    summary: "Sito monopagina, multipagina, e-commerce, CMS, aree riservate, booking e integrazioni API.",
    keywords: ["sito", "landing", "webapp", "e-commerce", "cms", "booking", "area riservata"],
    examples: ["Sito monopagina", "Sito multipagina", "E-commerce base", "Piattaforma con integrazioni"],
    pricingNotes: ["Base sito da circa 3.500 euro", "Piattaforme avanzate da circa 6.170 euro", "Pagine e lingue extra vanno esplicitate"],
  },
  {
    id: "annual_management",
    label: "Gestione annuale",
    shortLabel: "Gestione",
    summary: "Hosting, manutenzione tecnica, aggiornamenti contenuti, backup, sicurezza e interventi ricorrenti.",
    keywords: ["hosting", "manutenzione", "gestione", "aggiornamenti", "supporto", "webflow"],
    examples: ["Hosting professionale", "Gestione tecnica", "Aggiornamenti contenuti", "Pacchetto interventi"],
    pricingNotes: ["Tecnica 150 euro/mese", "Contenuti 170 euro/mese", "Hosting esterno 27 euro/mese", "Dominio 4 euro/mese se necessario"],
  },
  {
    id: "communication_plan",
    label: "Piano di comunicazione",
    shortLabel: "Comunicazione",
    summary: "Strategia editoriale, calendario, contenuti iniziali, frequenza pubblicazione e piattaforme.",
    keywords: ["piano editoriale", "comunicazione", "social", "contenuti", "campagne", "stories"],
    examples: ["Piano 90 gradi", "Piano 180 gradi", "Piano 360 gradi", "Piano custom"],
    pricingNotes: ["Piani 180 gradi tipicamente 3.500-5.000 euro", "La gestione mensile va separata dal setup"],
  },
  {
    id: "photo_video",
    label: "Foto, video e drone",
    shortLabel: "Foto/video",
    summary: "Shooting, video hero, reel, social video, copertura eventi, drone, clip extra e trasporto.",
    keywords: ["foto", "video", "shooting", "drone", "reel", "evento", "clip"],
    examples: ["Solo foto", "Foto e video interno", "Pacchetto drone", "Copertura evento"],
    pricingNotes: ["Foto base circa 300 euro", "Foto + video interno circa 650 euro", "Pacchetto completo con drone circa 1.190 euro"],
  },
  {
    id: "seo",
    label: "SEO",
    shortLabel: "SEO",
    summary: "SEO tecnico, locale, multilingua, schema markup, sitemap, analytics e contenuti indicizzabili.",
    keywords: ["seo", "search console", "locale", "schema", "sitemap", "analytics"],
    examples: ["SEO base", "SEO avanzata", "SEO locale", "SEO multilingua"],
    pricingNotes: ["SEO base 250-800 euro", "SEO avanzata circa 620 euro", "SEO multilingua circa 800 euro"],
  },
  {
    id: "advertising",
    label: "Advertising",
    shortLabel: "Ads",
    summary: "Budget, piattaforme, setup campagne, tracciamenti, creatività e report.",
    keywords: ["ads", "advertising", "google", "meta", "linkedin", "budget", "campagna"],
    examples: ["Google Ads", "Meta Ads", "LinkedIn Ads", "Report campagne"],
    pricingNotes: ["Separare sempre fee di gestione e budget media", "Il budget media non va confuso con il compenso Righello"],
  },
  {
    id: "crm_sige",
    label: "CRM / SIGE",
    shortLabel: "CRM/SIGE",
    summary: "Moduli gestionali per dipendenti, formazione, attrezzature, impianti, DPI, documenti e certificazioni.",
    keywords: ["crm", "sige", "gestionale", "dipendenti", "formazione", "dpi", "documenti"],
    examples: ["Gestione dipendenti", "Sicurezza e formazione", "Attrezzature", "Documenti e certificazioni"],
    pricingNotes: ["Modulare per reparto", "Serve discovery funzionale prima di prezzo fisso"],
  },
  {
    id: "automation_ai",
    label: "AI, automazioni e canali",
    shortLabel: "AI/canali",
    summary: "WhatsApp Business API, AI FAQ, dashboard operatori, broadcast, profilazione, MCP/API e workflow agentici.",
    keywords: ["whatsapp", "ai", "automazione", "broadcast", "telegram", "mcp", "api", "dashboard"],
    examples: ["WhatsApp cittadini", "AI FAQ", "Dashboard operatori", "Workflow agentico"],
    pricingNotes: ["Preventivi annuali complessi possono avere opzioni 18-22k, 10.5k/11.7k o premium 38.7k se il perimetro lo giustifica"],
  },
  {
    id: "extra",
    label: "Extra e requisiti custom",
    shortLabel: "Extra",
    summary: "Richieste libere, trasporto, asset, vincoli legali, urgenze, opzioni fuori standard e note di rischio.",
    keywords: ["extra", "trasporto", "urgenza", "custom", "vincolo", "materiali"],
    examples: ["Trasporto per km", "Richiesta custom", "Materiali mancanti", "Urgenza"],
    pricingNotes: ["Ogni extra deve restare tracciabile come voce separata o nota di revisione"],
  },
]

export const RIGHELLO_QUOTE_HISTORICAL_PATTERNS: RighelloQuoteHistoricalPattern[] = [
  {
    id: "notion-tubaro-sito-base",
    label: "Sito base con Webflow e pagamenti parziali",
    source: "notion_rig_work",
    sourceTitle: "CONTABILIZZARE TUBARO SITO",
    summary: "Caso reale con sito base, inserimento annunci, abbonamento annuale Webflow e saldo residuo.",
    pricingSignal: "700 euro sito base piu inserimento annunci e abbonamento Webflow; totale indicato 1.145 euro + IVA.",
    caution: "Usare come pattern storico, non come listino automatico universale.",
  },
  {
    id: "notion-whatsapp-pa",
    label: "Sistema WhatsApp/API/AI annuale",
    source: "notion_rig_work",
    sourceTitle: "PREVENTIVO WHATSAPP",
    summary: "Preventivo annuale per broadcast, API profilate, AI conversazionale, dashboard, GDPR e report.",
    pricingSignal: "Opzione 1 18-22k/anno, variante 10.5k anno 1 e 11.7k anno 2+, premium 38.7k/anno.",
    caution: "Richiede perimetro, volumi, canale, responsabilita operative e compliance espliciti.",
  },
]

export const RIGHELLO_QUOTE_DISCOVERY_QUESTIONS = [
  "Quale macro-area Righello e' primaria e quali sono solo accessorie?",
  "Il preventivo deve separare costi una tantum, mensili, annuali e budget media?",
  "Ci sono materiali mancanti, loghi, accessi, reference o contenuti da richiedere?",
  "Il cliente e' gia censito in Optima/Notion o va creato come cliente esterno?",
  "Serve una variante economica, premium o fase 1/fase 2?",
  "Il lavoro richiede approvazione direzione prima dell'invio al cliente?",
]

export function getRighelloQuoteAreaLabels() {
  return RIGHELLO_QUOTE_SERVICE_AREAS.map((area) => area.label)
}

export function buildRighelloQuoteOperatingContext() {
  const areas = RIGHELLO_QUOTE_SERVICE_AREAS
    .map((area) => {
      return `- ${area.label}: ${area.summary} Esempi: ${area.examples.join(", ")}. Note prezzo: ${area.pricingNotes.join("; ")}.`
    })
    .join("\n")

  const flow = RIGHELLO_QUOTE_FLOW_STEPS
    .map((step, index) => `${index + 1}. ${step.label}: ${step.summary}`)
    .join("\n")

  const patterns = RIGHELLO_QUOTE_HISTORICAL_PATTERNS
    .map((pattern) => `- ${pattern.label}: ${pattern.pricingSignal} (${pattern.caution})`)
    .join("\n")

  return `MODELLO OPERATIVO PREVENTIVI RIGHELLO

Flusso configuratore:
${flow}

Macro-aree servizi:
${areas}

Pattern storici verificati da Notion/RIG_WORK:
${patterns}

Regole:
- Non inventare prezzi o servizi: se manca un dato, indicarlo come domanda aperta o voce da revisionare.
- Separare sempre una tantum, mensile, annuale, budget media e costi terzi.
- Collegare cliente, progetto, task, sorgente Notion e preventivo quando disponibili.
- I pattern storici aiutano la coerenza, ma non sostituiscono approvazione commerciale.`
}
