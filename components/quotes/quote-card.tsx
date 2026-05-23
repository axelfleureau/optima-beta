"use client"

import { useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { motion } from "framer-motion"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Send,
  Trash2,
  User,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Quote } from "@/types/quote"

interface QuoteCardProps {
  quote: Quote
  onEdit?: (quoteId: string) => void
  onSend?: (quoteId: string) => void
  onDownload?: (quoteId: string) => void
  onDelete?: (quoteId: string) => void
  sending?: boolean
}

const finalPositiveStates: Quote["status"][] = ["approved", "in_progress", "completed"]

const statusConfig = {
  draft: {
    label: "Bozza",
    className: "border-slate-400/20 bg-slate-400/10 text-slate-200",
    accent: "from-slate-300 to-slate-500",
    icon: FileText,
  },
  sent: {
    label: "Inviato",
    className: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    accent: "from-cyan-300 to-blue-500",
    icon: Send,
  },
  in_review: {
    label: "In revisione",
    className: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    accent: "from-amber-300 to-orange-500",
    icon: Eye,
  },
  pending_payment: {
    label: "Pagamento",
    className: "border-orange-300/20 bg-orange-300/10 text-orange-200",
    accent: "from-orange-300 to-righello-pink",
    icon: Clock,
  },
  approved: {
    label: "Approvato",
    className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    accent: "from-emerald-300 to-green-500",
    icon: CheckCircle,
  },
  in_progress: {
    label: "In lavoro",
    className: "border-purple-300/20 bg-purple-300/10 text-purple-200",
    accent: "from-purple-300 to-righello-pink",
    icon: CheckCircle,
  },
  completed: {
    label: "Completato",
    className: "border-green-300/20 bg-green-300/10 text-green-200",
    accent: "from-green-300 to-emerald-500",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rifiutato",
    className: "border-red-300/20 bg-red-300/10 text-red-200",
    accent: "from-red-300 to-red-500",
    icon: XCircle,
  },
  expired: {
    label: "Scaduto",
    className: "border-red-300/20 bg-red-300/10 text-red-200",
    accent: "from-red-300 to-righello-pink",
    icon: AlertCircle,
  },
} satisfies Record<Quote["status"], { label: string; className: string; accent: string; icon: typeof FileText }>

function toDate(value: Date | { toDate?: () => Date } | string | number | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate()
  if (typeof value === "string" || typeof value === "number") return new Date(value)
  return null
}

function getEffectiveStatus(quote: Quote): Quote["status"] {
  const validUntil = toDate(quote.validUntil)
  if (validUntil && validUntil < new Date() && !finalPositiveStates.includes(quote.status)) {
    return "expired"
  }

  return quote.status
}

function formatDate(value: Date | { toDate?: () => Date } | string | number | null | undefined) {
  const date = toDate(value)
  if (!date || Number.isNaN(date.getTime())) return "Da definire"
  return format(date, "dd MMM yyyy", { locale: it })
}

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 10000 ? 0 : 2,
  }).format(amount || 0)
}

function getQuoteRows(quote: Quote) {
  const itemRows = quote.items?.map((item) => ({
    label: item.name,
    value: item.total,
  })) || []

  const voiceRows = quote.voci?.map((item) => ({
    label: item.descrizione,
    value: item.quantita * item.prezzoUnitario,
  })) || []

  const activityRows = quote.attivita?.map((item) => ({
    label: item,
    value: null,
  })) || []

  return [...itemRows, ...voiceRows, ...activityRows].slice(0, 3)
}

export function QuoteCard({ quote, onEdit, onSend, onDownload, onDelete, sending = false }: QuoteCardProps) {
  const effectiveStatus = getEffectiveStatus(quote)
  const statusInfo = statusConfig[effectiveStatus]
  const StatusIcon = statusInfo.icon
  const rows = useMemo(() => getQuoteRows(quote), [quote])
  const canSend = effectiveStatus === "draft" && onSend
  const canEdit = effectiveStatus === "draft" && onEdit

  const handleDelete = () => {
    if (!onDelete) return
    const confirmed = window.confirm("Eliminare questo preventivo?")
    if (confirmed) onDelete(quote.id)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[8px] border border-white/10 bg-[#0a1020]/92 shadow-[0_18px_70px_rgba(0,0,0,0.24)]"
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", statusInfo.accent)} />
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/[0.04] blur-2xl transition group-hover:bg-righello-pink/10" />

      <div className="relative p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Badge className={cn("w-fit rounded-[8px] border px-2.5 py-1", statusInfo.className)}>
              <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
              {statusInfo.label}
            </Badge>
            <Link href={`/preventivi/${quote.id}`}>
              <h3 className="line-clamp-2 text-xl font-black leading-tight text-white transition hover:text-righello-pink">
                {quote.title || "Preventivo senza titolo"}
              </h3>
            </Link>
            <p className="line-clamp-2 text-sm leading-6 text-slate-400">
              {quote.description || "Struttura proposta, attivita e pricing pronti per essere completati."}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-[8px] text-slate-300 hover:bg-white/10 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[8px] border-white/10 bg-[#0d1320] text-white">
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
                <Link href={`/preventivi/${quote.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={() => onEdit?.(quote.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={() => onDownload(quote.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Documenti
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer text-red-200 focus:bg-red-500/10 focus:text-red-100" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <InfoCell icon={User} label="Cliente" value={quote.clientName || quote.externalClientName || "Da definire"} />
          <InfoCell icon={Calendar} label="Scadenza" value={formatDate(quote.validUntil)} />
          <InfoCell icon={FileText} label="Voci" value={String((quote.items?.length || 0) + (quote.voci?.length || 0) + (quote.attivita?.length || 0))} />
          <InfoCell icon={CheckCircle} label="Valore" value={formatCurrency(quote.total || 0, quote.currency)} accent />
        </div>

        <div className="mt-4 rounded-[8px] border border-white/10 bg-black/25 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase text-slate-500">Anteprima proposta</p>
            <span className="text-xs text-slate-500">{quote.shareToken ? "Link attivo" : "Non condiviso"}</span>
          </div>
          <div className="space-y-2">
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 rounded-[8px] bg-white/[0.035] px-3 py-2">
                  <span className="line-clamp-1 text-sm font-semibold text-slate-200">{row.label}</span>
                  <span className="shrink-0 text-sm font-black text-white">
                    {typeof row.value === "number" ? formatCurrency(row.value, quote.currency) : "task"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-[8px] border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                Nessuna voce ancora definita. Apri l'editor per completare scope e pricing.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="outline" className="rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Link href={`/preventivi/${quote.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Visualizza
            </Link>
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="rounded-[8px] border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => onEdit?.(quote.id)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </Button>
          )}
          {canSend && (
            <Button
              disabled={sending}
              className="rounded-[8px] bg-righello-pink text-white hover:bg-righello-pink-dark disabled:opacity-60"
              onClick={() => onSend?.(quote.id)}
            >
              <Send className={cn("mr-2 h-4 w-4", sending && "animate-pulse")} />
              {sending ? "Invio..." : "Invia link"}
            </Button>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              className="rounded-[8px] text-slate-300 hover:bg-white/10 hover:text-white sm:ml-auto"
              onClick={() => onDownload(quote.id)}
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  )
}

function InfoCell({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof FileText
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase">{label}</span>
      </div>
      <p className={cn("mt-2 truncate text-sm font-black", accent ? "text-cyan-200" : "text-white")}>{value}</p>
    </div>
  )
}
