"use client"

import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { LiquidButton } from "@/components/ui/liquid-button"
import { FileText, Download, Eye } from "lucide-react"
import { downloadQuotePDF, getQuotePDFBlob } from "@/lib/pdf-generator"
import { GeneratedQuoteData } from "@/lib/ai-quote-service"
import { useToast } from "@/hooks/use-toast"

interface QuoteDocumentsTabProps {
  quote: Quote
}

function toDate(value: Date | { toDate?: () => Date } | string | number | null | undefined) {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate()
  if (typeof value === "string" || typeof value === "number") return new Date(value)
  return new Date()
}

// Mapper function: Quote → GeneratedQuoteData
function convertQuoteToPDFData(quote: Quote): GeneratedQuoteData {
  const createdAt = toDate(quote.createdAt)
  const validUntil = toDate(quote.validUntil)
  // Calculate validity days from validUntil
  const validityDays = quote.validUntil
    ? Math.max(1, Math.ceil((validUntil.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 60

  // Client email - prefer externalClientEmail, fallback to clientEmail
  const clientEmail = quote.externalClientEmail || quote.clientEmail || ''
  
  // Client name - prefer externalClientName, fallback to clientName
  const clientName = quote.externalClientName || quote.clientName || 'Cliente'

  const voci = quote.voci?.length
    ? quote.voci.map(voce => ({
        descrizione: voce.descrizione,
        quantita: voce.quantita,
        prezzoUnitario: voce.prezzoUnitario,
        totale: voce.totale ?? Math.round(voce.quantita * voce.prezzoUnitario * 100) / 100,
        categoria: voce.categoria ?? 'base' as const,
        tipo: voce.tipo ?? 'one_time' as const
      }))
    : (quote.items || []).map(item => ({
        descrizione: item.description || item.name,
        quantita: item.quantity,
        prezzoUnitario: item.unitPrice,
        totale: item.total,
        categoria: 'base' as const,
        tipo: 'one_time' as const
      }))

  // Use persisted financial breakdown from quote (fallback to calculating if not available)
  const subtotale = quote.subtotale ?? voci.reduce((sum, voce) => sum + voce.totale, 0)
  const percentualeIva = quote.percentualeIva ?? 22
  const iva = quote.iva ?? Math.round(subtotale * (percentualeIva / 100) * 100) / 100
  const totale = quote.total ?? (subtotale + iva)

  return {
    cliente: {
      nome: clientName,
      email: clientEmail,
      azienda: '',
      telefono: '',
      indirizzo: '',
      partitaIva: ''
    },
    preventivo: {
      titolo: quote.title,
      descrizione: quote.description || '',
      numeroPreventivo: quote.id.slice(0, 8).toUpperCase(),
      dataCreazione: createdAt.toISOString().split('T')[0],
      validitaGiorni: validityDays,
      settore: '',
      timeline: ''
    },
    obiettivi: quote.obiettivi || [],
    attivita: quote.attivita || [],
    voci: voci,
    condizioni: {
      costVariation: 10,
      validityDays: validityDays,
      paymentTerms: quote.terminiCondizioni || "50% all'accettazione, 50% a completamento",
      cancellationPenalty: 30
    },
    brandMateriali: quote.brandMateriali,
    totali: {
      subtotale: subtotale,
      iva: iva,
      percentualeIva: percentualeIva,
      totale: totale
    }
  }
}

export function QuoteDocumentsTab({ quote }: QuoteDocumentsTabProps) {
  const { toast } = useToast()

  const handleDownloadPDF = () => {
    try {
      const pdfData = convertQuoteToPDFData(quote)
      downloadQuotePDF(pdfData, `Proposta_${quote.id}.pdf`)
      
      toast({
        title: "PDF Scaricato",
        description: "La proposta commerciale e' stata scaricata con successo.",
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si e' verificato un errore durante il download del PDF.",
        variant: "destructive"
      })
    }
  }

  const handlePreviewPDF = () => {
    let url: string | null = null
    try {
      const pdfData = convertQuoteToPDFData(quote)
      const blob = getQuotePDFBlob(pdfData)
      url = URL.createObjectURL(blob)
      
      // Open PDF in new tab
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow) {
        // Revoke URL immediately if popup blocked
        URL.revokeObjectURL(url)
        toast({
          title: "Popup Bloccato",
          description: "Abilita i popup per visualizzare l'anteprima PDF.",
          variant: "destructive"
        })
        return
      }
      
      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url!), 1000)
      
      toast({
        title: "Anteprima Aperta",
        description: "Il PDF è stato aperto in una nuova scheda.",
      })
    } catch (error) {
      // Revoke URL on error if it was created
      if (url) URL.revokeObjectURL(url)
      console.error("Error previewing PDF:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si e' verificato un errore durante l'anteprima del PDF.",
        variant: "destructive"
      })
    }
  }
  
  return (
    <GlassCard variant="elevated" padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Documenti
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Proposta_{quote.id}.pdf
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">PDF Preventivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LiquidButton variant="outline" size="sm" onClick={handlePreviewPDF}>
              <Eye className="h-4 w-4" />
            </LiquidButton>
            <LiquidButton variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" />
            </LiquidButton>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
