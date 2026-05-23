export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  sessionId: string
  userId: string
  adminId?: string
}

export interface ChatSession {
  id: string
  title: string
  userId: string
  adminId?: string
  lastMessage: string
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

export interface PaginatedChatSessions {
  sessions: ChatSession[]
  nextOffset: number | null
  hasMore: boolean
}
