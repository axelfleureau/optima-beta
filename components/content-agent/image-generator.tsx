'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { GlassInput } from '@/components/ui/glass-input'
import { GlassButton } from '@/components/ui/glass-button'
import { PlatformSelector, type Platform } from './platform-selector'
import { ImagePreview } from './image-preview'
import { estimateImageCost } from '@/lib/ai/cost-calculator'
import { getPlatformSize, getPlatformAspectRatio } from '@/lib/ai/dalle-service'
import { useAuth } from '@/lib/auth-context'
import { useAIFeedback } from '@/hooks/use-ai-feedback'
import { motion, AnimatePresence } from 'framer-motion'
import { liquidExpand } from '@/lib/animations/liquid'
import { Sparkles, Info, Zap } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

interface ImageGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageGenerator({ open, onOpenChange }: ImageGeneratorProps) {
  const { user } = useAuth()
  const feedback = useAIFeedback()
  const [platform, setPlatform] = useState<Platform>('instagram-feed-grid')
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard')
  const [style, setStyle] = useState<'natural' | 'vivid'>('vivid')
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null)

  const costEstimate = estimateImageCost(quality)
  const imageSize = getPlatformSize(platform)
  const aspectRatio = getPlatformAspectRatio(platform)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      feedback.error('Validazione', 'Inserisci un prompt', 'Il campo prompt è obbligatorio')
      return
    }

    if (!user) {
      feedback.error('Autenticazione', 'Autenticazione richiesta', 'Effettua il login e riprova')
      return
    }

    setIsGenerating(true)
    setImageUrl(null)
    setRevisedPrompt(null)

    try {
      // Get Firebase ID token for authentication
      const token = await user.getIdToken()

      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          platform,
          size: imageSize,
          quality,
          style,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate image')
      }

      setImageUrl(data.imageUrl)
      setRevisedPrompt(data.revisedPrompt)

      feedback.success('Immagine generata', { 
        amount: data.tokensUsed 
      })
    } catch (error) {
      console.error('Error generating image:', error)
      feedback.error(
        'Generazione immagine',
        error instanceof Error ? error.message : 'Errore sconosciuto',
        'Verifica il prompt e i token disponibili'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    handleGenerate()
  }

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setImageUrl(null)
        setRevisedPrompt(null)
        setPrompt('')
        setPlatform('instagram-feed-grid')
        setQuality('standard')
        setStyle('vivid')
      }, 300)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
        <motion.div
          initial={liquidExpand.initial}
          animate={liquidExpand.animate}
          exit={liquidExpand.exit}
          transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
        >
          <GlassCard variant="elevated" padding="none" className="overflow-hidden">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white shadow-glow-purple">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-semibold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent">
                    AI Image Generator
                  </div>
                  <p className="text-sm text-muted-foreground font-normal mt-0.5">
                    Create professional images for social media with DALL-E 3
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <GlassCardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Platform</Label>
                <PlatformSelector selected={platform} onChange={setPlatform} />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Describe your image</Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Professional team working in modern office, bright colors, creative atmosphere..."
                  className={cn(
                    'w-full min-h-[100px] px-4 py-3 text-sm rounded-lg transition-all',
                    'bg-white/70 dark:bg-black/40 backdrop-blur-md',
                    'border border-white/40 dark:border-white/20',
                    'shadow-glass-sm focus:shadow-glass-md',
                    'focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20',
                    'focus-visible:outline-none',
                    'placeholder:text-muted-foreground',
                    'resize-none'
                  )}
                  disabled={isGenerating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Quality</Label>
                  <RadioGroup value={quality} onValueChange={(v) => setQuality(v as 'standard' | 'hd')}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span>Standard</span>
                          <span className="text-xs text-muted-foreground">15 tokens</span>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10">
                      <RadioGroupItem value="hd" id="hd" />
                      <Label htmlFor="hd" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span>HD Quality</span>
                          <span className="text-xs text-muted-foreground">30 tokens</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Style</Label>
                  <RadioGroup value={style} onValueChange={(v) => setStyle(v as 'natural' | 'vivid')}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10">
                      <RadioGroupItem value="vivid" id="vivid" />
                      <Label htmlFor="vivid" className="flex-1 cursor-pointer">
                        <div>
                          <div>Vivid</div>
                          <div className="text-xs text-muted-foreground">Hyper-real and dramatic</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10">
                      <RadioGroupItem value="natural" id="natural" />
                      <Label htmlFor="natural" className="flex-1 cursor-pointer">
                        <div>
                          <div>Natural</div>
                          <div className="text-xs text-muted-foreground">More subtle and realistic</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <motion.div
                className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Costo Token
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>
                        Questa generazione utilizzerà <strong className="text-foreground">{costEstimate.tokens} tokens</strong>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {imageSize} • Aspect Ratio: {aspectRatio}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Preview</Label>
                <ImagePreview
                  imageUrl={imageUrl}
                  revisedPrompt={revisedPrompt}
                  isGenerating={isGenerating}
                  onRegenerate={handleRegenerate}
                  aspectRatio={aspectRatio}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <GlassButton
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  loading={isGenerating}
                  glow="medium"
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Image'}
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
