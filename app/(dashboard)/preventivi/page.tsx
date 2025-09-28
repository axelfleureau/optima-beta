"use client"

import { useState } from "react"
import { useQuotes } from "@/hooks/use-quotes"
import { AIQuoteGenerator } from "@/components/ai/ai-quote-generator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  Download,
  Calendar,
  Euro,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Wand2,
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const statusConfig = {
  draft: {
    label: "Bozza",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
    icon: FileText,
  },
  sent: {
    label: "Inviato",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Send,
  },
  pending: {
    label: "In Attesa",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Clock,
  },
  accepted: {
    label: "Accettato",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rifiutato",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
  },
  expired: {
    label: "Scaduto",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    icon: AlertCircle,
  },
}

export default function PreventiviPage() {
  const { quotes, loading, error, getQuotesByStatus, getQuoteStats } = useQuotes()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showAIGenerator, setShowAIGenerator] = useState(false)

  const stats = getQuoteStats()

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.description?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    return matchesSearch && quote.status === activeTab
  })

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon
    return (
      <Badge className={`${config.color} flex items-center gap-1 border-0`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const isExpired = (validUntil: Date, status: string) => {
    return validUntil < new Date() && status !== "accepted"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-gradient-to-r from-orange-200 to-amber-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="h-10 bg-gradient-to-r from-orange-200 to-amber-200 rounded w-32"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl md:rounded-2xl shadow-lg">
                  <FileText className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <span className="leading-tight">Preventivi</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg ml-11 md:ml-0">Gestisci i tuoi preventivi e offerte</p>
            </div>
            <div className="flex gap-2 md:gap-3">
              <Button 
                onClick={() => setShowAIGenerator(true)}
                size="sm"
                className="flex-1 md:flex-none bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Genera con AI</span>
                <span className="sm:hidden">AI</span>
              </Button>
              <Button size="sm" className="flex-1 md:flex-none bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Preventivo</span>
                <span className="sm:hidden">Nuovo</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  Totale Preventivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">preventivi creati</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-xl border-yellow-200/50 dark:border-yellow-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl shadow-sm">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  In Attesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pending + stats.sent}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">da approvare</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border-green-200/50 dark:border-green-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  Accettati
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.accepted}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">confermati</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl border-purple-200/50 dark:border-purple-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm">
                    <Euro className="h-4 w-4 text-white" />
                  </div>
                  Valore Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(stats.totalValue)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">valore complessivo</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cerca preventivi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200/50"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/80 backdrop-blur-sm border-gray-200/50">
              <TabsTrigger value="all">Tutti ({stats.total})</TabsTrigger>
              <TabsTrigger value="draft">Bozze ({stats.draft})</TabsTrigger>
              <TabsTrigger value="sent">Inviati ({stats.sent})</TabsTrigger>
              <TabsTrigger value="pending">In Attesa ({stats.pending})</TabsTrigger>
              <TabsTrigger value="accepted">Accettati ({stats.accepted})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {filteredQuotes.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl flex items-center justify-center mb-6">
                      <FileText className="h-10 w-10 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                      Nessun preventivo trovato
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
                      {searchTerm
                        ? "Nessun preventivo corrisponde ai criteri di ricerca."
                        : "Non hai ancora creato nessun preventivo."}
                    </p>
                    <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Crea il tuo primo preventivo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {filteredQuotes.map((quote) => (
                    <Card
                      key={quote.id}
                      className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <CardTitle className="text-xl text-gray-900 dark:text-white">{quote.title}</CardTitle>
                            <CardDescription className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {quote.clientName}
                              </span>
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(quote.createdAt, "dd MMM yyyy", { locale: it })}
                              </span>
                              <span className="flex items-center gap-2">
                                <Euro className="h-4 w-4" />
                                {formatCurrency(quote.total, quote.currency)}
                              </span>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-3">
                            {isExpired(quote.validUntil, quote.status) ? (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-0">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Scaduto
                              </Badge>
                            ) : (
                              getStatusBadge(quote.status)
                            )}
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
                                  <Send className="mr-2 h-4 w-4" />
                                  Invia
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Scarica PDF
                                </DropdownMenuItem>
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
                        {quote.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{quote.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Valido fino al:{" "}
                            <span className="font-medium">
                              {format(quote.validUntil, "dd MMM yyyy", { locale: it })}
                            </span>
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            <span className="font-medium">{quote.items.length}</span> elementi
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* AI Quote Generator Dialog */}
      <AIQuoteGenerator 
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        onQuoteGenerated={() => {
          // Quote salvato, ricarica la lista se necessario
        }}
      />
    </div>
  )
}
