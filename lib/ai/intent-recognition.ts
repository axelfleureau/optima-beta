import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import type { CommandContext, NLPResponse, CommandIntent } from "@/lib/types"

const IntentSchema = z.object({
  intent: z.enum([
    "CREATE_TASK",
    "SEARCH_TASK",
    "ASSIGN_TASK",
    "UPDATE_TASK",
    "DELETE_TASK",
    "GENERATE_IMAGE",
    "PLAN_CAMPAIGN",
    "NAVIGATE",
    "SEARCH_GLOBAL",
    "SHOW_ANALYTICS",
    "CREATE_CLIENT",
    "CREATE_CONTENT_POST",
    "CREATE_CONTENT_REEL",
    "CREATE_CONTENT_VIDEO",
    "CREATE_CONTENT_BATCH",
    "TASK_REFINEMENT",
    "GENERATE_DELIVERABLE",
    "CREATE_WEBSITE",
    "CREATE_GRAPHIC_DESIGN",
    "CREATE_VIDEO_PRODUCTION",
    "CREATE_SOFTWARE_DEV",
    "CREATE_CAMPAIGN_PROJECT",
    "UNKNOWN",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.any()).optional().default({}),
  missingParams: z.array(z.string()).optional(),
  suggestedAction: z.string().optional(),
  reasoning: z.string().optional(),
})

export async function recognizeIntent(
  message: string,
  context: CommandContext
): Promise<NLPResponse> {
  const clientNames = context.availableClients?.map((c) => c.name).join(", ") || "nessun cliente"
  const userNames =
    context.availableUsers?.map((u) => `${u.firstName} ${u.lastName}`).join(", ") || "nessun utente"

  const systemPrompt = `Sei un assistente AI per la piattaforma di marketing Optima. 
Analizza i comandi dell'utente ed estrai:

1. **Intent** (intenzione principale):
   - CREATE_TASK: Creare una nuova task
   - SEARCH_TASK: Cercare tasks esistenti
   - ASSIGN_TASK: Assegnare una task a qualcuno
   - UPDATE_TASK: Aggiornare una task esistente
   - DELETE_TASK: Eliminare una task
   - GENERATE_IMAGE: Generare immagini con AI
   - PLAN_CAMPAIGN: Pianificare una campagna
   - NAVIGATE: Navigare a una sezione dell'app
   - SEARCH_GLOBAL: Ricerca globale
   - SHOW_ANALYTICS: Mostrare analytics
   - CREATE_CLIENT: Creare un nuovo cliente
   - CREATE_CONTENT_POST: Creare post social (immagine/testo per Instagram/Facebook/LinkedIn)
   - CREATE_CONTENT_REEL: Creare reel/short video (Instagram Reels, TikTok, YouTube Shorts)
   - CREATE_CONTENT_VIDEO: Creare video lungo (YouTube, Facebook Video)
   - CREATE_CONTENT_BATCH: Creare batch di contenuti multipli
   - TASK_REFINEMENT: Raffinare una task con Technical Architect
   - GENERATE_DELIVERABLE: Generare deliverable (copy o visual) per una task
   - CREATE_WEBSITE: Creare sito web (landing page, corporate, e-commerce, portfolio)
   - CREATE_GRAPHIC_DESIGN: Creare grafica vettoriale, logo, branding, materiali stampa
   - CREATE_VIDEO_PRODUCTION: Organizzare shooting video professionale (location, regia, editing)
   - CREATE_SOFTWARE_DEV: Sviluppo software (app, tool, feature, integrazione)
   - CREATE_CAMPAIGN_PROJECT: Campagna completa con template e deliverable multipli
   - UNKNOWN: Non riconosciuto

2. **Entities** (parametri estratti dal messaggio):
   
   Per TASK intents:
   - title: titolo della task
   - description: descrizione
   - clientId/clientName: nome del cliente
   - priority: low, medium, high, urgent
   - assignee/assignedUserId: utente assegnatario
   - dueDate: data di scadenza
   - status: todo, in-progress, review, done
   
   Per CONTENT CREATION intents:
   - contentType: "post" | "reel" | "video" (tipo di contenuto)
   - platform: "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" (piattaforma social)
   - clientName: nome del cliente per cui creare il contenuto
   - topic: argomento/tema del contenuto
   - publishDate: data di pubblicazione (formato ISO: YYYY-MM-DD)
   - quantity: numero di contenuti da creare (per batch)
   
   Per TASK_REFINEMENT intent:
   - task_name: nome/descrizione della task da raffinare
   - task_id: ID della task (se noto)
   
   Per GENERATE_DELIVERABLE intent:
   - task_name: nome/descrizione della task
   - task_id: ID della task (se noto)
   - deliverable_type: "copy" | "visual" (tipo di deliverable da generare)
   
   Per WEBSITE intents:
   - websiteType: "landing" | "corporate" | "ecommerce" | "portfolio" | "blog"
   - clientName: nome del cliente
   - features: array di feature richieste (es: ["form contatto", "gallery", "blog"])
   - pages: numero di pagine (default: 1 per landing)
   - deadline: data consegna
   
   Per GRAPHIC_DESIGN intents:
   - designType: "logo" | "branding" | "brochure" | "packaging" | "vector"
   - clientName: nome del cliente
   - format: formato richiesto (es: "A4", "social", "web")
   - deliverables: array di deliverable (es: ["logo primario", "varianti colore", "brandbook"])
   
   Per VIDEO_PRODUCTION intents:
   - videoType: "corporate" | "commercial" | "interview" | "event" | "tutorial"
   - clientName: nome del cliente
   - duration: durata in minuti
   - location: luogo shooting
   - deliverables: array (es: ["raw footage", "edited video", "social cuts"])
   
   Per SOFTWARE_DEV intents:
   - projectType: "app" | "feature" | "integration" | "api" | "tool"
   - clientName: nome del cliente
   - tech: tecnologie richieste (es: "React", "Python", "API REST")
   - scope: scope del progetto
   
   Per CAMPAIGN_PROJECT intents:
   - campaignType: "product_launch" | "rebranding" | "seasonal" | "awareness"
   - clientName: nome del cliente
   - channels: array canali (es: ["social", "email", "web"])
   - duration: durata campagna in giorni
   
   Per altri intents:
   - route: percorso di navigazione
   - any other relevant params

3. **Confidence** (0-1): Quanto sei sicuro dell'intent riconosciuto

4. **MissingParams**: Lista di parametri necessari ma mancanti

5. **SuggestedAction**: Azione suggerita per l'utente

Contesto disponibile:
- User role: ${context.userRole}
- Current view: ${context.currentView || "unknown"}
- Clienti disponibili: ${clientNames}
- Team members: ${userNames}

Esempi TASK:
- "crea task per Acme con priorità alta" → CREATE_TASK, entities: {clientName: "Acme", priority: "high"}
- "cerca task di Stark Industries" → SEARCH_TASK, entities: {clientName: "Stark Industries"}
- "assegna task a Mario Rossi" → ASSIGN_TASK, entities: {assignee: "Mario Rossi"}

Esempi CONTENT CREATION:
- "Crea post Instagram per cliente Acme" → CREATE_CONTENT_POST, entities: {contentType: "post", platform: "instagram", clientName: "Acme"}
- "Genera reel per Stark Industries sul prodotto Arc Reactor" → CREATE_CONTENT_REEL, entities: {contentType: "reel", clientName: "Stark Industries", topic: "prodotto Arc Reactor"}
- "Pianifica TikTok per domani su nuovo servizio" → CREATE_CONTENT_REEL, entities: {contentType: "reel", platform: "tiktok", topic: "nuovo servizio", publishDate: "2025-10-07"}
- "Fai 3 post social per cliente X questa settimana" → CREATE_CONTENT_BATCH, entities: {contentType: "post", clientName: "cliente X", quantity: 3}
- "Crea video YouTube per lancio prodotto" → CREATE_CONTENT_VIDEO, entities: {contentType: "video", platform: "youtube", topic: "lancio prodotto"}

Esempi TASK REFINEMENT & DELIVERABLE:
- "Raffina la task del post Instagram" → TASK_REFINEMENT, entities: {task_name: "post Instagram"}
- "Raffina task landing page" → TASK_REFINEMENT, entities: {task_name: "landing page"}
- "Genera copy per la task newsletter" → GENERATE_DELIVERABLE, entities: {task_name: "newsletter", deliverable_type: "copy"}
- "Genera visual per task social media" → GENERATE_DELIVERABLE, entities: {task_name: "social media", deliverable_type: "visual"}
- "Crea immagine per task banner" → GENERATE_DELIVERABLE, entities: {task_name: "banner", deliverable_type: "visual"}

Esempi WEBSITE:
- "crea landing page per cliente Acme" → CREATE_WEBSITE, entities: {websiteType: "landing", clientName: "Acme"}
- "sito e-commerce per Stark Industries con 20 pagine" → CREATE_WEBSITE, entities: {websiteType: "ecommerce", clientName: "Stark Industries", pages: 20}
- "portfolio per cliente X con gallery" → CREATE_WEBSITE, entities: {websiteType: "portfolio", clientName: "X", features: ["gallery"]}

Esempi GRAPHIC_DESIGN:
- "crea logo per cliente Acme" → CREATE_GRAPHIC_DESIGN, entities: {designType: "logo", clientName: "Acme"}
- "branding completo per Stark Industries" → CREATE_GRAPHIC_DESIGN, entities: {designType: "branding", clientName: "Stark Industries"}
- "brochure A4 per prodotto X" → CREATE_GRAPHIC_DESIGN, entities: {designType: "brochure", format: "A4", topic: "prodotto X"}

Esempi VIDEO_PRODUCTION:
- "shooting video corporate per cliente Acme" → CREATE_VIDEO_PRODUCTION, entities: {videoType: "corporate", clientName: "Acme"}
- "video commerciale 30 secondi per prodotto Y" → CREATE_VIDEO_PRODUCTION, entities: {videoType: "commercial", duration: 0.5, topic: "prodotto Y"}
- "intervista CEO Stark Industries" → CREATE_VIDEO_PRODUCTION, entities: {videoType: "interview", clientName: "Stark Industries"}

Esempi SOFTWARE_DEV:
- "sviluppa app mobile per cliente Acme" → CREATE_SOFTWARE_DEV, entities: {projectType: "app", clientName: "Acme"}
- "integrazione API Stripe per cliente X" → CREATE_SOFTWARE_DEV, entities: {projectType: "integration", tech: "Stripe", clientName: "X"}
- "feature login social per app Y" → CREATE_SOFTWARE_DEV, entities: {projectType: "feature", scope: "login social", clientName: "Y"}

Esempi CAMPAIGN_PROJECT:
- "campagna lancio prodotto per Acme su social ed email" → CREATE_CAMPAIGN_PROJECT, entities: {campaignType: "product_launch", clientName: "Acme", channels: ["social", "email"]}
- "rebranding Stark Industries con sito e materiali" → CREATE_CAMPAIGN_PROJECT, entities: {campaignType: "rebranding", clientName: "Stark Industries", channels: ["web", "print"]}

Altri esempi:
- "vai al calendario" → NAVIGATE, entities: {route: "/calendario-editoriale"}
- "mostra analytics" → SHOW_ANALYTICS

Rispondi SEMPRE in JSON con lo schema richiesto.`

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: IntentSchema,
      prompt: `${systemPrompt}\n\nComando utente: "${message}"`,
      temperature: 0.3,
    })

    const response: NLPResponse = {
      intent: object.intent as CommandIntent,
      confidence: object.confidence,
      entities: object.entities,
      missingParams: object.missingParams,
      suggestedAction: object.suggestedAction,
      reasoning: object.reasoning,
    }

    console.log("🤖 Intent Recognition Result:", response)
    return response
  } catch (error) {
    console.error("❌ Intent recognition error:", error)
    return {
      intent: "UNKNOWN" as CommandIntent,
      confidence: 0,
      entities: {},
      missingParams: [],
      suggestedAction: "Riprova con un comando più chiaro",
    }
  }
}
