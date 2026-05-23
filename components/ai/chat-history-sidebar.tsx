"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Plus, Clock, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ChatSession, PaginatedChatSessions } from "@/lib/chat-types"

interface ChatHistorySidebarProps {
  userId: string
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewChat: () => void
  refreshKey?: number
}

function parseSession(raw: any): ChatSession {
  return {
    id: raw.id,
    title: raw.title || "Nuova conversazione",
    userId: raw.userId || "",
    lastMessage: raw.lastMessage || "",
    lastMessageAt: raw.lastMessageAt ? new Date(raw.lastMessageAt) : new Date(),
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    messageCount: Number(raw.messageCount || 0),
  }
}

async function getChatSessions(limit: number, offset: number | null): Promise<PaginatedChatSessions> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset || 0),
  })
  const response = await fetch(`/api/ai/chat/sessions?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Errore caricamento cronologia: ${response.status}`)
  }

  const payload = await response.json()
  return {
    sessions: (payload.sessions || []).map(parseSession),
    nextOffset: payload.nextOffset ?? null,
    hasMore: Boolean(payload.hasMore),
  }
}

export function ChatHistorySidebar({
  userId,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  refreshKey = 0,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextOffset, setNextOffset] = useState<number | null>(0)
  const [searchQuery, setSearchQuery] = useState("")
  const observerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const SESSIONS_PER_PAGE = 12 // Ottimizzato per performance

  // Load initial sessions
  const loadInitialSessions = async () => {
    try {
      setLoading(true)
      console.log("📚 Loading initial chat sessions...")

      const result: PaginatedChatSessions = await getChatSessions(SESSIONS_PER_PAGE, 0)

      setSessions(result.sessions)
      setNextOffset(result.nextOffset)
      setHasMore(result.hasMore)

      console.log(`✅ Loaded ${result.sessions.length} initial sessions, hasMore: ${result.hasMore}`)
    } catch (error) {
      console.error("❌ Error loading initial chat sessions:", error)
      setSessions([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  // Load more sessions for infinite scroll
  const loadMoreSessions = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery || nextOffset === null) {
      console.log("🚫 Skipping loadMore:", { loadingMore, hasMore, searchQuery, nextOffset })
      return
    }

    try {
      setLoadingMore(true)
      console.log("📖 Loading more sessions...")

      const result: PaginatedChatSessions = await getChatSessions(SESSIONS_PER_PAGE, nextOffset)

      if (result.sessions.length === 0) {
        setHasMore(false)
        console.log("📝 No more sessions to load")
      } else {
        setSessions((prev) => [...prev, ...result.sessions])
        setNextOffset(result.nextOffset)
        setHasMore(result.hasMore)
        console.log(
          `✅ Loaded ${result.sessions.length} more sessions (total: ${sessions.length + result.sessions.length})`,
        )
      }
    } catch (error) {
      console.error("❌ Error loading more chat sessions:", error)
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, loadingMore, hasMore, searchQuery, nextOffset, sessions.length])

  useEffect(() => {
    if (userId) {
      loadInitialSessions()
    }
  }, [userId, refreshKey])

  // Filter sessions based on search query with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions)
    } else {
      const timeoutId = setTimeout(() => {
        const filtered = sessions.filter(
          (session) =>
            session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        setFilteredSessions(filtered)
        console.log(`🔍 Filtered ${filtered.length} sessions for query: "${searchQuery}"`)
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [sessions, searchQuery])

  // Scroll event handler for infinite scroll fallback
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingMore || !hasMore || searchQuery) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

    // Trigger when 80% scrolled
    if (scrollPercentage > 0.8) {
      console.log("🚀 Loading more sessions triggered by scroll event")
      loadMoreSessions()
    }
  }, [loadingMore, hasMore, searchQuery, loadMoreSessions])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        console.log("👁️ Observer triggered:", {
          isIntersecting: target.isIntersecting,
          hasMore,
          loadingMore,
          loading,
          searchQuery: !!searchQuery,
          sessionsCount: sessions.length,
        })

        if (target.isIntersecting && hasMore && !loadingMore && !loading && !searchQuery) {
          console.log("🚀 Loading more sessions triggered by intersection")
          loadMoreSessions()
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
        rootMargin: "50px",
      },
    )

    if (observerRef.current && scrollContainerRef.current) {
      observer.observe(observerRef.current)
      console.log("👀 Observer attached to element")
    }

    return () => {
      observer.disconnect()
      console.log("🔌 Observer disconnected")
    }
  }, [hasMore, loadingMore, loading, searchQuery, loadMoreSessions, sessions.length])

  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    console.log("📜 Scroll event listener attached")

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll)
      console.log("📜 Scroll event listener removed")
    }
  }, [handleScroll])

  const handleNewChat = () => {
    console.log("🆕 Starting new chat - resetting to welcome message")
    onNewChat()
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Ora"
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-sm">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            Cronologia Chat
          </h2>
          <Button
            onClick={handleNewChat}
            size="sm"
            className="h-9 w-9 p-0 bg-righello-pink hover:bg-righello-pink-dark shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca conversazioni..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-pink-300 focus:ring-pink-200"
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {searchQuery
            ? `${filteredSessions.length} risultati`
            : `${sessions.length} conversazioni${hasMore ? "+" : ""} caricate`}
        </p>
      </div>

      {/* Scrollable Sessions List */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
          <div className="px-4 py-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? "Nessun risultato" : "Nessuna conversazione"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {searchQuery ? "Prova con termini diversi" : "Inizia una nuova chat per vedere la cronologia"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSessionSelect(session.id)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-sm group",
                      currentSessionId === session.id
                        ? "bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-sm"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {session.lastMessage}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatDate(session.lastMessageAt)}
                        </div>
                        {session.messageCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 px-2 py-0.5"
                          >
                            {session.messageCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                      <span>Caricamento altre chat...</span>
                    </div>
                  </div>
                )}

                {/* Intersection observer target */}
                {hasMore && !loadingMore && !searchQuery && (
                  <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
                    <div className="text-xs text-gray-400 text-center">
                      <div>Scorri per caricare altro ({sessions.length} chat caricate)</div>
                    </div>
                  </div>
                )}

                {!hasMore && sessions.length > 0 && !searchQuery && (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400">
                      ✅ Tutte le conversazioni caricate ({sessions.length} totali)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Fixed height */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          💡 Le conversazioni includono memoria del contesto per risposte più precise
        </div>
      </div>
    </div>
  )
}
