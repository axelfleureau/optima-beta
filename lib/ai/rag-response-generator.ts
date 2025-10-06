export interface RAGResponseGeneratorParams {
  userMessage: string
  retrievedData: any[]
  intent: string
  context?: {
    collectionQueried?: string
    recordCount?: number
  }
}

export interface RAGResponseGeneratorResponse {
  success: boolean
  response: string
  tokensUsed: number
  error?: string
}

export async function generateResponse(
  params: RAGResponseGeneratorParams
): Promise<RAGResponseGeneratorResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey.trim() === '') {
      return {
        success: false,
        response: '',
        tokensUsed: 0,
        error: 'Configurazione API mancante',
      }
    }

    console.log('🤖 RAG Response Generator: Generating response', {
      userMessage: params.userMessage.substring(0, 50) + '...',
      dataCount: params.retrievedData.length,
      intent: params.intent,
    })

    const systemPrompt = `Sei un assistente AI intelligente per la piattaforma Optima, specializzato nell'analisi di progetti, task e contenuti editoriali.

RUOLO:
- Rispondi SEMPRE in italiano conversazionale e professionale
- Usa i dati forniti per dare risposte precise e contestuali
- Fornisci insights utili e suggestions actionable
- Formatta le risposte in modo leggibile (usa elenchi puntati, numeri, spaziature)
- Se i dati sono vuoti o mancanti, dillo chiaramente all'utente

STILE:
- Professionale ma friendly
- Diretto e conciso
- Evidenzia informazioni importanti (task in ritardo, priorità alte, deadline vicine)
- Termina sempre con un suggerimento o azione consigliata quando appropriato

FORMATTING:
- Usa **grassetto** per evidenziare punti chiave
- Usa elenchi numerati o puntati per liste
- Usa emoji occasionalmente per enfasi: ⚠️ (urgente), ✅ (completato), 🔴 (problema), ⏰ (deadline)
- Mantieni paragrafi brevi (max 2-3 righe)

ESEMPI:

Domanda: "Mostra task in ritardo"
Dati: [{ title: "Website update", dueDate: "2025-10-05", status: "in-progress" }]
Risposta: "⚠️ **Hai 1 task in ritardo**:\n\n• Website update - scadenza 5 ottobre (status: in corso)\n\n💡 **Suggerimento**: Prioritizza questa task o estendi la deadline per evitare blocchi nel workflow."

Domanda: "Analizza progetti Stark"
Dati: [{ title: "Arc Reactor", status: "done" }, { title: "Suit Upgrade", status: "in-progress" }]
Risposta: "**Stark Industries - 2 progetti**:\n\n✅ Arc Reactor - completato\n🔄 Suit Upgrade - in corso\n\n📊 **Stato**: 50% completato. Il progetto attivo procede senza blocchi evidenti."

IMPORTANTE:
- NON inventare dati - usa solo quelli forniti
- Se nessun dato trovato, suggerisci cosa l'utente può fare
- Includi sempre numeri e metriche concrete quando disponibili`

    const dataFormatted = params.retrievedData.length > 0
      ? JSON.stringify(params.retrievedData, null, 2)
      : '[] (nessun dato trovato)'
    
    const userPrompt = `Domanda dell'utente: "${params.userMessage}"

Intent rilevato: ${params.intent}

Dati recuperati (${params.retrievedData.length} record${params.context?.collectionQueried ? ` dalla collezione ${params.context.collectionQueried}` : ''}):
\`\`\`json
${dataFormatted}
\`\`\`

Genera una risposta conversazionale in italiano che analizza questi dati e risponde alla domanda dell'utente.`

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
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ GPT-4 API error:', errorData)
      
      return {
        success: false,
        response: '',
        tokensUsed: 0,
        error: errorData.error?.message || 'Errore nella generazione risposta',
      }
    }

    const data = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        response: '',
        tokensUsed: 0,
        error: 'Nessuna risposta da GPT-4',
      }
    }

    const aiResponse = data.choices[0].message?.content
    if (!aiResponse) {
      return {
        success: false,
        response: '',
        tokensUsed: 0,
        error: 'Risposta vuota da GPT-4',
      }
    }

    const tokensUsed = data.usage?.total_tokens || 0

    console.log('✅ Response generated:', {
      responseLength: aiResponse.length,
      tokensUsed,
    })

    return {
      success: true,
      response: aiResponse.trim(),
      tokensUsed,
    }
  } catch (error) {
    console.error('❌ Error generating response:', error)
    return {
      success: false,
      response: '',
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    }
  }
}
