export const dynamic = 'force-dynamic'

import type { NextRequest } from "next/server"
import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { z } from "zod"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { OPENAI_FAST_MODEL } from "@/lib/ai/models"

const quoteContentSchema = z.object({
  titolo: z.string(),
  descrizione: z.string(),
  obiettivi: z.array(z.string()),
  attivita: z.array(z.string()),
  sitemap: z.array(z.string()).optional()
})

async function getRuntimeSecret(name: string) {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (env as Record<string, string | undefined>)[name] || process.env[name] || ""
  } catch {
    return process.env[name] || ""
  }
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 3.5)
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const { prompt, systemPrompt, userId, maxTokens = 1000, temperature = 0.7 } = await request.json()

    if (!prompt || !userId) {
      console.error("❌ Missing required fields:", { hasPrompt: !!prompt, hasUserId: !!userId })
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("🚀 AI Quote Content request:", { userId, promptLength: prompt.length })

    const apiKey = await getRuntimeSecret("OPENAI_API_KEY")
    if (!apiKey || apiKey.trim() === "") {
      console.error("❌ OPENAI_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "Configurazione API mancante. Contatta l'amministratore." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const openai = createOpenAI({ apiKey })

    console.log("🤖 Generating quote content with OpenAI structured output...")

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt || "Sei un esperto nella generazione di preventivi professionali."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ]

    const fullPrompt = JSON.stringify(messages)
    const estimatedInputTokens = estimateTokens(fullPrompt)

    const MAX_RETRIES = 2
    let lastError: any = null
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${MAX_RETRIES + 1} to generate quote content...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        const result = await generateObject({
          model: openai(OPENAI_FAST_MODEL),
          schema: quoteContentSchema,
          mode: 'json',
          messages,
          maxTokens,
          temperature,
          abortSignal: controller.signal,
        })
        
        clearTimeout(timeoutId)

        const responseObject = result.object
        const actualOutputTokens = Math.ceil(JSON.stringify(responseObject).length / 3.5)
        const totalTokensUsed = estimatedInputTokens + actualOutputTokens

        console.log(`✅ Quote content generated successfully on attempt ${attempt + 1}`)
        console.log(`💰 Tokens used: ${totalTokensUsed}`)
        console.log("Quote content token tracking skipped in Cloudflare route", {
          userId,
          totalTokensUsed,
        })

        return new Response(
          JSON.stringify({
            object: responseObject,
            usage: {
              totalTokens: totalTokensUsed,
              promptTokens: estimatedInputTokens,
              completionTokens: actualOutputTokens,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      } catch (error: any) {
        lastError = error
        console.error(`❌ Attempt ${attempt + 1} failed:`, {
          name: error?.name,
          message: error?.message,
          cause: error?.cause?.message
        })
        
        if (error?.name === 'AbortError') {
          console.error("⏱️ Request timeout after 30 seconds")
        }
        
        if (attempt < MAX_RETRIES) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.log(`⏳ Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    console.error("❌ All retry attempts failed for quote content generation")
    
    const errorMessage = lastError?.name === 'AbortError' 
      ? "La generazione del preventivo ha richiesto troppo tempo. Riprova tra qualche istante."
      : lastError?.message?.includes('API') || lastError?.message?.includes('fetch')
      ? "Errore di connessione con il servizio AI. Controlla la tua connessione e riprova."
      : "Errore nella generazione del contenuto preventivo. Riprova tra qualche istante."
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? lastError?.message : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error("❌ Quote content generation handler error:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    })
    return new Response(
      JSON.stringify({ 
        error: "Errore interno del server. Contatta l'assistenza se il problema persiste.",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
