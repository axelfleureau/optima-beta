"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"

interface DashboardStats {
  totalClients: number
  activeCampaigns: number
  sentQuotes: number
  completedTasks: number
  aiTokensUsed: number
  aiTokensLimit: number
  pendingTasks: number
  totalRevenue: number
}

interface RecentActivity {
  id: string
  type: "ai_usage" | "task" | "campaign" | "quote" | "client"
  title: string
  details?: string
  timestamp: Date
  tokensUsed?: number
  user?: string
  client?: string
  status?: string
}

const EMPTY_STATS: DashboardStats = {
  totalClients: 0,
  activeCampaigns: 0,
  sentQuotes: 0,
  completedTasks: 0,
  aiTokensUsed: 0,
  aiTokensLimit: 1_000_000,
  pendingTasks: 0,
  totalRevenue: 0,
}

export function useDashboardData() {
  const { user, userData, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (authLoading) return

    if (!user?.uid) {
      setStats(EMPTY_STATS)
      setRecentActivities([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard", {
        credentials: "include",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Dashboard request failed: ${response.status}`)
      }

      const payload = await response.json()
      setStats({ ...EMPTY_STATS, ...(payload.stats || {}) })
      setRecentActivities(
        (payload.recentActivities || []).map((activity: any) => ({
          ...activity,
          timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
        })),
      )
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Errore nel caricamento dei dati della dashboard")
    } finally {
      setLoading(false)
    }
  }, [authLoading, user?.uid])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData, userData?.tenantId])

  return {
    stats,
    recentActivities,
    loading,
    error,
    refetch: fetchDashboardData,
  }
}
