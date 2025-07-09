import { generateText, streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { db } from "./firebase"
import { collection, addDoc, doc, updateDoc, increment, getDoc } from "firebase/firestore"

// Define types for AI responses
export interface AIResponse {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIStreamResponse {
  text: string
  isComplete: boolean
}

export interface TokenInfo {
  tokensUsed: number
  tokensTotal: number
  tokensAvailable: number
  organizationName: string
  adminId: string
  userRole: string
}

// System prompt that defines the AI assistant's behavior
const SYSTEM_PROMPT = `Sei un assistente marketing esperto per Optima, una piattaforma di marketing digitale.
Aiuti gli utenti con:
- Creazione di contenuti (email, post social, annunci)
- Strategie di marketing
- Ottimizzazione delle campagne
- Idee creative
- Copywriting

Rispondi sempre in italiano in modo professionale, pratico e coinvolgente.
Fornisci consigli attuabili e basati sulle migliori pratiche del marketing digitale.
Usa un tono amichevole ma competente.`

// Function to get organization admin ID from user (corrected logic)
async function getOrganizationAdminId(userId: string): Promise<{ adminId: string; userRole: string }> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      console.log("User not found, using userId as adminId:", userId)
      return { adminId: userId, userRole: "unknown" }
    }

    const userData = userDoc.data()
    const role = userData.role

    console.log(`User ${userId} has role: ${role}`)

    switch (role) {
      case "admin":
      case "super-admin":
        // Admin manages their own tokens
        console.log(`Admin ${userId} manages own tokens`)
        return { adminId: userId, userRole: role }

      case "user":
      case "client":
        // User/Client should use admin's tokens via parentTenantId
        const adminId = userData.parentTenantId
        if (adminId) {
          console.log(`${role} ${userId} uses admin ${adminId} tokens`)
          return { adminId, userRole: role }
        } else {
          console.log(`${role} ${userId} has no parentTenantId, using tenantId: ${userData.tenantId}`)
          return { adminId: userData.tenantId || userId, userRole: role }
        }

      default:
        console.log("Unknown role, using userId as adminId:", role, userId)
        return { adminId: userId, userRole: role || "unknown" }
    }
  } catch (error) {
    console.error("Error getting organization admin ID:", error)
    return { adminId: userId, userRole: "error" }
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

// Function to generate text using OpenAI (GPT-4o-mini only)
export async function generateAIResponse(
  prompt: string,
  userId: string,
  systemPrompt: string = SYSTEM_PROMPT,
): Promise<AIResponse> {
  try {
    // Get organization admin ID
    const { adminId, userRole } = await getOrganizationAdminId(userId)
    console.log(`Generating AI response for user ${userId} (${userRole}) using admin ${adminId} tokens`)

    // Get OpenAI client with proper configuration
    const openaiClient = getOpenAIClient()

    // Generate text using OpenAI GPT-4o-mini
    const response = await generateText({
      model: openaiClient("gpt-4o-mini"),
      prompt,
      system: systemPrompt,
      maxTokens: 1000,
    })

    // Calculate token usage (estimate)
    const promptTokens = Math.ceil(prompt.length / 4)
    const completionTokens = Math.ceil(response.text.length / 4)
    const totalTokens = promptTokens + completionTokens

    // Log token usage (don't fail if this fails)
    try {
      await logTokenUsage(adminId, userId, totalTokens, prompt)
    } catch (logError) {
      console.error("Failed to log token usage:", logError)
    }

    return {
      text: response.text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
    }
  } catch (error) {
    console.error("Error generating AI response:", error)
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("Configurazione AI non disponibile. Contatta l'amministratore.")
    }
    throw error
  }
}

// Function to stream text using OpenAI (GPT-4o-mini only)
export async function streamAIResponse(
  prompt: string,
  userId: string,
  onChunk: (chunk: AIStreamResponse) => void,
  systemPrompt: string = SYSTEM_PROMPT,
) {
  try {
    // Get organization admin ID
    const { adminId, userRole } = await getOrganizationAdminId(userId)
    console.log(`Streaming AI response for user ${userId} (${userRole}) using admin ${adminId} tokens`)

    // Get OpenAI client with proper configuration
    const openaiClient = getOpenAIClient()

    let fullText = ""

    // Stream text using OpenAI GPT-4o-mini
    const result = streamText({
      model: openaiClient("gpt-4o-mini"),
      prompt,
      system: systemPrompt,
      maxTokens: 1000,
    })

    for await (const delta of result.textStream) {
      fullText += delta
      onChunk({
        text: delta,
        isComplete: false,
      })
    }

    // Calculate token usage (estimate)
    const promptTokens = Math.ceil(prompt.length / 4)
    const completionTokens = Math.ceil(fullText.length / 4)
    const totalTokens = promptTokens + completionTokens

    // Log token usage (don't fail if this fails)
    try {
      await logTokenUsage(adminId, userId, totalTokens, prompt)
    } catch (logError) {
      console.error("Failed to log token usage:", logError)
    }

    // Signal completion
    onChunk({
      text: "",
      isComplete: true,
    })

    return {
      text: fullText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
    }
  } catch (error) {
    console.error("Error streaming AI response:", error)
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("Configurazione AI non disponibile. Contatta l'amministratore.")
    }
    throw error
  }
}

// Function to log token usage to database (with error handling)
async function logTokenUsage(adminId: string, userId: string, tokensUsed: number, prompt: string) {
  try {
    console.log(`Logging ${tokensUsed} tokens: admin=${adminId}, user=${userId}`)

    // Log usage to ai_usage collection
    await addDoc(collection(db, "ai_usage"), {
      adminId, // The admin whose tokens are being used
      userId, // The actual user making the request
      tokensUsed,
      prompt: prompt.substring(0, 500),
      createdAt: new Date(),
    })

    // Update ADMIN's token usage (not the user's)
    const adminRef = doc(db, "users", adminId)
    await updateDoc(adminRef, {
      aiTokensUsed: increment(tokensUsed),
    })

    console.log(`Successfully logged ${tokensUsed} tokens for admin: ${adminId}, requested by user: ${userId}`)
  } catch (error) {
    console.error("Error logging token usage:", error)
    // Don't throw error, just log it
  }
}

// Function to get available tokens for an organization (with fallbacks)
export async function getAvailableTokens(userId: string): Promise<TokenInfo> {
  try {
    // Get organization admin ID and user role
    const { adminId, userRole } = await getOrganizationAdminId(userId)
    console.log(`Getting token info for user ${userId} (${userRole}) from admin ${adminId}`)

    // Get admin document (the one who owns the tokens)
    const adminDoc = await getDoc(doc(db, "users", adminId))

    if (!adminDoc.exists()) {
      console.log(`Admin document ${adminId} not found`)
      // Return default values if admin not found
      return {
        tokensUsed: 0,
        tokensTotal: 1000000, // Default 1M tokens
        tokensAvailable: 1000000,
        organizationName: "Organizzazione",
        adminId,
        userRole,
      }
    }

    const adminData = adminDoc.data()
    const tokensUsed = adminData.aiTokensUsed || 0
    const tokensTotal = adminData.aiTokensLimit || 1000000 // Default 1M tokens

    console.log(`Admin ${adminId} tokens: ${tokensUsed}/${tokensTotal}`)

    return {
      tokensUsed,
      tokensTotal,
      tokensAvailable: tokensTotal - tokensUsed,
      organizationName: adminData.companyName || `${adminData.firstName} ${adminData.lastName}` || "Organizzazione",
      adminId,
      userRole,
    }
  } catch (error) {
    console.error("Error getting available tokens:", error)
    // Return default values on error
    return {
      tokensUsed: 0,
      tokensTotal: 1000000,
      tokensAvailable: 1000000,
      organizationName: "Organizzazione",
      adminId: userId,
      userRole: "error",
    }
  }
}

// Function to check if organization has enough tokens (for informational purposes)
export async function hasEnoughTokens(adminId: string, estimatedTokens: number): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, "users", adminId))

    if (!adminDoc.exists()) {
      console.log("Admin not found, assuming enough tokens for logging:", adminId)
      return true // Assume true for logging purposes if admin doc doesn't exist
    }

    const adminData = adminDoc.data()
    const tokensUsed = adminData.aiTokensUsed || 0
    const tokensTotal = adminData.aiTokensLimit || 1000000
    const tokensAvailable = tokensTotal - tokensUsed

    const hasTokens = tokensAvailable >= estimatedTokens
    console.log(
      `Token check for admin ${adminId}: ${tokensAvailable}/${tokensTotal} available, need ${estimatedTokens}, result: ${hasTokens}`,
    )

    return hasTokens
  } catch (error) {
    console.error("Error checking token availability:", error)
    return true // Assume true on error to prevent blocking
  }
}

// Function to estimate tokens for a prompt
export function estimateTokens(prompt: string): number {
  // Simple estimation: ~4 characters per token
  return Math.ceil(prompt.length / 4) + 200 // Add buffer for system prompt and completion
}
