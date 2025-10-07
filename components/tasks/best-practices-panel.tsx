"use client"

import { useBestPractices } from "@/lib/hooks/use-best-practices"
import { CheckCircle2, Lightbulb, AlertTriangle, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"

interface BestPracticesPanelProps {
  taskType: string
  taskDescription?: string
}

export function BestPracticesPanel({ taskType, taskDescription }: BestPracticesPanelProps) {
  const { practices, loading, error } = useBestPractices(taskType, taskDescription)

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carico best practices...</div>
  }

  if (error || !practices) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 bg-card/50 backdrop-blur-sm border border-purple-500/20 rounded-lg"
    >
      <h3 className="font-semibold text-lg">📚 Best Practices</h3>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Checklist:</p>
        {practices.checklist.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>

      {practices.tips.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Tips Professionali:</p>
          {practices.tips.map((tip, i) => (
            <div key={i} className="p-3 bg-blue-500/10 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400">{tip.title}</p>
                  <p className="text-sm text-blue-400/80 mt-1">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {practices.warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-yellow-400">⚠️ Attenzione:</p>
          {practices.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
              <span className="text-sm text-yellow-400/80">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {practices.resources && practices.resources.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Risorse:</p>
          {practices.resources.map((resource, i) => (
            <div key={i} className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-purple-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-400">{resource.title}</p>
                <p className="text-sm text-muted-foreground">{resource.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
