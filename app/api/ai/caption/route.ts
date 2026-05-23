export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { OPENAI_FAST_MODEL } from "@/lib/ai/models"

function estimateTokens(input: string) {
  return Math.ceil(input.length / 4)
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { prompt, systemPrompt, maxTokens = 1000, temperature = 0.7 } = await request.json()

    if (!prompt) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey?.trim()) {
      return Response.json(
        { error: "Configurazione API mancante. Configura OPENAI_API_KEY." },
        { status: 500 },
      )
    }

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

    const fullPrompt = JSON.stringify(messages)
    const estimatedInputTokens = estimateTokens(fullPrompt)
    const result = await generateText({
      model: openai(OPENAI_FAST_MODEL),
      messages,
      maxTokens,
      temperature,
    })

    const responseText = result.text
    const actualOutputTokens = Math.ceil(responseText.length / 3.5)
    const totalTokensUsed = estimatedInputTokens + actualOutputTokens

    const db = await getCloudflareDb()
    if (db) {
      try {
        await db
          .prepare(
            `INSERT INTO ai_usage (id, organization_id, member_id, feature, model, input_tokens, output_tokens)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            createId("ai"),
            user.organizationId,
            user.id,
            "caption",
            OPENAI_FAST_MODEL,
            estimatedInputTokens,
            actualOutputTokens,
          )
          .run()
      } catch (error) {
        console.error("Error logging caption usage:", error)
      }
    }

    return Response.json({
      text: responseText,
      usage: {
        totalTokens: totalTokensUsed,
        promptTokens: estimatedInputTokens,
        completionTokens: actualOutputTokens,
      },
    })
  } catch (error) {
    console.error("Caption API handler error:", error)
    return Response.json(
      { error: "Errore interno del server: " + (error as Error).message },
      { status: 500 },
    )
  }
}
