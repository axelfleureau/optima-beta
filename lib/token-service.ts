import { db } from "./firebase"
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore"

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

// 🔧 ESPORTATA: Trova l'ID documento Firebase basandosi su username/email
export async function findUserDocumentId(identifier: string): Promise<string | null> {
  try {
    console.log(`🔍 Searching for user document with identifier: ${identifier}`)

    // Se l'identifier sembra già un ID Firebase, restituiscilo
    if (identifier.length > 15 && !identifier.includes("@") && !identifier.includes("-")) {
      console.log(`✅ Identifier ${identifier} looks like a Firebase ID`)
      return identifier
    }

    // Cerca per email
    if (identifier.includes("@")) {
      console.log(`🔍 Searching by email: ${identifier}`)
      const emailQuery = query(collection(db, "users"), where("email", "==", identifier))
      const emailSnapshot = await getDocs(emailQuery)

      if (!emailSnapshot.empty) {
        const docId = emailSnapshot.docs[0].id
        console.log(`✅ Found user by email: ${docId}`)
        return docId
      }
    }

    // Cerca per username o altri campi
    console.log(`🔍 Searching by username/displayName: ${identifier}`)
    const usernameQuery = query(collection(db, "users"), where("username", "==", identifier))
    const usernameSnapshot = await getDocs(usernameQuery)

    if (!usernameSnapshot.empty) {
      const docId = usernameSnapshot.docs[0].id
      console.log(`✅ Found user by username: ${docId}`)
      return docId
    }

    // Cerca per firstName + lastName combinati
    if (identifier.includes("-")) {
      const [firstName, lastName] = identifier.split("-")
      console.log(`🔍 Searching by firstName: ${firstName}, lastName: ${lastName}`)

      const nameQuery = query(
        collection(db, "users"),
        where("firstName", "==", firstName.charAt(0).toUpperCase() + firstName.slice(1)),
        where("lastName", "==", lastName.charAt(0).toUpperCase() + lastName.slice(1)),
      )
      const nameSnapshot = await getDocs(nameQuery)

      if (!nameSnapshot.empty) {
        const docId = nameSnapshot.docs[0].id
        console.log(`✅ Found user by name: ${docId}`)
        return docId
      }
    }

    // Cerca per displayName
    const displayNameQuery = query(collection(db, "users"), where("displayName", "==", identifier))
    const displayNameSnapshot = await getDocs(displayNameQuery)

    if (!displayNameSnapshot.empty) {
      const docId = displayNameSnapshot.docs[0].id
      console.log(`✅ Found user by displayName: ${docId}`)
      return docId
    }

    console.log(`❌ No user document found for identifier: ${identifier}`)
    return null
  } catch (error) {
    console.error("❌ Error searching for user document:", error)
    return null
  }
}

// Get organization admin ID from user (dynamic from database)
export async function getOrganizationAdminId(userId: string): Promise<{ adminId: string; userRole: string }> {
  try {
    console.log(`🔍 Token Service: Getting admin ID for user: ${userId}`)

    // 🔧 CORREZIONE: Prima trova l'ID documento reale
    let realUserId = userId

    // Se l'userId non sembra un ID Firebase, cerca il documento reale
    if (userId.length < 15 || userId.includes("-") || userId.includes("@")) {
      console.log(`🔍 UserId ${userId} doesn't look like a Firebase ID, searching for real document ID`)
      const foundId = await findUserDocumentId(userId)

      if (foundId) {
        realUserId = foundId
        console.log(`✅ Found real user document ID: ${realUserId}`)
      } else {
        console.log(`❌ Could not find real document ID for: ${userId}`)
        return { adminId: userId, userRole: "unknown" }
      }
    }

    const userDoc = await getDoc(doc(db, "users", realUserId))
    if (!userDoc.exists()) {
      console.log("❌ User document not found even with real ID:", realUserId)
      return { adminId: realUserId, userRole: "unknown" }
    }

    const userData = userDoc.data()
    const role = userData.role

    console.log(`🔍 Token Service: User ${realUserId} has role: ${role}`)
    console.log(`🔍 Token Service: User data:`, {
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
        // L'admin gestisce i propri token - usa il suo ID documento Firebase
        console.log(`✅ Admin ${realUserId} manages own tokens`)
        return { adminId: realUserId, userRole: role }

      case "user":
      case "client":
        // L'utente/cliente usa i token dell'admin - cerca parentTenantId
        let adminId = userData.parentTenantId || userData.tenantId

        // 🔧 CORREZIONE: Se adminId non sembra un ID Firebase, cerca il documento reale
        if (adminId && (adminId.length < 15 || adminId.includes("-") || adminId.includes("@"))) {
          console.log(`🔍 AdminId ${adminId} doesn't look like a Firebase ID, searching for real document ID`)
          const foundAdminId = await findUserDocumentId(adminId)

          if (foundAdminId) {
            adminId = foundAdminId
            console.log(`✅ Found real admin document ID: ${adminId}`)
          }
        }

        if (adminId && adminId !== realUserId) {
          console.log(`✅ ${role} ${realUserId} uses admin ${adminId} tokens`)

          // Verifica che l'adminId sia un ID documento valido
          const adminDoc = await getDoc(doc(db, "users", adminId))
          if (adminDoc.exists()) {
            console.log(`✅ Admin document ${adminId} exists`)
            return { adminId, userRole: role }
          } else {
            console.warn(`⚠️ Admin document ${adminId} not found, using user ${realUserId} as admin`)
            return { adminId: realUserId, userRole: role }
          }
        } else {
          console.log(`⚠️ ${role} ${realUserId} has no valid parentTenantId, using own ID`)
          return { adminId: realUserId, userRole: role }
        }

      default:
        console.log("⚠️ Unknown role, using userId as adminId:", role, realUserId)
        return { adminId: realUserId, userRole: role || "unknown" }
    }
  } catch (error) {
    console.error("❌ Error getting organization admin ID:", error)
    return { adminId: userId, userRole: "error" }
  }
}

// Get available tokens for an organization (IMPROVED VERSION)
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

    // 🔧 IMPROVED: Leggi solo dai campi corretti e validali
    const tokensUsed = Math.max(0, adminData.aiTokensUsed || 0) // Assicura che non sia negativo
    const tokensTotal = Math.max(1000, adminData.aiTokensLimit || 1000000) // Minimo 1000 token

    // 🔍 VALIDATION: Verifica che i dati siano coerenti
    if (tokensUsed > tokensTotal) {
      console.warn(`⚠️ Token inconsistency for admin ${adminId}: used(${tokensUsed}) > total(${tokensTotal})`)
    }

    console.log(`✅ Token Service: Admin ${adminId} tokens: ${tokensUsed}/${tokensTotal}`)

    return {
      tokensUsed,
      tokensTotal,
      tokensAvailable: Math.max(0, tokensTotal - tokensUsed),
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
    if (!adminId || adminId === "undefined" || adminId === "null") {
      console.error("❌ Invalid adminId for token logging:", adminId)
      return
    }

    // 🔧 CORREZIONE: Se adminId non sembra un ID Firebase, cerca il documento reale
    let realAdminId = adminId
    if (adminId.length < 15 || adminId.includes("-") || adminId.includes("@")) {
      console.log(`🔍 AdminId ${adminId} doesn't look like a Firebase ID, searching for real document ID`)
      const foundAdminId = await findUserDocumentId(adminId)

      if (foundAdminId) {
        realAdminId = foundAdminId
        console.log(`✅ Found real admin document ID: ${realAdminId}`)
      } else {
        console.error("❌ Could not find real admin document ID for:", adminId)
        return
      }
    }

    // Log usage to ai_usage collection (only token data)
    const usageDoc = await addDoc(collection(db, "ai_usage"), {
      adminId: realAdminId, // ID del documento dell'admin che possiede i token
      userId, // ID del documento dell'utente che ha fatto la richiesta (può essere lo stesso di adminId)
      tokensUsed,
      feature,
      createdAt: new Date(),
    })
    console.log(`✅ Token Service: Created usage log document: ${usageDoc.id}`)

    // 🚨 CRITICAL FIX: Update ADMIN's token usage in users collection
    const adminRef = doc(db, "users", realAdminId)

    // First check if admin document exists
    const adminDoc = await getDoc(adminRef)
    if (!adminDoc.exists()) {
      console.error(`❌ Admin document ${realAdminId} does not exist, cannot update tokens`)
      return
    }

    console.log(`✅ Admin document ${realAdminId} exists, updating token usage`)

    // Update the aiTokensUsed field
    await updateDoc(adminRef, {
      aiTokensUsed: increment(tokensUsed),
    })

    console.log(`✅ Token Service: Successfully incremented aiTokensUsed by ${tokensUsed} for admin: ${realAdminId}`)

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
    // 🔧 CORREZIONE: Se adminId non sembra un ID Firebase, cerca il documento reale
    let realAdminId = adminId
    if (adminId.length < 15 || adminId.includes("-") || adminId.includes("@")) {
      const foundAdminId = await findUserDocumentId(adminId)
      if (foundAdminId) {
        realAdminId = foundAdminId
      }
    }

    const adminDoc = await getDoc(doc(db, "users", realAdminId))

    if (!adminDoc.exists()) {
      console.log("Token Service: Admin not found, allowing request:", realAdminId)
      return true
    }

    const adminData = adminDoc.data()
    const tokensUsed = adminData.aiTokensUsed || 0
    const tokensTotal = adminData.aiTokensLimit || 1000000
    const tokensAvailable = tokensTotal - tokensUsed

    const hasTokens = tokensAvailable >= estimatedTokens
    console.log(
      `Token Service: Token check for admin ${realAdminId}: ${tokensAvailable}/${tokensTotal} available, need ${estimatedTokens}, result: ${hasTokens}`,
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

// 🔧 NUOVO: Funzione per ottenere i dati token dell'utente (per la dashboard)
export class TokenService {
  static async getUserTokenData(adminId: string): Promise<{ aiTokensUsed: number; aiTokensLimit: number }> {
    try {
      console.log(`🔍 TokenService: Getting token data for admin: ${adminId}`)

      // 🔧 CORREZIONE: Se adminId non sembra un ID Firebase, cerca il documento reale
      let realAdminId = adminId
      if (adminId.length < 15 || adminId.includes("-") || adminId.includes("@")) {
        const foundAdminId = await findUserDocumentId(adminId)
        if (foundAdminId) {
          realAdminId = foundAdminId
        }
      }

      const adminDoc = await getDoc(doc(db, "users", realAdminId))

      if (!adminDoc.exists()) {
        console.log(`❌ TokenService: Admin document ${realAdminId} not found`)
        return { aiTokensUsed: 0, aiTokensLimit: 1000000 }
      }

      const adminData = adminDoc.data()
      console.log(`✅ TokenService: Found admin data for ${realAdminId}`)

      return {
        aiTokensUsed: adminData.aiTokensUsed || 0,
        aiTokensLimit: adminData.aiTokensLimit || 1000000,
      }
    } catch (error) {
      console.error("❌ TokenService: Error getting user token data:", error)
      return { aiTokensUsed: 0, aiTokensLimit: 1000000 }
    }
  }

  // 🔧 NUOVO: Real-time token listener
  static subscribeToTokenUpdates(
    adminId: string,
    callback: (tokenData: { aiTokensUsed: number; aiTokensLimit: number }) => void,
  ): () => void {
    console.log(`🔄 TokenService: Setting up real-time listener for admin: ${adminId}`)

    const unsubscribe = onSnapshot(
      doc(db, "users", adminId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          const tokenData = {
            aiTokensUsed: data.aiTokensUsed || 0,
            aiTokensLimit: data.aiTokensLimit || 1000000,
          }
          console.log(
            `🔄 TokenService: Real-time update - tokens: ${tokenData.aiTokensUsed}/${tokenData.aiTokensLimit}`,
          )
          callback(tokenData)
        } else {
          console.log(`❌ TokenService: Admin document ${adminId} not found in real-time listener`)
          callback({ aiTokensUsed: 0, aiTokensLimit: 1000000 })
        }
      },
      (error) => {
        console.error("❌ TokenService: Real-time listener error:", error)
        callback({ aiTokensUsed: 0, aiTokensLimit: 1000000 })
      },
    )

    return unsubscribe
  }
}
