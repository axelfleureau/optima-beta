import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, limit } from "firebase/firestore"

// ============= TOKEN MANAGEMENT CODE =============

export interface TokenData {
  tokensUsed: number
  tokensAvailable: number
  tokensTotal: number
  tokensLimit: number
  lastUpdated: Date
  loading: boolean
  error: string | null
}

// User resolution function
export async function findUserDocumentId(identifier: string): Promise<string | null> {
  try {
    console.log("🔍 Searching for user with identifier:", identifier)

    // First, try to use the identifier as-is (assuming it's already a document ID)
    const directDoc = await getDoc(doc(db, "users", identifier))
    if (directDoc.exists()) {
      console.log("✅ Found user by direct ID:", identifier)
      return identifier
    }

    // If not found, search by email
    if (identifier.includes("@")) {
      const emailQuery = query(collection(db, "users"), where("email", "==", identifier), limit(1))
      const emailSnapshot = await getDocs(emailQuery)
      if (!emailSnapshot.empty) {
        const userId = emailSnapshot.docs[0].id
        console.log("✅ Found user by email:", userId)
        return userId
      }
    }

    // Search by username
    const usernameQuery = query(collection(db, "users"), where("username", "==", identifier), limit(1))
    const usernameSnapshot = await getDocs(usernameQuery)
    if (!usernameSnapshot.empty) {
      const userId = usernameSnapshot.docs[0].id
      console.log("✅ Found user by username:", userId)
      return userId
    }

    // Search by display name
    const displayNameQuery = query(collection(db, "users"), where("displayName", "==", identifier), limit(1))
    const displayNameSnapshot = await getDocs(displayNameQuery)
    if (!displayNameSnapshot.empty) {
      const userId = displayNameSnapshot.docs[0].id
      console.log("✅ Found user by display name:", userId)
      return userId
    }

    console.log("❌ User not found with identifier:", identifier)
    return null
  } catch (error) {
    console.error("❌ Error finding user:", error)
    return null
  }
}

// Helper function to ensure admin document exists
async function ensureAdminDocument(userId: string): Promise<void> {
  try {
    const adminDocRef = doc(db, "admin", userId)
    const adminDoc = await getDoc(adminDocRef)

    if (!adminDoc.exists()) {
      console.log("📝 Creating new admin document for user:", userId)
      const defaultData = {
        tokensUsed: 0,
        tokensAvailable: 100000, // 100k tokens default
        tokensTotal: 100000,
        tokensLimit: 100000,
        lastUpdated: new Date(),
      }

      // Use setDoc instead of updateDoc for creating new documents
      await setDoc(adminDocRef, defaultData)
      console.log("✅ Admin document created successfully")
    }
  } catch (error) {
    console.error("❌ Error ensuring admin document:", error)
    throw error
  }
}

export async function getTokenData(userId: string): Promise<TokenData> {
  try {
    console.log("📊 Getting token data for user:", userId)

    // Resolve user ID if needed
    const resolvedUserId = await findUserDocumentId(userId)
    if (!resolvedUserId) {
      throw new Error(`User not found: ${userId}`)
    }

    // Ensure the admin document exists
    await ensureAdminDocument(resolvedUserId)

    const adminDoc = await getDoc(doc(db, "admin", resolvedUserId))
    const data = adminDoc.data()

    const tokenData: TokenData = {
      tokensUsed: data?.tokensUsed || 0,
      tokensAvailable: data?.tokensAvailable || 100000,
      tokensTotal: data?.tokensTotal || 100000,
      tokensLimit: data?.tokensLimit || 100000,
      lastUpdated: data?.lastUpdated?.toDate() || new Date(),
      loading: false,
      error: null,
    }

    console.log("✅ Token data retrieved:", tokenData)
    return tokenData
  } catch (error) {
    console.error("❌ Error getting token data:", error)
    return {
      tokensUsed: 0,
      tokensAvailable: 0,
      tokensTotal: 0,
      tokensLimit: 0,
      lastUpdated: new Date(),
      loading: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
  try {
    console.log("🔄 Updating token usage for user:", userId, "tokens:", tokensUsed)

    // Resolve user ID if needed
    const resolvedUserId = await findUserDocumentId(userId)
    if (!resolvedUserId) {
      throw new Error(`User not found: ${userId}`)
    }

    // Ensure the admin document exists before updating
    await ensureAdminDocument(resolvedUserId)

    const adminDocRef = doc(db, "admin", resolvedUserId)

    await updateDoc(adminDocRef, {
      tokensUsed: increment(tokensUsed),
      tokensAvailable: increment(-tokensUsed),
      lastUpdated: new Date(),
    })

    console.log("✅ Token usage updated successfully")
  } catch (error) {
    console.error("❌ Error updating token usage:", error)
    throw error
  }
}

export async function resetTokens(userId: string): Promise<void> {
  try {
    console.log("🔄 Resetting tokens for user:", userId)

    // Resolve user ID if needed
    const resolvedUserId = await findUserDocumentId(userId)
    if (!resolvedUserId) {
      throw new Error(`User not found: ${userId}`)
    }

    // Ensure the admin document exists before updating
    await ensureAdminDocument(resolvedUserId)

    const adminDocRef = doc(db, "admin", resolvedUserId)

    await updateDoc(adminDocRef, {
      tokensUsed: 0,
      tokensAvailable: 100000,
      tokensTotal: 100000,
      lastUpdated: new Date(),
    })

    console.log("✅ Tokens reset successfully")
  } catch (error) {
    console.error("❌ Error resetting tokens:", error)
    throw error
  }
}

// ============= NEW AI GENERATION CODE WITH OPENAI =============

export interface AIResponse {
  text: string
  usage: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }
}

export interface AITextOptions {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  model?: string
}

export const SYSTEM_PROMPTS = {
  VISUAL:
    "Sei un esperto di visual design e generazione di immagini AI. Crea prompt dettagliati e specifici per la generazione di immagini.",
  CAPTION: "Sei un esperto copywriter di social media. Crea caption coinvolgenti e ottimizzate per ogni piattaforma.",
  DEFAULT: "Sei un assistente AI utile e professionale.",
  TASK: "Sei un esperto project manager e consulente di produttività.",
}

// Helper function to get the base URL for server-side API calls
function getBaseUrl(): string {
  // In server environment, we need a full URL
  if (typeof window === 'undefined') {
    // 1. Check for explicit SITE_URL environment variable first
    if (process.env.SITE_URL) {
      return process.env.SITE_URL.replace(/\/$/, '') // Remove trailing slash
    }
    
    // 2. Check for deployment environment variables
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',')
      return `https://${domains[0]}`
    }
    
    // 3. Development fallback - check PORT or use standard Next.js dev port
    const port = process.env.PORT || '3000'
    const host = process.env.HOST || 'localhost'
    return `http://${host}:${port}`
  }
  // Client-side can use relative URLs
  return ''
}

async function callCaptionAPI(
  prompt: string,
  systemPrompt: string,
  userId: string,
  maxTokens = 1000,
  temperature = 0.7,
): Promise<any> {
  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/api/ai/caption`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      userId,
      maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "API call failed" }))
    throw new Error(error.error || "Failed to generate caption")
  }

  return await response.json()
}

// OpenAI API integration through Next.js API route
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 1000,
  temperature = 0.7,
  model = "gpt-5-mini",
): Promise<any> {
  try {
    // Call our API route instead of OpenAI directly
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        maxTokens,
        temperature,
        model,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "API call failed" }))
      throw new Error(error.error || "Failed to generate AI response")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error calling OpenAI through API route:", error)
    throw error
  }
}

// Real implementation using Next.js API route
export async function generateAIResponse(prompt: string, userId: string, systemPrompt?: string): Promise<AIResponse> {
  try {
    console.log("🤖 Generating AI response for user:", userId)

    // Call our API route
    const response = await callCaptionAPI(prompt, systemPrompt || SYSTEM_PROMPTS.DEFAULT, userId, 1000, 0.7)

    return {
      text: response.text,
      usage: response.usage || {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      },
    }
  } catch (error) {
    console.error("Error generating AI response:", error)

    // Fallback to mock response if API fails
    if (error instanceof Error && error.message.includes("API")) {
      console.warn("⚠️ API error, using fallback response")
      return {
        text: `[Errore API - Controlla la configurazione]\n\nLa chiave OpenAI runtime non risulta configurata correttamente sul server.\n\nDettaglio errore: ${error.message}`,
        usage: {
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
        },
      }
    }

    throw error
  }
}

// Alias for generateAIResponse with options
export async function generateAIText(options: AITextOptions): Promise<AIResponse> {
  try {
    const response = await callCaptionAPI(
      options.prompt,
      options.systemPrompt || SYSTEM_PROMPTS.DEFAULT,
      "system", // Default user for system calls
      options.maxTokens || 1000,
      options.temperature || 0.7,
    )

    return {
      text: response.text,
      usage: response.usage || {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      },
    }
  } catch (error) {
    console.error("Error in generateAIText:", error)

    // Fallback response
    return {
      text: "[Errore nella generazione AI]",
      usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
    }
  }
}

// Helper function to get organization admin ID
export async function getOrganizationAdminId(userId: string): Promise<{ adminId: string }> {
  try {
    // In production, this would find the organization admin
    // For now, return the user as their own admin
    const resolvedUserId = await findUserDocumentId(userId)
    return { adminId: resolvedUserId || userId }
  } catch (error) {
    console.error("Error getting organization admin:", error)
    return { adminId: userId }
  }
}

// Log token usage with specific operation type
export async function logTokenUsage(adminId: string, userId: string, tokens: number, operation: string): Promise<void> {
  try {
    console.log(`📊 Logging ${tokens} tokens for ${operation} by user ${userId}`)
    await updateTokenUsage(adminId, tokens)
  } catch (error) {
    console.error("Error logging token usage:", error)
    // Don't throw - logging failures shouldn't break the operation
  }
}

// Estimate tokens for a given text (rough approximation)
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters in English
  // For Italian/mixed content, be more conservative
  return Math.ceil(text.length / 3)
}
