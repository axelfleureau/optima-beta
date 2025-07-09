"use client"

import { useState, useEffect } from "react"
import { collection, query, where, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { TokenService } from "@/lib/token-service"

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

// Helper function to safely convert Firestore timestamp to Date
const safeToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    try {
      return timestamp.toDate()
    } catch (e) {
      console.warn("Error converting timestamp:", e)
      return new Date()
    }
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000)
  }
  return new Date()
}

export function useDashboardData() {
  const { user, userData } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeCampaigns: 0,
    sentQuotes: 0,
    completedTasks: 0,
    aiTokensUsed: 0,
    aiTokensLimit: 1000000,
    pendingTasks: 0,
    totalRevenue: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid || !userData?.tenantId) {
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log("Fetching dashboard data for tenant:", userData.tenantId)

        // Determina l'ID dell'admin per i token
        const adminId =
          userData.role === "admin" || userData.role === "super-admin"
            ? user.uid
            : userData.parentTenantId || userData.tenantId

        // Fetch all data in parallel
        const [clientsData, campaignsData, quotesData, tasksData, tokenData, aiUsageData] = await Promise.all([
          fetchClients(),
          fetchCampaigns(),
          fetchQuotes(),
          fetchTasks(),
          fetchTokenData(adminId),
          fetchAIUsage(),
        ])

        console.log("Fetched data:", {
          clients: clientsData.length,
          campaigns: campaignsData.length,
          quotes: quotesData.length,
          tasks: tasksData.length,
          aiUsage: aiUsageData.length,
        })

        // Calculate stats
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        const newStats = {
          totalClients: clientsData.length,
          activeCampaigns: campaignsData.filter((c) => c.status === "active" || c.status === "running").length,
          sentQuotes: quotesData.filter((q) => q.status === "sent" || q.status === "pending").length,
          completedTasks: tasksData.filter((t) => {
            if (t.status !== "completed") return false
            const completedAt = safeToDate(t.completedAt || t.updatedAt)
            return completedAt >= oneMonthAgo
          }).length,
          pendingTasks: tasksData.filter(
            (t) => t.status === "pending" || t.status === "in_progress" || t.status === "todo",
          ).length,
          totalRevenue: quotesData.filter((q) => q.status === "accepted").reduce((sum, q) => sum + (q.amount || 0), 0),
          aiTokensUsed: tokenData.aiTokensUsed,
          aiTokensLimit: tokenData.aiTokensLimit,
        }

        console.log("Calculated stats:", newStats)

        // Build recent activities (max 6)
        const activities = buildRecentActivities(aiUsageData, tasksData, campaignsData, quotesData, clientsData)

        setStats(newStats)
        setRecentActivities(activities)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Errore nel caricamento dei dati della dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.uid, userData?.tenantId, userData?.role, userData?.parentTenantId])

  const fetchClients = async () => {
    try {
      const q = query(collection(db, "clients"), where("tenantId", "==", userData?.tenantId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error("Error fetching clients:", error)
      return []
    }
  }

  const fetchCampaigns = async () => {
    try {
      const q = query(collection(db, "campaigns"), where("tenantId", "==", userData?.tenantId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      return []
    }
  }

  const fetchQuotes = async () => {
    try {
      const q = query(collection(db, "quotes"), where("tenantId", "==", userData?.tenantId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error("Error fetching quotes:", error)
      return []
    }
  }

  const fetchTasks = async () => {
    try {
      const q = query(collection(db, "tasks"), where("tenantId", "==", userData?.tenantId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error("Error fetching tasks:", error)
      return []
    }
  }

  const fetchTokenData = async (adminId: string) => {
    try {
      const tokenData = await TokenService.getUserTokenData(adminId)
      return tokenData
    } catch (error) {
      console.error("Error fetching token data:", error)
      return { aiTokensUsed: 0, aiTokensLimit: 1000000 }
    }
  }

  const fetchAIUsage = async () => {
    try {
      const q = query(collection(db, "ai_usage"), where("tenantId", "==", userData?.tenantId), limit(3))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error("Error fetching AI usage:", error)
      return []
    }
  }

  const buildRecentActivities = (
    aiUsageData: any[],
    tasksData: any[],
    campaignsData: any[],
    quotesData: any[],
    clientsData: any[],
  ): RecentActivity[] => {
    const activities: RecentActivity[] = []

    // AI Usage activities (max 2)
    aiUsageData.slice(0, 2).forEach((usage) => {
      activities.push({
        id: usage.id,
        type: "ai_usage",
        title: "Utilizzo AI Assistant",
        details: `${usage.feature || "Chat"} - Generazione contenuto`,
        timestamp: safeToDate(usage.createdAt),
        tokensUsed: usage.tokensUsed || 0,
        user: usage.userEmail || "Utente",
      })
    })

    // Task activities (max 2)
    tasksData
      .sort((a, b) => {
        const aTime = safeToDate(a.updatedAt || a.createdAt)
        const bTime = safeToDate(b.updatedAt || b.createdAt)
        return bTime.getTime() - aTime.getTime()
      })
      .slice(0, 2)
      .forEach((task) => {
        const isCompleted = task.status === "completed"
        activities.push({
          id: task.id,
          type: "task",
          title: isCompleted ? "Task Completato" : "Task Aggiornato",
          details: task.title || "Task senza titolo",
          timestamp: safeToDate(task.updatedAt || task.createdAt),
          client: task.clientName || task.client?.name,
          status: task.status,
        })
      })

    // Campaign activities (max 1)
    if (campaignsData.length > 0) {
      const latestCampaign = campaignsData.sort((a, b) => {
        const aTime = safeToDate(a.createdAt)
        const bTime = safeToDate(b.createdAt)
        return bTime.getTime() - aTime.getTime()
      })[0]

      activities.push({
        id: latestCampaign.id,
        type: "campaign",
        title: "Nuova Campagna",
        details: latestCampaign.title || "Campagna senza nome",
        timestamp: safeToDate(latestCampaign.createdAt),
        client: latestCampaign.clientName,
        status: latestCampaign.status,
      })
    }

    // Quote activities (max 1)
    if (quotesData.length > 0) {
      const latestQuote = quotesData.sort((a, b) => {
        const aTime = safeToDate(a.createdAt)
        const bTime = safeToDate(b.createdAt)
        return bTime.getTime() - aTime.getTime()
      })[0]

      activities.push({
        id: latestQuote.id,
        type: "quote",
        title: latestQuote.status === "sent" ? "Preventivo Inviato" : "Preventivo Creato",
        details: `€${latestQuote.amount?.toLocaleString() || 0} - ${latestQuote.title || "Preventivo"}`,
        timestamp: safeToDate(latestQuote.createdAt),
        client: latestQuote.clientName,
        status: latestQuote.status,
      })
    }

    // Sort all activities by timestamp and return max 6
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 6)
  }

  return {
    stats,
    recentActivities,
    loading,
    error,
    refetch: () => {
      if (user?.uid && userData?.tenantId) {
        setLoading(true)
        // Re-trigger the effect by updating a state
        setStats((prev) => ({ ...prev }))
      }
    },
  }
}
