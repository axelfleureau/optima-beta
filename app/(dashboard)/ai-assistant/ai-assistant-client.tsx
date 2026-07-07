"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  MessageSquare,
  TrendingUp,
  Activity,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRealTimeTokens } from "@/hooks/use-real-time-tokens";
import {
  TokenUsageAlert,
  TokenUsageStats,
} from "@/components/ai/token-usage-alert";
import { MagnificStudio } from "@/components/ai/magnific-studio";
import type { ChatMessage } from "@/lib/chat-types";

// Dynamic imports for client-side dependencies
import dynamic from "next/dynamic";

const AIChat = dynamic(
  () =>
    import("@/components/ai/ai-chat").then((mod) => ({ default: mod.AIChat })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  },
);

const ChatHistorySidebar = dynamic(
  () =>
    import("@/components/ai/chat-history-sidebar").then((mod) => ({
      default: mod.ChatHistorySidebar,
    })),
  {
    ssr: false,
    loading: () => <div className="w-80 bg-gray-100 animate-pulse"></div>,
  },
);

export default function AIAssistantClient() {
  const [mounted, setMounted] = useState(false);

  const { user, loading: authLoading } = useAuth();

  // Real-time token data
  const tokenData = useRealTimeTokens(user?.uid || "");

  // State for the component
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadChatHistory = async (sessionId: string) => {
    try {
      setLoadingHistory(true);
      console.log("📚 Loading chat history for session:", sessionId);

      const response = await fetch(`/api/ai/chat/sessions/${sessionId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Errore caricamento messaggi: ${response.status}`);
      }

      const payload = await response.json();
      const history: ChatMessage[] = (payload.messages || []).map(
        (message: any) => ({
          id: message.id,
          content: message.content || "",
          role: message.role,
          timestamp: message.timestamp
            ? new Date(message.timestamp)
            : new Date(),
          sessionId: message.sessionId,
          userId: message.userId || user?.uid || "",
        }),
      );
      setChatHistory(history);
      console.log("✅ Loaded", history.length, "messages");
    } catch (error) {
      console.error("❌ Error loading chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    console.log("🎯 Selected session:", sessionId);
    setSelectedSessionId(sessionId);
    if (sessionId) {
      loadChatHistory(sessionId);
    } else {
      setChatHistory([]);
    }
  };

  const handleNewChat = () => {
    console.log("🆕 Starting new chat");
    setSelectedSessionId(null);
    setChatHistory([]);
  };

  const handleSessionCreated = (sessionId: string) => {
    console.log("🎉 New session created:", sessionId);
    setSelectedSessionId(sessionId);
    setHistoryRefreshKey((key) => key + 1);
  };

  const handleMessageSent = () => {
    console.log(
      "📨 Message sent, token data will update automatically via real-time listener",
    );
    setHistoryRefreshKey((key) => key + 1);
  };

  // Show loading while mounting or auth is loading
  if (!mounted || authLoading) {
    return (
      <div className="optima-ops-page">
        <div className="optima-ops-container">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center mx-auto shadow-lg">
                <Loader2 className="h-8 w-8 text-righello-pink animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium text-lg">
                  Inizializzazione Assistente AI
                </p>
                <p className="text-sm text-slate-400">
                  Caricamento autenticazione...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="optima-ops-page">
        <div className="optima-ops-container">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center mx-auto shadow-lg">
                <MessageSquare className="h-8 w-8 text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium text-lg">
                  Accesso Richiesto
                </p>
                <p className="text-sm text-slate-400">
                  Devi essere autenticato per utilizzare l'Assistente AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use real token data from the hook
  const tokensAvailable = tokenData.tokensAvailable;
  const tokensTotal = tokenData.tokensTotal;
  const tokensUsed = tokenData.tokensUsed;
  const usagePercentage =
    tokensTotal > 0 ? (tokensUsed / tokensTotal) * 100 : 0;

  console.log("🔍 Current token data:", {
    tokensUsed,
    tokensAvailable,
    tokensTotal,
    loading: tokenData.loading,
    error: tokenData.error,
    userId: user.uid,
  });

  return (
    <div className="optima-ops-page min-w-0 overflow-x-clip">
      {/* Main Container with Professional Grid System */}
      <div className="optima-ops-container">
        <div className="optima-ops-stack min-w-0 md:gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="flex items-center gap-3 text-2xl font-bold text-white md:gap-4 md:text-3xl">
                <Sparkles className="h-8 w-8 text-righello-pink" />
                Assistente AI
              </h1>
              <p className="text-sm text-slate-400 md:text-lg">
                Assistente operativo con memoria, cronologia e contesto live da
                progetti, task, clienti e team
              </p>
              {user && (
                <p className="text-sm text-slate-500">
                  Benvenuto, {user.displayName || user.email}
                </p>
              )}
            </div>

            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              variant="outline"
              className="lg:hidden h-10 px-4"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showSidebar ? "Nascondi" : "Mostra"} Cronologia
            </Button>
          </div>

          {/* Token Usage Alert */}
          <TokenUsageAlert
            tokensUsed={tokensUsed}
            tokensLimit={tokensTotal}
            loading={tokenData.loading}
            className="mb-2"
          />

          <MagnificStudio />

          {/* Token Status Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <Card className="overflow-hidden border border-white/10 bg-white/[0.04] shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl shadow-sm">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  Token Disponibili
                  {tokenData.loading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                  {tokenData.loading ? "..." : tokensAvailable.toLocaleString()}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Utilizzo</span>
                    <span>
                      {tokenData.loading ? "..." : Math.round(usagePercentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-rose-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, usagePercentage))}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tokenData.loading
                    ? "Caricamento..."
                    : "Aggiornato in tempo reale"}
                </p>
                {tokenData.error && (
                  <p className="text-xs text-red-500">
                    Errore: {tokenData.error}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-white/10 bg-white/[0.04] shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  Token Utilizzati
                  {tokenData.loading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {tokenData.loading ? "..." : tokensUsed.toLocaleString()}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Progresso</span>
                    <span>
                      {tokenData.loading ? "..." : Math.round(usagePercentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, usagePercentage))}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  di {tokenData.loading ? "..." : tokensTotal.toLocaleString()}{" "}
                  totali
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-white/10 bg-white/[0.04] shadow-lg">
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
                    {tokenData.loading ? "Caricamento..." : "Operativo"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {[
                    "Memoria conversazioni attiva",
                    "Contesto operativo Óptima",
                    "Canale Telegram predisposto",
                    "Modello GPT aggiornato",
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${tokenData.loading ? "bg-yellow-500" : "bg-green-500"}`}
                      ></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Utente: {user.uid.substring(0, 8)}...
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Interface */}
          <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="flex min-h-[620px] md:h-[700px]">
              {/* Sidebar */}
              {showSidebar && (
                <div className="hidden lg:block">
                  <ChatHistorySidebar
                    userId={user.uid}
                    currentSessionId={selectedSessionId}
                    onSessionSelect={handleSessionSelect}
                    onNewChat={handleNewChat}
                    refreshKey={historyRefreshKey}
                  />
                </div>
              )}

              {/* Chat Area */}
              <div className="flex min-w-0 flex-1 flex-col">
                {loadingHistory ? (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-900 dark:text-white font-medium text-lg">
                          Caricamento cronologia
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recupero dei messaggi in corso...
                        </p>
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
  );
}
