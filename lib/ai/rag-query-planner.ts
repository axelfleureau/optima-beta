import { getOpenAIApiKey } from "./openai-runtime"

export interface RAGQueryPlan {
  collection: 'tasks' | 'clients' | 'editorialPosts' | 'ai_usage'
  filters: Record<string, any>
  fields: string[]
  limit: number
  orderBy?: { field: string; direction: 'asc' | 'desc' }
}

export interface RAGQueryPlannerParams {
  userMessage: string
  tenantId: string
  userId: string
}

export interface RAGQueryPlannerResponse {
  success: boolean
  queryPlan: RAGQueryPlan | null
  intent: string
  error?: string
}

export async function generateQueryPlan(
  params: RAGQueryPlannerParams
): Promise<RAGQueryPlannerResponse> {
  try {
    const apiKey = await getOpenAIApiKey()
    
    if (!apiKey || apiKey.trim() === '') {
      return {
        success: false,
        queryPlan: null,
        intent: '',
        error: 'Configurazione API mancante',
      }
    }

    const systemPrompt = `Sei un assistente AI che genera query plan Firestore da domande naturali.

SCHEMA FIRESTORE DISPONIBILE:

1. Collection "tasks":
   - Fields: id, title, description, status, priority, dueDate, assignee, clientId, clientName, tenantId
   - Status values: "todo", "in-progress", "review", "done"
   - Priority values: "low", "medium", "high", "urgent"

2. Collection "clients":
   - Fields: id, name, email, company, tenantId, industry, status

3. Collection "editorialPosts" (calendario editoriale):
   - Fields: id, title, content, scheduledDate, status, type, platform, clientId, tenantId
   - Type values: "post", "reel", "video"
   - Platform values: "instagram", "facebook", "linkedin", "tiktok"

4. Collection "ai_usage" (utilizzo token):
   - Fields: id, feature, tokensUsed, userId, adminId, tenantId, createdAt

ESEMPI:

User: "Mostra task in ritardo"
→ { collection: "tasks", filters: { "dueDate": "<TODAY" }, fields: ["title","dueDate","status","assignee"], limit: 50 }

User: "Analizza progetti di Stark Industries"
→ { collection: "tasks", filters: { "clientName": "Stark Industries" }, fields: ["title","description","status","priority"], limit: 50 }

User: "Contenuti Instagram pubblicati questo mese"
→ { collection: "editorialPosts", filters: { "platform": "instagram", "scheduledDate": ">=2025-10-01" }, fields: ["title","scheduledDate","status"], limit: 50 }

User: "Mostra tutti i progetti"
→ { collection: "tasks", filters: { "clientId": "all" }, fields: ["title","description","status","clientName"], limit: 50 }

User: "Tutti i clienti attivi"
→ { collection: "clients", filters: { "clientId": "all", "status": "active" }, fields: ["name","email","company","industry"], limit: 50 }

User: "Elenco clienti"
→ { collection: "clients", filters: { "clientId": "all" }, fields: ["name","email","company"], limit: 50 }

User: "Progetti in corso"
→ { collection: "tasks", filters: { "status": "in-progress" }, fields: ["title","status","assignee"], limit: 50 }

REGOLE:
- Includi SEMPRE tenantId filter (multi-tenant isolation)
- Limita a max 50 records per performance
- Seleziona solo fields necessari per la risposta
- GESTIONE CLIENTI:
  * Se utente chiede "tutti i clienti", "all clients", "mostra tutti i progetti", "elenco clienti" → aggiungi "clientId": "all"
  * Se utente menziona un cliente specifico (es. "Stark", "Acme") → usa "clientName": "NomeCliente"
  * Se utente NON menziona clienti → NON aggiungere filtro clientId
- Se menziona date, usa ISO format (YYYY-MM-DD)
- Se menziona "in ritardo", filtra dueDate < today

Rispondi SOLO con JSON nel formato:
{
  "collection": "tasks|clients|editorialPosts|ai_usage",
  "filters": { ... },
  "fields": [ ... ],
  "limit": 50,
  "intent": "breve descrizione di cosa vuole sapere l'utente"
}`

    const userPrompt = `Domanda utente: "${params.userMessage}"

TenantId: ${params.tenantId}
UserId: ${params.userId}

Genera il query plan Firestore.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ GPT-4 API error:', errorData)
      
      return {
        success: false,
        queryPlan: null,
        intent: '',
        error: errorData.error?.message || 'Errore nella generazione query plan',
      }
    }

    const data = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        queryPlan: null,
        intent: '',
        error: 'Nessuna risposta da GPT-4',
      }
    }

    const content = data.choices[0].message?.content
    if (!content) {
      return {
        success: false,
        queryPlan: null,
        intent: '',
        error: 'Risposta vuota da GPT-4',
      }
    }

    const parsed = JSON.parse(content)
    
    if (!parsed.collection || !parsed.filters || !parsed.fields) {
      return {
        success: false,
        queryPlan: null,
        intent: parsed.intent || '',
        error: 'Query plan incompleto',
      }
    }

    const queryPlan: RAGQueryPlan = {
      collection: parsed.collection,
      filters: {
        ...parsed.filters,
        tenantId: params.tenantId,
      },
      fields: parsed.fields,
      limit: parsed.limit || 50,
      orderBy: parsed.orderBy,
    }

    console.log('✅ Query plan generated:', queryPlan)

    return {
      success: true,
      queryPlan,
      intent: parsed.intent || params.userMessage,
    }
  } catch (error) {
    console.error('❌ Error generating query plan:', error)
    return {
      success: false,
      queryPlan: null,
      intent: '',
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    }
  }
}
