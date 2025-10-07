'use client'

import { useAutoGenStore } from '@/lib/stores/auto-gen-store'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw, Save, X } from 'lucide-react'
import { OrchestrationFeedback } from '@/components/command-bar/orchestration-feedback'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'

export function AutoGenPreview() {
  const { user } = useAuth()
  const { 
    isGenerating, 
    generationType, 
    generatedContent, 
    error,
    saveToTask,
    regenerate,
    discard
  } = useAutoGenStore()

  const isOpen = generationType !== null

  const handleRegenerate = async () => {
    if (!user) return
    const token = await user.getIdToken()
    await regenerate(user.uid, token)
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => !isGenerating && discard()}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border border-purple-500/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {generationType === 'copy' ? 'Copy Generata' : 'Visual Generata'}
            </h3>
            <Button variant="ghost" size="icon" onClick={discard} disabled={isGenerating}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {isGenerating && <OrchestrationFeedback />}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!isGenerating && !error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {generationType === 'copy' && generatedContent.copy && (
                <div className="p-4 bg-card/50 backdrop-blur-sm border border-purple-500/20 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{generatedContent.copy}</p>
                </div>
              )}

              {generationType === 'visual' && generatedContent.imageUrl && (
                <div className="relative aspect-square rounded-lg overflow-hidden border border-purple-500/20">
                  <Image
                    src={generatedContent.imageUrl}
                    alt="Generated visual"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </motion.div>
          )}

          {!isGenerating && !error && (generatedContent.copy || generatedContent.imageUrl) && (
            <div className="flex gap-3">
              <Button 
                onClick={saveToTask}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                Salva in Task
              </Button>
              <Button 
                onClick={handleRegenerate}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Rigenera
              </Button>
              <Button 
                onClick={discard}
                variant="ghost"
              >
                Scarta
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
