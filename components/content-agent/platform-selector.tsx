'use client'

import { Instagram, Facebook, Linkedin, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'custom'

interface PlatformSelectorProps {
  selected: Platform
  onChange: (platform: Platform) => void
}

const platforms = [
  {
    id: 'instagram' as const,
    name: 'Instagram',
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
                <p className="text-sm font-medium">{platform.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform.aspectRatio}
                </p>
                <p className="text-xs text-muted-foreground opacity-70">
                  {platform.size}
                </p>
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
