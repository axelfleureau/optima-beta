import { generateAIText, getOrganizationAdminId, logTokenUsage, SYSTEM_PROMPTS } from "./ai-service"

export interface VisualGenerationOptions {
  description: string
  style: "fotografico" | "illustrativo" | "minimalista" | "colorato" | "professionale" | "creativo"
  mood: "energico" | "rilassante" | "professionale" | "divertente" | "elegante" | "moderno"
  format: "square" | "story" | "landscape" | "portrait" | "reel"
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "tiktok"
  isCarousel?: boolean
  carouselCount?: number
}

export interface GeneratedVisual {
  id: string
  imageUrl: string
  prompt: string
  style: string
  format: string
  platform: string
}

// Generate visual descriptions for AI image generation
export async function generateVisualPrompt(options: VisualGenerationOptions, userId: string): Promise<string> {
  try {
    const { adminId } = await getOrganizationAdminId(userId)

    const formatSpecs = {
      square: "1:1 aspect ratio, perfetto per feed Instagram",
      story: "9:16 aspect ratio, verticale per Stories",
      landscape: "16:9 aspect ratio, orizzontale per Facebook/LinkedIn",
      portrait: "4:5 aspect ratio, verticale per Instagram feed",
      reel: "9:16 aspect ratio, verticale per Reels/TikTok",
    }

    const styleGuides = {
      fotografico: "stile fotografico realistico, alta qualità, professionale",
      illustrativo: "illustrazione digitale, colorata, stile grafico",
      minimalista: "design pulito, spazi bianchi, elementi essenziali",
      colorato: "colori vivaci e accattivanti, alto contrasto",
      professionale: "elegante, sobrio, adatto al business",
      creativo: "artistico, originale, fuori dagli schemi",
    }

    const moodGuides = {
      energico: "dinamico, vivace, motivazionale",
      rilassante: "calmo, sereno, tranquillo",
      professionale: "serio, competente, affidabile",
      divertente: "giocoso, allegro, spensierato",
      elegante: "raffinato, sofisticato, di classe",
      moderno: "contemporaneo, trendy, all'avanguardia",
    }

    const prompt = `
Crea un prompt dettagliato per generare un'immagine AI con queste specifiche:

DESCRIZIONE: ${options.description}
STILE: ${styleGuides[options.style]}
MOOD: ${moodGuides[options.mood]}
FORMATO: ${formatSpecs[options.format]}
PIATTAFORMA: ${options.platform}
${options.isCarousel ? `CAROSELLO: ${options.carouselCount || 3} immagini coordinate` : ""}

Il prompt deve essere:
- Dettagliato e specifico
- Ottimizzato per AI image generation
- Adatto per ${options.platform}
- In inglese per migliori risultati
- Includere aspetti tecnici (lighting, composition, style)

Restituisci SOLO il prompt per l'AI, senza spiegazioni.
`

    const result = await generateAIText({
      prompt,
      systemPrompt: SYSTEM_PROMPTS.VISUAL,
      maxTokens: 300,
      temperature: 0.7,
    })

    // Log token usage
    if (result.usage) {
      await logTokenUsage(adminId, userId, result.usage.totalTokens, "visual_prompt_generation")
    }

    return result.text.trim()
  } catch (error) {
    console.error("Error generating visual prompt:", error)
    throw new Error(
      `Impossibile generare il prompt visual: ${error instanceof Error ? error.message : "Errore sconosciuto"}`,
    )
  }
}

// Generate multiple visuals (simulated - in real implementation would call image generation API)
export async function generateVisuals(options: VisualGenerationOptions, userId: string): Promise<GeneratedVisual[]> {
  try {
    const prompt = await generateVisualPrompt(options, userId)

    const count = options.isCarousel ? options.carouselCount || 3 : 1
    const visuals: GeneratedVisual[] = []

    for (let i = 0; i < count; i++) {
      // In a real implementation, this would call an image generation API like DALL-E, Midjourney, or Stable Diffusion
      // For now, we'll return placeholder data
      visuals.push({
        id: `visual_${Date.now()}_${i}`,
        imageUrl: `/placeholder.svg?height=400&width=400&text=Generated+Visual+${i + 1}`,
        prompt: prompt,
        style: options.style,
        format: options.format,
        platform: options.platform,
      })
    }

    return visuals
  } catch (error) {
    console.error("Error generating visuals:", error)
    throw new Error(`Impossibile generare i visual: ${error instanceof Error ? error.message : "Errore sconosciuto"}`)
  }
}

// Check if visual generation is possible
export function canGenerateVisual(options: Partial<VisualGenerationOptions>): boolean {
  return !!(options.description && options.description.trim().length > 0)
}

// Get missing fields for visual generation
export function getMissingVisualFields(options: Partial<VisualGenerationOptions>): string[] {
  const missing: string[] = []

  if (!options.description || options.description.trim().length === 0) {
    missing.push("Descrizione del visual")
  }

  return missing
}

// Get visual suggestions based on options
export function getVisualSuggestions(options: Partial<VisualGenerationOptions>): string[] {
  const suggestions: string[] = []

  if (options.platform === "instagram" && options.format !== "square" && options.format !== "story") {
    suggestions.push("Per Instagram considera formato square (1:1) o story (9:16)")
  }

  if (options.platform === "linkedin" && options.style !== "professionale") {
    suggestions.push("Per LinkedIn considera uno stile più professionale")
  }

  if (options.isCarousel && (!options.carouselCount || options.carouselCount < 2)) {
    suggestions.push("Per un carosello efficace usa almeno 2-3 immagini")
  }

  if (!options.description || options.description.length < 20) {
    suggestions.push("Aggiungi più dettagli alla descrizione per visual migliori")
  }

  return suggestions
}

// AI Visual Service object for easier imports
export const aiVisualService = {
  generateVisualPrompt,
  generateVisuals,
  canGenerateVisual,
  getMissingVisualFields,
  getVisualSuggestions,
}
