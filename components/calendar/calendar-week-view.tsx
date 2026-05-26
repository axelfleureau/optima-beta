"use client"

import { useMemo, useState, type MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock3 } from "lucide-react"
import { addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek, subWeeks } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { EditorialPostStatus as PostStatusEnum } from "@/lib/types"
import { platformConfig, statusConfig } from "@/app/(dashboard)/calendario-editoriale/utils/status-config"
import { PostPreviewTooltip } from "./post-preview-tooltip"

interface CalendarWeekViewProps {
  posts: EditorialPost[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onEditPost: (post: EditorialPost) => void
}

const HOURS = Array.from({ length: 16 }, (_, index) => index + 8)
const ROW_HEIGHT = 58
const TIME_GUTTER_WIDTH = 58

function getPrimaryPlatform(post: EditorialPost) {
  return Array.isArray(post.platform) ? post.platform[0] : post.platform || "altro"
}

function normalizePostDate(post: EditorialPost): Date | null {
  if (post.date && typeof post.date.toDate === "function") {
    return post.date.toDate()
  }

  if (!post.scheduledDate) return null

  const date = String(post.scheduledDate)
  if (date.includes("T")) return new Date(date)

  return new Date(`${date}T${post.scheduledTime || "00:00"}:00`)
}

function postsForDayAndHour(posts: EditorialPost[], day: Date, hour: number) {
  return posts.filter((post) => {
    const postDate = normalizePostDate(post)
    if (!postDate || !isSameDay(postDate, day)) return false
    return postDate.getHours() === hour
  })
}

function isRecommendedPublishingWindow(hour: number) {
  return (hour >= 9 && hour <= 12) || (hour >= 16 && hour <= 20)
}

function recommendationClass(hour: number, day: Date) {
  if (!isRecommendedPublishingWindow(hour)) return "bg-slate-50 dark:bg-slate-950/30"
  if (day.getDay() === 0 || day.getDay() === 6) return "bg-blue-100/65 dark:bg-blue-500/10"
  if (hour >= 16 && hour <= 18) return "bg-blue-200/75 dark:bg-blue-500/16"
  return "bg-blue-100/80 dark:bg-blue-500/12"
}

function currentTimeOffset(weekStart: Date, weekEnd: Date) {
  const now = new Date()
  if (now < weekStart || now > weekEnd) return null
  const hour = now.getHours()
  if (hour < HOURS[0] || hour > HOURS[HOURS.length - 1]) return null
  return ((hour - HOURS[0]) * 60 + now.getMinutes()) / 60 * ROW_HEIGHT
}

export function CalendarWeekView({ posts, selectedDate, onDateChange, onEditPost }: CalendarWeekViewProps) {
  const [hoveredPost, setHoveredPost] = useState<{ post: EditorialPost; position: { x: number; y: number } } | null>(null)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const nowOffset = currentTimeOffset(weekStart, weekEnd)

  const scheduledPosts = useMemo(
    () => posts.filter((post) => normalizePostDate(post)).sort((a, b) => {
      const firstDate = normalizePostDate(a)?.getTime() || 0
      const secondDate = normalizePostDate(b)?.getTime() || 0
      return firstDate - secondDate
    }),
    [posts],
  )

  const handlePostMouseEnter = (post: EditorialPost, event: MouseEvent) => {
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
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/45 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <Clock3 className="h-3.5 w-3.5" />
            Planner settimanale
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">
            {format(weekStart, "d MMM yyyy", { locale: it })} - {format(weekEnd, "d MMM yyyy", { locale: it })}
          </h2>
        </div>

        <div className="grid grid-cols-[40px_1fr_40px] gap-2 sm:flex sm:items-center">
          <Button variant="outline" size="icon" onClick={() => onDateChange(subWeeks(selectedDate, 1))} className="h-10 w-10 rounded-[8px] border-slate-300 dark:border-slate-700">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onDateChange(new Date())} className="h-10 rounded-[8px] border-slate-300 px-4 text-sm dark:border-slate-700">
            Questa settimana
          </Button>
          <Button variant="outline" size="icon" onClick={() => onDateChange(addWeeks(selectedDate, 1))} className="h-10 w-10 rounded-[8px] border-slate-300 dark:border-slate-700">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/45">
        <div className="overflow-x-auto">
          <div className="min-w-[1040px]">
            <div
              className="grid border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              style={{ gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(7, minmax(132px, 1fr))` }}
            >
              <div className="border-r border-slate-200 dark:border-slate-800" />
              {daysInWeek.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onDateChange(day)}
                  className={`min-w-0 border-r border-slate-200 px-3 py-3 text-center text-sm transition-colors last:border-r-0 dark:border-slate-800 ${
                    isSameDay(day, selectedDate)
                      ? "bg-[#2b1025] font-semibold text-white dark:bg-pink-500"
                      : isToday(day)
                        ? "bg-pink-50 font-semibold text-pink-700 dark:bg-pink-500/10 dark:text-pink-200"
                        : day.getDay() === 0 || day.getDay() === 6
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="block truncate capitalize">{format(day, "EEEE", { locale: it })}</span>
                  <span className="mt-0.5 block text-xs opacity-70">{format(day, "d MMM", { locale: it })}</span>
                </button>
              ))}
            </div>

            <div className="relative max-h-[calc(100dvh-310px)] min-h-[560px] overflow-y-auto">
              {nowOffset !== null && (
                <div
                  className="pointer-events-none absolute z-20 flex items-center"
                  style={{ top: nowOffset, left: 0, right: 0 }}
                >
                  <span className="h-2 w-2 rounded-full bg-[#2b1025] dark:bg-pink-400" />
                  <span className="h-px flex-1 bg-[#2b1025] dark:bg-pink-400" />
                </div>
              )}

              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid border-b border-slate-200 last:border-b-0 dark:border-slate-800"
                  style={{
                    minHeight: ROW_HEIGHT,
                    gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(7, minmax(132px, 1fr))`,
                  }}
                >
                  <div className="border-r border-slate-200 bg-white px-2 py-2 text-right text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
                    {hour.toString().padStart(2, "0")}:00
                  </div>

                  {daysInWeek.map((day) => {
                    const hourPosts = postsForDayAndHour(scheduledPosts, day, hour)

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={`min-h-[58px] space-y-1.5 border-r border-slate-200 p-1.5 last:border-r-0 dark:border-slate-800 ${recommendationClass(hour, day)}`}
                      >
                        {hourPosts.map((post) => {
                          const statusInfo = statusConfig[post.status] || statusConfig[PostStatusEnum.IDEA]
                          const platformKey = getPrimaryPlatform(post)
                          const platformInfo = platformConfig[platformKey as keyof typeof platformConfig] || platformConfig.altro
                          const PlatformIcon = platformInfo.icon
                          const postDate = normalizePostDate(post)
                          const content = post.caption || post.content || post.description || ""

                          return (
                            <button
                              key={post.id}
                              type="button"
                              className="group w-full min-w-0 rounded-[7px] border border-white/80 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                              onClick={() => onEditPost(post)}
                              onMouseEnter={(event) => handlePostMouseEnter(post, event)}
                              onMouseLeave={() => setHoveredPost(null)}
                            >
                              <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                                <PlatformIcon className={`h-3.5 w-3.5 shrink-0 ${platformInfo.iconColor}`} />
                                <span className="ml-auto shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {postDate ? format(postDate, "HH:mm") : post.scheduledTime}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-xs font-medium leading-4 text-slate-900 dark:text-slate-100">
                                {content || post.name || post.title}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
                                <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                  {statusInfo.label}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 rounded-[8px] border border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-400 sm:flex sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Le fasce azzurre indicano finestre editoriali consigliate. I post restano modificabili cliccando la card.
        </span>
        <span>{scheduledPosts.length} post pianificati nella vista filtrata</span>
      </div>

      {hoveredPost && <PostPreviewTooltip post={hoveredPost.post} isOpen={true} position={hoveredPost.position} />}
    </div>
  )
}
