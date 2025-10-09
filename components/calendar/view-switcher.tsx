"use client"

import { CalendarIcon, CalendarDays, CalendarClock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCalendarExperience, type ViewMode } from "@/lib/calendar-experience-context"

export function ViewSwitcher() {
  const { viewMode, setViewMode } = useCalendarExperience()

  return (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
      <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-1 rounded-2xl shadow-lg">
        <TabsTrigger
          value="month"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Mese
        </TabsTrigger>
        <TabsTrigger
          value="week"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Settimana
        </TabsTrigger>
        <TabsTrigger
          value="day"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
        >
          <CalendarClock className="w-4 h-4 mr-2" />
          Giorno
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
