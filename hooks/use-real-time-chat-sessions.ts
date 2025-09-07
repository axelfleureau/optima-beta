"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { findUserDocumentId } from "@/lib/token-service"
import type { ChatSession } from "@/lib/chat-service"

interface UseRealTimeChatSessionsReturn {
  sessions: ChatSession[]
  loading: boolean
  error: string | null
  isRealTime: boolean
}

export function useRealTimeChatSessions(userId: string, limitCount = 20): UseRealTimeChatSessionsReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRealTime, setIsRealTime] = useState(false)

  useEffect(() => {
    if (!userId) {
      console.log("⚠️ No userId provided to useRealTimeChatSessions")
      setLoading(false)
      return
    }

    console.log("🚀 Setting up real-time chat sessions subscription for:", userId)

    let unsubscribe: Unsubscribe | null = null

    const setupSubscription = async () => {
      try {
        setLoading(true)
        setError(null)

        // Resolve the user ID first
        const resolvedUserId = await findUserDocumentId(userId)
        if (!resolvedUserId) {
          setError(`User not found: ${userId}`)
          setLoading(false)
          setIsRealTime(false)
          return
        }

        // Set up real-time subscription for recent chat sessions
        const chatSessionsQuery = query(
          collection(db, "chatSessions"),
          where("userId", "==", resolvedUserId),
          orderBy("lastMessageAt", "desc"),
          limit(limitCount),
        )

        unsubscribe = onSnapshot(
          chatSessionsQuery,
          (snapshot) => {
            const chatSessions: ChatSession[] = []

            snapshot.forEach((doc) => {
              const data = doc.data()
              chatSessions.push({
                id: doc.id,
                userId: data.userId,
                title: data.title || "Nuova Conversazione",
                lastMessage: data.lastMessage || "",
                lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
                messageCount: data.messageCount || 0,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              })
            })

            console.log(`📱 Real-time chat sessions updated: ${chatSessions.length} sessions`)
            setSessions(chatSessions)
            setLoading(false)
            setIsRealTime(true)
            setError(null)
          },
          (err) => {
            console.error("❌ Real-time chat sessions error:", err)
            setError(err.message)
            setLoading(false)
            setIsRealTime(false)
          },
        )
      } catch (err) {
        console.error("❌ Error setting up chat sessions subscription:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setLoading(false)
        setIsRealTime(false)
      }
    }

    setupSubscription()

    return () => {
      if (unsubscribe) {
        console.log("🔌 Cleaning up chat sessions subscription")
        unsubscribe()
      }
    }
  }, [userId, limitCount])

  return {
    sessions,
    loading,
    error,
    isRealTime,
  }
}
