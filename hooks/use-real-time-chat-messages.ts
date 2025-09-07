"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  sessionId: string
  userId: string
  adminId: string
}

export interface ChatMessagesState {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
}

export function useRealTimeChatMessages(sessionId: string | null): ChatMessagesState {
  const [state, setState] = useState<ChatMessagesState>({
    messages: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!sessionId) {
      setState({ messages: [], loading: false, error: null })
      return
    }

    console.log("🔍 Setting up real-time chat messages listener for session:", sessionId)

    setState((prev) => ({ ...prev, loading: true }))

    // Create query for session messages
    const messagesQuery = query(
      collection(db, "chat_messages"),
      where("sessionId", "==", sessionId),
      orderBy("timestamp", "asc"),
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages: ChatMessage[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          messages.push({
            id: doc.id,
            content: data.content,
            role: data.role,
            timestamp: data.timestamp?.toDate() || new Date(),
            sessionId: data.sessionId,
            userId: data.userId,
            adminId: data.adminId,
          })
        })

        console.log(`🔄 Chat messages update: ${messages.length} messages for session ${sessionId}`)

        setState({
          messages,
          loading: false,
          error: null,
        })
      },
      (error) => {
        console.error("❌ Error in chat messages listener:", error)
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }))
      },
    )

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up chat messages listener")
      unsubscribe()
    }
  }, [sessionId])

  return state
}
