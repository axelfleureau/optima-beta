"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { AIChat } from "@/components/ai/ai-chat"
import { ChatHistorySidebar } from "@/components/ai/chat-history-sidebar"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { getChatHistory, type ChatMessage } from "@/lib/chat-service"
import { getAvailableTokens, type TokenInfo } from "@/lib/token-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Zap, MessageSquare, AlertTriangle, TrendingUp, Activity, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AIAssistantClient() {
  const auth = useAuth()
  const dashboardData = useDashboardData()
  const toast = useToast()

  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // State for the component
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loadingTokens, setLoadingTokens] = useState(true)

  // Handle mounting and auth
  useEffect(() => {
    setMounted(true)

    // Set up a timeout to handle auth loading
    const authTimeout = setTimeout(() => {
      setAuthLoading(false)
    }, 2000)

    return () => clearTimeout(authTimeout)
  }, [])

  useEffect(() => {
    if (mounted && auth.user) {
      setUser(auth.user)
      setAuthLoading(false)
    } else if (mounted && !auth.user && !authLoading) {
      setUser(null)
    }
  }, [mounted, auth.user, authLoading])

  // Load token info when user is available
  useEffect(() => {
    if (user?.uid && mounted) {
      loadTokenInfo()
    }
  }, [user?.uid, mounted])

  const loadTokenInfo = async () => {
    if (!user?.uid) return

    try {
      setLoadingTokens(true)
      console.log("🔍 Loading token info for user:", user.uid)
      const info = await getAvailableTokens(user.uid)
      console.log("✅ Token info loaded:", info)
      setTokenInfo(info)
    } catch (error) {
      console.error("❌ Error loading token info:", error)
      if (mounted && toast.toast) {
        toast.toast({
          title: "Errore",
          description: "Impossibile caricare le informazioni sui token",
          variant: "destructive",
        })
      }
    } finally {
      setLoadingTokens(false)
    }
  }

  // Load chat history when session is selected
  useEffect(() => {
    if (selectedSessionId && mounted && user) {
      loadChatHistory(selectedSessionId)
    } else {
      setChatHistory([])
    }
  }, [selectedSessionId, mounted, user])

  const loadChatHistory = async (sessionId: string) => {
    try {
      setLoadingHistory(true)
      console.log("📚 Loading chat history for session:", sessionId)
      const history = await getChatHistory(sessionId)
      setChatHistory(history)
      console.log("✅ Loaded", history.length, "messages")
    } catch (error) {
      console.error("❌ Error loading chat history:", error)
      if (mounted && toast.toast) {
        toast.toast({
          title: "Errore",
          description: "Impossibile caricare la cronologia della chat",
          variant: "destructive",
        })
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    console.log("🎯 Selected session:", sessionId)
    setSelectedSessionId(sessionId)
  }

  const handleNewChat = () => {
    console.log("🆕 Starting new chat")
    setSelectedSessionId(null)
    setChatHistory([])
  }

  const handleSessionCreated = (sessionId: string) => {
    console.log("🎉 New session created:", sessionId)
    setSelectedSessionId(sessionId)
  }

  const handleMessageSent = () => {
    console.log("📨 Message sent, refreshing token data")
    if (dashboardData.refreshTokenData) {
      dashboardData.refreshTokenData()
    }
    loadTokenInfo()
  }

  // Show loading while mounting or auth is loading
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-white font-medium text-lg">Inizializzazione Assistente AI</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Caricamento autenticazione...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show auth required if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Accesso Richiesto</h3>
              <p className="text-gray-600">Devi essere autenticato per usare l'assistente AI.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tokensAvailable = tokenInfo?.tokensAvailable || 0
  const tokensTotal = tokenInfo?.tokensTotal || 1000000
  const tokensUsed = tokenInfo?.tokensUsed || 0
  const usagePercentage = tokensTotal > 0 ? (tokensUsed / tokensTotal) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Container with Professional Grid System */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                Assistente AI
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Il tuo assistente marketing intelligente con memoria delle conversazioni
              </p>
            </div>

            <Button onClick={() => setShowSidebar(!showSidebar)} variant="outline" className="lg:hidden h-10 px-4">
              <MessageSquare className="h-4 w-4 mr-2" />
              {showSidebar ? "Nascondi" : "Mostra"} Cronologia
            </Button>
          </div>

          {/* Token Status Cards with Professional Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl shadow-sm">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  Token Disponibili
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTokens ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                      {tokensAvailable.toLocaleString()}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Utilizzo</span>
                        <span>{Math.round(100 - (tokensAvailable / tokensTotal) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-rose-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, 100 - (tokensAvailable / tokensTotal) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Aggiornato automaticamente</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  Token Utilizzati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTokens ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {tokensUsed.toLocaleString()}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Progresso</span>
                        <span>{Math.round(usagePercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, usagePercentage)}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">di {tokensTotal.toLocaleString()} totali</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  Stato Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 px-3 py-1"
                  >
                    Operativo
                  </Badge>
                </div>
                <div className="space-y-2">
                  {["Memoria conversazioni attiva", "Token tracking in tempo reale", "GPT-4o Mini disponibile"].map(
                    (feature, index) => (
                      <div key={index} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Interface with Professional Layout */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex h-[700px]">
              {/* Sidebar */}
              {showSidebar && (
                <div className="hidden lg:block">
                  <ChatHistorySidebar
                    userId={user.uid}
                    currentSessionId={selectedSessionId}
                    onSessionSelect={handleSessionSelect}
                    onNewChat={handleNewChat}
                  />
                </div>
              )}

              {/* Chat Area */}
              <div className="flex-1 flex flex-col">
                {loadingHistory ? (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-900 dark:text-white font-medium text-lg">Caricamento cronologia</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Recupero dei messaggi in corso...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AIChat
                    userId={user.uid}
                    sessionId={selectedSessionId}
                    initialMessages={chatHistory}
                    onMessageSent={handleMessageSent}
                    onSessionCreated={handleSessionCreated}
                    showWelcome={!selectedSessionId && chatHistory.length === 0}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
