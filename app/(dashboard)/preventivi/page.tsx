"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  Layers,
  Link2,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { QuoteCard } from "@/components/quotes/quote-card"
import { useQuotes } from "@/hooks/use-quotes"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import type { GeneratedQuoteData } from "@/lib/ai-quote-service"
import type { Quote } from "@/types/quote"

const AIQuoteGenerator = dynamic(
  () => import("@/components/ai/ai-quote-generator").then((mod) => mod.AIQuoteGenerator),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="flex w-[min(420px,calc(100vw-32px))] flex-col items-center gap-4 rounded-[8px] border border-white/10 bg-[#090b12] p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-righello-pink border-t-transparent" />
          <p className="text-center text-sm font-medium text-white">Caricamento generatore preventivi AI...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

type StatusFilter = "all" | Quote["status"]

const statusTabs: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "draft", label: "Bozze" },
  { value: "sent", label: "Inviati" },
  { value: "approved", label: "Approvati" },
  { value: "expired", label: "Scaduti" },
]

const finalPositiveStates: Quote["status"][] = ["approved", "in_progress", "completed"]
const openStates: Quote["status"][] = ["sent", "in_review", "pending_payment"]

function toDate(value: Date | { toDate?: () => Date } | string | number | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate()
  if (typeof value === "string" || typeof value === "number") return new Date(value)
  return null
}

function isQuoteExpired(quote: Quote) {
  const validUntil = toDate(quote.validUntil)
  if (!validUntil || finalPositiveStates.includes(quote.status)) return false
  return validUntil < new Date()
}

function getEffectiveStatus(quote: Quote): Quote["status"] {
  return isQuoteExpired(quote) ? "expired" : quote.status
}

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 10000 ? 0 : 2,
  }).format(amount || 0)
}

function getQuoteLineCount(quote: Quote) {
  return (quote.items?.length || 0) + (quote.voci?.length || 0) + (quote.attivita?.length || 0)
}

function convertQuoteToPDFData(quote: Quote): GeneratedQuoteData {
  const createdAt = toDate(quote.createdAt) || new Date()
  const validUntil = toDate(quote.validUntil)
  const validityDays = validUntil
    ? Math.max(1, Math.ceil((validUntil.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 60
  const voci =
    quote.voci?.map((voce) => ({
      descrizione: voce.descrizione,
      quantita: voce.quantita,
      prezzoUnitario: voce.prezzoUnitario,
      totale: voce.quantita * voce.prezzoUnitario,
      categoria: "base" as const,
      tipo: "one_time" as const,
    })) ||
    quote.items?.map((item) => ({
      descrizione: item.name,
      quantita: item.quantity,
      prezzoUnitario: item.unitPrice,
      totale: item.total,
      categoria: "base" as const,
      tipo: "one_time" as const,
    })) ||
    []

  const subtotale = quote.subtotale ?? voci.reduce((sum, voce) => sum + voce.totale, 0)
  const percentualeIva = quote.percentualeIva ?? 22
  const iva = quote.iva ?? Math.round(subtotale * (percentualeIva / 100) * 100) / 100

  return {
    cliente: {
      nome: quote.externalClientName || quote.clientName || "Cliente",
      email: quote.externalClientEmail || quote.clientEmail || "",
      azienda: quote.clientName || "",
      telefono: "",
      indirizzo: "",
      partitaIva: "",
    },
    preventivo: {
      titolo: quote.title || "Preventivo",
      descrizione: quote.description || "",
      numeroPreventivo: quote.id.slice(0, 8).toUpperCase(),
      dataCreazione: createdAt.toISOString().split("T")[0],
      validitaGiorni: validityDays,
      settore: "",
      timeline: "",
    },
    obiettivi: quote.obiettivi || [],
    attivita: quote.attivita || [],
    voci,
    condizioni: {
      costVariation: 10,
      validityDays,
      paymentTerms: "50% all'accettazione, 50% a completamento",
      cancellationPenalty: 30,
    },
    totali: {
      subtotale,
      iva,
      percentualeIva,
      totale: quote.total ?? subtotale + iva,
    },
  }
}

export default function PreventiviPage() {
  const { quotes, loading, error, getQuoteStats, deleteQuote } = useQuotes()
  const { userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [showNewQuoteMenu, setShowNewQuoteMenu] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const stats = getQuoteStats()

  const enrichedStats = useMemo(() => {
    const approvedQuotes = quotes.filter((quote) => finalPositiveStates.includes(quote.status))
    const rejectedQuotes = quotes.filter((quote) => quote.status === "rejected")
    const openQuotes = quotes.filter((quote) => openStates.includes(getEffectiveStatus(quote)))
    const activePipeline = quotes.filter((quote) => {
      const status = getEffectiveStatus(quote)
      return !["rejected", "expired", "completed"].includes(status)
    })
    const totalWon = approvedQuotes.reduce((sum, quote) => sum + (quote.total || 0), 0)
    const pipelineValue = activePipeline.reduce((sum, quote) => sum + (quote.total || 0), 0)
    const decisionCount = approvedQuotes.length + rejectedQuotes.length

    return {
      openCount: openQuotes.length,
      approvedCount: approvedQuotes.length,
      pipelineValue,
      totalWon,
      winRate: decisionCount > 0 ? Math.round((approvedQuotes.length / decisionCount) * 100) : 0,
      avgValue: quotes.length > 0 ? quotes.reduce((sum, quote) => sum + (quote.total || 0), 0) / quotes.length : 0,
    }
  }, [quotes])

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return quotes.filter((quote) => {
      const searchable = [
        quote.title,
        quote.clientName,
        quote.externalClientName,
        quote.description,
        quote.clientEmail,
        quote.externalClientEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch)
      const matchesStatus = statusFilter === "all" || getEffectiveStatus(quote) === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [quotes, searchTerm, statusFilter])

  const featuredQuote = filteredQuotes[0] || quotes[0]

  const handleCreateEmptyQuote = async () => {
    if (!userData?.tenantId) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per creare un preventivo",
        variant: "destructive",
      })
      return
    }

    try {
      const emptyQuote = {
        tenantId: userData.tenantId,
        createdBy: userData.id || "",
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
        items: [],
        total: 0,
        currency: "EUR",
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "quotes"), emptyQuote)

      toast({
        title: "Preventivo creato",
        description: "Apro l'editor per completarlo.",
      })

      router.push(`/preventivi/${docRef.id}/edit`)
    } catch (createError) {
      console.error("Error creating empty quote:", createError)
      toast({
        title: "Errore",
        description: "Impossibile creare il preventivo",
        variant: "destructive",
      })
    } finally {
      setShowNewQuoteMenu(false)
    }
  }

  const handleSendQuote = async (quoteId: string) => {
    setSendingId(quoteId)

    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
        credentials: "include",
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Errore nell'invio del preventivo")
      }

      if (payload?.publicUrl) {
        await navigator.clipboard.writeText(payload.publicUrl).catch(() => undefined)
      }

      toast({
        title: "Preventivo pronto",
        description: payload?.publicUrl
          ? "Link pubblico generato e copiato negli appunti."
          : "Preventivo segnato come inviato.",
      })
    } catch (sendError) {
      console.error("Error sending quote:", sendError)
      toast({
        title: "Invio non riuscito",
        description: sendError instanceof Error ? sendError.message : "Errore nell'invio del preventivo",
        variant: "destructive",
      })
    } finally {
      setSendingId(null)
    }
  }

  const handleDownloadQuote = async (quoteId: string) => {
    const quote = quotes.find((item) => item.id === quoteId)
    if (!quote) return

    try {
      const { downloadQuotePDF } = await import("@/lib/pdf-generator")
      downloadQuotePDF(convertQuoteToPDFData(quote), `Proposta_${quote.id.slice(0, 8)}.pdf`)
      toast({
        title: "PDF scaricato",
        description: "La proposta commerciale e' stata generata correttamente.",
      })
    } catch (downloadError) {
      console.error("Error downloading quote PDF:", downloadError)
      toast({
        title: "PDF non riuscito",
        description: downloadError instanceof Error ? downloadError.message : "Non sono riuscito a generare il PDF del preventivo.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] px-4 py-4 text-white md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-64 animate-pulse rounded-[8px] border border-white/10 bg-white/[0.04]" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-[8px] border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050914] px-4 py-4 text-white md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl">
          <Alert className="border-red-500/40 bg-red-950/40 text-red-100">
            <AlertCircle className="h-4 w-4 text-red-300" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050914] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(226,55,133,0.22),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(40,206,218,0.18),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-8">
        <div className="space-y-6 md:space-y-8">
          <section className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[#080d18]/90 shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_28%,rgba(226,55,133,0.12)_70%,transparent)]" />
            <div className="relative grid gap-8 p-5 md:grid-cols-[1.05fr_0.95fr] md:p-8 lg:p-10">
              <div className="flex flex-col justify-between gap-8">
                <div className="space-y-5">
                  <Badge className="w-fit rounded-[8px] border border-righello-pink/30 bg-righello-pink/15 px-3 py-1 text-righello-pink">
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Proposal OS
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-normal text-white md:text-6xl">
                      Preventivi che sembrano presentazioni, ma governano margine e firma.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                      Crea offerte leggibili, inviale con link pubblico, monitora stato, valore e scadenze senza perdere il contesto cliente.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => setShowAIGenerator(true)}
                    className="h-12 rounded-[8px] bg-righello-pink px-5 text-white shadow-[0_18px_55px_rgba(226,55,133,0.28)] hover:bg-righello-pink-dark"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Genera con AI
                  </Button>
                  <DropdownMenu open={showNewQuoteMenu} onOpenChange={setShowNewQuoteMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-12 rounded-[8px] border-white/15 bg-white/5 px-5 text-white hover:bg-white/10"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuovo preventivo
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 rounded-[8px] border-white/10 bg-[#0d1320] text-white">
                      <DropdownMenuLabel>Crea preventivo</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={handleCreateEmptyQuote}>
                        <FileText className="mr-2 h-4 w-4" />
                        Preventivo vuoto
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-righello-pink focus:bg-white/10 focus:text-righello-pink"
                        onClick={() => {
                          setShowNewQuoteMenu(false)
                          setShowAIGenerator(true)
                        }}
                      >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Genera con AI
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="relative min-h-[360px] overflow-hidden rounded-[8px] border border-white/10 bg-black/30 p-4">
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Pipeline live
                </div>
                <div className="absolute -bottom-12 -right-10 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative mt-10 space-y-3">
                  {(featuredQuote ? [featuredQuote, ...filteredQuotes.filter((quote) => quote.id !== featuredQuote.id).slice(0, 2)] : []).map(
                    (quote, index) => (
                      <div
                        key={quote.id}
                        className={cn(
                          "rounded-[8px] border border-white/10 bg-[#101827]/90 p-4 shadow-xl",
                          index === 0 ? "translate-x-0" : index === 1 ? "translate-x-4 opacity-80" : "translate-x-8 opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase text-slate-500">Slide {index + 1}</p>
                            <h3 className="mt-1 truncate text-lg font-bold text-white">{quote.title || "Preventivo senza titolo"}</h3>
                            <p className="mt-1 truncate text-sm text-slate-400">{quote.clientName || quote.externalClientName || "Cliente da definire"}</p>
                          </div>
                          <Badge className="rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                            {formatCurrency(quote.total || 0, quote.currency)}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-[8px] bg-white/[0.04] p-3">
                            <p className="text-xs text-slate-500">Voci</p>
                            <p className="text-lg font-black text-white">{getQuoteLineCount(quote)}</p>
                          </div>
                          <div className="rounded-[8px] bg-white/[0.04] p-3">
                            <p className="text-xs text-slate-500">Stato</p>
                            <p className="truncate text-sm font-bold text-white">{getEffectiveStatus(quote)}</p>
                          </div>
                          <div className="rounded-[8px] bg-white/[0.04] p-3">
                            <p className="text-xs text-slate-500">Link</p>
                            <p className="text-sm font-bold text-white">{quote.shareToken ? "attivo" : "draft"}</p>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {!featuredQuote && (
                    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[8px] border border-dashed border-white/15 text-center">
                      <Layers className="h-10 w-10 text-slate-500" />
                      <p className="mt-3 text-sm font-semibold text-white">La prima proposta diventa il tuo deck commerciale.</p>
                      <p className="mt-1 max-w-xs text-xs text-slate-500">Parti da una bozza vuota o lascia generare struttura e voci all'AI.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={FileText} label="Preventivi totali" value={String(stats.total)} hint="documenti creati" />
            <MetricCard icon={Clock} label="In attesa" value={String(enrichedStats.openCount)} hint="richiedono follow-up" tone="cyan" />
            <MetricCard icon={CheckCircle} label="Win rate" value={`${enrichedStats.winRate}%`} hint={`${enrichedStats.approvedCount} confermati`} tone="green" />
            <MetricCard icon={DollarSign} label="Pipeline" value={formatCurrency(enrichedStats.pipelineValue)} hint={`vinto ${formatCurrency(enrichedStats.totalWon)}`} tone="pink" />
          </section>

          <section className="rounded-[8px] border border-white/10 bg-[#080d18]/88 p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-white md:text-2xl">Sala preventivi</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Vista operativa in stile board: cerca, filtra e apri subito editor o link pubblico.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:min-w-[520px]">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cerca cliente, titolo, email..."
                    className="h-11 rounded-[8px] border-white/10 bg-black/25 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-righello-pink"
                  />
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => router.push("/preventivi")}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Vista completa
                </Button>
              </div>
            </div>

            <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-1">
              <div className="flex min-w-max gap-2">
                {statusTabs.map((tab) => {
                  const active = statusFilter === tab.value
                  const count =
                    tab.value === "all" ? quotes.length : quotes.filter((quote) => getEffectiveStatus(quote) === tab.value).length

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value)}
                      className={cn(
                        "rounded-[8px] border px-4 py-2 text-sm font-bold transition",
                        active
                          ? "border-righello-pink/70 bg-righello-pink text-white shadow-[0_12px_32px_rgba(226,55,133,0.22)]"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                      )}
                    >
                      {tab.label}
                      <span className={cn("ml-2 text-xs", active ? "text-white/75" : "text-slate-500")}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {filteredQuotes.length === 0 ? (
            <section className="rounded-[8px] border border-white/10 bg-[#080d18]/88 p-8 text-center md:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[8px] border border-righello-pink/30 bg-righello-pink/15">
                <FileText className="h-8 w-8 text-righello-pink" />
              </div>
              <h3 className="mt-6 text-2xl font-black text-white">Nessun preventivo trovato</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                {searchTerm
                  ? "La ricerca non ha prodotto risultati. Prova a cambiare filtro o testo."
                  : "Crea una bozza e trasformala in una proposta presentabile in pochi passaggi."}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={handleCreateEmptyQuote} className="rounded-[8px] bg-righello-pink text-white hover:bg-righello-pink-dark">
                  <Plus className="mr-2 h-4 w-4" />
                  Crea il primo preventivo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAIGenerator(true)}
                  className="rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Genera con AI
                </Button>
              </div>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2">
              {filteredQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onEdit={(id) => router.push(`/preventivi/${id}/edit`)}
                  onSend={handleSendQuote}
                  onDownload={handleDownloadQuote}
                  onDelete={async (id) => {
                    try {
                      await deleteQuote(id)
                      toast({
                        title: "Preventivo eliminato",
                        description: "La lista e' stata aggiornata.",
                      })
                    } catch (deleteError) {
                      console.error("Error deleting quote:", deleteError)
                      toast({
                        title: "Eliminazione non riuscita",
                        description: "Non sono riuscito a eliminare il preventivo.",
                        variant: "destructive",
                      })
                    }
                  }}
                  sending={sendingId === quote.id}
                />
              ))}
            </section>
          )}
        </div>
      </div>

      <AIQuoteGenerator
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        onQuoteGenerated={() => {
          toast({
            title: "Preventivo generato",
            description: "La lista si aggiorna in tempo reale.",
          })
        }}
      />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "slate",
}: {
  icon: typeof FileText
  label: string
  value: string
  hint: string
  tone?: "slate" | "cyan" | "green" | "pink"
}) {
  const tones = {
    slate: "from-white/10 to-white/[0.03] text-slate-300",
    cyan: "from-cyan-400/18 to-cyan-400/[0.03] text-cyan-200",
    green: "from-emerald-400/18 to-emerald-400/[0.03] text-emerald-200",
    pink: "from-righello-pink/20 to-righello-pink/[0.04] text-righello-pink",
  }

  return (
    <div className="rounded-[8px] border border-white/10 bg-[#080d18]/88 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-[8px] bg-gradient-to-br", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <Link2 className="h-4 w-4 text-slate-600" />
      </div>
      <p className="mt-5 text-sm font-semibold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  )
}
