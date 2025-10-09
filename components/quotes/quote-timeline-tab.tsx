"use client"

import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { FileText, Send, CheckCircle, Edit, XCircle, RefreshCw, type LucideIcon } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useQuoteEvents } from "@/hooks/use-quote-events"
import { Skeleton } from "@/components/ui/skeleton"

interface QuoteTimelineTabProps {
  quote: Quote
}

interface EventMetadata {
  icon: LucideIcon
  label: string
  color: string
  iconColor: string
}

function getEventMetadata(eventType: string): EventMetadata {
  const metadataMap: Record<string, EventMetadata> = {
    created: {
      icon: FileText,
      label: "Preventivo creato",
      color: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
    updated: {
      icon: Edit,
      label: "Preventivo modificato",
      color: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    sent: {
      icon: Send,
      label: "Inviato al cliente",
      color: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    approved: {
      icon: CheckCircle,
      label: "Approvato",
      color: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    rejected: {
      icon: XCircle,
      label: "Rifiutato",
      color: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
    },
    status_changed: {
      icon: RefreshCw,
      label: "Stato modificato",
      color: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  }

  return metadataMap[eventType] || {
    icon: FileText,
    label: eventType,
    color: "bg-gray-100 dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400",
  }
}

export function QuoteTimelineTab({ quote }: QuoteTimelineTabProps) {
  const { events, loading, error } = useQuoteEvents(quote.id)

  const formatDate = (date: any) => {
    if (!date) return null
    const dateObj = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date)
    return format(dateObj, "dd MMM yyyy, HH:mm", { locale: it })
  }

  if (!quote.id) {
    return (
      <GlassCard variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Cronologia Eventi
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ID preventivo non disponibile
        </p>
      </GlassCard>
    )
  }

  if (loading) {
    return (
      <GlassCard variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Cronologia Eventi
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Cronologia Eventi
        </h3>
        <p className="text-sm text-red-500 dark:text-red-400">
          Errore nel caricamento degli eventi: {error.message}
        </p>
      </GlassCard>
    )
  }

  if (events.length === 0) {
    return (
      <GlassCard variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Cronologia Eventi
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nessun evento registrato
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Cronologia Eventi
      </h3>
      <div className="space-y-4">
        {events.map((event) => {
          const metadata = getEventMetadata(event.eventType)
          const EventIcon = metadata.icon
          const formattedDate = formatDate(event.timestamp)
          
          return (
            <div key={event.id} className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${metadata.color}`}>
                <EventIcon className={`h-5 w-5 ${metadata.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {metadata.label}
                  {event.userName && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      da {event.userName}
                    </span>
                  )}
                </p>
                {formattedDate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formattedDate}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
