import { generateAIText, getOrganizationAdminId, logTokenUsage, SYSTEM_PROMPTS } from "./ai-service"
import { getOpenAIApiKey, hasOpenAIApiKey } from "./ai/openai-runtime"
// Note: fetch is now global in Node.js 18+, no import needed

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

// Generate visuals using direct OpenAI calls with proper server-side implementation
async function callOpenAIDallE(prompt: string, format: string): Promise<string | null> {
  const apiKey = await getOpenAIApiKey()
  if (!apiKey) {
    console.warn("⚠️ OpenAI API key non trovata")
    return null
  }

  // Get appropriate image size based on format
  const sizeMap = {
    square: "1024x1024",     // 1:1 per Instagram feed
    story: "1024x1792",      // 9:16 per Stories
    landscape: "1792x1024",  // 16:9 per Facebook/LinkedIn 
    portrait: "1024x1280",   // 4:5 per Instagram
    reel: "1024x1792"        // 9:16 per Reels/TikTok
  }

  const imageSize = sizeMap[format as keyof typeof sizeMap] || "1024x1024"

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: imageSize,
        quality: "standard",
        response_format: "url"
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`❌ Errore DALL-E:`, error)
      return null
    }

    const data = await response.json() as {
      data?: Array<{ url?: string }>
    }
    
    if (data.data?.[0]?.url) {
      return data.data[0].url
    }

    return null
  } catch (error) {
    console.error("Errore chiamata DALL-E:", error)
    return null
  }
}

// Generate multiple visuals (with proper server-side handling)
export async function generateVisuals(options: VisualGenerationOptions, userId: string): Promise<GeneratedVisual[]> {
  try {
    const { adminId } = await getOrganizationAdminId(userId)
    const prompt = await generateVisualPrompt(options, userId)
    
    const count = options.isCarousel ? options.carouselCount || 3 : 1
    const visuals: GeneratedVisual[] = []

    console.log(`🎨 Generazione ${count} visual AI...`)

    // Check if we have OpenAI API key
    const hasAPIKey = await hasOpenAIApiKey()

    // Generate each visual individually for better error handling
    for (let i = 0; i < count; i++) {
      try {
        let currentPrompt = prompt
        
        // Add variation for carousel images
        if (options.isCarousel && count > 1) {
          const variations = [
            "focus on product details",
            "show broader context", 
            "highlight key benefits",
            "include call to action elements",
            "show different angle or perspective"
          ]
          const variation = variations[i % variations.length]
          currentPrompt = `${prompt}, ${variation}`
        }

        let imageUrl: string | null = null

        if (hasAPIKey) {
          console.log(`🎨 Generazione AI per visual ${i + 1}/${count}`)
          imageUrl = await callOpenAIDallE(currentPrompt, options.format)
        }

        if (imageUrl) {
          console.log(`✅ Visual ${i + 1} generato con successo`)
          
          visuals.push({
            id: `visual_${Date.now()}_${i}`,
            imageUrl: imageUrl,
            prompt: currentPrompt,
            style: options.style,
            format: options.format,
            platform: options.platform,
          })

          // Log token usage for image generation (estimated)
          try {
            await logTokenUsage(adminId, userId, 100, "image_generation")
          } catch (logError) {
            console.warn("Warning: could not log token usage:", logError)
          }
        } else {
          console.log(`⚠️ Fallback a placeholder per visual ${i + 1}`)
          
          // Fallback to placeholder
          visuals.push({
            id: `visual_${Date.now()}_${i}`,
            imageUrl: `/api/placeholder/image?width=400&height=400&text=Visual+${i + 1}`,
            prompt: currentPrompt,
            style: options.style,
            format: options.format,
            platform: options.platform,
          })
        }

        // Add small delay between generations to avoid rate limiting
        if (i < count - 1 && hasAPIKey) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (imageError) {
        console.error(`❌ Errore generazione immagine ${i + 1}:`, imageError)
        
        // Add placeholder for failed generation
        visuals.push({
          id: `visual_${Date.now()}_${i}`,
          imageUrl: `/api/placeholder/image?width=400&height=400&text=Errore+${i + 1}`,
          prompt: prompt,
          style: options.style,
          format: options.format,
          platform: options.platform,
        })
      }
    }

    console.log(`🎨 Completata generazione: ${visuals.length}/${count} visual`)
    
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
