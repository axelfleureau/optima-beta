import { NextRequest, NextResponse } from "next/server"
import { generateAIResponse, logTokenUsage } from "@/lib/ai-service"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"

const SECTION_REGENERATION_PROMPT = `Sei un commerciale esperto di Righello. Devi rigenerare SOLO la sezione specifica richiesta del preventivo.

IL TUO COMPITO È GENERARE CONTENUTO TESTUALE PERSONALIZZATO:
- Mantieni il contesto del progetto originale
- Personalizza in base al settore e tipo di progetto
- Restituisci SOLO il JSON richiesto per la sezione specifica

NON DEVI:
- Modificare altre sezioni del preventivo
- Calcolare prezzi o voci di costo
- Cambiare la struttura generale del preventivo

FORMATO RISPOSTA: Restituisci SOLO il JSON con il campo richiesto.`

interface RegenerateSectionRequest {
  section: 'obiettivi' | 'attivita' | 'sitemap' | 'descrizione'
  context: {
    projectDescription: string
    sector: string
    projectType: string
    projectTypeLabel?: string
    sectorLabel?: string
    currentData?: string[] | string
  }
}

export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get("firebase-auth-token")?.value

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Non autenticato" },
        { status: 401 }
      )
    }

    const decodedToken = await verifyFirebaseToken(authToken)
    const userData = await getUserData(decodedToken.uid)

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    const userId = decodedToken.uid
    const body: RegenerateSectionRequest = await req.json()
    const { section, context } = body

    if (!section || !context) {
      return NextResponse.json(
        { success: false, error: "Parametri mancanti" },
        { status: 400 }
      )
    }

    console.log(`🔄 Regenerating section: ${section}`)

    let prompt = ""
    let expectedFormat = ""

    switch (section) {
      case 'obiettivi':
        prompt = `Genera 3-5 obiettivi personalizzati per questo preventivo Righello:

INFORMAZIONI PROGETTO:
- Tipo: ${context.projectTypeLabel || context.projectType}
- Settore: ${context.sectorLabel || context.sector}
- Descrizione: ${context.projectDescription}

${context.currentData ? `OBIETTIVI ATTUALI (da migliorare o variare):
${Array.isArray(context.currentData) ? context.currentData.map((o, i) => `${i + 1}. ${o}`).join('\n') : context.currentData}` : ''}

Genera obiettivi che:
- Siano specifici per il settore ${context.sector}
- Riflettano le esigenze del tipo di progetto ${context.projectType}
- Siano misurabili e concreti
- Parlino direttamente ai benefici per il cliente

Restituisci SOLO JSON nel formato:
{ "obiettivi": ["Obiettivo 1", "Obiettivo 2", "..."] }`
        expectedFormat = "obiettivi"
        break

      case 'attivita':
        prompt = `Genera 4-6 attività specifiche per questo preventivo Righello:

INFORMAZIONI PROGETTO:
- Tipo: ${context.projectTypeLabel || context.projectType}
- Settore: ${context.sectorLabel || context.sector}
- Descrizione: ${context.projectDescription}

${context.currentData ? `ATTIVITÀ ATTUALI (da migliorare o variare):
${Array.isArray(context.currentData) ? context.currentData.map((a, i) => `${i + 1}. ${a}`).join('\n') : context.currentData}` : ''}

Genera attività che:
- Siano concrete e operative
- Riflettano il processo lavorativo di Righello per progetti ${context.projectType}
- Siano adatte al settore ${context.sector}
- Mostrino professionalità e competenza

Restituisci SOLO JSON nel formato:
{ "attivita": ["Attività 1", "Attività 2", "..."] }`
        expectedFormat = "attivita"
        break

      case 'sitemap':
        prompt = `Genera una sitemap appropriata (5-8 pagine) per questo sito web:

INFORMAZIONI PROGETTO:
- Tipo: ${context.projectTypeLabel || context.projectType}
- Settore: ${context.sectorLabel || context.sector}
- Descrizione: ${context.projectDescription}

${context.currentData ? `SITEMAP ATTUALE (da migliorare o variare):
${Array.isArray(context.currentData) ? context.currentData.map((p, i) => `${i + 1}. ${p}`).join('\n') : context.currentData}` : ''}

Genera una sitemap che:
- Includa le pagine essenziali (Homepage, Chi siamo, Contatti, ecc.)
- Sia specifica per il settore ${context.sector}
- Rifletta le necessità di un sito ${context.projectType}
- Sia logica e user-friendly

Restituisci SOLO JSON nel formato:
{ "sitemap": ["Homepage", "Chi siamo", "..."] }`
        expectedFormat = "sitemap"
        break

      case 'descrizione':
        prompt = `Genera una descrizione professionale (2-3 frasi) per questo preventivo Righello:

INFORMAZIONI PROGETTO:
- Tipo: ${context.projectTypeLabel || context.projectType}
- Settore: ${context.sectorLabel || context.sector}
- Descrizione originale: ${context.projectDescription}

${context.currentData ? `DESCRIZIONE ATTUALE (da migliorare o variare):
${context.currentData}` : ''}

Genera una descrizione che:
- Sia professionale e accattivante
- Riassuma efficacemente il progetto
- Parli al cliente in modo diretto
- Evidenzi il valore del servizio Righello

Restituisci SOLO JSON nel formato:
{ "descrizione": "Descrizione del preventivo professionale..." }`
        expectedFormat = "descrizione"
        break

      default:
        return NextResponse.json(
          { success: false, error: "Sezione non supportata" },
          { status: 400 }
        )
    }

    const aiResponse = await generateAIResponse(prompt, userId, SECTION_REGENERATION_PROMPT)

    let parsedResponse: any
    try {
      parsedResponse = JSON.parse(aiResponse.text)
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError)
      console.log("Raw response:", aiResponse.text)
      return NextResponse.json(
        { success: false, error: "Risposta AI non valida" },
        { status: 500 }
      )
    }

    if (!parsedResponse[expectedFormat]) {
      return NextResponse.json(
        { success: false, error: `Campo ${expectedFormat} mancante nella risposta` },
        { status: 500 }
      )
    }

    await logTokenUsage(userId, userId, aiResponse.usage?.totalTokens || 0, "quote_section_regeneration")

    console.log(`✅ Section ${section} regenerated successfully`)

    return NextResponse.json({
      success: true,
      data: parsedResponse[expectedFormat]
    })

  } catch (error) {
    console.error("❌ Error regenerating section:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Errore nella rigenerazione della sezione",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      },
      { status: 500 }
    )
  }
}
