"use client"

import { useState } from "react"
import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Send,
  Download,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

interface QuoteCardProps {
  quote: Quote
  onEdit?: (quoteId: string) => void
  onSend?: (quoteId: string) => void
  onDownload?: (quoteId: string) => void
  onDelete?: (quoteId: string) => void
}

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
  pending_payment: {
    label: "Pagamento Atteso",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    icon: Clock,
  },
  approved: {
    label: "Approvato",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle,
  },
  accepted: {
    label: "Accettato",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle,
  },
  paid: {
    label: "Pagato",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
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

export function QuoteCard({ quote, onEdit, onSend, onDownload, onDelete }: QuoteCardProps) {
  const [showActions, setShowActions] = useState(false)
  
  const statusInfo = statusConfig[quote.status as keyof typeof statusConfig]
  const StatusIcon = statusInfo?.icon || FileText
  
  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }
  
  const formatDate = (date: Date | any) => {
    if (!date) return "N/A"
    const dateObj = date?.toDate ? date.toDate() : new Date(date)
    return format(dateObj, "dd MMM yyyy", { locale: it })
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard 
        variant="elevated" 
        padding="lg" 
        hover={true}
        className="group relative overflow-hidden"
      >
        {/* Status Badge - Top Right */}
        <div className="absolute top-4 right-4">
          <Badge className={`${statusInfo?.color} flex items-center gap-1 border-0 shadow-sm`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo?.label}
          </Badge>
        </div>
        
        {/* Header */}
        <div className="mb-4 pr-24">
          <Link href={`/preventivi/${quote.id}`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors line-clamp-2">
              {quote.title || "Preventivo senza titolo"}
            </h3>
          </Link>
          {quote.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {quote.description}
            </p>
          )}
        </div>
        
        {/* Meta Info Grid - Mobile First */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Cliente */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <User className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {quote.clientName || "N/A"}
              </p>
            </div>
          </div>
          
          {/* Data Creazione */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Creato</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(quote.createdAt)}
              </p>
            </div>
          </div>
          
          {/* Totale */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Totale</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(quote.total || 0, quote.currency)}
              </p>
            </div>
          </div>
          
          {/* Scadenza */}
          {quote.validUntil && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Scadenza</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(quote.validUntil)}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions - Mobile First */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <Link href={`/preventivi/${quote.id}`} className="flex-1 sm:flex-initial">
            <LiquidButton variant="outline" size="sm" className="w-full sm:w-auto">
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </LiquidButton>
          </Link>
          
          {quote.status === 'draft' && onEdit && (
            <LiquidButton 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(quote.id)}
              className="flex-1 sm:flex-initial"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </LiquidButton>
          )}
          
          {quote.status === 'draft' && onSend && (
            <LiquidButton 
              variant="primary" 
              size="sm" 
              onClick={() => onSend(quote.id)}
              className="flex-1 sm:flex-initial"
            >
              <Send className="h-4 w-4 mr-2" />
              Invia
            </LiquidButton>
          )}
          
          {onDownload && (
            <LiquidButton 
              variant="outline" 
              size="sm" 
              onClick={() => onDownload(quote.id)}
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4" />
            </LiquidButton>
          )}
          
          <LiquidButton 
            variant="outline" 
            size="sm" 
            onClick={() => setShowActions(!showActions)}
            className="sm:hidden"
          >
            <MoreHorizontal className="h-4 w-4" />
          </LiquidButton>
        </div>
        
        {/* Mobile Actions Menu */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50 sm:hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {onDownload && (
                <LiquidButton variant="outline" size="sm" onClick={() => onDownload(quote.id)} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica PDF
                </LiquidButton>
              )}
            </div>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  )
}
