import type { NextRequest } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { estimateTokens } from "@/lib/token-service"
import { saveChatMessage } from "@/lib/chat-service"

// Helper functions (copied from ai-service.ts to ensure independence and avoid blocking)
async function getOrganizationAdminIdFromService(userId: string): Promise<{ adminId: string; userRole: string }> {
  try {
    const { db } = await import("@/lib/firebase")
    const { doc, getDoc } = await import("firebase/firestore")

    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      return { adminId: userId, userRole: "unknown" }
    }

    const userData = userDoc.data()
    const role = userData.role

    switch (role) {
      case "admin":
      case "super-admin":
        return { adminId: userId, userRole: role }
      case "user":
      case "client":
        return { adminId: userData.parentTenantId || userData.tenantId || userId, userRole: role }
      default:
        return { adminId: userId, userRole: "unknown" }
    }
  } catch (error) {
    console.error("Error getting organization admin ID in chat route:", error)
    return { adminId: userId, userRole: "unknown" }
  }
}

async function logTokenUsageFromService(adminId: string, userId: string, tokensUsed: number, promptType: string) {
  try {
    const { db } = await import("@/lib/firebase")
    const { collection, addDoc, doc, updateDoc, increment } = await import("firebase/firestore")

    await addDoc(collection(db, "ai_usage"), {
      adminId,
      userId,
      tokensUsed,
      promptType,
      createdAt: new Date(),
    })

    const adminRef = doc(db, "users", adminId)
    await updateDoc(adminRef, {
      aiTokensUsed: increment(tokensUsed),
    })
  } catch (error) {
    console.error("Error logging token usage in chat route:", error)
  }
}

// Function to get OpenAI client with proper API key configuration
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY environment variable is missing")
    throw new Error("OpenAI API key is not configured. Please contact your administrator.")
  }

  return openai({
    apiKey: apiKey,
  })
}

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
  try {
    const { messages, userId } = await request.json()

    if (!messages || !userId) {
      return new Response("Missing required fields", { status: 400 })
    }

    console.log("🚀 AI Chat request:", { userId, messagesLength: messages.length })

    // Get organization admin ID (for logging purposes)
    const { adminId, userRole } = await getOrganizationAdminIdFromService(userId)
    console.log(`Chat API: User ${userId} (${userRole}) will use admin ${adminId} tokens`)

    // 🚨 CRITICAL: Validate adminId
    if (!adminId || adminId === "undefined") {
      console.error("❌ Invalid adminId for chat")
      return new Response("Invalid user configuration", { status: 400 })
    }

    // Get OpenAI client with proper configuration
    const openaiClient = getOpenAIClient()

    // Estimate tokens for this request
    const messagesText = messages.map((m: any) => m.content).join(" ")
    const estimatedTokens = estimateTokens(messagesText) + 500 // Add estimated output tokens

    console.log(`💰 Chat token estimate: ${estimatedTokens} tokens`)

    // Stream the AI response using GPT-4o-mini
    const result = streamText({
      model: openaiClient("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],
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
          const sessionChunk = `data: ${JSON.stringify({ sessionId: messages[0].sessionId })}\n\n`
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

          // Save assistant message to chat history with the FULL TEXT
          if (fullText && fullText.trim()) {
            try {
              console.log("💾 Saving assistant message with content:", fullText.substring(0, 100) + "...")
              await saveChatMessage(messages[0].sessionId, fullText, "assistant", userId, adminId)
              console.log("✅ Successfully saved assistant message to chat history")
            } catch (error) {
              console.error("❌ Error saving assistant message:", error)
            }
          }

          // 🚨 CRITICAL FIX: Log token usage after completion
          try {
            const actualInputTokens = estimateTokens(messagesText)
            const actualOutputTokens = Math.ceil(fullText.length / 3.5)
            const actualTokensUsed = actualInputTokens + actualOutputTokens

            console.log(
              `💰 CHAT LOGGING TOKENS: ${actualTokensUsed} (${actualInputTokens} input + ${actualOutputTokens} output) for admin ${adminId}`,
            )

            await logTokenUsageFromService(adminId, userId, actualTokensUsed, "chat")
            console.log(`✅ Logged ${actualTokensUsed} tokens for chat`)
          } catch (logError) {
            console.error("❌ CRITICAL ERROR logging chat tokens:", logError)
            console.error("Chat token logging error details:", {
              adminId,
              userId,
              fullTextLength: fullText.length,
              error: logError.message,
            })
          }

          // Send completion signal
          const endChunk = `data: ${JSON.stringify({ done: true })}\n\n`
          controller.enqueue(new TextEncoder().encode(endChunk))

          controller.close()
          console.log("🏁 Stream closed successfully")
        } catch (error) {
          console.error("❌ Streaming error:", error)
          const errorChunk = `data: ${JSON.stringify({ error: "Errore durante la generazione della risposta: " + error.message })}\n\n`
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
    console.error("❌ AI Chat POST handler error:", error)
    if (error instanceof Error && error.message.includes("API key")) {
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
    return new Response(JSON.stringify({ error: "Errore interno del server: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
