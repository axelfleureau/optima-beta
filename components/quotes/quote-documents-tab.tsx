"use client"

import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { LiquidButton } from "@/components/ui/liquid-button"
import { FileText, Download, Eye } from "lucide-react"

interface QuoteDocumentsTabProps {
  quote: Quote
}

export function QuoteDocumentsTab({ quote }: QuoteDocumentsTabProps) {
  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log("Download PDF:", quote.id)
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
                Preventivo_{quote.id}.pdf
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">PDF Preventivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LiquidButton variant="outline" size="sm">
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
