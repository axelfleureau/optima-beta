"use client"

import { useState, useEffect } from "react"
import { collection, query, where, limit, getDocs, orderBy } from "firebase/firestore"
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
    if (!user?.uid) {
      console.log("❌ useDashboardData: No user logged in")
      setLoading(false)
      return
    }
    
    if (!userData) {
      console.log("⏳ useDashboardData: User data not loaded yet")
      setLoading(true)
      return
    }
    
    if (!userData.tenantId) {
      console.log("❌ useDashboardData: No tenantId in userData:", userData)
      setError("Configurazione utente incompleta - tenantId mancante")
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

        console.log("Admin ID for dashboard:", adminId, "User role:", userData.role)

        // Fetch all data in parallel
        const [clientsData, campaignsData, quotesData, tasksData, tokenData, aiUsageData] = await Promise.all([
          fetchClients(),
          fetchCampaigns(),
          fetchQuotes(),
          fetchTasks(),
          fetchTokenData(adminId),
          fetchAIUsage(adminId),
        ])

        console.log("Fetched data:", {
          clients: clientsData.length,
          campaigns: campaignsData.length,
          quotes: quotesData.length,
          tasks: tasksData.length,
          aiUsage: aiUsageData.length,
          tokenData,
        })

        // Calculate stats
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        // Count pending and completed tasks properly
        let completedTasks = 0
        let pendingTasks = 0

        tasksData.forEach((task: any) => {
          const status = task.status?.toLowerCase() || task.columnId?.toLowerCase() || ""

          // Task completate: done, validation, completed
          if (status === "done" || status === "completed" || status === "validation") {
            // Solo se completate nell'ultimo mese
            const completedAt = safeToDate(task.completedAt || task.updatedAt)
            if (completedAt >= oneMonthAgo) {
              completedTasks++
            }
          }
          // Task pendenti: tutte quelle attive (non done, validation, sospese o ricorrenti)
          else if (
            status !== "done" &&
            status !== "completed" &&
            status !== "validation" &&
            status !== "suspended" &&
            status !== "sospeso" &&
            status !== "recurring" &&
            status !== "ricorrente" &&
            status !== "archived" &&
            status !== "archiviato"
          ) {
            pendingTasks++
          }
        })

        console.log("Task counts:", { completedTasks, pendingTasks, totalTasks: tasksData.length })

        const newStats = {
          totalClients: clientsData.length,
          activeCampaigns: campaignsData.filter((c: any) => c.status === "active" || c.status === "running").length,
          sentQuotes: quotesData.filter((q: any) => q.status === "sent" || q.status === "pending").length,
          completedTasks,
          pendingTasks,
          totalRevenue: quotesData
            .filter((q: any) => q.status === "accepted")
            .reduce((sum: number, q: any) => sum + (q.amount || 0), 0),
          aiTokensUsed: tokenData.aiTokensUsed,
          aiTokensLimit: tokenData.aiTokensLimit,
        }

        console.log("Calculated stats:", newStats)

        // Build recent activities (max 5)
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
      // Fetch all tasks without orderBy to avoid composite index requirement
      const q = query(collection(db, "tasks"), where("tenantId", "==", userData?.tenantId))
      const snapshot = await getDocs(q)
      const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      console.log(
        "Raw tasks data:",
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          columnId: t.columnId,
        })),
      )

      return tasks
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

  // 🔧 CORREZIONE: Migliora il fetch delle attività AI
  const fetchAIUsage = async (adminId: string) => {
    try {
      console.log("🔍 Fetching AI usage for adminId:", adminId)

      // Prima prova con adminId
      let q = query(
        collection(db, "ai_usage"),
        where("adminId", "==", adminId),
        orderBy("createdAt", "desc"),
        limit(10),
      )

      let snapshot = await getDocs(q)
      let aiUsageData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      console.log("🔍 AI usage found with adminId:", aiUsageData.length)

      // Se non trova nulla con adminId, prova con userId (fallback)
      if (aiUsageData.length === 0 && user?.uid) {
        console.log("🔍 Trying fallback with userId:", user.uid)
        q = query(collection(db, "ai_usage"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(10))

        snapshot = await getDocs(q)
        aiUsageData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        console.log("🔍 AI usage found with userId fallback:", aiUsageData.length)
      }

      // Se ancora non trova nulla, prova senza orderBy per evitare problemi di indici
      if (aiUsageData.length === 0) {
        console.log("🔍 Trying without orderBy...")
        q = query(collection(db, "ai_usage"), where("adminId", "==", adminId), limit(10))

        snapshot = await getDocs(q)
        aiUsageData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        console.log("🔍 AI usage found without orderBy:", aiUsageData.length)
      }

      console.log(
        "🔍 Final AI usage data:",
        aiUsageData.map((item) => ({
          id: item.id,
          feature: item.feature,
          promptType: item.promptType,
          tokensUsed: item.tokensUsed,
          createdAt: item.createdAt,
          adminId: item.adminId,
          userId: item.userId,
        })),
      )

      return aiUsageData
    } catch (error) {
      console.error("❌ Error fetching AI usage:", error)

      // Fallback: prova una query più semplice
      try {
        console.log("🔍 Trying simple query fallback...")
        const simpleQuery = query(collection(db, "ai_usage"), limit(5))
        const simpleSnapshot = await getDocs(simpleQuery)
        const fallbackData = simpleSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        console.log("🔍 Fallback AI usage data:", fallbackData.length)
        return fallbackData.filter((item: any) => item.adminId === adminId || item.userId === user?.uid)
      } catch (fallbackError) {
        console.error("❌ Fallback query also failed:", fallbackError)
        return []
      }
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

    console.log("🔧 Building recent activities with AI usage data:", aiUsageData.length)

    // 🔧 MIGLIORAMENTO: AI Usage activities con più dettagli
    aiUsageData.slice(0, 3).forEach((usage) => {
      const feature = usage.feature || usage.promptType || "chat"
      const tokensUsed = usage.tokensUsed || 0

      let title = "Utilizzo AI Assistant"
      let details = "Generazione contenuto"

      // Personalizza il titolo e i dettagli in base al tipo di utilizzo
      switch (feature.toLowerCase()) {
        case "chat":
          title = "Chat AI Assistant"
          details = "Conversazione con l'assistente AI"
          break
        case "template":
          title = "Generazione Template"
          details = "Creazione contenuto da template"
          break
        case "task_optimization":
          title = "Ottimizzazione Task"
          details = "Ottimizzazione automatica delle attività"
          break
        case "content_generation":
          title = "Generazione Contenuti"
          details = "Creazione automatica di contenuti"
          break
        default:
          title = "Utilizzo AI Assistant"
          details = `${feature} - Generazione contenuto`
      }

      activities.push({
        id: usage.id,
        type: "ai_usage",
        title,
        details,
        timestamp: safeToDate(usage.createdAt),
        tokensUsed,
        user: usage.userEmail || userData?.firstName || "Utente",
      })
    })

    // Task activities (max 2) - sort in memory to avoid composite index
    const sortedTasks = tasksData
      .sort((a, b) => {
        const aTime = safeToDate(a.updatedAt || a.createdAt)
        const bTime = safeToDate(b.updatedAt || b.createdAt)
        return bTime.getTime() - aTime.getTime()
      })
      .slice(0, 2)

    sortedTasks.forEach((task) => {
      const isCompleted = task.status === "completed" || task.status === "done" || task.columnId === "done"
      activities.push({
        id: task.id,
        type: "task",
        title: isCompleted ? "Task Completato" : "Task Aggiornato",
        details: task.title || "Task senza titolo",
        timestamp: safeToDate(task.updatedAt || task.createdAt),
        client: task.clientName || task.client?.name,
        status: task.status || task.columnId,
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

    // Sort all activities by timestamp and return max 5
    const sortedActivities = activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)

    console.log(
      "🔧 Final activities:",
      sortedActivities.map((a) => ({
        type: a.type,
        title: a.title,
        timestamp: a.timestamp,
        tokensUsed: a.tokensUsed,
      })),
    )

    return sortedActivities
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
