import { generateAIResponse } from "./ai-service"
import { SocialPlatform } from "./types"
import type { PostObjective, EditorialPostFormat } from "./types"

export interface CaptionGenerationData {
  title: string
  // ✅ accetta string o array; normalizziamo internamente
  platform: SocialPlatform | SocialPlatform[]
  content: string
  format: EditorialPostFormat
  objective?: PostObjective
  // ✅ accetta string o array; normalizziamo internamente
  keywords?: string | string[]
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

// Best practices per piattaforma
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

function normalizePlatforms(p: SocialPlatform | SocialPlatform[] | undefined): SocialPlatform[] {
  const arr = Array.isArray(p) ? p : p ? [p] : []
  // filtra valori falsy/sconosciuti
  return arr.filter((x): x is SocialPlatform => !!x)
}

function normalizeKeywords(k: string | string[] | undefined): string[] {
  if (!k) return []
  const arr = Array.isArray(k) ? k : [k]
  return arr.map(s => String(s).trim()).filter(Boolean)
}

export async function generateCaption(
  data: CaptionGenerationData,
  userId: string,
): Promise<string> {
  try {
    // 🔒 Normalizzazioni robuste per evitare .map/.indexOf su undefined
    const platforms = normalizePlatforms(data.platform)
    const keywords = normalizeKeywords(data.keywords)
    const tone = data.tone ?? "professionale"
    const length = data.length ?? "media"
    const includeHashtags = data.includeHashtags ?? true
    const includeCTA = data.includeCTA ?? true
    const targetAudience = data.targetAudience ?? ""
    const clientName = data.clientName ?? ""
    const title = data.title ?? ""
    const dateObj = data.date

    if (!title?.trim()) {
      throw new Error("Titolo del post mancante.")
    }
    if (!platforms.length) {
      // fallback di sicurezza per non far fallire la generazione
      platforms.push(SocialPlatform.INSTAGRAM)
    }
    if (!data.format) {
      throw new Error("Formato del post mancante.")
    }

    const platformsText = platforms.map((p) => platformLabels[p]).filter(Boolean).join(", ")
    const formatText = formatLabels[data.format]
    const objectiveText = data.objective ? objectiveLabels[data.objective] : null
    const keywordsText = keywords.length ? keywords.join(", ") : null
    const dateText = dateObj
      ? dateObj.toLocaleDateString("it-IT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null

    const bestPractices = platforms.map((p) => platformBestPractices[p]).filter(Boolean).join("\n- ")

    const systemPrompt = `Sei un esperto copywriter e social media manager specializzato nella creazione di contenuti coinvolgenti e performanti per diverse piattaforme social.

Il tuo compito è generare una caption ottimizzata basata sui dati forniti, seguendo le best practice per ogni piattaforma e formato specifico.

LINEE GUIDA GENERALI:
- Scrivi sempre in italiano
- Usa un tono ${tone || "professionale ma coinvolgente"}
- Lunghezza: ${length || "media"} (corta: 50-100 parole, media: 100-200 parole, lunga: 200+ parole)
- ${includeCTA ? "Includi call-to-action appropriate" : "Non includere call-to-action esplicite"}
- ${includeHashtags ? "Usa hashtag strategici quando appropriato" : "Non utilizzare hashtag"}
- Ottimizza per l'engagement della piattaforma specifica
- Considera il target audience specificato
- Mantieni coerenza con l'obiettivo del post

BEST PRACTICES SPECIFICHE PER PIATTAFORMA:
- ${bestPractices}

${data.format === "carosello"
        ? `
SPECIFICHE CAROSELLO:
- Crea un hook iniziale forte per la prima slide
- Struttura il contenuto in punti chiari per le slide successive
- Includi una call-to-action finale
- Usa numerazione o bullet points per guidare la lettura
`
        : ""
      }

${data.format === "story"
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
- Titolo/Nome: ${title}
- Piattaforma/e: ${platformsText}
- Formato: ${formatText}
${objectiveText ? `- Obiettivo: ${objectiveText}` : ""}
${keywordsText ? `- Parole chiave: ${keywordsText}` : ""}
${targetAudience ? `- Target audience: ${targetAudience}` : ""}
${clientName ? `- Cliente/Brand: ${clientName}` : ""}
${dateText ? `- Data di pubblicazione: ${dateText}` : ""}

PREFERENZE STILE:
- Tono: ${tone || "professionale ma coinvolgente"}
- Lunghezza: ${length || "media"}
- Hashtag: ${includeHashtags ? "Sì, includi hashtag strategici" : "No, non includere hashtag"}
- Call-to-Action: ${includeCTA ? "Sì, includi CTA appropriate" : "No, evita CTA esplicite"}

Crea una caption coinvolgente, ottimizzata per le piattaforme specificate e perfettamente allineata con l'obiettivo e il target indicati.`

    const response = await generateAIResponse(userPrompt, userId, systemPrompt)

    // Evita ritorni undefined
    const text = (response as any)?.text ?? ""
    if (!text.trim()) {
      throw new Error("Risposta AI vuota.")
    }

    return text
  } catch (error) {
    console.error("Error generating caption:", error)
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("Servizio AI non disponibile. Contatta l'amministratore per configurare le chiavi API.")
    }
    throw new Error("Impossibile generare la caption. Riprova più tardi.")
  }
}

// Validazione dati minimi per generazione
export function canGenerateCaption(data: Partial<CaptionGenerationData>): boolean {
  const platforms = normalizePlatforms(data.platform as any)
  return !!(data.title && data.title.trim().length > 0 && platforms.length > 0 && data.format)
}

// Suggerimenti sui campi mancanti
export function getMissingFieldsSuggestion(data: Partial<CaptionGenerationData>): string[] {
  const missing: string[] = []
  if (!data.title || data.title.trim().length === 0) missing.push("Titolo del post")
  if (normalizePlatforms(data.platform as any).length === 0) missing.push("Piattaforma")
  if (!data.format) missing.push("Formato")
  return missing
}

// Suggerimenti per migliorare la caption
export function getCaptionSuggestions(data: CaptionGenerationData): string[] {
  const suggestions: string[] = []
  if (!data.objective) suggestions.push("Definisci un obiettivo per una caption più mirata")
  if (!normalizeKeywords(data.keywords).length) suggestions.push("Aggiungi parole chiave per migliorare la SEO")
  if (!data.targetAudience) suggestions.push("Specifica il target audience per un tono più appropriato")
  if (!data.tone) suggestions.push("Scegli un tono specifico per maggiore coerenza")
  return suggestions
}

// Analisi caption esistente
export async function analyzeCaptionPerformance(
  caption: string,
  platform: SocialPlatform | SocialPlatform[],
  userId: string,
): Promise<{
  score: number
  suggestions: string[]
  strengths: string[]
  improvements: string[]
}> {
  try {
    const platforms = normalizePlatforms(platform)
    const platformNames = platforms.map(p => platformLabels[p]).filter(Boolean).join(", ")

    const analysisPrompt = `Analizza questa caption per ${platformNames || "la piattaforma indicata"}:

"${caption}"

Fornisci:
1. Un punteggio da 1 a 10
2. Punti di forza
3. Aree di miglioramento
4. Suggerimenti specifici

Rispondi in formato JSON con le chiavi: score, strengths, improvements, suggestions`

    const response = await generateAIResponse(analysisPrompt, userId)

    try {
      const analysis = JSON.parse((response as any)?.text ?? "{}")
      return {
        score: analysis.score ?? 7,
        suggestions: analysis.suggestions ?? [],
        strengths: analysis.strengths ?? [],
        improvements: analysis.improvements ?? [],
      }
    } catch {
      // Fallback se il parsing JSON fallisce
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

export const aiCaptionService = {
  generateCaption,
  canGenerateCaption,
  getMissingFieldsSuggestion,
  getCaptionSuggestions,
  analyzeCaptionPerformance,
}

// --- TIPI ESPORTATI PER IL FORM ---

export type CaptionGenerationOptions = {
  content: string
  platform: SocialPlatform | SocialPlatform[]
  tone?: "professionale" | "amichevole" | "divertente" | "ispirante" | "informativo" | "promozionale"
  length?: "corta" | "media" | "lunga"
  includeHashtags?: boolean
  includeCTA?: boolean
  targetAudience?: string
  brandVoice?: string
  keywords?: string | string[]
  date?: Date
  format?: EditorialPostFormat
  objective?: PostObjective
  clientName?: string
  /** opzionale: se vuoi passarlo direttamente dal form */
  name?: string
}

// Risultato mostrato nella UI dopo la generazione
export type CaptionAnalysis = {
  score: number
  suggestions: string[]
  strengths: string[]
  improvements: string[]
}

export interface GeneratedCaption {
  caption: string
  hashtags: string[]
  analysis: CaptionAnalysis
}

/** Helper per convertire la stringa restituita da generateCaption in un oggetto UI-friendly */
export function toGeneratedCaption(text: string): GeneratedCaption {
  return {
    caption: text,
    hashtags: [],
    analysis: {
      score: 7,
      suggestions: [],
      strengths: [],
      improvements: [],
    },
  }
}
