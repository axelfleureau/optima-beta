import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, limit } from "firebase/firestore"

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
