'use client'

import { useState } from 'react'
import { Download, Maximize2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassButton } from '@/components/ui/glass-button'
import { liquidExpand, particleBurst } from '@/lib/animations/liquid'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  imageUrl: string | null
  revisedPrompt?: string | null
  isGenerating: boolean
  onRegenerate?: () => void
  aspectRatio?: string
}

export function ImagePreview({
  imageUrl,
  revisedPrompt,
  isGenerating,
  onRegenerate,
  aspectRatio = '1:1',
}: ImagePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!imageUrl) return

    setIsDownloading(true)
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `optima-generated-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading image:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video'
      case '1.91:1':
        return 'aspect-[1.91/1]'
      case '1:1':
      default:
        return 'aspect-square'
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative w-full rounded-lg overflow-hidden bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10',
          getAspectRatioClass()
        )}
      >
        <AnimatePresence mode="wait">
          {isGenerating && (
            <motion.div
              key="loading"
              className="absolute inset-0 flex items-center justify-center"
              initial={liquidExpand.initial}
              animate={liquidExpand.animate}
              exit={liquidExpand.exit}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            >
              <div className="text-center space-y-4">
                <motion.div
                  className="relative w-20 h-20 mx-auto"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-60 blur-lg" />
                  <div className="absolute inset-2 rounded-full bg-white dark:bg-black" />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-pulse" />
                </motion.div>
                <p className="text-sm text-muted-foreground font-medium">
                  Generating your image...
                </p>
              </div>
            </motion.div>
          )}

          {!isGenerating && !imageUrl && (
            <motion.div
              key="placeholder"
              className="absolute inset-0 flex items-center justify-center"
              initial={liquidExpand.initial}
              animate={liquidExpand.animate}
              exit={liquidExpand.exit}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            >
              <div className="text-center space-y-2 p-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your generated image will appear here
                </p>
              </div>
            </motion.div>
          )}

          {!isGenerating && imageUrl && (
            <motion.div
              key="image"
              className="absolute inset-0"
              initial={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            >
              <Image
                src={imageUrl}
                alt={revisedPrompt || 'Generated image'}
                fill
                className="object-cover"
                unoptimized
              />

              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={particleBurst.initial}
                animate={particleBurst.animate}
                transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-lg" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {imageUrl && !isGenerating && (
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            loading={isDownloading}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </GlassButton>

          {onRegenerate && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </GlassButton>
          )}
        </motion.div>
      )}

      {revisedPrompt && imageUrl && !isGenerating && (
        <motion.div
          className="p-3 rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-muted-foreground font-medium mb-1">
            AI-Optimized Prompt:
          </p>
          <p className="text-xs text-foreground">{revisedPrompt}</p>
        </motion.div>
      )}
    </div>
  )
}
