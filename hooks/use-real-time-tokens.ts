"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getOrganizationAdminId } from "@/lib/token-service"

export interface TokenData {
  tokensUsed: number
  tokensAvailable: number
  tokensTotal: number
  tokensLimit: number
  lastUpdated: Date
  loading: boolean
  error: string | null
}

export function useRealTimeTokens(userId: string): TokenData {
  const [tokenData, setTokenData] = useState<TokenData>({
    tokensUsed: 0,
    tokensAvailable: 0,
    tokensTotal: 0,
    tokensLimit: 0,
    lastUpdated: new Date(),
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!userId) {
      setTokenData((prev) => ({
        ...prev,
        loading: false,
        error: "No user ID provided",
      }))
      return
    }

    let unsubscribe: (() => void) | null = null

    const setupListener = async () => {
      try {
        console.log("🔄 Setting up real-time token listener for user:", userId)

        // Get the admin ID for this user (who owns the tokens)
        const { adminId, userRole } = await getOrganizationAdminId(userId)
        console.log(`📊 Token listener: User ${userId} (${userRole}) will track admin ${adminId} tokens`)

        if (!adminId || adminId === "undefined") {
          throw new Error(`Invalid admin ID for user: ${userId}`)
        }

        // Listen to the admin's document for token changes
        const adminDocRef = doc(db, "users", adminId)

        unsubscribe = onSnapshot(
          adminDocRef,
          (doc) => {
            if (doc.exists()) {
              const data = doc.data()

              // Get token data from the admin document
              const tokensUsed = Math.max(0, data.aiTokensUsed || 0)
              const tokensLimit = Math.max(1000, data.aiTokensLimit || 1000000)
              const tokensAvailable = Math.max(0, tokensLimit - tokensUsed)

              const newTokenData: TokenData = {
                tokensUsed,
                tokensAvailable,
                tokensTotal: tokensLimit,
                tokensLimit,
                lastUpdated: new Date(),
                loading: false,
                error: null,
              }

              console.log("📊 Real-time token update for admin", adminId, ":", {
                used: tokensUsed,
                available: tokensAvailable,
                total: tokensLimit,
              })

              setTokenData(newTokenData)
            } else {
              console.warn(`⚠️ Admin document ${adminId} does not exist`)
              // Set default values if admin document doesn't exist
              const defaultData: TokenData = {
                tokensUsed: 0,
                tokensAvailable: 1000000,
                tokensTotal: 1000000,
                tokensLimit: 1000000,
                lastUpdated: new Date(),
                loading: false,
                error: null,
              }
              setTokenData(defaultData)
            }
          },
          (error) => {
            console.error("❌ Real-time token listener error:", error)
            setTokenData((prev) => ({
              ...prev,
              loading: false,
              error: error.message,
            }))
          },
        )
      } catch (error) {
        console.error("❌ Error setting up token listener:", error)
        setTokenData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      }
    }

    setupListener()

    return () => {
      if (unsubscribe) {
        console.log("🔌 Cleaning up real-time token listener")
        unsubscribe()
      }
    }
  }, [userId])

  return tokenData
}
