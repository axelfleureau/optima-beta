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
    "UNKNOWN",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.any()),
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
   - UNKNOWN: Non riconosciuto

2. **Entities** (parametri estratti dal messaggio):
   - title: titolo della task
   - description: descrizione
   - clientId/clientName: nome del cliente
   - priority: low, medium, high, urgent
   - assignee/assignedUserId: utente assegnatario
   - dueDate: data di scadenza
   - status: todo, in-progress, review, done
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

Esempi:
- "crea task per Acme con priorità alta" → CREATE_TASK, entities: {clientName: "Acme", priority: "high"}
- "cerca task di Stark Industries" → SEARCH_TASK, entities: {clientName: "Stark Industries"}
- "assegna task a Mario Rossi" → ASSIGN_TASK, entities: {assignee: "Mario Rossi"}
- "vai al calendario" → NAVIGATE, entities: {route: "/calendario-editoriale"}
- "mostra analytics" → SHOW_ANALYTICS

Rispondi SEMPRE in JSON con lo schema richiesto.`

  try {
    const { object } = await generateObject({
      model: openai("gpt-4-turbo"),
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
