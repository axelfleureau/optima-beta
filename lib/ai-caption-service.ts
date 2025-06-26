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

export async function generateCaption(data: CaptionGenerationData, userId: string): Promise<string> {
  // Costruisci il prompt basato sui dati forniti
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

  const systemPrompt = `Sei un esperto copywriter e social media manager specializzato nella creazione di contenuti coinvolgenti e performanti per diverse piattaforme social.

Il tuo compito è generare una caption ottimizzata basata sui dati forniti, seguendo le best practice per ogni piattaforma e formato specifico.

LINEE GUIDA GENERALI:
- Scrivi sempre in italiano
- Usa un tono professionale ma coinvolgente
- Includi call-to-action appropriate
- Ottimizza per l'engagement della piattaforma specifica
- Usa hashtag strategici quando appropriato
- Mantieni la lunghezza ottimale per la piattaforma
- Considera il target audience specificato

SPECIFICHE PER PIATTAFORMA:
- Instagram: Usa emoji, hashtag strategici, storytelling
- LinkedIn: Tono professionale, insights di valore, networking
- Facebook: Conversazionale, domande per engagement
- TikTok: Trendy, divertente, call-to-action per interazione
- X (Twitter): Conciso, hashtag mirati, conversazionale
- YouTube: Descrittivo, SEO-friendly, call-to-action per iscrizioni

Genera una caption completa e pronta all'uso.`

  const userPrompt = `Genera una caption per questo contenuto:

DETTAGLI DEL POST:
- Titolo/Nome: ${data.name}
- Piattaforma/e: ${platformsText}
- Formato: ${formatText}
${objectiveText ? `- Obiettivo: ${objectiveText}` : ""}
${keywordsText ? `- Parole chiave: ${keywordsText}` : ""}
${data.targetAudience ? `- Target audience: ${data.targetAudience}` : ""}
${data.clientName ? `- Cliente: ${data.clientName}` : ""}
${dateText ? `- Data di pubblicazione: ${dateText}` : ""}

Crea una caption coinvolgente, ottimizzata per le piattaforme specificate e allineata con l'obiettivo indicato.`

  try {
    const response = await generateAIResponse(userPrompt, userId, systemPrompt)
    return response.text
  } catch (error) {
    console.error("Error generating caption:", error)
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
