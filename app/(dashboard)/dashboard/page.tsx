"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Target,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  Brain,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useAuth } from "@/lib/auth-context"
import { TokenUsageWidget } from "@/components/dashboard/token-usage-widget"
import { DashboardCommandInput } from "@/components/dashboard/dashboard-command-input"

// Lazy load Technical Architect Dialog - reduces initial bundle size
const TechnicalArchitectDialog = dynamic(
  () => import("@/components/architect/technical-architect-dialog").then(mod => ({ default: mod.TechnicalArchitectDialog })),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="animate-spin h-12 w-12 border-4 border-slate-600 dark:border-slate-400 border-t-transparent rounded-full" />
          <p className="text-lg font-medium text-gray-900 dark:text-white animate-pulse">Caricamento...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default function Dashboard() {
  const { userData } = useAuth()
  const { stats, recentActivities, loading } = useDashboardData()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/50 rounded-2xl border border-gray-200/50"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tokenUsagePercentage =
    stats.aiTokensLimit > 0 ? Math.min((stats.aiTokensUsed / stats.aiTokensLimit) * 100, 100) : 0

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "ai_usage":
        return <Brain className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      case "task":
        return <CheckCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      case "campaign":
        return <Target className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      case "quote":
        return <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      case "client":
        return <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      default:
        return <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
    }
  }

  const getStatusBadge = (type: string, status?: string) => {
    if (!status) return null

    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
        case "accepted":
          return "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
        case "active":
        case "running":
        case "in_progress":
          return "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
        case "pending":
        case "sent":
          return "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
        case "rejected":
          return "bg-slate-100 text-slate-900 dark:bg-slate-800/50 dark:text-slate-100"
        default:
          return "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
      }
    }

    return (
      <Badge variant="secondary" className={`text-xs ${getStatusColor(status)} border-0`}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header Section */}
          <div className="flex items-start md:items-center gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-righello-pink rounded-xl md:rounded-2xl shadow-corporate-medium">
                  <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <span className="leading-tight">Benvenuto, {userData?.firstName || "Utente"}!</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg ml-11 md:ml-0">
                {userData?.companyName} • Piano {userData?.plan || "Base"}
              </p>
            </div>
          </div>

          {/* Command Bar Glassmorphic Section */}
          <div className="relative backdrop-blur-xl bg-white/5 dark:bg-black/10 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-corporate-strong p-6 md:p-8">
            <DashboardCommandInput />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Clienti Totali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalClients}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">clienti attivi</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Target className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Campagne Attive
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.activeCampaigns}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">in corso</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Preventivi Inviati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.sentQuotes}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">in attesa di risposta</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Task Completati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.completedTasks}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">questo mese</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Task Pendenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingTasks}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">da completare</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Fatturato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  €{stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">preventivi accettati</p>
              </CardContent>
            </Card>

            <TokenUsageWidget />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200/50 dark:border-gray-700/50">
                <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-righello-pink rounded-xl shadow-corporate-subtle">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Attività Recenti
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {recentActivities.length > 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 md:space-x-4 p-3 md:p-4 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200 border border-gray-200/30 dark:border-gray-700/30"
                      >
                        <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                            {getStatusBadge(activity.type, activity.status)}
                          </div>
                          {activity.details && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{activity.details}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>
                                {activity.timestamp?.toLocaleDateString("it-IT")} -{" "}
                                {activity.timestamp?.toLocaleTimeString("it-IT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {activity.client && (
                                <>
                                  <span>•</span>
                                  <span>{activity.client}</span>
                                </>
                              )}
                            </div>
                            {activity.tokensUsed && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-0"
                              >
                                {activity.tokensUsed} token
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Nessuna attività recente</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Le tue attività appariranno qui quando inizierai a utilizzare la piattaforma
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl border-purple-200/50 dark:border-purple-700/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-800/50 dark:to-violet-800/50 border-b border-purple-200/50 dark:border-purple-700/50">
                <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  Utilizzo AI
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round(tokenUsagePercentage)}%
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Token utilizzati</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>Utilizzo corrente</span>
                    <span className="font-medium">{stats.aiTokensUsed.toLocaleString()} token</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-violet-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, tokenUsagePercentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>0</span>
                    <span>{stats.aiTokensLimit.toLocaleString()} token</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-200/50 dark:border-purple-700/50">
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                      Piano {userData?.plan || "Base"}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Piano attivo</p>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg border-0">
                    Gestisci Piano
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Technical Architect Dialog */}
      <TechnicalArchitectDialog />
    </div>
  )
}
