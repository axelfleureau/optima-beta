"use client"

import { useState } from "react"
import { useCampaigns } from "@/hooks/use-campaigns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Target,
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const statusConfig = {
  draft: {
    label: "Bozza",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  },
  active: {
    label: "Attiva",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  running: {
    label: "In Corso",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  paused: {
    label: "In Pausa",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  completed: {
    label: "Completata",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
}

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
}

export default function CampagnePage() {
  const { campaigns, loading, error } = useCampaigns()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    return matchesSearch && campaign.status === activeTab
  })

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform.toLowerCase() as keyof typeof platformIcons]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active" || c.status === "running").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              </div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white/50 rounded-2xl border border-gray-200/50"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 md:gap-4">
                <Target className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                <span className="leading-tight">Campagne</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg">Gestisci le tue campagne di marketing</p>
            </div>
            <Button className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Campagna
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Target className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Totale Campagne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.total}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">campagne create</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Play className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Attive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.active}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">in esecuzione</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Completate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.completed}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">terminate</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Budget Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(stats.totalBudget)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">investimento totale</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cerca campagne..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200/50"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/80 backdrop-blur-sm border-gray-200/50 grid w-full grid-cols-2 md:grid-cols-4 gap-1 md:gap-0 h-auto md:h-10">
              <TabsTrigger value="all" className="text-xs md:text-sm">Tutte ({stats.total})</TabsTrigger>
              <TabsTrigger value="draft" className="text-xs md:text-sm">Bozze ({stats.draft})</TabsTrigger>
              <TabsTrigger value="active" className="text-xs md:text-sm">Attive ({stats.active})</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs md:text-sm">Completate ({stats.completed})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {filteredCampaigns.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Target className="h-16 w-16 text-slate-600 dark:text-slate-400 mb-6" />
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                      Nessuna campagna trovata
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
                      {searchTerm
                        ? "Nessuna campagna corrisponde ai criteri di ricerca."
                        : "Non hai ancora creato nessuna campagna."}
                    </p>
                    <Button className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium">
                      <Plus className="mr-2 h-4 w-4" />
                      Crea la tua prima campagna
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:gap-6">
                  {filteredCampaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                          <div className="space-y-2">
                            <CardTitle className="text-xl text-gray-900 dark:text-white">{campaign.title}</CardTitle>
                            <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-gray-600 dark:text-gray-400">
                              {campaign.clientName && (
                                <span className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  {campaign.clientName}
                                </span>
                              )}
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(campaign.startDate, "dd MMM", { locale: it })} -{" "}
                                {format(campaign.endDate, "dd MMM yyyy", { locale: it })}
                              </span>
                              {campaign.budget && (
                                <span className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(campaign.budget)}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-3 self-end sm:self-start">
                            {getStatusBadge(campaign.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-white/95 backdrop-blur-sm border-gray-200/50"
                              >
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizza
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Analytics
                                </DropdownMenuItem>
                                {campaign.status === "active" ? (
                                  <DropdownMenuItem>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pausa
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem>
                                    <Play className="mr-2 h-4 w-4" />
                                    Avvia
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {campaign.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {campaign.description}
                          </p>
                        )}

                        {/* Platforms */}
                        {campaign.platforms && campaign.platforms.length > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Piattaforme:</span>
                            <div className="flex gap-2">
                              {campaign.platforms.map((platform) => (
                                <div
                                  key={platform}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                >
                                  {getPlatformIcon(platform)}
                                  <span className="text-xs capitalize">{platform}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Progress */}
                        {campaign.progress !== undefined && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                              <span className="font-medium text-gray-900 dark:text-white">{campaign.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-slate-600 dark:bg-slate-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${campaign.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Metrics */}
                        {campaign.metrics && (
                          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                {campaign.metrics.reach?.toLocaleString() || 0}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Reach</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {campaign.metrics.engagement?.toLocaleString() || 0}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Engagement</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                                {campaign.metrics.conversions?.toLocaleString() || 0}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Conversioni</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
