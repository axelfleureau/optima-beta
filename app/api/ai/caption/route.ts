export const dynamic = 'force-dynamic'

import type { NextRequest } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOrganizationAdminId, logTokenUsage, estimateTokens } from "@/lib/token-service"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const { prompt, systemPrompt, userId, maxTokens = 1000, temperature = 0.7, postId } = await request.json()

    if (!prompt || !userId) {
      console.error("Missing required fields:", { prompt: !!prompt, userId: !!userId })
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("🚀 AI Caption request:", { userId, promptLength: prompt.length })

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.trim() === "") {
      console.error("❌ OPENAI_API_KEY not found or empty in environment variables")
      return new Response(
        JSON.stringify({
          error: "Configurazione API mancante. Contatta l'amministratore per configurare OPENAI_API_KEY.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Get organization admin ID for token tracking
    let adminId: string
    let userRole: string

    try {
      const result = await getOrganizationAdminId(userId)
      adminId = result.adminId
      userRole = result.userRole
      console.log(`Caption API: User ${userId} (${userRole}) will use admin ${adminId} tokens`)
    } catch (error) {
      console.error("Error getting admin ID, using userId as fallback:", error)
      adminId = userId
      userRole = "unknown"
    }

    // Validate adminId
    if (!adminId || adminId === "undefined") {
      console.error("❌ Invalid adminId, cannot proceed with token logging")
      return new Response(JSON.stringify({ error: "Invalid user configuration" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("🤖 Generating caption with OpenAI...")

    // Build messages array
    const messages = [
      {
        role: "system" as const,
        content:
          systemPrompt ||
          "Sei un esperto copywriter di social media. Crea caption coinvolgenti e ottimizzate per ogni piattaforma.",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ]

    // Estimate tokens
    const fullPrompt = JSON.stringify(messages)
    const estimatedInputTokens = estimateTokens(fullPrompt)
    console.log(`💰 Estimated input tokens: ${estimatedInputTokens}`)

    const MAX_RETRIES = 2
    let lastError: any = null
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${MAX_RETRIES + 1} to generate caption...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        const result = await generateText({
          model: openai("gpt-4o-mini"),
          messages,
          maxTokens,
          temperature,
          abortSignal: controller.signal,
        })
        
        clearTimeout(timeoutId)

        const responseText = result.text

        // Calculate actual tokens used
        const actualOutputTokens = Math.ceil(responseText.length / 3.5)
        const totalTokensUsed = estimatedInputTokens + actualOutputTokens

        console.log(`✅ Caption generated successfully on attempt ${attempt + 1}`)
        console.log(
          `💰 Total tokens used: ${totalTokensUsed} (${estimatedInputTokens} input + ${actualOutputTokens} output)`,
        )

      // If postId is provided, save the AI content separately
      if (postId) {
        try {
          const { db } = await import("@/lib/firebase")
          const { collection, addDoc, Timestamp } = await import("firebase/firestore")

          await addDoc(collection(db, "ai_generated_content"), {
            postId,
            type: "caption",
            content: responseText,
            metadata: {
              generatedAt: Timestamp.now(),
              model: "gpt-4o-mini",
              tokensUsed: totalTokensUsed,
            },
            tenantId: adminId, // use adminId as tenantId for now
            createdBy: userId,
            createdAt: Timestamp.now(),
          })

          console.log(`✅ AI caption saved separately for post ${postId}`)
        } catch (saveError) {
          console.error("❌ Error saving AI content separately:", saveError)
          // Do not block the response if saving fails
        }
      }

      // Log token usage
      try {
        await logTokenUsage(adminId, userId, totalTokensUsed, "other")
        console.log("✅ Successfully logged token usage for caption generation")
      } catch (error) {
        console.error("❌ Error logging token usage:", error)
        // Don't fail the whole operation if token tracking fails
      }

        // Return the generated caption
        return new Response(
          JSON.stringify({
            text: responseText,
            usage: {
              totalTokens: totalTokensUsed,
              promptTokens: estimatedInputTokens,
              completionTokens: actualOutputTokens,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
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

    console.error("❌ All retry attempts failed for caption generation")
    
    const errorMessage = lastError?.name === 'AbortError' 
      ? "La generazione della caption ha richiesto troppo tempo. Riprova tra qualche istante."
      : lastError?.message?.includes('API') || lastError?.message?.includes('fetch')
      ? "Errore di connessione con il servizio AI. Controlla la tua connessione e riprova."
      : "Errore nella generazione della caption. Riprova tra qualche istante."
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? lastError?.message : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("❌ Caption API handler error:", error)
    return new Response(
      JSON.stringify({
        error: "Errore interno del server: " + (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
