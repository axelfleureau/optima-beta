"use client"

import { CalendarIcon, CalendarDays, CalendarClock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCalendarExperience, type ViewMode } from "@/lib/calendar-experience-context"

export function ViewSwitcher() {
  const { viewMode, setViewMode } = useCalendarExperience()

  return (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full sm:w-auto">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-[8px] border border-slate-200/50 bg-white/80 p-1 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80 sm:w-auto sm:flex">
        <TabsTrigger
          value="month"
          className="min-w-0 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white sm:px-5 sm:text-sm"
        >
          <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          Mese
        </TabsTrigger>
        <TabsTrigger
          value="week"
          className="min-w-0 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white sm:px-5 sm:text-sm"
        >
          <CalendarDays className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          Settimana
        </TabsTrigger>
        <TabsTrigger
          value="day"
          className="min-w-0 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white sm:px-5 sm:text-sm"
        >
          <CalendarClock className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          Giorno
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
