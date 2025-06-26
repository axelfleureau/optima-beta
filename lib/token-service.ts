import { db } from "./firebase"
import { doc, getDoc, updateDoc, increment, addDoc, collection } from "firebase/firestore"

export interface TokenUsage {
  adminId: string
  userId: string
  tokensUsed: number
  feature: "chat" | "template" | "other"
  createdAt: Date
}

export interface TokenInfo {
  tokensUsed: number
  tokensTotal: number
  tokensAvailable: number
  organizationName: string
  adminId: string
  userRole: string
}

// Get organization admin ID from user (dynamic from database)
export async function getOrganizationAdminId(userId: string): Promise<{ adminId: string; userRole: string }> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      console.log("User not found, using userId as adminId:", userId)
      return { adminId: userId, userRole: "unknown" }
    }

    const userData = userDoc.data()
    const role = userData.role

    console.log(`🔍 Token Service: User ${userId} has role: ${role}`)

    switch (role) {
      case "admin":
      case "super-admin":
        return { adminId: userId, userRole: role }

      case "user":
      case "client":
        const adminId = userData.parentTenantId
        if (adminId) {
          console.log(`🔍 Token Service: ${role} ${userId} uses admin ${adminId} tokens`)
          return { adminId, userRole: role }
        } else {
          console.log(`🔍 Token Service: ${role} ${userId} has no parentTenantId, using tenantId`)
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

// Get available tokens for an organization (FIXED VERSION)
export async function getAvailableTokens(userId: string): Promise<TokenInfo> {
  try {
    const { adminId, userRole } = await getOrganizationAdminId(userId)
    console.log(`🔍 Token Service: Getting token info for user ${userId} (${userRole}) from admin ${adminId}`)

    const adminDoc = await getDoc(doc(db, "users", adminId))

    if (!adminDoc.exists()) {
      console.log(`❌ Token Service: Admin document ${adminId} not found`)
      return {
        tokensUsed: 0,
        tokensTotal: 1000000,
        tokensAvailable: 1000000,
        organizationName: "Organizzazione",
        adminId,
        userRole,
      }
    }

    const adminData = adminDoc.data()

    // 🔧 FIX: Leggi SOLO dal campo aiTokensUsed
    const tokensUsed = adminData.aiTokensUsed || 0
    const tokensTotal = adminData.aiTokensLimit || 1000000

    console.log(`✅ Token Service: Admin ${adminId} tokens: ${tokensUsed}/${tokensTotal}`)
    console.log(`🔍 Token Service: Raw adminData.aiTokensUsed:`, adminData.aiTokensUsed)
    console.log(`🔍 Token Service: Raw adminData.aiTokensLimit:`, adminData.aiTokensLimit)

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

// 🚨 FIXED: Log token usage (separate from chat history)
export async function logTokenUsage(
  adminId: string,
  userId: string,
  tokensUsed: number,
  feature: "chat" | "template" | "other" = "chat",
): Promise<void> {
  try {
    console.log(`🔍 Token Service: Logging ${tokensUsed} tokens: admin=${adminId}, user=${userId}, feature=${feature}`)

    // 🚨 CRITICAL FIX: Ensure we have valid adminId
    if (!adminId || adminId === "undefined") {
      console.error("❌ Invalid adminId for token logging:", adminId)
      return
    }

    // Log usage to ai_usage collection (only token data)
    const usageDoc = await addDoc(collection(db, "ai_usage"), {
      adminId,
      userId,
      tokensUsed,
      feature,
      createdAt: new Date(),
    })
    console.log(`✅ Token Service: Created usage log document: ${usageDoc.id}`)

    // 🚨 CRITICAL FIX: Update ADMIN's token usage in users collection
    const adminRef = doc(db, "users", adminId)

    // First check if admin document exists
    const adminDoc = await getDoc(adminRef)
    if (!adminDoc.exists()) {
      console.error(`❌ Admin document ${adminId} does not exist, cannot update tokens`)
      return
    }

    // Update the aiTokensUsed field
    await updateDoc(adminRef, {
      aiTokensUsed: increment(tokensUsed),
    })

    console.log(`✅ Token Service: Successfully incremented aiTokensUsed by ${tokensUsed} for admin: ${adminId}`)

    // 🔍 DEBUG: Verify the update worked
    const updatedAdminDoc = await getDoc(adminRef)
    if (updatedAdminDoc.exists()) {
      const updatedData = updatedAdminDoc.data()
      console.log(`🔍 Token Service: After update - aiTokensUsed: ${updatedData.aiTokensUsed}`)
    }
  } catch (error) {
    console.error("❌ Error logging token usage:", error)
    console.error("Error details:", {
      adminId,
      userId,
      tokensUsed,
      feature,
      errorMessage: error.message,
    })
  }
}

// Check if organization has enough tokens
export async function hasEnoughTokens(adminId: string, estimatedTokens: number): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, "users", adminId))

    if (!adminDoc.exists()) {
      console.log("Token Service: Admin not found, allowing request:", adminId)
      return true
    }

    const adminData = adminDoc.data()
    const tokensUsed = adminData.aiTokensUsed || 0
    const tokensTotal = adminData.aiTokensLimit || 1000000
    const tokensAvailable = tokensTotal - tokensUsed

    const hasTokens = tokensAvailable >= estimatedTokens
    console.log(
      `Token Service: Token check for admin ${adminId}: ${tokensAvailable}/${tokensTotal} available, need ${estimatedTokens}, result: ${hasTokens}`,
    )

    return hasTokens
  } catch (error) {
    console.error("Error checking token availability:", error)
    return true
  }
}

// Estimate tokens for a prompt (more accurate)
export function estimateTokens(prompt: string): number {
  // More accurate token estimation
  // GPT-4o-mini uses roughly 3.5-4 characters per token
  const inputTokens = Math.ceil(prompt.length / 3.5)
  const systemPromptTokens = 150 // Estimated system prompt tokens
  const bufferTokens = 100 // Buffer for safety

  return inputTokens + systemPromptTokens + bufferTokens
}
