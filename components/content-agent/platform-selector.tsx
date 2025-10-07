'use client'

import { Instagram, Facebook, Linkedin, Sparkles, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getPlatformMetadata } from '@/lib/ai/dalle-service'

export type Platform = 
  | 'instagram-feed-grid'
  | 'instagram-feed-portrait'
  | 'instagram-reels'
  | 'instagram-stories'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'custom'

interface PlatformSelectorProps {
  selected: Platform
  onChange: (platform: Platform) => void
}

const platforms = [
  {
    id: 'instagram-feed-grid' as const,
    name: 'IG Feed Grid',
    icon: Instagram,
    aspectRatio: '3:4',
    size: '1080×1440',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    badge: 'NEW 2025',
    recommended: true,
  },
  {
    id: 'instagram-feed-portrait' as const,
    name: 'IG Feed',
    icon: Instagram,
    aspectRatio: '4:5',
    size: '1080×1350',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
  },
  {
    id: 'instagram-reels' as const,
    name: 'IG Reels',
    icon: Instagram,
    aspectRatio: '9:16',
    size: '1080×1920',
    gradient: 'from-purple-600 via-pink-600 to-orange-600',
    safeZone: '1080×1440 (center)',
  },
  {
    id: 'instagram-stories' as const,
    name: 'IG Stories',
    icon: Instagram,
    aspectRatio: '9:16',
    size: '1080×1920',
    gradient: 'from-purple-400 via-pink-400 to-orange-400',
    safeArea: '1080×1610 (center)',
  },
  {
    id: 'instagram' as const,
    name: 'Instagram (Legacy)',
    icon: Instagram,
    aspectRatio: '1:1',
    size: '1024x1024',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
  },
  {
    id: 'facebook' as const,
    name: 'Facebook',
    icon: Facebook,
    aspectRatio: '16:9',
    size: '1792x1024',
    gradient: 'from-blue-500 via-blue-600 to-blue-700',
  },
  {
    id: 'linkedin' as const,
    name: 'LinkedIn',
    icon: Linkedin,
    aspectRatio: '1.91:1',
    size: '1024x1024',
    gradient: 'from-blue-600 via-blue-700 to-blue-800',
  },
  {
    id: 'custom' as const,
    name: 'Custom',
    icon: Sparkles,
    aspectRatio: 'Custom',
    size: 'Variable',
    gradient: 'from-purple-600 via-pink-600 to-blue-600',
  },
]

export function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {platforms.map((platform) => {
        const isSelected = selected === platform.id
        const Icon = platform.icon
        const metadata = getPlatformMetadata(platform.id)
        const hasSafeZone = !!(platform as any).safeZone || !!(platform as any).safeArea
        const isInstagram = platform.id.startsWith('instagram-') && platform.id !== 'instagram'

        return (
          <motion.button
            key={platform.id}
            type="button"
            onClick={() => onChange(platform.id)}
            className={cn(
              'relative p-4 rounded-lg transition-all duration-300',
              'bg-white/60 dark:bg-black/30 backdrop-blur-md',
              'border-2 hover:shadow-glass-md',
              isSelected
                ? 'border-purple-500 shadow-glow-purple'
                : 'border-white/40 dark:border-white/10 hover:border-purple-500/50'
            )}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {(platform as any).badge && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/90 text-white shadow-lg">
                {(platform as any).badge}
              </span>
            )}
            
            {(platform as any).recommended && (
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'p-3 rounded-full transition-all',
                  isSelected
                    ? `bg-gradient-to-br ${platform.gradient} text-white shadow-glow-purple`
                    : 'bg-white/60 dark:bg-black/40 text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm font-medium">{platform.name}</p>
                  {(hasSafeZone || metadata.notes) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-medium">{metadata.notes}</p>
                          <div className="text-xs mt-1 opacity-70">
                            <div>Target: {metadata.targetSize}</div>
                            <div>DALL-E: {metadata.dalleSize}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform.aspectRatio}
                </p>
                <p className="text-xs text-muted-foreground opacity-70">
                  {platform.size}
                </p>
                {isInstagram && (
                  <div className="mt-1 text-xs text-purple-500 dark:text-purple-400 font-medium">
                    DALL-E: {metadata.dalleSize}
                  </div>
                )}
              </div>
            </div>

            {isSelected && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
