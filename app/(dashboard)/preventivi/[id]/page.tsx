"use client"

import { useQuoteDetail } from "@/hooks/use-quote-detail"
import { GlassCard } from "@/components/ui/glass-card"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { QuoteDetailsTab } from "@/components/quotes/quote-details-tab"
import { QuoteTimelineTab } from "@/components/quotes/quote-timeline-tab"
import QuoteMilestonesTab from "@/components/quotes/quote-milestones-tab"
import { QuoteDocumentsTab } from "@/components/quotes/quote-documents-tab"
import {
  ArrowLeft,
  FileText,
  Clock,
  CreditCard,
  FolderOpen,
  Download,
  Send,
  Edit,
  Eye,
  CheckCircle,
  DollarSign,
  Briefcase,
  Trophy,
  XCircle,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

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

export default function QuoteDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { quote, loading, error } = useQuoteDetail(id)
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <GlassCard variant="elevated" padding="lg">
            <p className="text-red-600 dark:text-red-400">
              Errore nel caricamento del preventivo: {error || "Preventivo non trovato"}
            </p>
            <LiquidButton onClick={() => router.push("/preventivi")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla lista
            </LiquidButton>
          </GlassCard>
        </div>
      </div>
    )
  }
  
  const statusInfo = statusConfig[quote.status as keyof typeof statusConfig]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/preventivi">
              <LiquidButton variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </LiquidButton>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {(quote as any).titolo || quote.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cliente: {quote.clientName || (quote as any).cliente?.nome}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`${statusInfo?.color} border-0`}>
              {statusInfo?.label}
            </Badge>
            {quote.status === 'draft' && (
              <>
                <LiquidButton variant="outline" size="sm" onClick={() => router.push(`/preventivi/${id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </LiquidButton>
                <LiquidButton variant="default" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Invia
                </LiquidButton>
              </>
            )}
            <LiquidButton variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </LiquidButton>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Dettagli</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamenti</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Documenti</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-6">
            <QuoteDetailsTab quote={quote} />
          </TabsContent>
          
          <TabsContent value="timeline" className="mt-6">
            <QuoteTimelineTab quote={quote} />
          </TabsContent>
          
          <TabsContent value="payments" className="mt-6">
            <QuoteMilestonesTab quote={quote} />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-6">
            <QuoteDocumentsTab quote={quote} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
