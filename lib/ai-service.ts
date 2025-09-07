// lib/ai-service.ts

import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, limit } from "firebase/firestore"

// ============= EXISTING TOKEN MANAGEMENT CODE =============

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

export async function getTokenData(userId: string): Promise<TokenData> {
  try {
    console.log("📊 Getting token data for user:", userId)

    // Resolve user ID if needed
    const resolvedUserId = await findUserDocumentId(userId)
    if (!resolvedUserId) {
      throw new Error(`User not found: ${userId}`)
    }

    const adminDoc = await getDoc(doc(db, "admin", resolvedUserId))

    if (!adminDoc.exists()) {
      console.log("📝 Creating new admin document for user:", resolvedUserId)
      const defaultData: TokenData = {
        tokensUsed: 0,
        tokensAvailable: 10000,
        tokensTotal: 10000,
        tokensLimit: 10000,
        lastUpdated: new Date(),
        loading: false,
        error: null,
      }

      await updateDoc(doc(db, "admin", resolvedUserId), {
        tokensUsed: defaultData.tokensUsed,
        tokensAvailable: defaultData.tokensAvailable,
        tokensTotal: defaultData.tokensTotal,
        tokensLimit: defaultData.tokensLimit,
        lastUpdated: defaultData.lastUpdated,
      })

      return defaultData
    }

    const data = adminDoc.data()
    const tokenData: TokenData = {
      tokensUsed: data.tokensUsed || 0,
      tokensAvailable: data.tokensAvailable || 10000,
      tokensTotal: data.tokensTotal || 10000,
      tokensLimit: data.tokensLimit || 10000,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
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

    const adminDocRef = doc(db, "admin", resolvedUserId)

    await updateDoc(adminDocRef, {
      tokensUsed: 0,
      tokensAvailable: 10000,
      tokensTotal: 10000,
      lastUpdated: new Date(),
    })

    console.log("✅ Tokens reset successfully")
  } catch (error) {
    console.error("❌ Error resetting tokens:", error)
    throw error
  }
}

// ============= NEW AI GENERATION CODE =============

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
}

export const SYSTEM_PROMPTS = {
  VISUAL: "You are an expert in visual design and AI image generation. Create detailed, specific prompts for image generation.",
  CAPTION: "You are an expert social media copywriter. Create engaging, platform-optimized captions.",
  DEFAULT: "You are a helpful AI assistant.",
  TASK: "You are an expert project manager and productivity consultant."
}

// Stub implementation - replace with actual OpenAI/Anthropic API calls
export async function generateAIResponse(
  prompt: string,
  userId: string,
  systemPrompt?: string
): Promise<AIResponse> {
  try {
    console.log("🤖 Generating AI response for user:", userId)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, this would call OpenAI or Anthropic API
    // For now, return a mock response
    const mockResponse = {
      text: `[AI Generated Response]\n\nBased on your request, here's a professional response:\n\n${prompt.substring(0, 200)}...\n\nQuesto è un esempio di risposta generata. In produzione, questa funzione chiamerà l'API di OpenAI o Claude per generare contenuti reali e personalizzati.`,
      usage: {
        totalTokens: 150,
        promptTokens: 100,
        completionTokens: 50
      }
    }
    
    // Update token usage
    await updateTokenUsage(userId, mockResponse.usage.totalTokens)
    
    return mockResponse
  } catch (error) {
    console.error("Error generating AI response:", error)
    throw new Error("Failed to generate AI response")
  }
}

// Alias for generateAIResponse with options
export async function generateAIText(options: AITextOptions): Promise<AIResponse> {
  // For stub purposes, just call generateAIResponse
  // In production, this would handle the options differently
  return generateAIResponse(
    options.prompt,
    "default-user", // This should be passed properly in production
    options.systemPrompt || SYSTEM_PROMPTS.DEFAULT
  )
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
export async function logTokenUsage(
  adminId: string,
  userId: string,
  tokens: number,
  operation: string
): Promise<void> {
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