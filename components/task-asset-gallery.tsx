'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Trash2, Maximize2, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type { GeneratedAsset } from '@/lib/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface TaskAssetGalleryProps {
  assets: GeneratedAsset[]
  onDelete?: (assetId: string) => Promise<void>
}

export function TaskAssetGallery({ assets, onDelete }: TaskAssetGalleryProps) {
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handlePreview = (asset: GeneratedAsset) => {
    setSelectedAsset(asset)
    setPreviewOpen(true)
  }

  const handleDownload = async (asset: GeneratedAsset) => {
    try {
      const response = await fetch(asset.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `asset_${asset.id}.${asset.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDelete = async (assetId: string) => {
    if (onDelete) {
      await onDelete(assetId)
    }
  }

  if (!assets || assets.length === 0) {
    return (
      <GlassCard variant="default" padding="lg" className="text-center">
        <Sparkles className="h-12 w-12 mx-auto mb-3 text-purple-400 opacity-50" />
        <p className="text-sm text-muted-foreground">
          Nessun asset generato. Genera immagini dal calendario collegato.
        </p>
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard variant="elevated" padding="md">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          Asset Generati ({assets.length})
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              whileHover={{ scale: 1.05, opacity: 0.9 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative group cursor-pointer"
              onClick={() => handlePreview(asset)}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-black/20">
                <img
                  src={asset.url}
                  alt={asset.metadata.prompt || 'Generated asset'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(asset)
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(asset)
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(asset.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white">
                {asset.format.toUpperCase()}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl bg-black/80 backdrop-blur-xl border-white/20">
          <VisuallyHidden>
            <DialogTitle>Asset Preview</DialogTitle>
          </VisuallyHidden>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.metadata.prompt || 'Asset'}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              </div>
              
              <div className="space-y-2 text-sm">
                {selectedAsset.metadata.prompt && (
                  <div>
                    <span className="text-purple-400 font-medium">Prompt: </span>
                    <span className="text-white">{selectedAsset.metadata.prompt}</span>
                  </div>
                )}
                <div className="flex gap-4 text-muted-foreground">
                  <span>Formato: {selectedAsset.metadata.targetFormat || selectedAsset.format}</span>
                  <span>•</span>
                  <span>{format(new Date(selectedAsset.metadata.generatedAt), "dd MMM yyyy, HH:mm", { locale: it })}</span>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => handleDownload(selectedAsset)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {onDelete && (
                  <Button variant="ghost" className="text-red-400 hover:bg-red-500/20" onClick={() => {
                    handleDelete(selectedAsset.id)
                    setPreviewOpen(false)
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
