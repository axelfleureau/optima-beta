"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { statusConfig, platformConfig, contentTypeConfig } from "@/app/(dashboard)/calendario-editoriale/utils/status-config"

interface PostPreviewTooltipProps {
  post: EditorialPost
  isOpen: boolean
  position?: { x: number; y: number }
}

export function PostPreviewTooltip({ post, isOpen, position }: PostPreviewTooltipProps) {
  const statusInfo = statusConfig[post.status]
  const platformInfo = platformConfig[post.platform as keyof typeof platformConfig] || platformConfig.altro
  const contentType = post.format || post.type
  const contentInfo = contentTypeConfig[contentType as keyof typeof contentTypeConfig] || contentTypeConfig.altro

  const postDate = post.date ? post.date.toDate() : new Date(post.scheduledDate)
  const postTitle = post.name || post.title
  const postContent = post.caption || post.content

  const StatusIcon = statusInfo.icon
  const PlatformIcon = platformInfo.icon
  const ContentIcon = contentInfo.icon

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: position?.x || 0,
            top: position?.y || 0,
          }}
        >
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl p-4 w-80 max-w-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 flex-1">
                  {postTitle}
                </h4>
                <Badge className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium shrink-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>

              {postContent && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                  {postContent.substring(0, 100)}
                  {postContent.length > 100 ? "..." : ""}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${platformInfo.lightColor} dark:${platformInfo.darkColor}`}>
                  <PlatformIcon className="w-3 h-3 mr-1" />
                  {platformInfo.label}
                </Badge>

                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <ContentIcon className={`w-3 h-3 mr-1 ${contentInfo.color}`} />
                  {contentInfo.label}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  📅 {format(postDate, "PPP 'alle' p", { locale: it })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
