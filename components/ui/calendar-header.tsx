"use client"

import { Video, Search, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

interface CalendarHeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onNewPost: () => void
  selectedClientId: string | null
  onClientChange: (value: string | null) => void
  clientOptions: { value: string; label: string }[]
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
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title and Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Image
                  src="/assets/logos/righello-logo.svg"
                  alt="Righello Logo"
                  width={24}
                  height={24}
                  className="brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Calendario Editoriale
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Gestisci e pianifica i tuoi contenuti con precisione
                </p>
              </div>
            </div>

            {/* Video Tutorial Link */}
            <div className="flex items-center gap-2 text-sm text-pink-500 hover:text-pink-600 transition-colors cursor-pointer">
              <Video className="w-4 h-4" />
              <span>Guarda il tutorial per ottimizzare il tuo workflow</span>
            </div>

            {/* Client Selector */}
            {userRole !== "client" && (
              <div className="max-w-xs">
                <Select
                  value={selectedClientId || ""}
                  onValueChange={(value) => onClientChange(value === "all" ? null : value)}
                  disabled={userRole === "client"}
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i Clienti</SelectItem>
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca contenuti..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              />
            </div>
            <Button
              onClick={onNewPost}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-500 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-pink-500/25 transition-all duration-200 hover:scale-105"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Nuovo Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
