"use client"

import { Search, Plus, Calendar, Sparkles, PlayCircle } from "lucide-react"
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
    <div className="border-b border-slate-200/50 bg-white/80 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
      <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
        {/* Titolo principale */}
        <div className="mb-4 flex min-w-0 items-start gap-3 sm:mb-6 sm:items-center sm:gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg sm:h-14 sm:w-14">
            <Calendar className="h-6 w-6 text-white sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-xl font-bold text-transparent dark:from-slate-100 dark:to-slate-300 sm:text-2xl">
              Calendario Editoriale
            </h1>
            <p className="mt-1 flex items-start gap-2 text-sm leading-5 text-slate-600 dark:text-slate-400 sm:items-center sm:text-base">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
              Gestisci e pianifica i tuoi contenuti con precisione
            </p>
          </div>

          {/* Tutorial link */}
          <div className="hidden items-center gap-2 rounded-[8px] border border-pink-200 bg-pink-50 px-3 py-2 dark:border-pink-800 dark:bg-pink-900/20 md:flex">
            <PlayCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-sm font-medium text-pink-700 dark:text-pink-300">
              Guarda il tutorial per ottimizzare il tuo workflow
            </span>
          </div>
        </div>

        {/* Controlli */}
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cerca contenuti..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="min-w-0 rounded-[8px] border-slate-200/50 bg-white/70 pl-10 backdrop-blur-sm transition-all duration-200 focus:bg-white dark:border-slate-700/50 dark:bg-slate-800/70 dark:focus:bg-slate-800"
              />
            </div>

            {/* Client selector - solo per admin */}
            {userRole !== "client" && (
              <div className="min-w-0 sm:w-56">
                <Select
                  value={selectedClientId || "all"}
                  onValueChange={(value) => onClientChange(value === "all" ? null : value)}
                >
                  <SelectTrigger className="min-w-0 rounded-[8px] border-slate-200/50 bg-white/70 backdrop-blur-sm transition-all duration-200 focus:bg-white dark:border-slate-700/50 dark:bg-slate-800/70 dark:focus:bg-slate-800">
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
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
          </div>

          {/* New Post Button */}
          <Button
            onClick={onNewPost}
            className="w-full rounded-[8px] bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Post
          </Button>
        </div>
      </div>
    </div>
  )
}
