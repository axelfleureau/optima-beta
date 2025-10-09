"use client"

import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface QuoteDetailsTabProps {
  quote: Quote
}

export function QuoteDetailsTab({ quote }: QuoteDetailsTabProps) {
  const formatDate = (date: any) => {
    if (!date) return "N/A"
    const dateObj = date?.toDate ? date.toDate() : new Date(date)
    return format(dateObj, "dd MMMM yyyy", { locale: it })
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }
  
  const quoteAny = quote as any
  
  return (
    <div className="space-y-6">
      {/* Info Cliente */}
      <GlassCard variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Informazioni Cliente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <User className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {quote.clientName || quoteAny.cliente?.nome || "N/A"}
              </p>
            </div>
          </div>
          
          {(quote.clientEmail || quoteAny.cliente?.email) && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {quote.clientEmail || quoteAny.cliente?.email}
                </p>
              </div>
            </div>
          )}
          
          {quoteAny.cliente?.telefono && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefono</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {quoteAny.cliente.telefono}
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
      
      {/* Obiettivi */}
      {quoteAny.obiettivi && quoteAny.obiettivi.length > 0 && (
        <GlassCard variant="elevated" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Obiettivi del Progetto
          </h3>
          <ul className="space-y-2">
            {quoteAny.obiettivi.map((obiettivo: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-pink-500 mt-1">•</span>
                <span className="text-gray-700 dark:text-gray-300">{obiettivo}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
      
      {/* Totali */}
      <GlassCard variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Riepilogo Economico
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Subtotale</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(quoteAny.totale?.subtotale || quote.total || 0)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-900 dark:text-white">Totale</span>
            <span className="font-bold text-pink-600 dark:text-pink-400">
              {formatCurrency(quote.total || quoteAny.totale?.complessivo || 0)}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
