"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { statusConfig, platformConfig, contentTypeConfig } from "@/app/(dashboard)/calendario-editoriale/utils/status-config"
import { PostPreviewTooltip } from "./post-preview-tooltip"

interface CalendarWeekViewProps {
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

export function CalendarWeekView({ posts, selectedDate, onDateChange, onEditPost }: CalendarWeekViewProps) {
  const [hoveredPost, setHoveredPost] = useState<{ post: EditorialPost; position: { x: number; y: number } } | null>(null)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const handlePrevWeek = () => onDateChange(subWeeks(selectedDate, 1))
  const handleNextWeek = () => onDateChange(addWeeks(selectedDate, 1))
  const handleToday = () => onDateChange(new Date())

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) => {
      const postDate = normalizePostDate(post)
      if (!postDate) return false
      return isSameDay(postDate, day)
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
    <div className="min-w-0 space-y-4">
      <Card className="rounded-[8px] border-slate-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-slate-100 p-4 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="min-w-0 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
              {format(weekStart, "d MMM", { locale: it })} - {format(weekEnd, "d MMM yyyy", { locale: it })}
            </CardTitle>
            <div className="grid grid-cols-[44px_1fr_44px] gap-2 sm:flex sm:items-center">
              <Button variant="outline" size="sm" onClick={handlePrevWeek} className="rounded-[8px] border-slate-200 dark:border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} className="rounded-[8px] border-slate-200 dark:border-slate-700">
                Oggi
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek} className="rounded-[8px] border-slate-200 dark:border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid gap-2 md:grid-cols-7">
            {daysInWeek.map((day) => {
              const dayPosts = getPostsForDay(day)
              const isDayToday = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[124px] rounded-[8px] border md:min-h-[200px] ${
                    isDayToday
                      ? "border-pink-500 bg-pink-50/50 dark:bg-pink-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                  } p-3 space-y-2`}
                >
                  <div className="text-center mb-2">
                    <p className={`text-xs font-medium ${isDayToday ? "text-pink-600 dark:text-pink-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {format(day, "EEE", { locale: it })}
                    </p>
                    <p className={`text-lg font-bold ${isDayToday ? "text-pink-600 dark:text-pink-400" : "text-slate-900 dark:text-slate-100"}`}>
                      {format(day, "d", { locale: it })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {dayPosts.map((post) => {
                      const statusInfo = statusConfig[post.status]
                      const platformInfo = platformConfig[post.platform as keyof typeof platformConfig] || platformConfig.altro
                      const PlatformIcon = platformInfo.icon

                      return (
                        <div
                          key={post.id}
                      className={`min-w-0 rounded-[8px] border bg-white p-2 transition-all hover:shadow-md dark:bg-slate-800 ${statusInfo.borderColor}`}
                          onClick={() => onEditPost(post)}
                          onMouseEnter={(e) => handlePostMouseEnter(post, e)}
                          onMouseLeave={() => setHoveredPost(null)}
                        >
                          <div className="mb-1 flex min-w-0 items-center gap-2">
                            <PlatformIcon className={`w-3 h-3 ${platformInfo.iconColor}`} />
                            <span className="min-w-0 truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                              {post.name || post.title}
                            </span>
                          </div>
                          {post.scheduledTime && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{post.scheduledTime}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {hoveredPost && <PostPreviewTooltip post={hoveredPost.post} isOpen={true} position={hoveredPost.position} />}
    </div>
  )
}
