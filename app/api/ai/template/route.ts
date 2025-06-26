import type { NextRequest } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { estimateTokens } from "@/lib/token-service"

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
    console.error("Error getting organization admin ID in template route:", error)
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
    console.error("Error logging token usage in template route:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { templateId, formData, userId } = await request.json()

    if (!templateId || !formData || !userId) {
      return new Response("Missing required fields", { status: 400 })
    }

    console.log("AI Template request from user:", userId)

    // Get organization admin ID (for logging purposes)
    const { adminId, userRole } = await getOrganizationAdminIdFromService(userId)
    console.log("Admin ID for logging:", adminId, "User role:", userRole)

    // 🚨 CRITICAL: Validate adminId
    if (!adminId || adminId === "undefined") {
      console.error("❌ Invalid adminId for template generation")
      return new Response("Invalid user configuration", { status: 400 })
    }

    // Generate prompt based on template
    const prompt = generateTemplatePrompt(templateId, formData)

    // Estimate tokens for this request
    const estimatedTokens = estimateTokens(prompt) + 800 // Add estimated output tokens

    console.log(`💰 Template token estimate: ${estimatedTokens} tokens`)

    // Stream the AI response using GPT-4o-mini
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: `Sei un esperto di marketing che crea contenuti professionali in italiano. 
          Genera contenuti di alta qualità, persuasivi e coinvolgenti basati sui requisiti dell'utente.
          Formatta il contenuto in modo chiaro e professionale usando Markdown quando appropriato.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 2000,
    })

    let fullText = ""

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of result.textStream) {
            fullText += delta
            const chunk = `data: ${JSON.stringify({ content: delta })}\n\n`
            controller.enqueue(new TextEncoder().encode(chunk))
          }

          // 🚨 CRITICAL FIX: Log token usage after completion
          try {
            const actualInputTokens = estimateTokens(prompt)
            const actualOutputTokens = Math.ceil(fullText.length / 3.5)
            const actualTokensUsed = actualInputTokens + actualOutputTokens

            console.log(
              `💰 TEMPLATE LOGGING TOKENS: ${actualTokensUsed} (${actualInputTokens} input + ${actualOutputTokens} output) for admin ${adminId}`,
            )

            await logTokenUsageFromService(adminId, userId, actualTokensUsed, "template")
            console.log(`✅ Logged ${actualTokensUsed} tokens for template ${templateId}`)
          } catch (logError) {
            console.error("❌ CRITICAL ERROR logging template tokens:", logError)
            console.error("Template token logging error details:", {
              adminId,
              userId,
              templateId,
              fullTextLength: fullText.length,
              error: logError.message,
            })
          }

          // Send completion signal
          const endChunk = `data: ${JSON.stringify({ done: true })}\n\n`
          controller.enqueue(new TextEncoder().encode(endChunk))

          controller.close()
        } catch (error) {
          console.error("Streaming error in template route:", error)
          const errorChunk = `data: ${JSON.stringify({ error: "Errore durante la generazione del contenuto" })}\n\n`
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
      },
    })
  } catch (error) {
    console.error("AI Template POST handler error:", error)
    return new Response(JSON.stringify({ error: "Errore interno del server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

function generateTemplatePrompt(templateId: string, formData: Record<string, string>): string {
  switch (templateId) {
    case "email-newsletter":
      return `Crea una newsletter email professionale con questi dettagli:
      - Oggetto: ${formData.subject}
      - Pubblico target: ${formData.audience}
      - Scopo: ${formData.purpose}
      
      Include: intestazione accattivante, contenuto di valore, call-to-action chiara, e footer professionale.
      Formatta usando Markdown per una migliore leggibilità.`

    case "social-post":
      return `Crea un post per ${formData.platform} con:
      - Argomento: ${formData.topic}
      - Tono: ${formData.tone}
      
      Include: hook iniziale coinvolgente, contenuto di valore, hashtag rilevanti, e call-to-action.
      Adatta il formato e la lunghezza alla piattaforma specificata.`

    case "ad-copy":
      return `Crea una copy pubblicitaria persuasiva per:
      - Prodotto/Servizio: ${formData.product}
      - Benefici: ${formData.benefits}
      - Call to Action: ${formData.cta}
      
      Include: headline accattivante, benefici chiari, social proof, senso di urgenza, e garanzie.
      Struttura il contenuto per massimizzare le conversioni.`

    case "content-calendar":
      return `Crea un calendario contenuti dettagliato per ${formData.month} con:
      - Argomenti principali: ${formData.topics}
      - Obiettivi: ${formData.goals}
      
      Include: pianificazione settimanale, tipi di contenuto variati, suggerimenti per visual, 
      hashtag consigliati, e metriche da monitorare. Organizza tutto in formato tabellare.`

    case "marketing-strategy":
      return `Sviluppa una strategia marketing completa per:
      - Prodotto/Servizio: ${formData.product}
      - Target: ${formData.target}
      - Concorrenti: ${formData.competitors}
      - Budget: ${formData.budget}
      
      Include: analisi del mercato, strategia multi-canale, KPI specifici, timeline dettagliata, 
      e prossimi passi concreti. Struttura la strategia in sezioni chiare e actionable.`

    default:
      return `Genera contenuto marketing professionale basato su: ${JSON.stringify(formData)}`
  }
}
