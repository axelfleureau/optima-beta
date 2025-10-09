'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCommandProgress } from '@/hooks/use-command-progress'
import { Brain, Sparkles, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useOrchestrationStore } from '@/lib/stores/orchestration-store'

const stageIcons = {
  analyzing: Brain,
  parsing: Sparkles,
  executing: Zap,
  completed: CheckCircle2,
  idle: null
}

const stageLabels = {
  analyzing: 'Analisi richiesta',
  parsing: 'Estrazione parametri',
  executing: 'Esecuzione',
  completed: 'Completato',
  idle: ''
}

const containerVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
}

const stageVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 20
    }
  }
}

const entityVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 25
    }
  }
}

export function OrchestrationFeedback() {
  const { stage, progress, reasoning, entities, actionStream, isProcessing, tokenCost } = useCommandProgress()

  useEffect(() => {
    if (stage === 'completed') {
      const timer = setTimeout(() => {
        useOrchestrationStore.getState().reset()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [stage])

  if (!isProcessing && stage === 'idle') {
    return null
  }

  const StageIcon = stageIcons[stage]
  const stageLabel = stageLabels[stage]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mt-4 relative"
      >
        {/* Glassmorphic Container */}
        <div className="
          relative 
          backdrop-blur-xl 
          bg-slate-50/50 dark:bg-slate-800/50 
          border border-slate-200/50 dark:border-slate-700/50 
          rounded-2xl 
          p-6
          shadow-2xl
          overflow-hidden
        ">
          {/* Animated overlay */}
          <div className="absolute inset-0 bg-slate-200/10 dark:bg-slate-700/10 animate-pulse pointer-events-none" />
          
          <div className="relative z-10">
            {/* Stage Header */}
            <motion.div 
              variants={stageVariants}
              className="flex items-center gap-3 mb-4"
            >
              {StageIcon && (
                <div className="p-2 rounded-lg bg-purple-500/20 backdrop-blur-sm">
                  <StageIcon className="h-5 w-5 text-purple-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{stageLabel}</h3>
                <Progress value={progress} className="h-1.5 mt-2" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
            </motion.div>

            {/* Stage 1: Analyzing - Streaming Reasoning */}
            {stage === 'analyzing' && reasoning && (
              <motion.div
                variants={stageVariants}
                className="
                  mt-4 p-4 
                  rounded-xl 
                  bg-white/5 
                  dark:bg-black/10
                  border border-white/10
                "
              >
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {reasoning}
                </p>
              </motion.div>
            )}

            {/* Stage 2: Parsing - Entity Cards */}
            {stage === 'parsing' && entities.length > 0 && (
              <motion.div
                variants={stageVariants}
                className="mt-4"
              >
                <p className="text-xs text-muted-foreground mb-3">Parametri identificati:</p>
                <div className="flex flex-wrap gap-2">
                  {entities.map((entity, index) => (
                    <motion.div
                      key={entity.key}
                      variants={entityVariants}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.05 }}
                    >
                      <Badge 
                        variant="secondary" 
                        className="
                          px-3 py-1.5 
                          bg-slate-100 dark:bg-slate-800 
                          border border-slate-200/50 dark:border-slate-700/50
                          backdrop-blur-sm
                        "
                      >
                        <span className="mr-1.5">{entity.icon}</span>
                        <span className="font-medium text-xs">
                          {entity.label}: <span className="text-foreground/80">{entity.value}</span>
                        </span>
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Stage 3: Executing - Action Stream */}
            {stage === 'executing' && actionStream && (
              <motion.div
                variants={stageVariants}
                className="
                  mt-4 p-4 
                  rounded-xl 
                  bg-blue-500/10
                  border border-blue-500/20
                "
              >
                <p className="text-sm text-blue-400 font-medium">
                  {actionStream}
                </p>
              </motion.div>
            )}

            {/* Completed State */}
            {stage === 'completed' && (
              <motion.div
                variants={stageVariants}
                className="
                  mt-4 p-4 
                  rounded-xl 
                  bg-green-500/10
                  border border-green-500/20
                  flex items-center gap-3
                "
              >
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-400 font-medium flex-1">
                  {actionStream || 'Comando completato!'}
                </p>
                {tokenCost > 0 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {tokenCost} token
                  </Badge>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
