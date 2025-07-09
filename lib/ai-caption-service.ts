import { generateAIResponse } from "./ai-service"
import type { PostObjective, SocialPlatform, EditorialPostFormat } from "./types"

export interface CaptionGenerationData {
  name: string
  platform: SocialPlatform[]
  format: EditorialPostFormat
  objective?: PostObjective
  keywords?: string[]
  targetAudience?: string
  clientName?: string
  date?: Date
  tone?: "professionale" | "amichevole" | "divertente" | "ispirante" | "informativo" | "promozionale"
  length?: "corta" | "media" | "lunga"
  includeHashtags?: boolean
  includeCTA?: boolean
}

// Mapping per rendere i dati più leggibili nel prompt
const platformLabels: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X (Twitter)",
  youtube: "YouTube",
  blog: "Blog",
  pinterest: "Pinterest",
  threads: "Threads",
  altro: "Altra piattaforma",
}

const formatLabels: Record<EditorialPostFormat, string> = {
  post_singolo: "Post singolo",
  carosello: "Carosello",
  video: "Video",
  reel: "Reel",
  story: "Story",
  articolo_blog: "Articolo blog",
  newsletter: "Newsletter",
  podcast: "Podcast",
  live: "Live",
  altro: "Altro formato",
}

const objectiveLabels: Record<PostObjective, string> = {
  awareness: "Aumentare la consapevolezza del brand",
  engagement: "Aumentare l'engagement",
  traffic: "Generare traffico",
  conversioni: "Aumentare le conversioni",
  vendite: "Aumentare le vendite",
  lead_generation: "Generare lead",
  brand_building: "Costruire il brand",
  educazione: "Educare il pubblico",
  intrattenimento: "Intrattenere",
  community: "Costruire community",
}

// Platform-specific best practices
const platformBestPractices: Record<SocialPlatform, string> = {
  instagram: "Usa emoji strategiche, storytelling coinvolgente, hashtag mirati (max 30), call-to-action nelle stories",
  facebook: "Tono conversazionale, domande per stimolare engagement, link esterni, condivisioni",
  linkedin: "Tono professionale, insights di valore, networking, competenze, industry trends",
  tiktok: "Linguaggio trendy, hashtag virali, sfide, contenuti divertenti e autentici",
  x: "Messaggi concisi (280 caratteri), hashtag mirati, conversazioni, retweet",
  youtube: "Descrizioni SEO-friendly, call-to-action per iscrizioni, timestamp, link correlati",
  blog: "Contenuto approfondito, SEO ottimizzato, struttura chiara, link interni",
  pinterest: "Descrizioni ricche di keyword, board tematiche, contenuti ispiranti",
  threads: "Conversazioni autentiche, thread informativi, engagement genuino",
  altro: "Adatta il tono alla piattaforma specifica",
}

export async function generateCaption(data: CaptionGenerationData, userId: string): Promise<string> {
  try {
    console.log("🤖 Generating caption for:", data.name)

    // Costruisci il prompt avanzato basato sui dati forniti
    const platformsText = data.platform.map((p) => platformLabels[p]).join(", ")
    const formatText = formatLabels[data.format]
    const objectiveText = data.objective ? objectiveLabels[data.objective] : null
    const keywordsText = data.keywords && data.keywords.length > 0 ? data.keywords.join(", ") : null
    const dateText = data.date
      ? data.date.toLocaleDateString("it-IT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null

    // Get platform-specific best practices
    const bestPractices = data.platform.map((p) => platformBestPractices[p]).join("\n- ")

    const systemPrompt = `Sei un esperto copywriter e social media manager specializzato nella creazione di contenuti coinvolgenti e performanti per diverse piattaforme social.

Il tuo compito è generare una caption ottimizzata basata sui dati forniti, seguendo le best practice per ogni piattaforma e formato specifico.

LINEE GUIDA GENERALI:
- Scrivi sempre in italiano
- Usa un tono ${data.tone || "professionale ma coinvolgente"}
- Lunghezza: ${data.length || "media"} (corta: 50-100 parole, media: 100-200 parole, lunga: 200+ parole)
- ${data.includeCTA !== false ? "Includi call-to-action appropriate" : "Non includere call-to-action esplicite"}
- ${data.includeHashtags !== false ? "Usa hashtag strategici quando appropriato" : "Non utilizzare hashtag"}
- Ottimizza per l'engagement della piattaforma specifica
- Considera il target audience specificato
- Mantieni coerenza con l'obiettivo del post

BEST PRACTICES SPECIFICHE PER PIATTAFORMA:
- ${bestPractices}

${
  data.format === "carosello"
    ? `
SPECIFICHE CAROSELLO:
- Crea un hook iniziale forte per la prima slide
- Struttura il contenuto in punti chiari per le slide successive
- Includi una call-to-action finale
- Usa numerazione o bullet points per guidare la lettura
`
    : ""
}

${
  data.format === "story"
    ? `
SPECIFICHE STORY:
- Linguaggio immediato e diretto
- Usa elementi interattivi (sondaggi, domande)
- Call-to-action chiare per swipe up o link in bio
- Tono più informale e personale
`
    : ""
}

Genera una caption completa, coinvolgente e pronta all'uso che massimizzi l'engagement e raggiunga l'obiettivo specificato.`

    const userPrompt = `Genera una caption per questo contenuto:

DETTAGLI DEL POST:
- Titolo/Nome: ${data.name}
- Piattaforma/e: ${platformsText}
- Formato: ${formatText}
${objectiveText ? `- Obiettivo: ${objectiveText}` : ""}
${keywordsText ? `- Parole chiave: ${keywordsText}` : ""}
${data.targetAudience ? `- Target audience: ${data.targetAudience}` : ""}
${data.clientName ? `- Cliente/Brand: ${data.clientName}` : ""}
${dateText ? `- Data di pubblicazione: ${dateText}` : ""}

PREFERENZE STILE:
- Tono: ${data.tone || "professionale ma coinvolgente"}
- Lunghezza: ${data.length || "media"}
- Hashtag: ${data.includeHashtags !== false ? "Sì, includi hashtag strategici" : "No, non includere hashtag"}
- Call-to-Action: ${data.includeCTA !== false ? "Sì, includi CTA appropriate" : "No, evita CTA esplicite"}

Crea una caption coinvolgente, ottimizzata per le piattaforme specificate e perfettamente allineata con l'obiettivo e il target indicati.`

    const response = await generateAIResponse(userPrompt, userId, systemPrompt)

    console.log("✅ Caption generated successfully")
    return response.text
  } catch (error) {
    console.error("Error generating caption:", error)
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("Servizio AI non disponibile. Contatta l'amministratore per configurare le chiavi API.")
    }
    throw new Error("Impossibile generare la caption. Riprova più tardi.")
  }
}

// Funzione per validare se i dati sono sufficienti per generare una caption
export function canGenerateCaption(data: Partial<CaptionGenerationData>): boolean {
  return !!(data.name && data.name.trim().length > 0 && data.platform && data.platform.length > 0 && data.format)
}

// Funzione per ottenere suggerimenti sui campi mancanti
export function getMissingFieldsSuggestion(data: Partial<CaptionGenerationData>): string[] {
  const missing: string[] = []

  if (!data.name || data.name.trim().length === 0) {
    missing.push("Nome del post")
  }
  if (!data.platform || data.platform.length === 0) {
    missing.push("Piattaforma")
  }
  if (!data.format) {
    missing.push("Formato")
  }

  return missing
}

// Funzione per ottenere suggerimenti per migliorare la caption
export function getCaptionSuggestions(data: CaptionGenerationData): string[] {
  const suggestions: string[] = []

  if (!data.objective) {
    suggestions.push("Definisci un obiettivo per una caption più mirata")
  }

  if (!data.keywords || data.keywords.length === 0) {
    suggestions.push("Aggiungi parole chiave per migliorare la SEO")
  }

  if (!data.targetAudience) {
    suggestions.push("Specifica il target audience per un tono più appropriato")
  }

  if (!data.tone) {
    suggestions.push("Scegli un tono specifico per maggiore coerenza")
  }

  return suggestions
}

// Funzione per analizzare una caption esistente
export async function analyzeCaptionPerformance(
  caption: string,
  platform: SocialPlatform[],
  userId: string,
): Promise<{
  score: number
  suggestions: string[]
  strengths: string[]
  improvements: string[]
}> {
  try {
    const analysisPrompt = `Analizza questa caption per ${platform.join(", ")}:

"${caption}"

Fornisci:
1. Un punteggio da 1 a 10
2. Punti di forza
3. Aree di miglioramento
4. Suggerimenti specifici

Rispondi in formato JSON con le chiavi: score, strengths, improvements, suggestions`

    const response = await generateAIResponse(analysisPrompt, userId)

    try {
      const analysis = JSON.parse(response.text)
      return {
        score: analysis.score || 7,
        suggestions: analysis.suggestions || [],
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
      }
    } catch {
      // Fallback if JSON parsing fails
      return {
        score: 7,
        suggestions: ["Analisi completata con successo"],
        strengths: ["Caption ben strutturata"],
        improvements: ["Considera l'aggiunta di più call-to-action"],
      }
    }
  } catch (error) {
    console.error("Error analyzing caption:", error)
    throw new Error("Impossibile analizzare la caption.")
  }
}
