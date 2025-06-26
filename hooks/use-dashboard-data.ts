"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

interface DashboardStats {
  activeCampaigns: number
  sentQuotes: number
  completedTasks: number
  aiTokensUsed: number
  aiTokensLimit: number
}

interface RecentActivity {
  id: string
  type: "client" | "campaign" | "task" | "quote"
  title: string
  description: string
  timestamp: Date
  clientName?: string
}

export function useDashboardData() {
  const { userData } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    sentQuotes: 0,
    completedTasks: 0,
    aiTokensUsed: 0,
    aiTokensLimit: 1000000,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.tenantId) return

    const tenantId = userData.tenantId
    let unsubscribeCampaigns: (() => void) | undefined
    let unsubscribeQuotes: (() => void) | undefined
    let unsubscribeTasks: (() => void) | undefined
    let unsubscribeActivities: (() => void) | undefined

    const initFirestore = async () => {
      try {
        const { db } = await import("@/lib/firebase")
        const { query, collection, where, onSnapshot, limit, doc, getDoc } = await import("firebase/firestore")

        // Subscribe to campaigns (without orderBy to avoid index requirement)
        const campaignsQuery = query(collection(db, "campaigns"), where("tenantId", "==", tenantId))

        unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
          const activeCampaigns = snapshot.docs.filter((doc) => doc.data().status === "active").length
          setStats((prev) => ({ ...prev, activeCampaigns }))
        })

        // Subscribe to quotes (without orderBy to avoid index requirement)
        const quotesQuery = query(collection(db, "quotes"), where("tenantId", "==", tenantId))

        unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
          const sentQuotes = snapshot.docs.filter((doc) => ["sent", "viewed"].includes(doc.data().status)).length
          setStats((prev) => ({ ...prev, sentQuotes }))
        })

        // Subscribe to tasks (without orderBy to avoid index requirement)
        const tasksQuery = query(collection(db, "tasks"), where("tenantId", "==", tenantId))

        unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const completedTasks = snapshot.docs.filter((doc) => doc.data().columnId === "done").length
          setStats((prev) => ({ ...prev, completedTasks }))
        })

        // Subscribe to activities (without orderBy, sort client-side)
        const activitiesQuery = query(
          collection(db, "activities"),
          where("tenantId", "==", tenantId),
          limit(20), // Get more to sort client-side
        )

        unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
          const activities = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().createdAt?.toDate() || new Date(),
            }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort client-side
            .slice(0, 10) as RecentActivity[] // Take only first 10

          setRecentActivities(activities)
        })

        // Check AI tokens from user data with debugging
        console.log("🔍 Dashboard: Checking AI tokens from userData", {
          aiTokensUsed: userData.aiTokensUsed,
          aiTokensLimit: userData.aiTokensLimit,
        })

        // Check for anomalous data (tokens > 100K suggests old/corrupted data)
        const currentTokensUsed = userData.aiTokensUsed || 0
        const currentTokensLimit = userData.aiTokensLimit || 1000000

        if (currentTokensUsed > 100000) {
          console.log("⚠️ Dashboard: Anomalous token usage detected, resetting to 0")
          console.log("🔍 Dashboard: userData for reset:", { uid: userData.uid, tenantId: userData.tenantId })

          // Reset tokens in database with better error handling
          try {
            if (!userData.uid) {
              console.error("❌ Dashboard: userData.uid is undefined, cannot reset tokens")
              // Still update UI to show 0
              setStats((prev) => ({
                ...prev,
                aiTokensUsed: 0,
                aiTokensLimit: currentTokensLimit,
              }))
              return
            }

            const { updateDoc, setDoc } = await import("firebase/firestore")
            const userRef = doc(db, "users", userData.uid)

            // Try to update, if fails try to create
            try {
              await updateDoc(userRef, {
                aiTokensUsed: 0,
                updatedAt: new Date(),
              })
              console.log("✅ Dashboard: Tokens reset to 0 in database via updateDoc")
            } catch (updateError) {
              console.log("⚠️ Dashboard: updateDoc failed, trying setDoc:", updateError)

              // Document might not exist, create it
              await setDoc(
                userRef,
                {
                  aiTokensUsed: 0,
                  aiTokensLimit: currentTokensLimit,
                  tenantId: userData.tenantId,
                  updatedAt: new Date(),
                  createdAt: new Date(),
                },
                { merge: true },
              )
              console.log("✅ Dashboard: Tokens reset to 0 in database via setDoc")
            }

            // Update stats with reset value
            setStats((prev) => ({
              ...prev,
              aiTokensUsed: 0,
              aiTokensLimit: currentTokensLimit,
            }))
          } catch (error) {
            console.error("❌ Dashboard: Error resetting tokens:", error)
            console.error("❌ Dashboard: Error details:", {
              message: error.message,
              stack: error.stack,
              userData: { uid: userData.uid, tenantId: userData.tenantId },
            })

            // Still update UI to show 0 even if database update fails
            setStats((prev) => ({
              ...prev,
              aiTokensUsed: 0,
              aiTokensLimit: currentTokensLimit,
            }))
          }
        } else {
          // Set AI tokens from user data (normal case)
          console.log("✅ Dashboard: Using normal token values:", { currentTokensUsed, currentTokensLimit })
          setStats((prev) => ({
            ...prev,
            aiTokensUsed: currentTokensUsed,
            aiTokensLimit: currentTokensLimit,
          }))
        }

        // Double-check with ai_usage collection for debugging
        try {
          const aiUsageRef = doc(db, "ai_usage", userData.tenantId)
          const aiUsageSnap = await getDoc(aiUsageRef)

          if (aiUsageSnap.exists()) {
            const aiUsageData = aiUsageSnap.data()
            console.log("🔍 Dashboard: AI usage from ai_usage collection", {
              tokensUsed: aiUsageData.tokensUsed,
              tokensLimit: aiUsageData.tokensLimit,
            })
          } else {
            console.log("🔍 Dashboard: No ai_usage document found")
          }
        } catch (err) {
          console.error("❌ Dashboard: Error checking ai_usage:", err)
        }

        setLoading(false)
      } catch (err) {
        console.error("Error initializing Firestore:", err)
        setLoading(false)
      }
    }

    initFirestore()

    return () => {
      if (unsubscribeCampaigns) unsubscribeCampaigns()
      if (unsubscribeQuotes) unsubscribeQuotes()
      if (unsubscribeTasks) unsubscribeTasks()
      if (unsubscribeActivities) unsubscribeActivities()
    }
  }, [userData])

  return {
    stats,
    recentActivities,
    loading,
  }
}
