import { db } from "./firebase"
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type DocumentSnapshot,
} from "firebase/firestore"

export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  sessionId: string
  userId: string
  adminId: string
}

export interface ChatSession {
  id: string
  title: string
  userId: string
  adminId: string
  lastMessage: string
  lastMessageAt: Date
  createdAt: Date
  messageCount: number
}

export interface PaginatedChatSessions {
  sessions: ChatSession[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
}

// Create a new chat session
export async function createChatSession(userId: string, adminId: string, firstMessage: string): Promise<string> {
  try {
    const sessionData = {
      title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : ""),
      userId,
      adminId,
      lastMessage: firstMessage,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      messageCount: 1,
    }

    const sessionRef = await addDoc(collection(db, "chat_sessions"), sessionData)
    console.log("Created new chat session:", sessionRef.id)
    return sessionRef.id
  } catch (error) {
    console.error("Error creating chat session:", error)
    throw error
  }
}

// Save a message to the chat session
export async function saveChatMessage(
  sessionId: string,
  content: string,
  role: "user" | "assistant",
  userId: string,
  adminId: string,
): Promise<void> {
  try {
    // Save the message
    await addDoc(collection(db, "chat_messages"), {
      content,
      role,
      sessionId,
      userId,
      adminId,
      timestamp: serverTimestamp(),
    })

    // Update session with last message info and increment message count
    const sessionRef = doc(db, "chat_sessions", sessionId)
    await updateDoc(sessionRef, {
      lastMessage: content.substring(0, 100),
      lastMessageAt: serverTimestamp(),
      messageCount: role === "user" ? 1 : 0,
    })

    console.log(`Saved ${role} message to session ${sessionId}`)
  } catch (error) {
    console.error("Error saving chat message:", error)
    throw error
  }
}

// Get chat history for a session
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    console.log("🔍 Getting chat history for session:", sessionId)

    const messagesQuery = query(collection(db, "chat_messages"), where("sessionId", "==", sessionId))

    const snapshot = await getDocs(messagesQuery)
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

    // Sort in memory by timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    console.log(`✅ Retrieved ${messages.length} messages for session ${sessionId}`)
    return messages
  } catch (error) {
    console.error("Error getting chat history:", error)
    return []
  }
}

// Get user's chat sessions with TRUE pagination
export async function getUserChatSessionsPaginated(
  userId: string,
  pageSize = 12,
  lastDoc: DocumentSnapshot | null = null,
): Promise<PaginatedChatSessions> {
  try {
    console.log(`🔍 Loading paginated chat sessions for user ${userId} (pageSize: ${pageSize})`)

    let sessionsQuery = query(
      collection(db, "chat_sessions"),
      where("userId", "==", userId),
      orderBy("lastMessageAt", "desc"),
      limit(pageSize),
    )

    // If we have a lastDoc, start after it for pagination
    if (lastDoc) {
      sessionsQuery = query(
        collection(db, "chat_sessions"),
        where("userId", "==", userId),
        orderBy("lastMessageAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize),
      )
      console.log("📄 Continuing from last document for pagination")
    }

    const snapshot = await getDocs(sessionsQuery)
    const sessions: ChatSession[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      sessions.push({
        id: doc.id,
        title: data.title || "Nuova Conversazione",
        userId: data.userId,
        adminId: data.adminId,
        lastMessage: data.lastMessage || "",
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        messageCount: data.messageCount || 0,
      })
    })

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null
    const hasMore = snapshot.docs.length === pageSize

    console.log(`✅ Retrieved ${sessions.length} sessions, hasMore: ${hasMore}`)

    return {
      sessions,
      lastDoc: newLastDoc,
      hasMore,
    }
  } catch (error) {
    console.error("❌ Error getting paginated chat sessions:", error)
    return {
      sessions: [],
      lastDoc: null,
      hasMore: false,
    }
  }
}

// Backward compatibility - keep the old function but use the new one internally
export async function getUserChatSessions(userId: string, offset = 0, limit = 20): Promise<ChatSession[]> {
  try {
    const result = await getUserChatSessionsPaginated(userId, limit, null)
    return result.sessions
  } catch (error) {
    console.error("Error getting user chat sessions:", error)
    return []
  }
}
