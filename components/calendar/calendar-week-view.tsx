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
    <div className="space-y-4">
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl">
        <CardHeader className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {format(weekStart, "d MMM", { locale: it })} - {format(weekEnd, "d MMM yyyy", { locale: it })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevWeek} className="border-slate-200 dark:border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} className="border-slate-200 dark:border-slate-700">
                Oggi
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek} className="border-slate-200 dark:border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {daysInWeek.map((day) => {
              const dayPosts = getPostsForDay(day)
              const isDayToday = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[200px] rounded-lg border ${
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
                          className={`p-2 rounded-lg bg-white dark:bg-slate-800 border cursor-pointer hover:shadow-md transition-all ${statusInfo.borderColor}`}
                          onClick={() => onEditPost(post)}
                          onMouseEnter={(e) => handlePostMouseEnter(post, e)}
                          onMouseLeave={() => setHoveredPost(null)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <PlatformIcon className={`w-3 h-3 ${platformInfo.iconColor}`} />
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
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
