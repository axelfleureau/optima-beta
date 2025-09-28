"// AI Quote Service - Server and client compatible"

import { generateAIResponse, logTokenUsage } from "@/lib/ai-service"
import type { Client } from "@/lib/types"

export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  title: string
  description?: string
  clientId: string
  clientName: string
  status: "draft" | "sent" | "pending" | "accepted" | "rejected" | "expired"
  currency: string
  items: QuoteItem[]
  total: number
  validUntil: Date
  createdAt: Date
  updatedAt: Date
  tenantId: string
  createdBy: string
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
  }
  voci: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    totale: number
    categoria: string
  }>
  condizioni: {
    metodoPagamento: string
    tempiConsegna: string
    garanzia?: string
    note?: string
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

const QUOTE_SYSTEM_PROMPT = `Sei un esperto commerciale specializzato nella creazione di preventivi professionali per servizi di marketing e comunicazione.

Analizza la descrizione del progetto fornita e genera un preventivo dettagliato in formato JSON.

REGOLE IMPORTANTI:
1. Usa prezzi realistici per il mercato italiano del marketing/comunicazione
2. Includi sempre IVA al 22%
3. Suggerisci voci dettagliate e specifiche
4. Usa nomenclatura professionale italiana
5. Restituisci SOLO il JSON valido, senza testo aggiuntivo

CATEGORIE SERVIZI:
- Strategia e Consulenza: €500-2000/giorno
- Creazione Contenuti: €50-200/contenuto
- Gestione Social Media: €800-2500/mese
- Advertising/PPC: €300-1000/mese + budget ads
- Design Grafico: €300-800/progetto
- Sviluppo Web: €1000-5000/progetto
- Video/Foto: €500-2000/servizio
- SEO/SEM: €600-1500/mese
- Email Marketing: €400-1000/mese
- Formazione: €800-1500/giornata

FORMATO JSON RICHIESTO:
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
    "validitaGiorni": 30
  },
  "voci": [
    {
      "descrizione": "string",
      "quantita": number,
      "prezzoUnitario": number,
      "totale": number,
      "categoria": "string"
    }
  ],
  "condizioni": {
    "metodoPagamento": "string",
    "tempiConsegna": "string",
    "garanzia": "string",
    "note": "string"
  },
  "totali": {
    "subtotale": number,
    "iva": number,
    "percentualeIva": 22,
    "totale": number,
    "sconto": number,
    "percentualeSconto": number
  }
}`

export async function generateQuoteFromText(
  data: QuoteGenerationData,
  userId: string
): Promise<GeneratedQuoteData> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const quoteNumber = `RIG-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    
    const prompt = `Analizza questa richiesta di progetto e genera un preventivo professionale:

DESCRIZIONE PROGETTO: ${data.projectDescription}

${data.clientName ? `CLIENTE: ${data.clientName}` : ''}
${data.clientEmail ? `EMAIL: ${data.clientEmail}` : ''}
${data.clientCompany ? `AZIENDA: ${data.clientCompany}` : ''}
${data.budget ? `BUDGET INDICATIVO: ${data.budget}` : ''}
${data.deadline ? `SCADENZA: ${data.deadline}` : ''}
${data.additionalRequirements ? `REQUISITI AGGIUNTIVI: ${data.additionalRequirements}` : ''}

Genera un preventivo dettagliato con:
- Voci specifiche e professionali per i servizi richiesti
- Prezzi competitivi per il mercato italiano
- Numero preventivo: ${quoteNumber}
- Data creazione: ${today}
- Totali con IVA calcolata correttamente

Restituisci SOLO il JSON senza altro testo.`

    console.log("🤖 Generating AI quote for user:", userId)
    
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

    // Recalculate totals to ensure accuracy
    const subtotale = quoteData.voci.reduce((sum, voce) => sum + voce.totale, 0)
    const sconto = quoteData.totali.sconto || 0
    const subtotaleConSconto = subtotale - sconto
    const iva = subtotaleConSconto * 0.22
    const totale = subtotaleConSconto + iva

    quoteData.totali = {
      ...quoteData.totali,
      subtotale,
      iva: Number(iva.toFixed(2)),
      percentualeIva: 22,
      totale: Number(totale.toFixed(2))
    }

    // Ensure each voce has correct totale
    quoteData.voci = quoteData.voci.map(voce => ({
      ...voce,
      totale: Number((voce.quantita * voce.prezzoUnitario).toFixed(2))
    }))

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

export function convertToQuoteFormat(quoteData: GeneratedQuoteData, tenantId: string, createdBy: string): Omit<Quote, 'id'> {
  // SECURITY: Only use server-provided tenantId and createdBy, never client data
  const quoteItems: QuoteItem[] = quoteData.voci.map(voce => ({
    description: voce.descrizione,
    quantity: voce.quantita,
    unitPrice: voce.prezzoUnitario,
    total: voce.totale
  }))

  return {
    title: quoteData.preventivo.titolo,
    description: quoteData.preventivo.descrizione,
    clientId: '', // Will be set when creating actual client
    clientName: quoteData.cliente.nome,
    status: 'draft',
    currency: 'EUR',
    items: quoteItems,
    total: quoteData.totali.totale,
    validUntil: new Date(Date.now() + (quoteData.preventivo.validitaGiorni * 24 * 60 * 60 * 1000)),
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId,
    createdBy
  }
}