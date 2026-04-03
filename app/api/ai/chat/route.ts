export const dynamic = 'force-dynamic'

import type { NextRequest } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getOrganizationAdminId, logTokenUsage, estimateTokens } from "@/lib/token-service"
import { createChatSession, saveChatMessage, getChatHistory } from "@/lib/chat-service"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const SYSTEM_PROMPT = `Sei un assistente marketing esperto per Optima, una piattaforma di marketing digitale.
Aiuti gli utenti con:
- Creazione di contenuti (email, post social, annunci)
- Strategie di marketing
- Ottimizzazione delle campagne
- Idee creative
- Copywriting

Rispondi sempre in italiano in modo professionale, pratico e coinvolgente.
Fornisci consigli attuabili e basati sulle migliori pratiche del marketing digitale.
Usa un tono amichevole ma competente.

Se l'utente fa riferimento a conversazioni precedenti, usa il contesto fornito per dare risposte coerenti e personalizzate.`

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const { message, userId, sessionId } = await request.json()

    if (!message || !userId) {
      console.error("Missing required fields:", { message: !!message, userId: !!userId })
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("🚀 AI Chat request:", { userId, sessionId, messageLength: message.length })

    // Check for OpenAI API key with better error handling
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

    console.log("✅ OpenAI API key found, length:", apiKey.length)

    // Get organization admin ID with error handling
    let adminId: string
    let userRole: string

    try {
      const result = await getOrganizationAdminId(userId)
      adminId = result.adminId
      userRole = result.userRole
      console.log(`Chat API: User ${userId} (${userRole}) will use admin ${adminId} tokens`)
    } catch (error) {
      console.error("Error getting admin ID, using userId as fallback:", error)
      adminId = userId
      userRole = "unknown"
    }

    // 🚨 CRITICAL: Validate adminId before proceeding
    if (!adminId || adminId === "undefined") {
      console.error("❌ Invalid adminId, cannot proceed with token logging")
      return new Response(JSON.stringify({ error: "Invalid user configuration" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Create or use existing session with error handling
    let currentSessionId = sessionId
    if (!currentSessionId) {
      try {
        currentSessionId = await createChatSession(userId, adminId, message)
        console.log("Created new session:", currentSessionId)
      } catch (error) {
        console.error("Error creating session, continuing without session:", error)
        currentSessionId = `temp_${Date.now()}`
      }
    }

    // Get conversation history for context (last 10 messages for memory)
    let conversationHistory: any[] = []
    try {
      const history = await getChatHistory(currentSessionId)
      // Take last 10 messages for context (economical approach)
      conversationHistory = history.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content.substring(0, 500), // Limit content length for cost efficiency
      }))
      console.log(`📚 Loaded ${conversationHistory.length} messages for context`)
    } catch (error) {
      console.error("Error loading conversation history:", error)
    }

    // Save user message to chat history (don't fail if this fails)
    try {
      await saveChatMessage(currentSessionId, message, "user", userId, adminId)
      console.log("Saved user message to chat history")
    } catch (error) {
      console.error("Error saving user message:", error)
    }

    console.log("🤖 Starting AI stream with OpenAI...")

    // Build messages array with conversation history for context
    const messages = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
      },
      // Add conversation history for context (if available)
      ...conversationHistory,
      // Add current user message
      {
        role: "user" as const,
        content: message,
      },
    ]

    console.log(
      `📝 Sending ${messages.length} messages to OpenAI (including ${conversationHistory.length} history messages)`,
    )

    // Estimate tokens for this request (more accurate)
    const fullPrompt = JSON.stringify(messages)
    const estimatedInputTokens = estimateTokens(fullPrompt)
    const estimatedOutputTokens = 600 // Conservative estimate for output
    const totalEstimatedTokens = estimatedInputTokens + estimatedOutputTokens

    console.log(
      `💰 Token estimate: ${estimatedInputTokens} input + ${estimatedOutputTokens} output = ${totalEstimatedTokens} total`,
    )

    // Stream the AI response using GPT-4o-mini with conversation context
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
      maxTokens: 1000,
      temperature: 0.7,
    })

    let fullText = ""
    let chunkCount = 0

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("📡 Starting stream...")

          // Send session ID first
          const sessionChunk = `data: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`
          controller.enqueue(new TextEncoder().encode(sessionChunk))

          // Stream the AI response
          for await (const delta of result.textStream) {
            if (delta) {
              chunkCount++
              fullText += delta
              console.log(`📝 Chunk ${chunkCount}:`, delta.substring(0, 50) + "...")
              const chunk = `data: ${JSON.stringify({ content: delta })}\n\n`
              controller.enqueue(new TextEncoder().encode(chunk))
            }
          }

          console.log(`✅ Stream completed! Total chunks: ${chunkCount}, Full text length: ${fullText.length}`)

          // CRITICAL: Save assistant message to chat history with the FULL TEXT
          if (fullText && fullText.trim()) {
            try {
              console.log("💾 Saving assistant message with content:", fullText.substring(0, 100) + "...")
              await saveChatMessage(currentSessionId, fullText, "assistant", userId, adminId)
              console.log("✅ Successfully saved assistant message to chat history")
            } catch (error) {
              console.error("❌ Error saving assistant message:", error)
            }
          }

          // 🚨 CRITICAL FIX: LOG TOKEN USAGE - More accurate calculation
          try {
            // More accurate token calculation based on actual output
            const actualInputTokens = estimateTokens(fullPrompt)
            const actualOutputTokens = Math.ceil(fullText.length / 3.5) // More accurate for output
            const actualTokensUsed = actualInputTokens + actualOutputTokens

            console.log(
              `💰 LOGGING TOKENS: ${actualTokensUsed} (${actualInputTokens} input + ${actualOutputTokens} output) for admin ${adminId}`,
            )

            // 🔧 MIGLIORAMENTO: Log con feature specifica per la dashboard
            await logTokenUsage(adminId, userId, actualTokensUsed, "chat")
            console.log("✅ Successfully logged token usage for chat")
          } catch (error) {
            const err = error as Error
            console.error("❌ CRITICAL ERROR logging token usage:", error)
            // Log detailed error info for debugging
            console.error("Token logging error details:", {
              adminId,
              userId,
              fullTextLength: fullText.length,
              error: err.message,
            })
          }

          // Send completion signal
          const endChunk = `data: ${JSON.stringify({ done: true })}\n\n`
          controller.enqueue(new TextEncoder().encode(endChunk))

          controller.close()
          console.log("🏁 Stream closed successfully")
        } catch (error) {
          const err = error as Error
          console.error("❌ Streaming error:", error)
          const errorChunk = `data: ${JSON.stringify({ error: "Errore durante la generazione della risposta: " + err.message })}\n\n`
          controller.enqueue(new TextEncoder().encode(errorChunk))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    const err = error as Error
    console.error("❌ AI Chat POST handler error:", error)
    return new Response(JSON.stringify({ error: "Errore interno del server: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
