export type QuoteCreativeArchetypeId =
  | "institutional_operating"
  | "digital_product"
  | "hospitality_territorial"
  | "creative_direction"
  | "technical_system"
  | "field_documentation"

export interface QuoteCreativePalette {
  primary: string
  ink: string
  paper: string
  signal: string
  highlight: string
  positive: string
  earth: string
  border: string
  muted: string
  soft: string
}

export interface QuoteCreativeSystem {
  id: QuoteCreativeArchetypeId
  label: string
  summary: string
  keywords: string[]
  palette: QuoteCreativePalette
  documentTone: string
  layoutPrinciples: string[]
  sectionRhythm: string[]
  visualNotes: string[]
  avoid: string[]
  sourcePattern: string
}

const righelloInstitutionalPalette: QuoteCreativePalette = {
  primary: "#005EEC",
  ink: "#10131A",
  paper: "#F5F7FA",
  signal: "#F45A2A",
  highlight: "#FBBC06",
  positive: "#0E7C66",
  earth: "#8A5A3B",
  border: "#D8DEE8",
  muted: "#6B7280",
  soft: "#EEF2F7",
}

export const RIGHELLO_QUOTE_CREATIVE_SYSTEMS: QuoteCreativeSystem[] = [
  {
    id: "institutional_operating",
    label: "Istituzionale operativo",
    summary: "Documento solido, chiaro e deliberabile, adatto a enti, aziende strutturate e progetti con molti stakeholder.",
    keywords: ["dico", "ente", "comune", "istituzionale", "pa", "direzione", "systemdoc", "whatsapp", "cittadini"],
    palette: righelloInstitutionalPalette,
    documentTone: "Autorevole, asciutto, leggibile. Prima il perche, poi il perimetro, poi le condizioni.",
    layoutPrinciples: [
      "A4 verticale con griglia semplice, gerarchia netta e sezioni corte.",
      "Totale e decisione commerciale visibili subito, senza effetto brochure.",
      "Callout usati per responsabilita, vincoli e prossimi passi, non come decorazione.",
    ],
    sectionRhythm: ["Contesto", "Obiettivi", "Perimetro", "Economia", "Condizioni", "Prossimi passi"],
    visualNotes: [
      "Palette ad alto contrasto con un solo colore guida e segnali secondari.",
      "Tabelle e box devono sembrare strumenti decisionali, non card generiche.",
      "Usare micro-titoli concreti invece di claim astratti.",
    ],
    avoid: ["Guardrail grafici arbitrari", "angoli e inclinazioni imposti", "copy enfatico", "icone decorative senza funzione"],
    sourcePattern: "Pattern interno Righello per proposte istituzionali, documenti direzionali e offerte deliberabili.",
  },
  {
    id: "digital_product",
    label: "Prodotto digitale",
    summary: "Proposta orientata a flussi, utenti, roadmap, integrazioni e valore operativo del software.",
    keywords: ["webapp", "piattaforma", "e-commerce", "cms", "app", "dashboard", "booking", "portal", "saas"],
    palette: {
      primary: "#1447E6",
      ink: "#0F172A",
      paper: "#F8FAFC",
      signal: "#F97316",
      highlight: "#EAB308",
      positive: "#059669",
      earth: "#64748B",
      border: "#CBD5E1",
      muted: "#64748B",
      soft: "#E2E8F0",
    },
    documentTone: "Tecnico-commerciale, diretto, orientato a flussi, milestone e rischi.",
    layoutPrinciples: [
      "Separare prodotto, integrazioni, dati, governance e manutenzione.",
      "Rendere visibile cosa viene rilasciato in fase 1 e cosa resta evolutivo.",
      "Mettere in evidenza assunzioni, dipendenze e costi terzi.",
    ],
    sectionRhythm: ["Problema", "Sistema", "Flussi", "Roadmap", "Economia", "Governance"],
    visualNotes: ["Diagrammi testuali brevi", "tabelle compatte", "badge solo per stato e priorita"],
    avoid: ["Promesse generiche di innovazione", "feature list senza outcome", "totali mischiati a costi terzi"],
    sourcePattern: "Pattern Righello per prodotti digitali e piattaforme operative.",
  },
  {
    id: "hospitality_territorial",
    label: "Hospitality territoriale",
    summary: "Proposta premium ma concreta per hospitality, turismo, territorio, booking e contenuti esperienziali.",
    keywords: ["hotel", "resort", "appartamenti", "hospitality", "portopiccolo", "booking", "guesty", "turismo", "ristorante"],
    palette: {
      primary: "#0B5E6E",
      ink: "#18212F",
      paper: "#F7FAF9",
      signal: "#D97706",
      highlight: "#FACC15",
      positive: "#0F766E",
      earth: "#8A5A3B",
      border: "#D5E3E1",
      muted: "#667085",
      soft: "#EAF3F2",
    },
    documentTone: "Elegante, concreto, orientato a conversione, qualita percepita e continuita operativa.",
    layoutPrinciples: [
      "Far emergere esperienza, prenotazione e contenuti senza perdere il controllo tecnico.",
      "Separare sito, booking engine, integrazioni, produzione contenuti e gestione annuale.",
      "Mostrare subito cosa influenza vendita diretta e riduzione attrito.",
    ],
    sectionRhythm: ["Posizionamento", "Esperienza", "Booking", "Contenuti", "Gestione", "Investimento"],
    visualNotes: ["Accenti caldi limitati", "molto spazio bianco", "tabelle economiche sobrie"],
    avoid: ["Look stock travel", "copy aspirazionale vuoto", "confondere booking esterno con incasso Righello"],
    sourcePattern: "Pattern Righello per Portopiccolo, sport village e progetti hospitality.",
  },
  {
    id: "creative_direction",
    label: "Direzione creativa",
    summary: "Documento editoriale per brand, contenuti, campagne, fotografia, video e sistemi visuali.",
    keywords: ["brand", "direzione creativa", "campagna", "shooting", "video", "foto", "visual", "content", "social"],
    palette: {
      primary: "#BE185D",
      ink: "#18181B",
      paper: "#FAFAFA",
      signal: "#EA580C",
      highlight: "#FDE047",
      positive: "#16A34A",
      earth: "#854D0E",
      border: "#E4E4E7",
      muted: "#71717A",
      soft: "#F4F4F5",
    },
    documentTone: "Editoriale, preciso, con esempi concreti e lessico da direzione creativa, non da prompt AI.",
    layoutPrinciples: [
      "Aprire con direzione, pubblico, promessa e materiali necessari.",
      "Usare riferimenti come vincoli di produzione, non come collage estetico.",
      "Rendere chiari deliverable, formati, revisioni e calendario.",
    ],
    sectionRhythm: ["Direzione", "Materiali", "Produzione", "Formati", "Calendario", "Licenze"],
    visualNotes: ["Contrasti forti ma controllati", "note editoriali brevi", "liste di deliverable verificabili"],
    avoid: ["Moodboard finta", "aggettivi senza deliverable", "template creativo uguale per ogni cliente"],
    sourcePattern: "Pattern Righello per brief creativi, campagne e produzione contenuti.",
  },
  {
    id: "technical_system",
    label: "Sistema tecnico",
    summary: "Proposta per gestionali, AI, MCP, automazioni, CRM/SIGE, API e operations multi-tenant.",
    keywords: ["crm", "sige", "gestionale", "ai", "mcp", "automazione", "api", "runner", "agentico", "database"],
    palette: {
      primary: "#1E3A5F",
      ink: "#111827",
      paper: "#F5F7FA",
      signal: "#DC2626",
      highlight: "#F59E0B",
      positive: "#047857",
      earth: "#475569",
      border: "#D1D5DB",
      muted: "#6B7280",
      soft: "#E5E7EB",
    },
    documentTone: "Pragmatico, verificabile, con enfasi su sicurezza, dati, responsabilita e manutenzione.",
    layoutPrinciples: [
      "Separare dati, permessi, integrazioni, ambienti, runner e responsabilita.",
      "Esplicitare cosa e prototipo, cosa e produzione e cosa richiede presidio.",
      "Dare spazio a rischi, audit log, rollback e approvazioni.",
    ],
    sectionRhythm: ["Architettura", "Dati", "Integrazioni", "Sicurezza", "Roadmap", "SLA"],
    visualNotes: ["Schema operativo in testo", "matrice responsabilita", "warning solo per rischi reali"],
    avoid: ["Fantascienza agentica", "tool citati senza funzione", "assenza di confini e fallback"],
    sourcePattern: "Pattern Righello per Optima, MCP, AI operations e sistemi gestionali.",
  },
  {
    id: "field_documentation",
    label: "Documentazione di campo",
    summary: "Proposta per cantieri, eventi, sopralluoghi, sport, broadcast e produzioni dove conta il lavoro operativo.",
    keywords: ["cantiere", "evento", "sport", "broadcast", "overlay", "sopralluogo", "documentazione", "drone", "live"],
    palette: {
      primary: "#0F766E",
      ink: "#172026",
      paper: "#F7F8F8",
      signal: "#E11D48",
      highlight: "#FBBF24",
      positive: "#059669",
      earth: "#7C5E3C",
      border: "#D7DEDD",
      muted: "#667085",
      soft: "#EDF3F2",
    },
    documentTone: "Operativo, concreto, orientato a logistica, output, responsabilita e tempi di consegna.",
    layoutPrinciples: [
      "Mettere in evidenza giornate, mezzi, persone, materiali e condizioni sul campo.",
      "Separare produzione, post-produzione, urgenze, trasferte e licenze.",
      "Rendere visibili assunzioni logistiche e vincoli meteo/luogo.",
    ],
    sectionRhythm: ["Scenario", "Giornate", "Output", "Logistica", "Post-produzione", "Consegna"],
    visualNotes: ["Timeline chiara", "checklist operative", "importi per giornata o deliverable"],
    avoid: ["Preventivo troppo astratto", "trasferte nascoste", "output non enumerati"],
    sourcePattern: "Pattern Righello per produzioni sul campo, sport, eventi e documentazione tecnica.",
  },
]

function normalize(value?: string | null) {
  return value?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || ""
}

export function getQuoteCreativeSystem(input: {
  projectType?: string
  sector?: string
  clientName?: string
  description?: string
  title?: string
}): QuoteCreativeSystem {
  const haystack = normalize([
    input.projectType,
    input.sector,
    input.clientName,
    input.description,
    input.title,
  ].filter(Boolean).join(" "))

  const scored = RIGHELLO_QUOTE_CREATIVE_SYSTEMS.map((system) => {
    const score = system.keywords.reduce((sum, keyword) => sum + (haystack.includes(normalize(keyword)) ? 1 : 0), 0)
    return { system, score }
  }).sort((a, b) => b.score - a.score)

  return scored[0]?.score > 0 ? scored[0].system : RIGHELLO_QUOTE_CREATIVE_SYSTEMS[1]
}

export function serializeQuoteCreativeDirection(system: QuoteCreativeSystem) {
  return {
    archetypeId: system.id,
    label: system.label,
    summary: system.summary,
    palette: system.palette,
    documentTone: system.documentTone,
    layoutPrinciples: system.layoutPrinciples,
    sectionRhythm: system.sectionRhythm,
    visualNotes: system.visualNotes,
    sourcePattern: system.sourcePattern,
  }
}

export function buildQuoteCreativeSystemContext() {
  const archetypes = RIGHELLO_QUOTE_CREATIVE_SYSTEMS.map((system) => {
    return `- ${system.label}: ${system.summary} Tono: ${system.documentTone} Ritmo: ${system.sectionRhythm.join(" > ")}. Evitare: ${system.avoid.join(", ")}.`
  }).join("\n")

  return `SISTEMA CREATIVO PREVENTIVI RIGHELLO

Principio:
- Il preventivo deve essere libero nel linguaggio visuale, ma riproducibile nei dati, nei calcoli e nella verifica.
- Non usare guardrail arbitrari su angoli, inclinazioni o decorazioni. Usa invece archetipi editoriali coerenti con cliente, settore e deliverable.
- Il documento deve sembrare progettato da Righello, non generato da una AI: meno enfasi, piu gerarchia, ritmo, responsabilita e dettagli verificabili.
- PDF A4 leggibile, stampabile, con glyph sicuri e sezioni che aiutano una decisione commerciale reale.
- Il kit e' Righello: i casi cliente riusciti sono esempi di qualita e metodo, non template da copiare.

Archetipi disponibili:
${archetypes}`
}
