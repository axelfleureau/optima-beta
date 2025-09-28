"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  Users,
  Target,
  FileText,
  CheckCircle,
  Clock,
  Euro,
  Brain,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useAuth } from "@/lib/auth-context"

export default function Dashboard() {
  const { userData } = useAuth()
  const { stats, recentActivities, loading } = useDashboardData()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-200 to-rose-200 rounded-2xl"></div>
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
        return <Brain className="h-4 w-4 text-purple-500" />
      case "task":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "campaign":
        return <Target className="h-4 w-4 text-blue-500" />
      case "quote":
        return <FileText className="h-4 w-4 text-orange-500" />
      case "client":
        return <Users className="h-4 w-4 text-indigo-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (type: string, status?: string) => {
    if (!status) return null

    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
          return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
        case "active":
        case "running":
        case "in_progress":
          return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
        case "pending":
        case "sent":
          return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
        case "accepted":
          return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
        case "rejected":
          return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
        default:
          return "bg-gray-100 text-gray-700 dark:bg-gray-800/20 dark:text-gray-300"
      }
    }

    return (
      <Badge variant="secondary" className={`text-xs ${getStatusColor(status)} border-0`}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start md:items-center gap-3 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl md:rounded-2xl shadow-lg">
                    <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-white" />
                  </div>
                  <span className="leading-tight">Benvenuto, {userData?.firstName || "Utente"}!</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg ml-11 md:ml-0">
                  {userData?.companyName} • Piano {userData?.plan || "Base"}
                </p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca..."
                  className="pl-10 w-[300px] bg-white/80 backdrop-blur-sm border-gray-200/50"
                />
              </div>
              <Button className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Nuovo
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Search className="h-4 w-4" />
              </Button>
              <Button size="sm" className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Nuovo
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                    <Users className="h-4 w-4 text-white" />
                  </div>
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
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm">
                    <Target className="h-4 w-4 text-white" />
                  </div>
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
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl shadow-sm">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
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
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 backdrop-blur-xl border-orange-200/50 dark:border-orange-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl shadow-sm">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  Task Pendenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingTasks}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">da completare</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border-green-200/50 dark:border-green-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm">
                    <Euro className="h-4 w-4 text-white" />
                  </div>
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

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl border-purple-200/50 dark:border-purple-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  Token AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(stats.aiTokensUsed / 1000)}K
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Utilizzo</span>
                    <span>{Math.round(tokenUsagePercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-violet-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, tokenUsagePercentage)}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.aiTokensUsed.toLocaleString()} / {stats.aiTokensLimit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200/50 dark:border-gray-700/50">
                <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl shadow-sm">
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
    </div>
  )
}
