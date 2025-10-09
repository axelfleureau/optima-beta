"use client"

import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { FileText, Send, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface QuoteTimelineTabProps {
  quote: Quote
}

export function QuoteTimelineTab({ quote }: QuoteTimelineTabProps) {
  const formatDate = (date: any) => {
    if (!date) return null
    const dateObj = date?.toDate ? date.toDate() : new Date(date)
    return format(dateObj, "dd MMM yyyy, HH:mm", { locale: it })
  }
  
  const quoteAny = quote as any
  
  const events = [
    {
      icon: FileText,
      label: "Preventivo creato",
      date: formatDate(quote.createdAt),
      color: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
    quote.sentAt && {
      icon: Send,
      label: "Preventivo inviato al cliente",
      date: formatDate(quote.sentAt),
      color: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    quote.approvedAt && {
      icon: CheckCircle,
      label: "Preventivo approvato",
      date: formatDate(quote.approvedAt),
      color: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    quoteAny.completedAt && {
      icon: CheckCircle,
      label: "Progetto completato",
      date: formatDate(quoteAny.completedAt),
      color: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ].filter(Boolean)
  
  return (
    <GlassCard variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Cronologia Eventi
      </h3>
      <div className="space-y-4">
        {events.map((event, index) => event && (
          <div key={index} className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${event.color}`}>
              <event.icon className={`h-5 w-5 ${event.iconColor}`} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{event.label}</p>
              {event.date && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.date}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
