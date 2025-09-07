import type { NextRequest } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { estimateTokens } from "@/lib/token-service"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, increment } from "firebase/firestore"

// 🔧 NUOVA FUNZIONE: Trova l'ID documento Firebase basandosi su username/email
async function findUserDocumentId(identifier: string): Promise<string | null> {
  try {
    console.log(`🔍 Template Route: Searching for user document with identifier: ${identifier}`)

    // Se l'identifier sembra già un ID Firebase, restituiscilo
    if (identifier.length > 15 && !identifier.includes("@") && !identifier.includes("-")) {
      console.log(`✅ Template Route: Identifier ${identifier} looks like a Firebase ID`)
      return identifier
    }

    // Cerca per email
    if (identifier.includes("@")) {
      console.log(`🔍 Template Route: Searching by email: ${identifier}`)
      const emailQuery = query(collection(db, "users"), where("email", "==", identifier))
      const emailSnapshot = await getDocs(emailQuery)

      if (!emailSnapshot.empty) {
        const docId = emailSnapshot.docs[0].id
        console.log(`✅ Template Route: Found user by email: ${docId}`)
        return docId
      }
    }

    // Cerca per username
    console.log(`🔍 Template Route: Searching by username: ${identifier}`)
    const usernameQuery = query(collection(db, "users"), where("username", "==", identifier))
    const usernameSnapshot = await getDocs(usernameQuery)

    if (!usernameSnapshot.empty) {
      const docId = usernameSnapshot.docs[0].id
      console.log(`✅ Template Route: Found user by username: ${docId}`)
      return docId
    }

    // Cerca per firstName + lastName combinati
    if (identifier.includes("-")) {
      const [firstName, lastName] = identifier.split("-")
      console.log(`🔍 Template Route: Searching by firstName: ${firstName}, lastName: ${lastName}`)

      const nameQuery = query(
        collection(db, "users"),
        where("firstName", "==", firstName.charAt(0).toUpperCase() + firstName.slice(1)),
        where("lastName", "==", lastName.charAt(0).toUpperCase() + lastName.slice(1)),
      )
      const nameSnapshot = await getDocs(nameQuery)

      if (!nameSnapshot.empty) {
        const docId = nameSnapshot.docs[0].id
        console.log(`✅ Template Route: Found user by name: ${docId}`)
        return docId
      }
    }

    console.log(`❌ Template Route: No user document found for identifier: ${identifier}`)
    return null
  } catch (error) {
    console.error("❌ Template Route: Error searching for user document:", error)
    return null
  }
}

// Helper functions (copied from ai-service.ts to ensure independence and avoid blocking)
async function getOrganizationAdminIdFromService(userId: string): Promise<{ adminId: string; userRole: string }> {
  try {
    console.log(`🔍 Template Route: Getting admin ID for user: ${userId}`)

    // 🔧 CORREZIONE: Prima trova l'ID documento reale
    let realUserId = userId

    // Se l'userId non sembra un ID Firebase, cerca il documento reale
    if (userId.length < 15 || userId.includes("-") || userId.includes("@")) {
      console.log(`🔍 Template Route: UserId ${userId} doesn't look like a Firebase ID, searching for real document ID`)
      const foundId = await findUserDocumentId(userId)

      if (foundId) {
        realUserId = foundId
        console.log(`✅ Template Route: Found real user document ID: ${realUserId}`)
      } else {
        console.log(`❌ Template Route: Could not find real document ID for: ${userId}`)
        return { adminId: userId, userRole: "unknown" }
      }
    }

    const userDoc = await getDoc(doc(db, "users", realUserId))
    if (!userDoc.exists()) {
      console.log("❌ Template Route: User document not found even with real ID:", realUserId)
      return { adminId: realUserId, userRole: "unknown" }
    }

    const userData = userDoc.data()
    const role = userData.role

    console.log(`🔍 Template Route: User ${realUserId} has role: ${role}`)
    console.log(`🔍 Template Route: User data:`, {
      role: userData.role,
      tenantId: userData.tenantId,
      parentTenantId: userData.parentTenantId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
    })

    switch (role) {
      case "admin":
      case "super-admin":
        console.log(`✅ Template Route: Admin ${realUserId} manages own tokens`)
        return { adminId: realUserId, userRole: role }
      case "user":
      case "client":
        let adminId = userData.parentTenantId || userData.tenantId

        // 🔧 CORREZIONE: Se adminId non sembra un ID Firebase, cerca il documento reale
        if (adminId && (adminId.length < 15 || adminId.includes("-") || adminId.includes("@"))) {
          console.log(
            `🔍 Template Route: AdminId ${adminId} doesn't look like a Firebase ID, searching for real document ID`,
          )
          const foundAdminId = await findUserDocumentId(adminId)

          if (foundAdminId) {
            adminId = foundAdminId
            console.log(`✅ Template Route: Found real admin document ID: ${adminId}`)
          }
        }

        if (adminId && adminId !== realUserId) {
          console.log(`✅ Template Route: ${role} ${realUserId} uses admin ${adminId} tokens`)

          // Verifica che l'adminId sia valido
          const adminDoc = await getDoc(doc(db, "users", adminId))
          if (adminDoc.exists()) {
            return { adminId, userRole: role }
          } else {
            console.warn(`⚠️ Template Route: Admin document ${adminId} not found, using user ${realUserId}`)
            return { adminId: realUserId, userRole: role }
          }
        } else {
          console.log(`⚠️ Template Route: ${role} ${realUserId} has no valid parentTenantId`)
          return { adminId: realUserId, userRole: role }
        }
      default:
        console.log("⚠️ Template Route: Unknown role:", role)
        return { adminId: realUserId, userRole: role || "unknown" }
    }
  } catch (error) {
    console.error("❌ Template Route: Error getting organization admin ID:", error)
    return { adminId: userId, userRole: "error" }
  }
}

async function logTokenUsageFromService(adminId: string, userId: string, tokensUsed: number, promptType: string) {
  try {
    console.log(`🔍 Template Route: Logging ${tokensUsed} tokens for admin: ${adminId}`)

    // 🔧 CORREZIONE: Se adminId non sembra un ID Firebase, cerca il documento reale
    let realAdminId = adminId
    if (adminId.length < 15 || adminId.includes("-") || adminId.includes("@")) {
      console.log(
        `🔍 Template Route: AdminId ${adminId} doesn't look like a Firebase ID, searching for real document ID`,
      )
      const foundAdminId = await findUserDocumentId(adminId)

      if (foundAdminId) {
        realAdminId = foundAdminId
        console.log(`✅ Template Route: Found real admin document ID: ${realAdminId}`)
      } else {
        console.error("❌ Template Route: Could not find real admin document ID for:", adminId)
        return
      }
    }

    // Verifica che il documento admin esista
    const adminDoc = await getDoc(doc(db, "users", realAdminId))
    if (!adminDoc.exists()) {
      console.error(`❌ Template Route: Admin document ${realAdminId} does not exist`)
      return
    }

    console.log(`✅ Template Route: Admin document ${realAdminId} exists`)

    // 🔧 MIGLIORAMENTO: Salva l'utilizzo con più dettagli per la dashboard
    await addDoc(collection(db, "ai_usage"), {
      adminId: realAdminId, // ID del documento dell'admin che possiede i token
      userId, // ID del documento dell'utente che ha fatto la richiesta
      tokensUsed,
      promptType,
      feature: "template", // 🔧 AGGIUNTO: feature specifica per la dashboard
      createdAt: new Date(),
    })

    // Aggiorna i token dell'admin
    const adminRef = doc(db, "users", realAdminId)
    await updateDoc(adminRef, {
      aiTokensUsed: increment(tokensUsed),
    })

    console.log(
      `✅ Template Route: Logged ${tokensUsed} tokens for admin document ID: ${realAdminId}, requested by user: ${userId}`,
    )
  } catch (error) {
    console.error("❌ Template Route: Error logging token usage:", error)
    console.error("Template Route: Error details:", {
      adminId,
      userId,
      tokensUsed,
      promptType,
      error: error.message,
    })
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

export async function POST(request: NextRequest) {
  try {
    const { templateId, formData, userId } = await request.json()

    if (!templateId || !formData || !userId) {
      return new Response("Missing required fields", { status: 400 })
    }

    console.log("🚀 AI Template request from user:", userId)

    // Get organization admin ID (for logging purposes)
    const { adminId, userRole } = await getOrganizationAdminIdFromService(userId)
    console.log("✅ Template Route: Admin ID for logging:", adminId, "User role:", userRole)

    // 🚨 CRITICAL: Validate adminId
    if (!adminId || adminId === "undefined" || adminId === "null") {
      console.error("❌ Template Route: Invalid adminId for template generation")
      return new Response("Invalid user configuration", { status: 400 })
    }

    // Generate prompt based on template
    const prompt = generateTemplatePrompt(templateId, formData)

    // Get OpenAI client with proper configuration
    const openaiClient = getOpenAIClient()

    // Estimate tokens for this request
    const estimatedTokens = estimateTokens(prompt) + 800 // Add estimated output tokens

    console.log(`💰 Template token estimate: ${estimatedTokens} tokens`)

    // Stream the AI response using GPT-4o-mini
    const result = streamText({
      model: openaiClient("gpt-4o-mini"),
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
            console.log(`✅ Template Route: Logged ${actualTokensUsed} tokens for template ${templateId}`)
          } catch (logError) {
            console.error("❌ Template Route: CRITICAL ERROR logging template tokens:", logError)
            console.error("Template Route: Token logging error details:", {
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
          console.error("❌ Template Route: Streaming error:", error)
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
    console.error("❌ Template Route: POST handler error:", error)
    if (error instanceof Error && error.message.includes("API key")) {
      return new Response(JSON.stringify({ error: "Configurazione AI non disponibile. Contatta l'amministratore." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
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
