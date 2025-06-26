"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Bot, User, MessageSquare, Sparkles, Copy, CheckCircle2, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/chat-service"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isStreaming?: boolean
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
    } else if (showWelcome || messages.length === 0) {
      // Show welcome message for new chats
      setMessages([
        {
          id: "welcome",
          content:
            "👋 **Ciao! Sono l'assistente AI di Optima.**\n\nSono qui per aiutarti con:\n\n• **Copywriting** e contenuti creativi\n• **Strategie marketing** personalizzate\n• **Campagne pubblicitarie** efficaci\n• **Social media** e engagement\n• **Email marketing** e automazioni\n• **Analisi competitor** e mercato\n\n✨ **Come posso aiutarti oggi?**",
          role: "assistant",
          timestamp: new Date(),
        },
      ])
    }
  }, [initialMessages, showWelcome])

  // Update session ID when prop changes
  useEffect(() => {
    setCurrentSessionId(sessionId || null)
  }, [sessionId])

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
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log("✅ Stream reading completed")
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim()
                if (jsonStr) {
                  const data = JSON.parse(jsonStr)

                  if (data.sessionId && !currentSessionId) {
                    console.log("🆔 Setting session ID:", data.sessionId)
                    setCurrentSessionId(data.sessionId)
                    if (onSessionCreated) {
                      onSessionCreated(data.sessionId)
                    }
                  }

                  if (data.error) {
                    console.error("❌ Stream error:", data.error)
                    throw new Error(data.error)
                  }

                  if (data.content) {
                    console.log("📝 Received content chunk:", data.content.substring(0, 50) + "...")
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
                    setMessages((prev) =>
                      prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg)),
                    )

                    // Notify parent component that message was sent (to refresh token info)
                    if (onMessageSent) {
                      console.log("🔄 Notifying parent of message completion")
                      onMessageSent()
                    }
                  }
                }
              } catch (parseError) {
                console.error("❌ Error parsing SSE data:", parseError, "Line:", line)
              }
            }
          }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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
              dangerouslySetInnerHTML={{ __html: processedText }}
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
              dangerouslySetInnerHTML={{ __html: processedText }}
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
              dangerouslySetInnerHTML={{ __html: processedText }}
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
          <p key={i} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: processedLine }} />
          </p>,
        )
        continue
      }

      // Regular paragraphs
      const processedLine = line
        .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-gray-900 dark:text-white'>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")

      elements.push(
        <p key={i} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: processedLine }} />
        </p>,
      )
    }

    return <div className="space-y-1">{elements}</div>
  }

  return (
    <div className="h-[700px] flex flex-col bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden border border-pink-200 dark:border-gray-700 shadow-lg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-pink-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 bg-gradient-to-r from-pink-500 to-rose-600 shadow-md">
                <AvatarFallback className="bg-transparent text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Assistente AI Optima</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-pink-500" />
                Marketing Expert • Memoria Conversazioni Attiva
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 shadow-sm"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Chat Attiva
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
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
                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white ml-auto shadow-md"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700",
                )}
              >
                <div className="text-sm">
                  {message.isStreaming ? (
                    <div className="flex items-center gap-2">
                      <span>{message.content || "Sto pensando..."}</span>
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                    </div>
                  ) : (
                    <div>{formatMessage(message.content)}</div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => copyToClipboard(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
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
      <div className="bg-white dark:bg-gray-800 border-t border-pink-200 dark:border-gray-700 p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi il tuo messaggio... (Premi Invio per inviare)"
              disabled={isLoading}
              className="min-h-[44px] max-h-32 resize-none border-gray-300 dark:border-gray-600 focus:border-pink-500 dark:focus:border-pink-400 rounded-xl shadow-sm"
              rows={1}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="h-11 w-11 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg"
            size="sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Powered by GPT-4o Mini • Memoria conversazioni + Token tracking attivi</span>
          {currentSessionId && <span>Sessione: {currentSessionId.slice(-8)}</span>}
        </div>
      </div>
    </div>
  )
}
