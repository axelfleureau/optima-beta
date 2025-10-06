'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrchestrationStore } from '@/lib/stores/orchestration-store'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export function OrchestrationFeedback() {
  const { step, message, progress, tokenCost, isProcessing } = useOrchestrationStore()

  useEffect(() => {
    if (step === 'completed' || step === 'error') {
      const timer = setTimeout(() => {
        useOrchestrationStore.getState().reset()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [step])

  if (!isProcessing && step !== 'completed' && step !== 'error') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="
          mt-4 
          relative 
          backdrop-blur-xl 
          bg-white/5 
          dark:bg-black/10
          border border-white/10 
          rounded-xl 
          p-4
          shadow-lg
          before:content-['']
          before:absolute 
          before:inset-0 
          before:rounded-xl 
          before:p-[1px]
          before:bg-gradient-to-r 
          before:from-purple-500/30 
          before:via-pink-500/30 
          before:to-purple-500/30
          before:-z-10
        "
      >
        <div className="flex items-center gap-3 mb-3">
          {step === 'completed' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </motion.div>
          )}
          
          {step === 'error' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <XCircle className="h-5 w-5 text-red-500" />
            </motion.div>
          )}
          
          {isProcessing && (
            <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
          )}

          <motion.p 
            key={message}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium text-foreground"
          >
            {message}
          </motion.p>
        </div>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.3 }}
            className="origin-left"
          >
            <Progress value={progress} className="h-1.5" />
          </motion.div>
        )}

        {step === 'completed' && tokenCost > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-2 inline-block px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium"
          >
            {tokenCost} token
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
