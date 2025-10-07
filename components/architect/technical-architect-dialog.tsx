'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useArchitectStore } from '@/lib/stores/architect-store'
import { Button } from '@/components/ui/button'
import { LiquidButton } from '@/components/ui/liquid-button'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function TechnicalArchitectDialog() {
  const { isOpen, breakdown, loading, error, closeArchitect, acceptRoadmap, createSingleTask } = useArchitectStore()
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  const togglePhase = (phaseId: string) => {
    const newSet = new Set(expandedPhases)
    if (newSet.has(phaseId)) {
      newSet.delete(phaseId)
    } else {
      newSet.add(phaseId)
    }
    setExpandedPhases(newSet)
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeArchitect}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-background/95 backdrop-blur-xl border border-purple-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🎯 Technical Architect
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
              />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {breakdown && !loading && (
            <div className="space-y-6">
              {/* Complexity Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  breakdown.complexity === 'simple' ? 'bg-green-500/20 text-green-400' :
                  breakdown.complexity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {breakdown.complexity.toUpperCase()}
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  ~{breakdown.totalEstimatedHours}h totali
                </span>
              </div>

              {/* Recommended Approach */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm leading-relaxed">{breakdown.recommendedApproach}</p>
              </div>

              {/* Phases Tree */}
              <div className="space-y-3">
                {breakdown.phases.map((phase, index) => (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card/50 backdrop-blur-sm border border-purple-500/20 rounded-lg overflow-hidden"
                  >
                    {/* Phase Header */}
                    <button
                      onClick={() => togglePhase(phase.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {expandedPhases.has(phase.id) ? (
                          <ChevronDown className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">{index + 1}. {phase.title}</span>
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded flex-shrink-0">
                          {phase.estimatedHours}h
                        </span>
                      </div>
                    </button>

                    {/* Phase Details */}
                    <AnimatePresence>
                      {expandedPhases.has(phase.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ 
                            duration: 0.3,
                            ease: [0.4, 0.0, 0.2, 1]
                          }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-4">
                            {/* Description */}
                            <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>

                            {/* Rationale */}
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <p className="text-sm text-blue-400 leading-relaxed">💡 {phase.rationale}</p>
                            </div>

                            {/* Checklist */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Checklist:</p>
                              {phase.checklist.map((item, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">{item}</span>
                                </div>
                              ))}
                            </div>

                            {/* Warnings */}
                            {phase.warnings && phase.warnings.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-yellow-400">⚠️ Attenzione:</p>
                                {phase.warnings.map((warning, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-yellow-400/80">{warning}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {breakdown && !loading && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-purple-500/20">
            <LiquidButton 
              onClick={acceptRoadmap} 
              variant="primary"
              className="flex-1"
            >
              ✅ Accetta Roadmap
            </LiquidButton>
            <Button 
              onClick={() => {
                toast.info('Modifica fasi in arrivo nella prossima versione')
              }} 
              variant="outline" 
              className="flex-1 border-purple-500/30 hover:bg-purple-500/10"
            >
              ✏️ Modifica Fasi
            </Button>
            <Button 
              onClick={createSingleTask} 
              variant="outline" 
              className="flex-1 border-purple-500/30 hover:bg-purple-500/10"
            >
              Crea Task Singola
            </Button>
            <Button 
              onClick={closeArchitect} 
              variant="ghost"
              className="hover:bg-purple-500/10"
            >
              Annulla
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
