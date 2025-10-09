"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { statusConfig, platformConfig, contentTypeConfig } from "@/app/(dashboard)/calendario-editoriale/utils/status-config"
import { PostPreviewTooltip } from "./post-preview-tooltip"
import { Calendar } from "lucide-react"

interface CalendarDayViewProps {
  posts: EditorialPost[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onEditPost: (post: EditorialPost) => void
}

// Safe date normalization function
function normalizePostDate(post: EditorialPost): Date | null {
  if (post.date && typeof post.date.toDate === 'function') {
    return post.date.toDate()
  }
  if (post.scheduledDate) {
    return new Date(post.scheduledDate)
  }
  return null
}

export function CalendarDayView({ posts, selectedDate, onDateChange, onEditPost }: CalendarDayViewProps) {
  const [hoveredPost, setHoveredPost] = useState<{ post: EditorialPost; position: { x: number; y: number } } | null>(null)

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1))
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const postsForDay = posts.filter((post) => {
    const postDate = normalizePostDate(post)
    if (!postDate) return false
    return isSameDay(postDate, selectedDate)
  })

  const scheduledPosts = postsForDay.filter((post) => post.scheduledTime)
  const unscheduledPosts = postsForDay.filter((post) => !post.scheduledTime)

  const getPostsForHour = (hour: number) => {
    return scheduledPosts.filter((post) => {
      if (!post.scheduledTime) return false
      const [postHour] = post.scheduledTime.split(":").map(Number)
      return postHour === hour
    })
  }

  const handlePostMouseEnter = (post: EditorialPost, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredPost({
      post,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      },
    })
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl">
        <CardHeader className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevDay} className="border-slate-200 dark:border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} className="border-slate-200 dark:border-slate-700">
                Oggi
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextDay} className="border-slate-200 dark:border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4">
              {unscheduledPosts.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">Da pianificare</h3>
                    <Badge variant="outline" className="ml-auto bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      {unscheduledPosts.length} {unscheduledPosts.length === 1 ? 'post' : 'post'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {unscheduledPosts.map((post) => {
                      const statusInfo = statusConfig[post.status]
                      const platformInfo = platformConfig[post.platform as keyof typeof platformConfig] || platformConfig.altro
                      const contentType = post.format || post.type
                      const contentInfo = contentTypeConfig[contentType as keyof typeof contentTypeConfig] || contentTypeConfig.altro

                      const StatusIcon = statusInfo.icon
                      const PlatformIcon = platformInfo.icon
                      const ContentIcon = contentInfo.icon

                      return (
                        <div
                          key={post.id}
                          className={`p-3 rounded-lg bg-white dark:bg-slate-800 border cursor-pointer hover:shadow-lg transition-all ${statusInfo.borderColor}`}
                          onClick={() => onEditPost(post)}
                          onMouseEnter={(e) => handlePostMouseEnter(post, e)}
                          onMouseLeave={() => setHoveredPost(null)}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex-1">
                              {post.name || post.title}
                            </h4>
                            <Badge className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium shrink-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={`${platformInfo.lightColor} dark:${platformInfo.darkColor}`}>
                              <PlatformIcon className="w-3 h-3 mr-1" />
                              {platformInfo.label}
                            </Badge>

                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              <ContentIcon className={`w-3 h-3 mr-1 ${contentInfo.color}`} />
                              {contentInfo.label}
                            </Badge>
                          </div>

                          {(post.caption || post.content) && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {(post.caption || post.content).substring(0, 100)}
                              {(post.caption || post.content).length > 100 ? "..." : ""}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {hours.map((hour) => {
                const hourPosts = getPostsForHour(hour)

                return (
                  <div key={hour} className="flex border-b border-slate-200 dark:border-slate-700 min-h-[80px]">
                    <div className="w-20 shrink-0 p-3 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {hour.toString().padStart(2, "0")}:00
                      </p>
                    </div>

                    <div className="flex-1 p-3 space-y-2">
                      {hourPosts.map((post) => {
                        const statusInfo = statusConfig[post.status]
                        const platformInfo = platformConfig[post.platform as keyof typeof platformConfig] || platformConfig.altro
                        const contentType = post.format || post.type
                        const contentInfo = contentTypeConfig[contentType as keyof typeof contentTypeConfig] || contentTypeConfig.altro

                        const StatusIcon = statusInfo.icon
                        const PlatformIcon = platformInfo.icon
                        const ContentIcon = contentInfo.icon

                        return (
                          <div
                            key={post.id}
                            className={`p-3 rounded-lg bg-white dark:bg-slate-800 border cursor-pointer hover:shadow-lg transition-all ${statusInfo.borderColor}`}
                            onClick={() => onEditPost(post)}
                            onMouseEnter={(e) => handlePostMouseEnter(post, e)}
                            onMouseLeave={() => setHoveredPost(null)}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex-1">
                                {post.name || post.title}
                              </h4>
                              <Badge className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium shrink-0`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={`${platformInfo.lightColor} dark:${platformInfo.darkColor}`}>
                                <PlatformIcon className="w-3 h-3 mr-1" />
                                {platformInfo.label}
                              </Badge>

                              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <ContentIcon className={`w-3 h-3 mr-1 ${contentInfo.color}`} />
                                {contentInfo.label}
                              </Badge>

                              {post.scheduledTime && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                                  {post.scheduledTime}
                                </span>
                              )}
                            </div>

                            {(post.caption || post.content) && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                {(post.caption || post.content).substring(0, 100)}
                                {(post.caption || post.content).length > 100 ? "..." : ""}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {hoveredPost && <PostPreviewTooltip post={hoveredPost.post} isOpen={true} position={hoveredPost.position} />}
    </div>
  )
}
