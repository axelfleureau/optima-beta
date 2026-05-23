"use client"

import { useEffect, useState } from "react"

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
    tokensAvailable: 1_000_000,
    tokensTotal: 1_000_000,
    tokensLimit: 1_000_000,
    lastUpdated: new Date(),
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!userId) {
      setTokenData((prev) => ({ ...prev, loading: false }))
      return
    }

    let cancelled = false

    const fetchTokens = async () => {
      try {
        const response = await fetch("/api/dashboard", {
          credentials: "include",
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Token request failed: ${response.status}`)
        }

        const payload = await response.json()
        const tokensUsed = Math.max(0, Number(payload.stats?.aiTokensUsed || 0))
        const tokensLimit = Math.max(1000, Number(payload.stats?.aiTokensLimit || 1_000_000))

        if (!cancelled) {
          setTokenData({
            tokensUsed,
            tokensAvailable: Math.max(0, tokensLimit - tokensUsed),
            tokensTotal: tokensLimit,
            tokensLimit,
            lastUpdated: new Date(),
            loading: false,
            error: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setTokenData((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }))
        }
      }
    }

    fetchTokens()

    return () => {
      cancelled = true
    }
  }, [userId])

  return tokenData
}
