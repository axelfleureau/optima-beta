"use client"

import { List, LayoutGrid, CalendarIcon } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CalendarTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function CalendarTabs({ activeTab, onTabChange }: CalendarTabsProps) {
  return (
    <div className="min-w-0 overflow-x-auto border-b border-slate-200 dark:border-white/10">
      <TabsList className="inline-flex h-11 min-w-max rounded-none border-0 bg-transparent p-0">
        <TabsTrigger
          value="calendar"
          aria-current={activeTab === "calendar" ? "page" : undefined}
          onClick={() => onTabChange("calendar")}
          className="h-11 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-slate-500 shadow-none transition-colors data-[state=active]:border-[#2b1025] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 dark:text-slate-400 dark:data-[state=active]:border-pink-400 dark:data-[state=active]:text-white"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          Calendario
        </TabsTrigger>
        <TabsTrigger
          value="table"
          aria-current={activeTab === "table" ? "page" : undefined}
          onClick={() => onTabChange("table")}
          className="h-11 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-slate-500 shadow-none transition-colors data-[state=active]:border-[#2b1025] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 dark:text-slate-400 dark:data-[state=active]:border-pink-400 dark:data-[state=active]:text-white"
        >
          <List className="mr-2 h-4 w-4 shrink-0" />
          Lista
        </TabsTrigger>
        <TabsTrigger
          value="kanban"
          aria-current={activeTab === "kanban" ? "page" : undefined}
          onClick={() => onTabChange("kanban")}
          className="h-11 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-slate-500 shadow-none transition-colors data-[state=active]:border-[#2b1025] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 dark:text-slate-400 dark:data-[state=active]:border-pink-400 dark:data-[state=active]:text-white"
        >
          <LayoutGrid className="mr-2 h-4 w-4 shrink-0" />
          Stato
        </TabsTrigger>
        <button className="h-11 px-4 text-left text-sm font-medium text-slate-400" type="button" disabled>
          Libreria dei post
        </button>
        <button className="h-11 px-4 text-left text-sm font-medium text-slate-400" type="button" disabled>
          Liste automatiche
        </button>
        <button className="h-11 px-4 text-left text-sm font-medium text-slate-400" type="button" disabled>
          Messaggi eliminati
        </button>
      </TabsList>
    </div>
  )
}
