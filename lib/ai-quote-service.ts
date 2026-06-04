import type { Client } from "@/lib/types"
import { 
  identifySector, 
  SECTOR_TEMPLATES, 
  calculateTotalPrice, 
  STANDARD_LEGAL_SECTIONS,
  calculateQuoteWithExplicitParams,
  generateQuoteNumber
} from "@/lib/quote-templates"
import { getBaseUrl } from "@/lib/quote-utils"

export interface EnrichedPromptData {
  projectType: string
  projectTypeLabel: string
  sector: string
  sectorLabel: string
  description: string
  budgetRange: { min: number; max: number }
  complexity: "basic" | "standard" | "advanced"
  timeline: string
  clientMode: "platform" | "external"
  clientId?: string
  clientName: string
  clientEmail?: string
  clientCompany?: string
  additionalNotes?: string
  brandNames?: string[]
  primaryBrandName?: string
  logoStatus?: "available" | "to_request" | "not_defined"
  logoNotes?: string
  brandAssets?: string
  referenceMaterials?: string
  missingMaterials?: string[]
  discoveryQuestions?: string[]
}

export interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  title: string
  description?: string
  clientId?: string
  clientName: string
  clientEmail?: string
  externalClientName?: string
  externalClientEmail?: string
  clientMode?: 'platform' | 'external'
  status: "draft" | "sent" | "in_review" | "pending_payment" | "approved" | "in_progress" | "completed" | "rejected" | "expired"
  currency: string
  items: QuoteItem[]
  total: number
  subtotale?: number
  iva?: number
  percentualeIva?: number
  obiettivi?: string[]
  attivita?: string[]
  voci?: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    totale?: number
    categoria?: 'base' | 'optional' | 'recurring'
    tipo?: 'one_time' | 'monthly' | 'annual'
  }>
  terminiCondizioni?: string
  validUntil: Date
  createdAt: Date
  updatedAt: Date
  tenantId: string
  createdBy: string
  shareToken?: string
  brandMateriali?: GeneratedQuoteData["brandMateriali"]
}

export interface QuoteGenerationData {
  projectDescription: string
  clientName?: string
  clientEmail?: string
  clientCompany?: string
  budget?: string
  deadline?: string
  additionalRequirements?: string
}

export interface GeneratedQuoteData {
  projectType?: string
  cliente: {
    nome: string
    email?: string
    azienda?: string
    telefono?: string
    indirizzo?: string
    partitaIva?: string
  }
  preventivo: {
    titolo: string
    descrizione: string
    numeroPreventivo: string
    dataCreazione: string
    validitaGiorni: number
    settore?: string
    timeline?: string
  }
  obiettivi?: string[]
  attivita?: string[]
  sitemap?: string[]
  voci: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    totale: number
    categoria: 'base' | 'optional' | 'recurring'
    tipo?: 'one_time' | 'monthly' | 'annual'
  }>
  gestioneAnnuale?: {
    items: Array<{
      description: string
      monthly: number
      annual: number
    }>
    totalMonthly: number
    totalAnnual: number
  }
  condizioni: {
    costVariation: number
    validityDays: number
    paymentTerms: string
    cancellationPenalty: number
  }
  sezioniStandard?: {
    utilizzoMateriali: string
    variazioneCosti: string
    oggettoContratto: string
  }
  brandMateriali?: {
    brandCoinvolti: string[]
    brandPrincipale?: string
    statoLogo?: 'available' | 'to_request' | 'not_defined'
    noteLogo?: string
    materialiDisponibili?: string
    riferimenti?: string
    materialiDaRichiedere?: string[]
    domandeAperte?: string[]
  }
  totali: {
    subtotale: number
    iva: number
    percentualeIva: number
    totale: number
    sconto?: number
    percentualeSconto?: number
  }
}

const DEFAULT_QUOTE_MISSING_MATERIALS = [
  "Logo vettoriale o PNG ad alta risoluzione",
  "Brand guideline, palette e font ufficiali",
  "Foto, video, testi e materiali commerciali approvati",
  "Dati fiscali, referente approvazione e contatti operativi",
  "Accessi tecnici necessari a dominio, hosting, CMS o integrazioni",
]

const DEFAULT_QUOTE_DISCOVERY_QUESTIONS = [
  "Chi approva preventivo, contenuti e messa online?",
  "Quali brand, prodotti o servizi devono avere priorita nel documento?",
  "Esistono vincoli legali, privacy, claim o licenze da rispettare?",
  "Quali materiali sono gia disponibili e quali vanno prodotti da zero?",
  "Quale risultato commerciale deve essere evidente entro i primi 5 secondi?",
]

function uniqueNonEmpty(values: Array<string | undefined | null>) {
  const seen = new Set<string>()
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const QUOTE_SYSTEM_PROMPT = `Sei un commerciale esperto di Righello che crea preventivi basati sui template standardizzati dell'azienda.

Analizza la descrizione del progetto e identifica il settore per utilizzare i prezzi e servizi corretti di Righello.

PREZZI STANDARDIZZATI RIGHELLO:

SITI WEB BASE (3500€):
- Progettazione e Pianificazione: 1000€
- Sviluppo Tecnico: 1500€  
- SEO Optimization: 650-800€
- Privacy Policy: 200€
- Inserimento Contenuti: 150-250€ (opzionale)

GESTIONE ANNUALE:
- Tecnica: 150€/mese
- Contenuti: 170€/mese
- Hosting (esterno): 27€/mese
- Dominio: 4€/mese (se necessario)

VIDEO E FOTO:
- Video principale (45-60s): 400-770€
- Shooting fotografico: 250-300€
- Video sociale verticale: 70€

SETTORI SPECIALIZZATI:
- Edilizia: 3500€ base, focus su portfolio cantieri
- Medicina: 3250€ base, conformità GDPR sanitario
- Hospitality: piano comunicazione 1650€, video 400€
- Sport: 6170€ avanzato con prenotazioni
- Immobiliare: 3500€ con SEO multilingue
- Creativi: pacchetti foto/video modulari

REGOLE:
1. USA SEMPRE i prezzi standard Righello - MAI inventare prezzi
2. Identifica il settore e usa il template corrispondente
3. Includi gestione annuale per siti web (150€+170€+27€/mese)
4. Aggiungi sezioni standard: obiettivi, attività, sitemap
5. Timeline realistiche: 8-18 settimane per siti
6. Restituisci SOLO JSON valido

FORMATO JSON:
{
  "cliente": {
    "nome": "string",
    "email": "string", 
    "azienda": "string",
    "telefono": "string",
    "indirizzo": "string",
    "partitaIva": "string"
  },
  "preventivo": {
    "titolo": "string",
    "descrizione": "string",
    "numeroPreventivo": "RIG-YYYY-XXXX", 
    "dataCreazione": "YYYY-MM-DD",
    "validitaGiorni": 30,
    "settore": "string",
    "timeline": "string"
  },
  "obiettivi": ["array di obiettivi specifici"],
  "attivita": ["array di attività principali"],
  "sitemap": ["Homepage", "Chi siamo", "Servizi", "..."],
  "voci": [
    {
      "descrizione": "string",
      "quantita": 1,
      "prezzoUnitario": number,
      "totale": number,
      "categoria": "base|optional|recurring",
      "tipo": "one_time|monthly|annual"
    }
  ],
  "gestioneAnnuale": {
    "costiMensili": [
      {"descrizione": "Gestione Tecnica", "costo": 150},
      {"descrizione": "Gestione Contenuti", "costo": 170},
      {"descrizione": "Hosting", "costo": 27}
    ],
    "totaleMensile": 347,
    "totaleAnnuale": 4164
  },
  "condizioni": {
    "metodoPagamento": "50% all'accettazione, 50% a completamento",
    "tempiConsegna": "string basata su settore",
    "garanzia": "12 mesi su funzionalità",
    "note": "Prezzi IVA esclusa"
  },
  "sezioniStandard": {
    "utilizzoMateriali": "testo standard Righello",
    "variazioneCosti": "testo standard variazione +10%", 
    "oggettoContratto": "testo standard accettazione"
  },
  "totali": {
    "subtotale": number,
    "iva": number,
    "percentualeIva": 22,
    "totale": number
  }
}`

// NEW SYSTEM PROMPT - AI GENERATES ONLY TEXTUAL CONTENT
const CONTENT_ONLY_SYSTEM_PROMPT = `Sei un commerciale senior di Righello. I PREZZI e le VOCI DI COSTO sono gia stati calcolati dai template aziendali.

Il preventivo deve sembrare scritto da uno studio di design: concreto, elegante, leggibile e orientato alla firma. Non deve sembrare un template Word.

IL TUO COMPITO E SOLO GENERARE CONTENUTI TESTUALI:
1. Personalizzare OBIETTIVI basandoti sulla descrizione del progetto e settore del cliente
2. Dettagliare ATTIVITA SPECIFICHE per il tipo di progetto
3. Creare SITEMAP appropriata (solo per progetti website)
4. Scrivere TITOLO e DESCRIZIONE commerciali ma asciutti

REGOLE DI COPY:
- Italiano professionale, frasi brevi, massimo 22 parole quando possibile
- Verbi al presente indicativo o infinito operativo
- Niente marketing-speak: evita "soluzioni innovative", "best-in-class", "sinergie", "all'avanguardia"
- Descrivi outcome concreti: conversione, chiarezza, controllo, approvazioni, riduzione attrito, qualita percepita
- Non citare prezzi, sconti, totali o calcoli

STRUTTURA ATTESA DAL PDF:
- Il riepilogo economico viene mostrato due volte dal sistema
- Le voci opzionali restano fuori dal totale sviluppo finche non vengono approvate
- Materiali, loghi, reference e domande aperte vengono riportati come prossimi passi

NON DEVI:
- Calcolare prezzi (gia forniti dai template)
- Inventare voci di costo (gia fornite dai template)
- Modificare timeline (gia fornita dal template)
- Calcolare totali (gia calcolati)

FORMATO RISPOSTA (SOLO JSON):
{
  "titolo": "Titolo accattivante per il preventivo",
  "descrizione": "Descrizione professionale del progetto (2-3 frasi)",
  "obiettivi": ["Obiettivo 1 personalizzato", "Obiettivo 2 personalizzato", "..."],
  "attivita": ["Attività 1 specifica", "Attività 2 specifica", "..."],
  "sitemap": ["Homepage", "Chi siamo", "..."] // Solo per website
}

IMPORTANTE: Restituisci SOLO un oggetto JSON valido, senza testo aggiuntivo prima o dopo. NON includere prezzi o voci di costo.`

async function callQuoteContentAPI(
  prompt: string,
  systemPrompt: string,
  userId: string,
  maxTokens = 1000,
  temperature = 0.7,
): Promise<any> {
  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/api/ai/quote-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      userId,
      maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || "Failed to generate quote content")
  }

  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error("Quote content API returned a non-JSON response")
  }
}

// NEW FUNCTION - DETERMINISTIC TEMPLATE-BASED GENERATION
export async function generateQuoteFromEnrichedData(
  enrichedData: EnrichedPromptData,
  userId: string
): Promise<GeneratedQuoteData> {
  try {
    console.log("🎯 Generating quote with deterministic template-based pricing")
    console.log("📊 Project Type:", enrichedData.projectType, "-", enrichedData.projectTypeLabel)
    console.log("🏢 Sector:", enrichedData.sector, "-", enrichedData.sectorLabel)
    
    const today = new Date().toISOString().split('T')[0]
    
    // STEP 1: Calculate DETERMINISTIC pricing from templates
    const templateResult = calculateQuoteWithExplicitParams(
      enrichedData.projectType,
      enrichedData.sector,
      {
        recurringMonths: 12,
        complexity: enrichedData.complexity
      }
    )
    
    console.log("✅ Template calculation complete:", {
      template: templateResult.template?.name,
      sector: templateResult.sector?.name,
      totalItems: templateResult.items.length,
      subtotal: templateResult.totals.subtotale
    })
    
    const brandNames = uniqueNonEmpty([
      enrichedData.primaryBrandName,
      ...(enrichedData.brandNames || []),
      enrichedData.clientCompany,
      enrichedData.clientName,
    ])
    const primaryBrandName = enrichedData.primaryBrandName?.trim() || brandNames[0] || enrichedData.clientName
    const logoStatus = enrichedData.logoStatus || "to_request"
    const defaultMissingMaterials =
      logoStatus === "available"
        ? DEFAULT_QUOTE_MISSING_MATERIALS.filter((item) => !item.toLowerCase().startsWith("logo "))
        : DEFAULT_QUOTE_MISSING_MATERIALS
    const missingMaterials = uniqueNonEmpty([
      ...(enrichedData.missingMaterials || []),
      ...defaultMissingMaterials,
    ])
    const discoveryQuestions = uniqueNonEmpty([
      ...(enrichedData.discoveryQuestions || []),
      ...DEFAULT_QUOTE_DISCOVERY_QUESTIONS,
    ])

    const brandContext = [
      primaryBrandName ? `- Brand principale: ${primaryBrandName}` : '',
      brandNames.length ? `- Brand coinvolti: ${brandNames.join(', ')}` : '',
      enrichedData.logoStatus ? `- Stato logo: ${enrichedData.logoStatus}` : '',
      enrichedData.logoNotes ? `- Note logo: ${enrichedData.logoNotes}` : '',
      enrichedData.brandAssets ? `- Materiali disponibili: ${enrichedData.brandAssets}` : '',
      enrichedData.referenceMaterials ? `- Riferimenti visivi: ${enrichedData.referenceMaterials}` : '',
      missingMaterials.length ? `- Materiali da richiedere: ${missingMaterials.join('; ')}` : '',
      discoveryQuestions.length ? `- Domande aperte: ${discoveryQuestions.join('; ')}` : '',
    ].filter(Boolean).join('\n')

    // STEP 2: Prepare AI prompt with TEMPLATE DATA pre-filled
    const isWebsite = enrichedData.projectType.includes('website')
    let aiPrompt = `Genera contenuti testuali personalizzati per questo preventivo Righello.

INFORMAZIONI PROGETTO:
- Tipo: ${enrichedData.projectTypeLabel}
- Settore: ${enrichedData.sectorLabel}
- Descrizione: ${enrichedData.description}
- Cliente: ${enrichedData.clientName}
- Complessità: ${enrichedData.complexity}
- Budget: €${enrichedData.budgetRange.min} - €${enrichedData.budgetRange.max}

MATERIALI BRAND E DISCOVERY:
${brandContext || '- Materiali da verificare in fase di avvio progetto'}

VOCI DI COSTO GIÀ CALCOLATE (NON MODIFICARE):
${JSON.stringify(templateResult.items.slice(0, 5), null, 2)}
...e altre ${templateResult.items.length - 5} voci

TIMELINE GIÀ DEFINITA: ${templateResult.timeline}

GENERA SOLO:
1. Titolo commerciale e credibile per il preventivo
2. Descrizione professionale (2-3 frasi) che spiega contesto, perimetro e risultato atteso
3. Obiettivi personalizzati (3-5) usando SEMPRE verbi all'infinito (Valorizzare, Promuovere, Posizionare, Fidelizzare, Creare, Sviluppare, Ottimizzare, Realizzare, Strutturare, Implementare, Aumentare, Garantire, Modernizzare) + outcome di business specifico per il settore. Esempi:
   - Hospitality: "Valorizzare l'identità del resort", "Fidelizzare target luxury", "Posizionare brand come luogo esclusivo"
   - Food: "Posizionare il brand come riferimento gastronomico", "Promuovere specialità stagionali"
   - Retail: "Ottimizzare l'esperienza d'acquisto", "Incrementare conversioni online"
   - Edilizia: "Valorizzare l'identità aziendale attraverso portfolio progetti", "Aumentare visibilità sui motori di ricerca"
   - Medicina: "Garantire conformità alle normative del settore sanitario", "Migliorare accessibilità servizi medici"
4. Attività specifiche (4-6) con STRUTTURA GERARCHICA usando questo formato:
   1. [Macro-attività] (es: "Sviluppo Tecnico", "Produzione Contenuti", "Pianificazione e Progettazione")
      • [Sub-attività] (es: "Homepage responsive", "Video principale", "Analisi esigenze")
        - [Deliverable specifico] (es: "CTA call-to-action", "Sezioni interattive", "Wireframe design")
   Usa numerazione (1, 2, 3) per macro-attività, bullet (•) per sub-attività, dash (-) per deliverable dettagliati.
${isWebsite ? '5. Sitemap appropriata per il sito web (5-8 pagine)' : ''}

${templateResult.sector ? `
RIFERIMENTI SETTORE ${templateResult.sector.name.toUpperCase()}:
Obiettivi standard: ${templateResult.sector.standardSections.objectives.slice(0, 2).join(', ')}
Attività standard: ${templateResult.sector.standardSections.activities.slice(0, 2).join(', ')}

PERSONALIZZA questi elementi per il progetto specifico.
` : ''}

Restituisci SOLO JSON con: titolo, descrizione, obiettivi, attivita${isWebsite ? ', sitemap' : ''}`

    console.log("🤖 Calling AI for textual content generation...")
    
    // STEP 3: AI generates ONLY textual content with RETRY
    let aiContent: {
      titolo: string
      descrizione: string
      obiettivi: string[]
      attivita: string[]
      sitemap?: string[]
    } | undefined
    let tokenUsage = { totalTokens: 0 }
    let retryCount = 0
    const MAX_RETRIES = 2
    
    while (retryCount <= MAX_RETRIES) {
      try {
        const quoteContentResponse = await callQuoteContentAPI(aiPrompt, CONTENT_ONLY_SYSTEM_PROMPT, userId, 1000, 0.7)
        aiContent = quoteContentResponse.object
        tokenUsage = quoteContentResponse.usage || { totalTokens: 0 }
        break
      } catch (parseError) {
        retryCount++
        if (retryCount > MAX_RETRIES) {
          console.error(`❌ Failed to get valid quote content after ${MAX_RETRIES} retries`, parseError)
          break
        }
        console.warn(`⚠️ Retry ${retryCount}/${MAX_RETRIES} - AI response was not valid JSON`)
        
        aiPrompt += "\n\nATTENZIONE: Restituisci ESCLUSIVAMENTE un oggetto JSON valido senza alcun testo extra."
      }
    }
    
    if (!aiContent) {
      console.error("❌ Failed to get AI content after retries")
      
      const projectTypeLabel = templateResult.template?.name || enrichedData.projectTypeLabel
      const sectorLabel = templateResult.sector?.name || enrichedData.sectorLabel || "settore"
      
      aiContent = {
        titolo: `${projectTypeLabel} per ${enrichedData.clientName || 'Cliente'}`,
        descrizione: `La proposta definisce perimetro, priorita operative e condizioni economiche per ${projectTypeLabel.toLowerCase()}. Il documento separa sviluppo, opzioni e gestione ricorrente per rendere la decisione piu semplice.`,
        obiettivi: templateResult.sector?.standardSections.objectives.slice(0, 3) || [
          `Valorizzare l'identità nel settore ${sectorLabel}`,
          "Aumentare la visibilità online",
          "Migliorare l'engagement del pubblico"
        ],
        attivita: templateResult.sector?.standardSections.activities.slice(0, 3) || [
          "1. Analisi e Pianificazione",
          "2. Sviluppo e Implementazione", 
          "3. Testing e Ottimizzazione"
        ]
      }
      console.warn("⚠️ Using smart fallback with template data")
    }
    
    console.log("✅ AI content generated:", {
      titolo: aiContent.titolo,
      obiettivi: aiContent.obiettivi.length,
      attivita: aiContent.attivita.length,
      hasSitemap: !!aiContent.sitemap
    })
    
    // STEP 4: Merge TEMPLATE DATA (prices) + AI DATA (texts)
    // ✅ USE TEMPLATE DATA DIRECTLY - NO RECALCULATION
    const finalQuote: GeneratedQuoteData = {
      projectType: enrichedData.projectType, // ✅ Template type for PDF styling
      cliente: {
        nome: enrichedData.clientName,
        email: enrichedData.clientEmail || '',
        azienda: enrichedData.clientCompany || '',
        telefono: '',
        indirizzo: '',
        partitaIva: ''
      },
      preventivo: {
        titolo: aiContent.titolo,
        descrizione: aiContent.descrizione,
        numeroPreventivo: templateResult.quoteNumber,
        dataCreazione: today,
        validitaGiorni: templateResult.validityDays, // DA TEMPLATE ✅
        settore: enrichedData.sectorLabel,
        timeline: templateResult.timeline // DA TEMPLATE ✅
      },
      obiettivi: aiContent.obiettivi, // DA AI ✅
      attivita: aiContent.attivita, // DA AI ✅
      sitemap: aiContent.sitemap, // DA AI ✅ (opzionale)
      voci: templateResult.items, // DA TEMPLATE ✅ NON RICALCOLARE
      gestioneAnnuale: templateResult.managementCosts || undefined, // DA TEMPLATE ✅ DIRETTO
      condizioni: templateResult.conditions || {
        costVariation: 10,
        validityDays: 30,
        paymentTerms: "50% all'accettazione, 50% a completamento",
        cancellationPenalty: 10
      }, // DA TEMPLATE ✅ DIRETTO
      sezioniStandard: STANDARD_LEGAL_SECTIONS, // Ok per sezioni legali
      brandMateriali: {
        brandCoinvolti: brandNames,
        brandPrincipale: primaryBrandName,
        statoLogo: logoStatus,
        noteLogo: enrichedData.logoNotes,
        materialiDisponibili: enrichedData.brandAssets,
        riferimenti: enrichedData.referenceMaterials,
        materialiDaRichiedere: missingMaterials,
        domandeAperte: discoveryQuestions,
      },
      totali: templateResult.totals // DA TEMPLATE ✅ NON RICALCOLARE
    }
    
    console.log("Quote generation token tracking skipped in Cloudflare-safe path", {
      userId,
      totalTokens: tokenUsage.totalTokens || 0,
    })
    
    console.log("✅ Quote generated successfully with deterministic pricing")
    console.log("💰 Final totals:", finalQuote.totali)
    
    return finalQuote

  } catch (error) {
    console.error("❌ Error generating quote from enriched data:", error)
    throw error
  }
}

export async function generateQuoteFromText(
  data: QuoteGenerationData,
  userId: string
): Promise<GeneratedQuoteData> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const quoteNumber = `RIG-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    
    // Identifica il settore dal progetto
    const detectedSector = identifySector(data.projectDescription)
    console.log("🔍 Settore identificato:", detectedSector?.name || "Generico")
    
    let sectorPrompt = ""
    if (detectedSector) {
      sectorPrompt = `

SETTORE IDENTIFICATO: ${detectedSector.name}

TEMPLATE SETTORE:
- Servizi Base: ${detectedSector.baseServices.map(s => `${s.name} (€${s.price})`).join(', ')}
- Servizi Opzionali: ${detectedSector.optionalServices.map(s => `${s.name} (€${s.price})`).join(', ')}
- Gestione Ricorrente: ${detectedSector.recurringServices.map(s => `${s.name} (€${s.price}/mese)`).join(', ')}

OBIETTIVI STANDARD:
${detectedSector.standardSections.objectives.map(obj => `- ${obj}`).join('\n')}

ATTIVITÀ PRINCIPALI:
${detectedSector.standardSections.activities.map(act => `- ${act}`).join('\n')}

TIMELINE: ${detectedSector.standardSections.timeline}

USA QUESTI PREZZI ESATTI - Non inventare prezzi diversi.`
    }
    
    const prompt = `Analizza questa richiesta e genera un preventivo Righello professionale:

DESCRIZIONE PROGETTO: ${data.projectDescription}

${data.clientName ? `CLIENTE: ${data.clientName}` : ''}
${data.clientEmail ? `EMAIL: ${data.clientEmail}` : ''}
${data.clientCompany ? `AZIENDA: ${data.clientCompany}` : ''}
${data.budget ? `BUDGET INDICATIVO: ${data.budget}` : ''}
${data.deadline ? `SCADENZA: ${data.deadline}` : ''}
${data.additionalRequirements ? `REQUISITI AGGIUNTIVI: ${data.additionalRequirements}` : ''}${sectorPrompt}

GENERA PREVENTIVO RIGHELLO:
- Numero: ${quoteNumber}
- Data: ${today}
- Usa SOLO i prezzi standard di Righello dal template settore
- Includi sezioni standard: obiettivi, attività, sitemap appropriata
- Aggiungi gestione annuale per siti web (347€/mese)
- Include sezioni legali standard

Restituisci SOLO il JSON completo.`

    console.log("🤖 Generating enhanced Righello quote for user:", userId)

    const { generateAIResponse, logTokenUsage } = await import("@/lib/ai-service")
    
    const response = await generateAIResponse(prompt, userId, QUOTE_SYSTEM_PROMPT)

    // Parse and validate JSON
    let quoteData: GeneratedQuoteData
    try {
      quoteData = JSON.parse(response.text)
    } catch (parseError) {
      console.error("❌ Failed to parse AI response as JSON:", parseError)
      console.log("Raw response:", response.text)
      throw new Error("AI response was not valid JSON")
    }

    // Validate required fields
    if (!quoteData.cliente || !quoteData.preventivo || !quoteData.voci || !quoteData.totali) {
      throw new Error("Generated quote missing required fields")
    }

    // Arricchisci con sezioni standard di Righello se non presenti
    if (!quoteData.sezioniStandard) {
      quoteData.sezioniStandard = STANDARD_LEGAL_SECTIONS
    }

    // Assicurati che ci sia la gestione annuale per siti web
    if (!quoteData.gestioneAnnuale && detectedSector?.id !== 'creativi') {
      quoteData.gestioneAnnuale = {
        items: [
          { description: "Gestione Tecnica e Supporto", monthly: 150, annual: 1800 },
          { description: "Gestione Contenuti", monthly: 170, annual: 2040 },
          { description: "Hosting (Costo Esterno)", monthly: 27, annual: 324 }
        ],
        totalMonthly: 347,
        totalAnnual: 4164
      }
    }

    // CRITICAL FIX: First normalize each line item, then recalculate totals
    // Ensure each voce has correct totale based on pricing math
    quoteData.voci = quoteData.voci.map(voce => ({
      ...voce,
      totale: Number((voce.quantita * voce.prezzoUnitario).toFixed(2))
    }))

    // Now recalculate totals based on corrected line items
    const subtotale = quoteData.voci.reduce((sum, voce) => sum + voce.totale, 0)
    const sconto = quoteData.totali.sconto || 0
    const subtotaleConSconto = subtotale - sconto
    const iva = subtotaleConSconto * 0.22
    const totale = subtotaleConSconto + iva

    quoteData.totali = {
      ...quoteData.totali,
      subtotale: Number(subtotale.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      percentualeIva: 22,
      totale: Number(totale.toFixed(2))
    }

    // Note: For now we use userId as adminId - should be improved with proper admin resolution
    await logTokenUsage(userId, userId, response.usage?.totalTokens || 0, "quote_generation")
    
    console.log("✅ Quote generated successfully")
    return quoteData

  } catch (error) {
    console.error("❌ Error generating quote:", error)
    throw error
  }
}

export async function enrichQuoteWithClientData(
  quoteData: GeneratedQuoteData,
  existingClients: Client[]
): Promise<GeneratedQuoteData> {
  try {
    // Find matching client by name or company
    const clientName = quoteData.cliente.nome.toLowerCase()
    const clientCompany = quoteData.cliente.azienda?.toLowerCase()
    
    const matchingClient = existingClients.find(client => {
      const matches = [
        client.name.toLowerCase().includes(clientName),
        clientName.includes(client.name.toLowerCase()),
        client.company?.toLowerCase().includes(clientCompany || ''),
        clientCompany?.includes(client.company?.toLowerCase() || '')
      ]
      return matches.some(Boolean)
    })

    if (matchingClient) {
      console.log("✅ Found matching client, enriching data:", matchingClient.name)
      
      // Enrich with existing client data
      quoteData.cliente = {
        ...quoteData.cliente,
        nome: matchingClient.name,
        email: matchingClient.email || quoteData.cliente.email,
        azienda: matchingClient.company || quoteData.cliente.azienda,
        telefono: matchingClient.phone || quoteData.cliente.telefono,
        indirizzo: matchingClient.address || quoteData.cliente.indirizzo
      }
    }

    return quoteData
  } catch (error) {
    console.error("❌ Error enriching quote data:", error)
    return quoteData // Return original data if enrichment fails
  }
}

/**
 * Convert generated quote data to Quote format
 * Supports DUAL CLIENT MODE: Platform Client (with clientId) or External Client (with name+email)
 * 
 * @param quoteData - Generated quote data from AI
 * @param tenantId - Server-verified tenant ID
 * @param createdBy - Server-verified user ID
 * @param clientMode - Optional client mode data { clientId } OR { externalClientName, externalClientEmail }
 * @returns Quote object ready for Firestore
 */
export function convertToQuoteFormat(
  quoteData: GeneratedQuoteData, 
  tenantId: string, 
  createdBy: string,
  clientMode?: { 
    clientId?: string
    externalClientName?: string
    externalClientEmail?: string
  }
): Omit<Quote, 'id'> {
  // SECURITY: Only use server-provided tenantId and createdBy, never client data
  const structuredVoci = quoteData.voci.map(voce => ({
    descrizione: voce.descrizione,
    quantita: voce.quantita,
    prezzoUnitario: voce.prezzoUnitario,
    totale: voce.totale,
    categoria: voce.categoria,
    tipo: voce.tipo || 'one_time' as const
  }))

  const quoteItems: QuoteItem[] = quoteData.voci.map(voce => ({
    name: voce.descrizione,
    description: voce.descrizione,
    quantity: voce.quantita,
    unitPrice: voce.prezzoUnitario,
    total: voce.totale
  }))

  const validityDays = quoteData.preventivo.validitaGiorni || quoteData.condizioni?.validityDays || 60

  const baseQuote = {
    title: quoteData.preventivo.titolo,
    description: quoteData.preventivo.descrizione,
    clientName: quoteData.cliente.nome,
    status: 'draft' as const,
    currency: 'EUR',
    items: quoteItems,
    total: quoteData.totali.totale,
    subtotale: quoteData.totali.subtotale,
    iva: quoteData.totali.iva,
    percentualeIva: quoteData.totali.percentualeIva,
    obiettivi: quoteData.obiettivi,
    attivita: quoteData.attivita,
    voci: structuredVoci,
    terminiCondizioni: quoteData.condizioni.paymentTerms,
    validUntil: new Date(Date.now() + (validityDays * 24 * 60 * 60 * 1000)),
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId,
    createdBy,
    brandMateriali: quoteData.brandMateriali
  }

  // DUAL CLIENT MODE: Set appropriate fields based on client type
  if (clientMode?.clientId) {
    // PLATFORM CLIENT MODE: Use clientId from platform
    return {
      ...baseQuote,
      clientId: clientMode.clientId,
      clientEmail: quoteData.cliente.email
    }
  } else if (clientMode?.externalClientName && clientMode?.externalClientEmail) {
    // EXTERNAL CLIENT MODE: Use external client data
    return {
      ...baseQuote,
      externalClientName: clientMode.externalClientName,
      externalClientEmail: clientMode.externalClientEmail,
      clientEmail: clientMode.externalClientEmail
    }
  } else {
    // LEGACY/FALLBACK: No client mode specified, use cliente data from AI
    // This maintains backward compatibility
    return {
      ...baseQuote,
      externalClientName: quoteData.cliente.nome,
      externalClientEmail: quoteData.cliente.email || '',
      clientEmail: quoteData.cliente.email || ''
    }
  }
}
