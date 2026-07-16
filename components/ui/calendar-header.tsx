"use client"

import { Search, Plus, Filter, MoreVertical } from "lucide-react"
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
    <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Cerca post, piattaforme, caption..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 min-w-0 rounded-[8px] border-white/10 bg-[#0b1424] pl-10 text-sm text-slate-100 shadow-none"
        />
      </div>

      {userRole !== "client" && (
        <div className="min-w-0 lg:w-60">
          <Select
            value={selectedClientId || "all"}
            onValueChange={(value) => onClientChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="h-10 min-w-0 rounded-[8px] border-white/10 bg-[#0b1424] text-sm text-slate-100 shadow-none">
              <SelectValue placeholder="Seleziona cliente..." />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#111b2d] text-slate-100">
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

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-[8px] border-white/10 bg-[#0b1424] text-slate-300">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-[8px] border-white/10 bg-[#0b1424] text-slate-300">
          <MoreVertical className="h-4 w-4" />
        </Button>
        <Button
          onClick={onNewPost}
          className="h-10 rounded-[8px] bg-righello-pink px-4 text-sm font-semibold text-white shadow-none hover:bg-righello-pink/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crea post
        </Button>
      </div>
    </div>
  )
}
