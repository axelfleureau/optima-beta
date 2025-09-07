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
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <div className="container mx-auto px-6 py-6">
        {/* Titolo principale */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Calendario Editoriale
            </h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Gestisci e pianifica i tuoi contenuti con precisione
            </p>
          </div>

          {/* Tutorial link */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800">
            <PlayCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-sm text-pink-700 dark:text-pink-300 font-medium">
              Guarda il tutorial per ottimizzare il tuo workflow
            </span>
          </div>
        </div>

        {/* Controlli */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Cerca contenuti..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200"
              />
            </div>

            {/* Client selector - solo per admin */}
            {userRole !== "client" && (
              <div className="min-w-[200px]">
                <Select
                  value={selectedClientId || "all"}
                  onValueChange={(value) => onClientChange(value === "all" ? null : value)}
                >
                  <SelectTrigger className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200">
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
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Post
          </Button>
        </div>
      </div>
    </div>
  )
}
