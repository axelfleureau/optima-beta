"use client"

import { CalendarIcon, CalendarDays, CalendarClock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCalendarExperience, type ViewMode } from "@/lib/calendar-experience-context"

export function ViewSwitcher() {
  const { viewMode, setViewMode } = useCalendarExperience()

  return (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full sm:w-auto">
      <TabsList className="grid h-10 w-full grid-cols-3 rounded-[8px] border border-slate-300 bg-white p-1 shadow-none dark:border-slate-700 dark:bg-slate-950/60 sm:w-auto sm:flex">
        <TabsTrigger
          value="month"
          className="min-w-0 rounded-[6px] px-2 py-1.5 text-xs font-medium transition-all data-[state=active]:bg-[#2b1025] data-[state=active]:text-white dark:data-[state=active]:bg-pink-500 sm:px-4 sm:text-sm"
        >
          <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          Mese
        </TabsTrigger>
        <TabsTrigger
          value="week"
          className="min-w-0 rounded-[6px] px-2 py-1.5 text-xs font-medium transition-all data-[state=active]:bg-[#2b1025] data-[state=active]:text-white dark:data-[state=active]:bg-pink-500 sm:px-4 sm:text-sm"
        >
          <CalendarDays className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          Settimana
        </TabsTrigger>
        <TabsTrigger
          value="day"
          className="min-w-0 rounded-[6px] px-2 py-1.5 text-xs font-medium transition-all data-[state=active]:bg-[#2b1025] data-[state=active]:text-white dark:data-[state=active]:bg-pink-500 sm:px-4 sm:text-sm"
        >
          <CalendarClock className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          Giorno
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
