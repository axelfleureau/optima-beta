"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek, subWeeks } from "date-fns"
import { it } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react"
import type { EditorialPost } from "@/lib/types"
import { statusConfig } from "../../app/(dashboard)/calendario-editoriale/utils/status-config"

interface CalendarViewProps {
  posts: EditorialPost[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onEditPost: (post: EditorialPost) => void
}

function getPostDate(post: EditorialPost): Date {
  if (post.date && typeof post.date.toDate === "function") {
    return post.date.toDate()
  }

  if (post.scheduledDate) {
    const timeStr = post.scheduledTime || "00:00"
    return new Date(`${post.scheduledDate}T${timeStr}:00`)
  }

  return new Date()
}

function getPlatformLabel(platform: EditorialPost["platform"] | string[] | undefined) {
  if (Array.isArray(platform)) return platform.join(", ")
  return platform || "-"
}

function PostSummaryCard({ post, onEditPost }: { post: EditorialPost; onEditPost: (post: EditorialPost) => void }) {
  const statusInfo = statusConfig[post.status]
  const StatusIcon = statusInfo.icon
  const postDate = getPostDate(post)
  const postTitle = post.name || post.title
  const postContent = post.caption || post.content

  return (
    <div className="min-w-0 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70">
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <h4 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-950 dark:text-slate-100">
          {postTitle}
        </h4>
        <Badge className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} shrink-0 border text-xs font-medium`}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </div>

      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
        <p>{format(postDate, "HH:mm", { locale: it })}</p>
        <p>
          <span className="font-medium text-slate-700 dark:text-slate-300">Piattaforma:</span>{" "}
          {getPlatformLabel(post.platform)}
        </p>
        <p>
          <span className="font-medium text-slate-700 dark:text-slate-300">Formato:</span> {post.format || post.type}
        </p>
        {postContent && <p className="line-clamp-2 pt-1">{postContent}</p>}
      </div>

      <Button onClick={() => onEditPost(post)} size="sm" className="mt-3 w-full rounded-[8px] bg-pink-500 hover:bg-pink-600">
        Vedi dettagli
      </Button>
    </div>
  )
}

export function CalendarView({ posts, currentMonth, onMonthChange, onEditPost }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(currentMonth || new Date())

  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => isSameDay(getPostDate(post), date))
  }

  const daysWithPosts = useMemo(() => posts.map((post) => getPostDate(post)), [posts])
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const daysInSelectedWeek = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  })
  const postsOnSelectedDay = getPostsForDate(selectedDate)

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return
    setSelectedDate(date)
  }

  const handleMobileDateChange = (date: Date) => {
    setSelectedDate(date)
    onMonthChange(date)
  }

  const modifiers = {
    hasPosts: daysWithPosts,
  }

  const modifiersClassNames = {
    hasPosts:
      "relative before:absolute before:bottom-1 before:left-1/2 before:h-1 before:w-1 before:-translate-x-1/2 before:rounded-full before:bg-pink-500 font-semibold text-pink-600 dark:text-pink-400",
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-4 md:hidden">
        <Card className="overflow-hidden rounded-[8px] border-slate-200/50 bg-white/90 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/85">
          <CardHeader className="border-b border-slate-200/50 bg-slate-50/80 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-5 w-5 shrink-0 text-pink-500" />
                <CardTitle className="truncate text-lg font-bold text-slate-950 dark:text-slate-100">
                  {format(selectedDate, "MMMM yyyy", { locale: it })}
                </CardTitle>
              </div>

              <div className="grid grid-cols-[44px_1fr_44px] gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMobileDateChange(subWeeks(selectedDate, 1))}
                  className="rounded-[8px] border-slate-200 dark:border-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMobileDateChange(new Date())}
                  className="rounded-[8px] border-slate-200 dark:border-slate-700"
                >
                  Oggi
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMobileDateChange(addWeeks(selectedDate, 1))}
                  className="rounded-[8px] border-slate-200 dark:border-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1">
              {daysInSelectedWeek.map((day) => {
                const dayPosts = getPostsForDate(day)
                const selected = isSameDay(day, selectedDate)
                const today = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleMobileDateChange(day)}
                    className={`min-w-0 rounded-[8px] border p-2 text-center transition ${
                      selected
                        ? "border-pink-500 bg-pink-500 text-white shadow-md"
                        : today
                          ? "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-900/20 dark:text-pink-300"
                          : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-semibold uppercase leading-none">
                      {format(day, "EEEEE", { locale: it })}
                    </span>
                    <span className="mt-1 block text-base font-black leading-none">{format(day, "d")}</span>
                    <span className="mt-1 block min-h-4 text-xs font-bold leading-4">
                      {dayPosts.length > 0 ? dayPosts.length : ""}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[8px] border-slate-200/50 bg-white/90 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/85">
          <CardHeader className="border-b border-slate-200/50 p-4 dark:border-slate-700/50">
            <CardTitle className="text-base font-bold text-slate-950 dark:text-slate-100">
              Post del {format(selectedDate, "d MMMM", { locale: it })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            {postsOnSelectedDay.length > 0 ? (
              postsOnSelectedDay.map((post) => <PostSummaryCard key={post.id} post={post} onEditPost={onEditPost} />)
            ) : (
              <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <List className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nessun post pianificato</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden space-y-4 md:block">
        <Card className="overflow-hidden rounded-[8px] border-slate-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
          <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-slate-100 p-6 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {format(currentMonth, "MMMM yyyy", { locale: it })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="rounded-[8px] border-slate-200 dark:border-slate-700"
                >
                  Precedente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    setSelectedDate(today)
                    onMonthChange(today)
                  }}
                  className="rounded-[8px] border-slate-200 dark:border-slate-700"
                >
                  Oggi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="rounded-[8px] border-slate-200 dark:border-slate-700"
                >
                  Successivo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              month={currentMonth}
              onMonthChange={onMonthChange}
              locale={it}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              className="w-full"
            />
          </CardContent>
        </Card>

        {postsOnSelectedDay.length > 0 && (
          <Card className="overflow-hidden rounded-[8px] border-slate-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
            <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-pink-50 to-purple-50 p-4 dark:border-slate-700/50 dark:from-pink-900/20 dark:to-purple-900/20">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Post del {format(selectedDate, "PPP", { locale: it })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {postsOnSelectedDay.map((post) => (
                <PostSummaryCard key={post.id} post={post} onEditPost={onEditPost} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
