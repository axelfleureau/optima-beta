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
    <div className="flex items-center justify-between">
      <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-1 rounded-2xl shadow-lg">
        <TabsTrigger
          value="table"
          className="data-[state=active]:bg-pink-500 data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
        >
          <List className="w-4 h-4 mr-2" />
          Tutti i Post
        </TabsTrigger>
        <TabsTrigger
          value="kanban"
          className="data-[state=active]:bg-pink-500 data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
        >
          <LayoutGrid className="w-4 h-4 mr-2" />
          Bacheca per Stato
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          className="data-[state=active]:bg-pink-500 data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Vista Calendario
        </TabsTrigger>
      </TabsList>

      {/* Additional Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
          <Filter className="w-4 h-4 mr-2" />
          Filtri
        </Button>
        <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
          <SortAsc className="w-4 h-4 mr-2" />
          Ordina
        </Button>
      </div>
    </div>
  )
}
