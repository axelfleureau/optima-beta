"use client"

import { List, LayoutGrid, CalendarIcon, Filter, SortAsc } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

interface CalendarTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function CalendarTabs({ activeTab, onTabChange }: CalendarTabsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-[8px] border border-slate-200/50 bg-white/80 p-1 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80 sm:w-auto sm:flex">
        <TabsTrigger
          value="table"
          className="min-w-0 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-pink-500 data-[state=active]:text-white sm:px-4 sm:text-sm"
        >
          <List className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          <span className="sm:hidden">Post</span>
          <span className="hidden sm:inline">Tutti i Post</span>
        </TabsTrigger>
        <TabsTrigger
          value="kanban"
          className="min-w-0 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-pink-500 data-[state=active]:text-white sm:px-4 sm:text-sm"
        >
          <LayoutGrid className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          <span className="sm:hidden">Stato</span>
          <span className="hidden sm:inline">Bacheca per Stato</span>
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          className="min-w-0 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 data-[state=active]:bg-pink-500 data-[state=active]:text-white sm:px-4 sm:text-sm"
        >
          <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
          <span className="sm:hidden">Cal.</span>
          <span className="hidden sm:inline">Vista Calendario</span>
        </TabsTrigger>
      </TabsList>

      {/* Additional Controls */}
      <div className="hidden items-center gap-2 sm:flex">
        <Button variant="outline" size="sm" className="rounded-[8px] border-slate-200 dark:border-slate-700">
          <Filter className="w-4 h-4 mr-2" />
          Filtri
        </Button>
        <Button variant="outline" size="sm" className="rounded-[8px] border-slate-200 dark:border-slate-700">
          <SortAsc className="w-4 h-4 mr-2" />
          Ordina
        </Button>
      </div>
    </div>
  )
}
