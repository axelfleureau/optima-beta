"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { statusConfig } from "../utils/status-config"

interface CalendarViewProps {
  posts: EditorialPost[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onEditPost: (post: EditorialPost) => void
}

export function CalendarView({ posts, currentMonth, onMonthChange, onEditPost }: CalendarViewProps) {
  return (
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
          selected={undefined}
          month={currentMonth}
          onMonthChange={onMonthChange}
          locale={it}
          className="w-full"
          components={{
            DayContent: ({ date }) => {
              const postsOnDay = posts.filter(
                (post) => format(post.date.toDate(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
              )
              return (
                <div className="relative w-full h-full p-1 min-h-[80px]">
                  <span className="absolute top-1 right-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {format(date, "d")}
                  </span>
                  {postsOnDay.length > 0 && (
                    <div className="mt-6 space-y-1">
                      {postsOnDay.slice(0, 2).map((post) => {
                        const statusInfo = statusConfig[post.status]
                        return (
                          <Popover key={post.id}>
                            <PopoverTrigger asChild>
                              <div
                                className={`p-1 text-xs rounded cursor-pointer transition-all hover:scale-105 ${statusInfo.color} text-white truncate font-medium`}
                              >
                                {post.name}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start">
                              <div className="p-4 space-y-3">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{post.name}</h4>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {format(post.date.toDate(), "PPP p", { locale: it })}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium`}
                                    >
                                      <statusInfo.icon className="w-3 h-3 mr-1" />
                                      {statusInfo.label}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm">
                                      <span className="font-medium">Piattaforme:</span> {post.platform.join(", ")}
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Formato:</span> {post.format}
                                    </p>
                                    {post.objective && (
                                      <p className="text-sm">
                                        <span className="font-medium">Obiettivo:</span> {post.objective}
                                      </p>
                                    )}
                                    {post.caption && (
                                      <p className="text-sm">
                                        <span className="font-medium">Caption:</span> {post.caption.substring(0, 100)}
                                        ...
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
                            </PopoverContent>
                          </Popover>
                        )
                      })}
                      {postsOnDay.length > 2 && (
                        <div className="p-1 text-xs text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
                          +{postsOnDay.length - 2} altro/i
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            },
          }}
        />
      </CardContent>
    </Card>
  )
}
