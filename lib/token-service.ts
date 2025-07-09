import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"

export interface TokenUsage {
  userId: string
  tenantId: string
  feature: string
  tokensUsed: number
  createdAt: Timestamp
  userEmail?: string
  prompt?: string
  response?: string
}

export interface UserTokenData {
  aiTokensUsed: number
  aiTokensLimit: number
  lastResetDate?: Timestamp
}

export class TokenService {
  /**
   * Records AI token usage and updates user's token count
   */
  static async recordTokenUsage(
    userId: string,
    tenantId: string,
    feature: string,
    tokensUsed: number,
    userEmail?: string,
    prompt?: string,
    response?: string,
  ): Promise<void> {
    try {
      // 1. Record the usage in ai_usage collection
      await addDoc(collection(db, "ai_usage"), {
        userId,
        tenantId,
        feature,
        tokensUsed,
        userEmail,
        prompt,
        response,
        createdAt: Timestamp.now(),
      })

      // 2. Update user's token count
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const currentTokensUsed = userDoc.data().aiTokensUsed || 0
        await updateDoc(userRef, {
          aiTokensUsed: currentTokensUsed + tokensUsed,
          updatedAt: Timestamp.now(),
        })
      }
    } catch (error) {
      console.error("Error recording token usage:", error)
      throw new Error("Failed to record token usage")
    }
  }

  /**
   * Gets user's current token data
   */
  static async getUserTokenData(userId: string): Promise<UserTokenData> {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const data = userDoc.data()
        return {
          aiTokensUsed: data.aiTokensUsed || 0,
          aiTokensLimit: data.aiTokensLimit || 1000000,
          lastResetDate: data.lastResetDate,
        }
      }

      return {
        aiTokensUsed: 0,
        aiTokensLimit: 1000000,
      }
    } catch (error) {
      console.error("Error getting user token data:", error)
      throw new Error("Failed to get user token data")
    }
  }

  /**
   * Checks if user has enough tokens for a request
   */
  static async checkTokenAvailability(userId: string, requiredTokens: number): Promise<boolean> {
    try {
      const tokenData = await this.getUserTokenData(userId)
      return tokenData.aiTokensUsed + requiredTokens <= tokenData.aiTokensLimit
    } catch (error) {
      console.error("Error checking token availability:", error)
      return false
    }
  }

  /**
   * Gets recent token usage for a user or tenant
   */
  static async getRecentUsage(tenantId: string, limitCount = 10, userId?: string): Promise<TokenUsage[]> {
    try {
      let q = query(
        collection(db, "ai_usage"),
        where("tenantId", "==", tenantId),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      )

      if (userId) {
        q = query(
          collection(db, "ai_usage"),
          where("tenantId", "==", tenantId),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        )
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as TokenUsage & { id: string },
      )
    } catch (error) {
      console.error("Error getting recent usage:", error)
      return []
    }
  }

  /**
   * Resets user's token count (for monthly resets)
   */
  static async resetUserTokens(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        aiTokensUsed: 0,
        lastResetDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error("Error resetting user tokens:", error)
      throw new Error("Failed to reset user tokens")
    }
  }

  /**
   * Updates user's token limit
   */
  static async updateTokenLimit(userId: string, newLimit: number): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        aiTokensLimit: newLimit,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error("Error updating token limit:", error)
      throw new Error("Failed to update token limit")
    }
  }

  /**
   * Gets token usage statistics for a tenant
   */
  static async getTenantTokenStats(tenantId: string): Promise<{
    totalUsage: number
    totalLimit: number
    userCount: number
    averageUsage: number
  }> {
    try {
      // Get all users in tenant
      const usersQuery = query(collection(db, "users"), where("tenantId", "==", tenantId))
      const usersSnapshot = await getDocs(usersQuery)

      let totalUsage = 0
      let totalLimit = 0
      const userCount = usersSnapshot.size

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        totalUsage += data.aiTokensUsed || 0
        totalLimit += data.aiTokensLimit || 0
      })

      return {
        totalUsage,
        totalLimit,
        userCount,
        averageUsage: userCount > 0 ? Math.round(totalUsage / userCount) : 0,
      }
    } catch (error) {
      console.error("Error getting tenant token stats:", error)
      return {
        totalUsage: 0,
        totalLimit: 0,
        userCount: 0,
        averageUsage: 0,
      }
    }
  }
}
