"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useQuotes } from "@/hooks/use-quotes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QuoteCard } from "@/components/quotes/quote-card"
import { QuoteFilters, QuoteFiltersState } from "@/components/quotes/quote-filters"
import {
  FileText,
  Plus,
  Send,
  XCircle,
  AlertCircle,
  Sparkles,
  Wand2,
  ChevronDown,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Eye,
  Briefcase,
  Trophy,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

// Lazy load AI Quote Generator (PDF Generator) - reduces initial bundle size by ~150KB
const AIQuoteGenerator = dynamic(
  () => import("@/components/ai/ai-quote-generator").then(mod => mod.AIQuoteGenerator),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-purple-200/50">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">Caricamento generatore preventivi AI...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

const statusConfig = {
  draft: {
    label: "Bozza",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: FileText,
  },
  sent: {
    label: "Inviato",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Send,
  },
  in_review: {
    label: "In Revisione",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Eye,
  },
  pending_payment: {
    label: "Pagamento Atteso",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    icon: DollarSign,
  },
  approved: {
    label: "Approvato",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle,
  },
  in_progress: {
    label: "In Lavorazione",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Briefcase,
  },
  completed: {
    label: "Completato",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: Trophy,
  },
  rejected: {
    label: "Rifiutato",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
  },
  expired: {
    label: "Scaduto",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Clock,
  },
}

export default function PreventiviPage() {
  const { quotes, loading, error, getQuotesByStatus, getQuoteStats, deleteQuote } = useQuotes()
  const { userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [filters, setFilters] = useState<QuoteFiltersState>({
    searchTerm: "",
    status: "all",
  })
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [showNewQuoteMenu, setShowNewQuoteMenu] = useState(false)

  const stats = getQuoteStats()

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      quote.clientName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      quote.description?.toLowerCase().includes(filters.searchTerm.toLowerCase())

    const matchesStatus = filters.status === "all" || quote.status === filters.status
    
    const matchesAmount = 
      (!filters.minAmount || quote.total >= filters.minAmount) &&
      (!filters.maxAmount || quote.total <= filters.maxAmount)

    return matchesSearch && matchesStatus && matchesAmount
  })

  const handleCreateEmptyQuote = async () => {
    if (!userData?.tenantId) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per creare un preventivo",
        variant: "destructive"
      })
      return
    }

    try {
      const emptyQuote = {
        tenantId: userData.tenantId,
        title: "Nuovo Preventivo",
        description: "",
        clientId: "",
        clientName: "",
        clientEmail: "",
        clientMode: "platform" as const,
        status: "draft" as const,
        obiettivi: [""],
        attivita: [],
        voci: [],
        total: 0,
        currency: "EUR",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "quotes"), emptyQuote)
      
      toast({
        title: "Preventivo creato",
        description: "Reindirizzamento all'editor..."
      })
      
      router.push(`/preventivi/${docRef.id}/edit`)
    } catch (error) {
      console.error("Error creating empty quote:", error)
      toast({
        title: "Errore",
        description: "Impossibile creare il preventivo",
        variant: "destructive"
      })
    } finally {
      setShowNewQuoteMenu(false)
    }
  }

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
    // Non considerare expired se stati finali positivi
    const finalPositiveStates = ["approved", "in_progress", "completed"]
    if (finalPositiveStates.includes(status)) return false
    
    return validUntil < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
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
                <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                <span className="leading-tight">Preventivi</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg md:ml-0">Gestisci i tuoi preventivi e offerte</p>
            </div>
            <div className="flex gap-2 md:gap-3">
              <Button 
                onClick={() => setShowAIGenerator(true)}
                size="sm"
                className="flex-1 md:flex-none bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Genera con AI</span>
                <span className="sm:hidden">AI</span>
              </Button>
              <DropdownMenu open={showNewQuoteMenu} onOpenChange={setShowNewQuoteMenu}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="flex-1 md:flex-none bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Nuovo Preventivo</span>
                    <span className="sm:hidden">Nuovo</span>
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white/95 backdrop-blur-sm border-gray-200/50 w-56"
                >
                  <DropdownMenuLabel>Crea Nuovo Preventivo</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleCreateEmptyQuote}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Preventivo Vuoto
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer opacity-50"
                    disabled
                    onClick={() => {
                      setShowNewQuoteMenu(false)
                      toast({
                        title: "Funzionalità in arrivo",
                        description: "I template settore saranno disponibili presto"
                      })
                    }}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Da Template Settore
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer opacity-50"
                    disabled
                    onClick={() => {
                      setShowNewQuoteMenu(false)
                      toast({
                        title: "Funzionalità in arrivo",
                        description: "La duplicazione sarà disponibile presto"
                      })
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Duplica Esistente
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setShowNewQuoteMenu(false)
                      setShowAIGenerator(true)
                    }}
                    className="cursor-pointer text-pink-600 dark:text-pink-400"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Genera con AI
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Totale Preventivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.total}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">preventivi creati</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  In Attesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                  {stats.inReview + stats.sent}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">da approvare</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Accettati
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.approved}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">confermati</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  Valore Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(stats.totalValue)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">valore complessivo</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <QuoteFilters 
            filters={filters} 
            onFiltersChange={setFilters}
            stats={stats}
          />

          {/* Quotes List */}
          <div className="space-y-6">
              {filteredQuotes.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-16 w-16 text-slate-600 dark:text-slate-400 mb-6" />
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                      Nessun preventivo trovato
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
                      {filters.searchTerm
                        ? "Nessun preventivo corrisponde ai criteri di ricerca."
                        : "Non hai ancora creato nessun preventivo."}
                    </p>
                    <Button className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium">
                      <Plus className="mr-2 h-4 w-4" />
                      Crea il tuo primo preventivo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onEdit={(id) => {
                        router.push(`/preventivi/${id}/edit`)
                      }}
                      onSend={(id) => {
                        // TODO: Implement send quote
                        console.log('Send quote:', id)
                      }}
                      onDownload={(id) => {
                        // TODO: Implement download PDF
                        console.log('Download quote:', id)
                      }}
                      onDelete={async (id) => {
                        try {
                          await deleteQuote(id)
                        } catch (error) {
                          console.error('Error deleting quote:', error)
                        }
                      }}
                    />
                  ))}
                </div>
              )}
          </div>
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
