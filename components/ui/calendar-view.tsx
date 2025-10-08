"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { statusConfig } from "../../app/(dashboard)/calendario-editoriale/utils/status-config"

interface CalendarViewProps {
  posts: EditorialPost[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onEditPost: (post: EditorialPost) => void
}

export function CalendarView({ posts, currentMonth, onMonthChange, onEditPost }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Helper per ottenere la data del post (compatibile con legacy)
  const getPostDate = (post: EditorialPost): Date => {
    if (post.date) {
      return post.date.toDate()
    }
    // Usa scheduledDate e scheduledTime se disponibili
    const dateStr = post.scheduledDate
    const timeStr = post.scheduledTime || "00:00"
    return new Date(`${dateStr}T${timeStr}:00`)
  }

  // Crea modifiers per i giorni che hanno post
  const daysWithPosts = posts.map((post) => getPostDate(post))
  
  const modifiers = {
    hasPosts: daysWithPosts,
  }

  const modifiersClassNames = {
    hasPosts: "relative before:absolute before:bottom-1 before:left-1/2 before:-translate-x-1/2 before:w-1 before:h-1 before:bg-pink-500 before:rounded-full font-semibold text-pink-600 dark:text-pink-400",
  }

  // Filtra i post per il giorno selezionato
  const postsOnSelectedDay = selectedDate
    ? posts.filter(
        (post) => format(getPostDate(post), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"),
      )
    : []

  return (
    <div className="space-y-4">
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {format(currentMonth, "MMMM yyyy", { locale: it })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="border-slate-200 dark:border-slate-700"
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMonthChange(new Date())}
                className="border-slate-200 dark:border-slate-700"
              >
                Oggi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="border-slate-200 dark:border-slate-700"
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
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={onMonthChange}
            locale={it}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="w-full"
          />
        </CardContent>
      </Card>

      {selectedDate && postsOnSelectedDay.length > 0 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-b border-slate-200/50 dark:border-slate-700/50">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Post del {format(selectedDate, "PPP", { locale: it })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {postsOnSelectedDay.map((post) => {
              const statusInfo = statusConfig[post.status]
              const postTitle = post.name || post.title
              const postContent = post.caption || post.content
              return (
                <div
                  key={post.id}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{postTitle}</h4>
                      <Badge
                        className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium`}
                      >
                        <statusInfo.icon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {format(getPostDate(post), "p", { locale: it })}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Piattaforma:</span> {post.platform}
                      </p>
                      <p>
                        <span className="font-medium">Formato:</span> {post.format}
                      </p>
                      {post.objective && (
                        <p>
                          <span className="font-medium">Obiettivo:</span> {post.objective}
                        </p>
                      )}
                      {postContent && (
                        <p className="text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Caption:</span> {postContent.substring(0, 100)}
                          {postContent.length > 100 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => onEditPost(post)}
                    size="sm"
                    className="w-full bg-pink-500 hover:bg-pink-600"
                  >
                    Vedi Dettagli
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
