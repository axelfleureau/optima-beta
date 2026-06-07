"use client"

import type React from "react"

import { useCallback, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Bot, User, Sparkles, Copy, CheckCircle2, Clock, ThumbsUp, ThumbsDown, RefreshCw, AlertTriangle, Database, Network, Radio } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/chat-types"
import DOMPurify from 'dompurify'

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isStreaming?: boolean
  feedback?: 'positive' | 'negative' | null
  canRegenerate?: boolean
  error?: boolean
}

interface AIChatProps {
  userId: string
  sessionId?: string | null
  initialMessages?: ChatMessage[]
  onMessageSent?: () => void
  onSessionCreated?: (sessionId: string) => void
  showWelcome?: boolean
}

export function AIChat({
  userId,
  sessionId,
  initialMessages = [],
  onMessageSent,
  onSessionCreated,
  showWelcome = false,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [modelName, setModelName] = useState("Modello Óptima")
  const [contextSources, setContextSources] = useState<string[]>([])
  const [lastInboxSyncAt, setLastInboxSyncAt] = useState<Date | null>(null)
  const [isInboxSyncing, setIsInboxSyncing] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  // Load initial messages or welcome message
  useEffect(() => {
    if (initialMessages.length > 0) {
      // Load from history
      const historyMessages: Message[] = initialMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp,
      }))
      setMessages(historyMessages)
    } else if (showWelcome) {
      // Show welcome message for new chats
      setMessages([
        {
          id: "welcome",
          content:
            "👋 **Ciao, sono l'assistente operativo di Óptima.**\n\nPosso aiutarti a ragionare su:\n\n• **Progetti**, task, priorità e scadenze\n• **Clienti** e stato lavori\n• **Team**, presenza, carico e colli di bottiglia\n• **Preventivi** e prossime azioni commerciali\n• **Graph memory**, nodi aziendali, Hermes e know-how\n\nQuando i dati sono disponibili, uso il contesto della piattaforma e del grafo. Per salvare conoscenza nel grafo puoi scrivere: `salva nel grafo: tipo=client; titolo=...; sommario=...; tag=...`.",
          role: "assistant",
          timestamp: new Date(),
        },
      ])
    } else {
      setMessages([])
    }
  }, [initialMessages, showWelcome, sessionId])

  // Update session ID when prop changes
  useEffect(() => {
    setCurrentSessionId(sessionId || null)
  }, [sessionId])

  const hydrateSessionMessages = useCallback(
    async (mode: "manual" | "poll" = "poll") => {
      if (!currentSessionId || currentSessionId.startsWith("temp_") || isLoading) return

      try {
        if (mode === "manual") setIsInboxSyncing(true)
        const response = await fetch(`/api/ai/chat/sessions/${currentSessionId}`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!response.ok) return

        const payload = await response.json()
        const nextMessages: Message[] = (payload.messages || [])
          .filter((message: any) => message.role === "user" || message.role === "assistant")
          .map((message: any) => ({
            id: String(message.id),
            content: String(message.content || ""),
            role: message.role,
            timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
            canRegenerate: message.role === "assistant",
          }))

        if (!nextMessages.length) return

        setMessages((current) => {
          const currentSignature = current
            .filter((message) => message.id !== "welcome" && !message.isStreaming)
            .map((message) => `${message.id}:${message.content.length}`)
            .join("|")
          const nextSignature = nextMessages.map((message) => `${message.id}:${message.content.length}`).join("|")
          return currentSignature === nextSignature ? current : nextMessages
        })
        setLastInboxSyncAt(new Date())
      } catch (error) {
        if (mode === "manual") {
          toast({
            title: "Sincronizzazione non riuscita",
            description: "Non sono riuscito a rileggere la conversazione agentica.",
            variant: "destructive",
          })
        }
      } finally {
        if (mode === "manual") setIsInboxSyncing(false)
      }
    },
    [currentSessionId, isLoading, toast],
  )

  useEffect(() => {
    if (!currentSessionId || currentSessionId.startsWith("temp_")) return

    let cancelled = false
    const sync = () => {
      if (cancelled || document.visibilityState === "hidden") return
      void hydrateSessionMessages("poll")
    }
    const interval = window.setInterval(sync, 12000)
    const handleFocus = () => sync()
    window.addEventListener("focus", handleFocus)
    sync()

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [currentSessionId, hydrateSessionMessages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !userId) {
      console.log("Cannot send message:", { input: input.trim(), isLoading, userId })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    }

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput("")
    setIsLoading(true)

    console.log("🚀 Sending message to API:", { userId, sessionId: currentSessionId, message: userMessage.content })

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: userId,
          sessionId: currentSessionId,
        }),
      })

      console.log("📡 API Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error:", errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      console.log("📖 Starting to read stream...")

      try {
        let buffer = ""
        let receivedAssistantContent = false

        const handleSsePayload = (jsonStr: string) => {
          if (!jsonStr) return
          const data = JSON.parse(jsonStr)

          if (data.sessionId && data.sessionId !== currentSessionId) {
            console.log("🆔 Setting session ID:", data.sessionId)
            setCurrentSessionId(data.sessionId)
            if (onSessionCreated) {
              onSessionCreated(data.sessionId)
            }
          }

          if (data.model) {
            setModelName(String(data.model))
          }

          if (Array.isArray(data.contextSources)) {
            setContextSources(data.contextSources.map(String))
          }

          if (data.error) {
            console.error("❌ Stream error:", data.error)
            throw new Error(data.error)
          }

          if (data.content) {
            if (String(data.content).trim()) {
              receivedAssistantContent = true
            }
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  const newContent = (msg.content || "") + data.content
                  return { ...msg, content: newContent }
                }
                return msg
              }),
            )
          }

          if (data.done) {
            console.log("🏁 Stream marked as done")
            const emptyResponseFallback =
              "Ho ricevuto la richiesta e l'ho salvata nella conversazione, ma il modello non ha restituito contenuto utile. Riprova con Invia o usa Rileggi tra qualche secondo se la risposta arriva in differita."
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: receivedAssistantContent || msg.content.trim() ? msg.content : emptyResponseFallback,
                      isStreaming: false,
                      canRegenerate: true,
                      error: !receivedAssistantContent && !msg.content.trim(),
                    }
                  : msg,
              ),
            )

            if (onMessageSent) {
              console.log("🔄 Notifying parent of message completion")
              onMessageSent()
            }
          }
        }

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log("✅ Stream reading completed")
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim()
                handleSsePayload(jsonStr)
              } catch (parseError) {
                console.error("❌ Error parsing SSE data:", parseError, "Line:", line)
                throw parseError
              }
            }
          }
        }

        if (buffer.startsWith("data: ")) {
          handleSsePayload(buffer.slice(6).trim())
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error("❌ Error sending message:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante l'invio del messaggio",
        variant: "destructive",
      })

      // Remove the assistant message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
    } finally {
      setIsLoading(false)
      console.log("🏁 Message sending completed")
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      toast({
        title: "Copiato!",
        description: "Il testo è stato copiato negli appunti",
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il testo",
        variant: "destructive",
      })
    }
  }

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      // Update message feedback locally
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg
        )
      )

      // Send feedback to API for analytics
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          feedback,
          userId,
          sessionId: currentSessionId,
        }),
      }).catch(() => {}) // Silently handle errors for feedback

      toast({
        description: feedback === 'positive' 
          ? "✨ Grazie! Il tuo feedback ci aiuta a migliorare" 
          : "📝 Feedback ricevuto. Lavoreremo per migliorare",
      })
    } catch (error) {
      console.error("Failed to submit feedback:", error)
    }
  }

  const regenerateResponse = async (messageId: string) => {
    try {
      setRegeneratingId(messageId)
      
      // Find the user message that preceded this assistant message
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1 || messageIndex === 0) return
      
      const userMessage = messages[messageIndex - 1]
      if (userMessage.role !== 'user') return

      // Mark the current message as regenerating
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isStreaming: true, content: "" } : msg
        )
      )

      // Call API to regenerate with same user message
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          userId: userId,
          sessionId: currentSessionId,
          regenerate: true,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Errore API: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim()
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr)
                if (data.model) setModelName(String(data.model))
                if (Array.isArray(data.contextSources)) setContextSources(data.contextSources.map(String))
                if (data.error) throw new Error(data.error)
                if (data.content) {
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id === messageId) {
                        const newContent = (msg.content || "") + data.content
                        return { ...msg, content: newContent }
                      }
                      return msg
                    })
                  )
                }
              } catch (parseError) {
                console.error("❌ Error parsing SSE data:", parseError, "Line:", line)
                throw parseError
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isStreaming: false, canRegenerate: true }
            : msg
        )
      )

      toast({
        description: "🔄 Risposta rigenerata con successo",
      })

    } catch (error) {
      console.error("Failed to regenerate response:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, error: true, isStreaming: false } : msg
        )
      )
      toast({
        title: "Errore",
        description: "Errore nella rigenerazione della risposta",
        variant: "destructive",
      })
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Sanitize HTML to prevent XSS attacks
  const sanitizeHTML = (html: string): string => {
    if (typeof window === 'undefined') {
      // Server-side: return plain text (strip all HTML tags)
      return html.replace(/<[^>]*>/g, '')
    }
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['strong', 'em', 'code', 'pre', 'br', 'p'],
      ALLOWED_ATTR: []
    })
  }

  const formatMessage = (content: string) => {
    if (!content || content.trim() === "") {
      return <span className="text-gray-400 italic">Contenuto vuoto</span>
    }

    const lines = content.split("\n")
    const elements: React.ReactNode[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (!line.trim()) {
        elements.push(<div key={i} className="h-3" />)
        continue
      }

      // Headers (### Title)
      if (line.startsWith("### ")) {
        const title = line.replace("### ", "").trim()
        elements.push(
          <div key={i} className="mt-6 mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
              {title}
            </h3>
          </div>,
        )
        continue
      }

      // Subheaders (## Title)
      if (line.startsWith("## ")) {
        const title = line.replace("## ", "").trim()
        elements.push(
          <div key={i} className="mt-5 mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>,
        )
        continue
      }

      // Main headers (# Title)
      if (line.startsWith("# ")) {
        const title = line.replace("# ", "").trim()
        elements.push(
          <div key={i} className="mt-6 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          </div>,
        )
        continue
      }

      // Bullet points with dash (- Item)
      if (line.startsWith("- ")) {
        const text = line.replace("- ", "").trim()
        const processedText = text
          .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-gray-900 dark:text-white'>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")

        elements.push(
          <div key={i} className="flex items-start gap-3 mb-2 ml-4">
            <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
            <span
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedText) }}
            />
          </div>,
        )
        continue
      }

      // Bullet points with bullet (• Item)
      if (line.startsWith("• ")) {
        const text = line.replace("• ", "").trim()
        const processedText = text
          .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-gray-900 dark:text-white'>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")

        elements.push(
          <div key={i} className="flex items-start gap-3 mb-2 ml-4">
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-2 flex-shrink-0"></div>
            <span
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedText) }}
            />
          </div>,
        )
        continue
      }

      // Numbered lists (1. Item, 2. Item, etc.)
      if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, "").trim()
        const number = line.match(/^(\d+)\./)?.[1] || "1"
        const processedText = text
          .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-gray-900 dark:text-white'>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")

        elements.push(
          <div key={i} className="flex items-start gap-3 mb-2 ml-4">
            <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              {number}
            </div>
            <span
              className="text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedText) }}
            />
          </div>,
        )
        continue
      }

      // Code blocks (\`\`\`code\`\`\`)
      if (line.startsWith("```") && line.endsWith("```")) {
        const code = line.replace(/```/g, "").trim()
        elements.push(
          <div key={i} className="my-3">
            <code className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 block">
              {code}
            </code>
          </div>,
        )
        continue
      }

      // Inline code (`code`)
      if (line.includes("`") && !line.startsWith("```")) {
        const processedLine = line
          .replace(
            /`([^`]+)`/g,
            "<code class='bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200'>$1</code>",
          )
          .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-gray-900 dark:text-white'>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")

        elements.push(
          <p key={i} className="mb-3 break-words text-gray-700 dark:text-gray-300 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedLine) }} />
          </p>,
        )
        continue
      }

      // Regular paragraphs
      const processedLine = line
        .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-gray-900 dark:text-white'>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")

      elements.push(
        <p key={i} className="mb-3 break-words text-gray-700 dark:text-gray-300 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedLine) }} />
        </p>,
      )
    }

    return <div className="min-w-0 max-w-full space-y-1 break-words [overflow-wrap:anywhere] [&_code]:break-words [&_code]:[overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto">{elements}</div>
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 shadow-lg dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-pink-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 bg-gradient-to-r from-pink-500 to-rose-600 shadow-md">
                <AvatarFallback className="bg-transparent text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900 dark:text-white">Assistente AI Optima</h3>
              <p className="flex items-center gap-1 truncate text-sm text-gray-500 dark:text-gray-400">
                <Sparkles className="h-3 w-3 text-pink-500" />
                Assistente operativo • Memoria, grafo e contesto piattaforma
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 shadow-sm"
          >
            <Radio className="h-3 w-3 mr-1" />
            Inbox agentica
          </Badge>
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-pink-100 bg-pink-50/70 px-3 py-2 text-xs text-pink-900 dark:border-pink-900/40 dark:bg-pink-950/20 dark:text-pink-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              Puoi scrivere richieste asincrone o salvare conoscenza con: salva nel grafo: tipo=...; titolo=...; sommario=...
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => hydrateSessionMessages("manual")}
            disabled={!currentSessionId || isInboxSyncing || isLoading}
            className="h-7 shrink-0 rounded-lg px-2 text-xs text-pink-700 hover:bg-pink-100 dark:text-pink-100 dark:hover:bg-pink-900/30"
          >
            {isInboxSyncing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
            Rileggi
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1 p-3 sm:p-4" ref={scrollAreaRef}>
        <div className="min-w-0 space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn("flex min-w-0 gap-2 sm:gap-3", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 bg-gradient-to-r from-pink-500 to-rose-600 flex-shrink-0 shadow-sm">
                  <AvatarFallback className="bg-transparent text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
              "max-w-[calc(100%-2.5rem)] min-w-0 rounded-2xl px-3 py-3 shadow-sm sm:max-w-[85%] sm:px-4",
                  message.role === "user"
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white ml-auto shadow-md"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700",
                )}
              >
                <div className="min-w-0 text-sm">
                  {message.isStreaming ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 break-words">{message.content || "Sto pensando..."}</span>
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                    </div>
                  ) : (
                    <div className="min-w-0 max-w-full">{formatMessage(message.content)}</div>
                  )}
                </div>

                <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                  <div
                    className={cn(
                      "text-xs flex items-center gap-1",
                      message.role === "user" ? "text-pink-100" : "text-gray-500 dark:text-gray-400",
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {message.role === "assistant" && !message.isStreaming && message.content && (
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Copy button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        title="Copia messaggio"
                      >
                        {copiedId === message.id ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>

                      {/* Feedback buttons */}
                      <div className="flex items-center gap-1 ml-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700",
                            message.feedback === 'positive' && "text-green-500 bg-green-50 hover:bg-green-100"
                          )}
                          onClick={() => handleFeedback(message.id, 'positive')}
                          title="Risposta utile"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700",
                            message.feedback === 'negative' && "text-red-500 bg-red-50 hover:bg-red-100"
                          )}
                          onClick={() => handleFeedback(message.id, 'negative')}
                          title="Risposta non utile"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Regenerate button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 ml-1"
                        onClick={() => regenerateResponse(message.id)}
                        disabled={regeneratingId === message.id}
                        title="Rigenera risposta"
                      >
                        {regeneratingId === message.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>

                      {/* Error indicator */}
                      {message.error && (
                        <div className="flex items-center gap-1 ml-1 text-red-500" title="Errore nella generazione">
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 bg-gradient-to-r from-gray-500 to-gray-600 flex-shrink-0 shadow-sm">
                  <AvatarFallback className="bg-transparent text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-pink-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="grid min-w-0 gap-2 sm:flex sm:items-end sm:gap-3">
          <div className="relative min-w-0 sm:flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi una richiesta operativa... l'AI puo rispondere subito o in differita"
              disabled={isLoading}
              className="min-h-[44px] max-h-32 resize-none border-gray-300 dark:border-gray-600 focus:border-pink-500 dark:focus:border-pink-400 rounded-xl shadow-sm"
              rows={1}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-black text-white shadow-lg hover:from-pink-600 hover:to-rose-700 sm:w-11 sm:p-0"
            size="sm"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin sm:mr-0" /> : <Send className="mr-2 h-4 w-4 sm:mr-0" />}
            <span className="sm:sr-only">Invia</span>
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2 truncate">
            <Network className="h-3 w-3 flex-shrink-0 text-pink-500" />
            <span className="truncate">{modelName} • memoria conversazioni • inbox agentica</span>
          </span>
          {contextSources.length > 0 && (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <Database className="h-3 w-3 flex-shrink-0 text-cyan-400" />
              <span className="truncate">{contextSources.join(", ")}</span>
            </span>
          )}
          {currentSessionId && (
            <span>
              Sessione: {currentSessionId.slice(-8)}
              {lastInboxSyncAt ? ` · sync ${lastInboxSyncAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
