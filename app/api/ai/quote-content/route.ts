import type { NextRequest } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getOrganizationAdminId, logTokenUsage, estimateTokens } from "@/lib/token-service"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const quoteContentSchema = z.object({
  titolo: z.string(),
  descrizione: z.string(),
  obiettivi: z.array(z.string()),
  attivita: z.array(z.string()),
  sitemap: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const { prompt, systemPrompt, userId, maxTokens = 1000, temperature = 0.7 } = await request.json()

    if (!prompt || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("🚀 AI Quote Content request:", { userId, promptLength: prompt.length })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Configurazione API mancante" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    let adminId: string
    try {
      const result = await getOrganizationAdminId(userId)
      adminId = result.adminId
    } catch (error) {
      adminId = userId
    }

    if (!adminId || adminId === "undefined") {
      return new Response(JSON.stringify({ error: "Invalid user configuration" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

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

    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: quoteContentSchema,
      mode: 'json',
      messages,
      maxTokens,
      temperature,
    })

    const responseObject = result.object
    const actualOutputTokens = Math.ceil(JSON.stringify(responseObject).length / 3.5)
    const totalTokensUsed = estimatedInputTokens + actualOutputTokens

    console.log(`💰 Quote content tokens used: ${totalTokensUsed}`)

    try {
      await logTokenUsage(adminId, userId, totalTokensUsed, "other")
    } catch (error) {
      console.error("❌ Error logging token usage:", error)
    }

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
  } catch (error) {
    console.error("❌ Quote content generation error:", error)
    return new Response(
      JSON.stringify({ error: "Errore nella generazione del contenuto preventivo" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
