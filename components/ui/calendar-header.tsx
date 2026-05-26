"use client"

import { Search, Plus, Clock3, Filter, MoreVertical, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CalendarHeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onNewPost: () => void
  selectedClientId: string | null
  onClientChange: (clientId: string | null) => void
  clientOptions: Array<{ value: string; label: string }>
  userRole?: string
}

export function CalendarHeader({
  searchTerm,
  onSearchChange,
  onNewPost,
  selectedClientId,
  onClientChange,
  clientOptions,
  userRole,
}: CalendarHeaderProps) {
  return (
    <div className="bg-white/95 dark:bg-[#111827]/95">
      <div className="w-full overflow-x-hidden px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#2b1025] text-white dark:bg-white dark:text-[#2b1025]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-white sm:text-xl">
                Planner editoriale
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                Europe/Rome
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 lg:w-[420px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cerca post, piattaforme, caption..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-10 min-w-0 rounded-[8px] border-slate-300 bg-white pl-10 text-sm shadow-none dark:border-slate-700 dark:bg-slate-950/60"
              />
            </div>

            {userRole !== "client" && (
              <div className="min-w-0 lg:w-60">
                <Select
                  value={selectedClientId || "all"}
                  onValueChange={(value) => onClientChange(value === "all" ? null : value)}
                >
                  <SelectTrigger className="h-10 min-w-0 rounded-[8px] border-slate-300 bg-white text-sm shadow-none dark:border-slate-700 dark:bg-slate-950/60">
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
                    <SelectItem value="all">Tutti i clienti</SelectItem>
                    {clientOptions.map((client) => (
                      <SelectItem key={client.value} value={client.value}>
                        {client.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-[40px_40px_1fr] gap-2 sm:flex sm:items-center">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-[8px] border-slate-300 dark:border-slate-700">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-[8px] border-slate-300 dark:border-slate-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
              <Button
                onClick={onNewPost}
                className="h-10 rounded-[8px] bg-[#2b1025] px-4 text-sm font-semibold text-white shadow-none hover:bg-[#3a1832] dark:bg-pink-500 dark:hover:bg-pink-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crea post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
