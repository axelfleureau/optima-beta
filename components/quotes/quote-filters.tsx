"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface QuoteFiltersState {
  searchTerm: string
  status: string
  dateRange?: { from: Date; to: Date }
  minAmount?: number
  maxAmount?: number
}

interface QuoteFiltersProps {
  filters: QuoteFiltersState
  onFiltersChange: (filters: QuoteFiltersState) => void
  stats?: {
    total: number
    draft: number
    sent: number
    pending: number
    accepted?: number
    approved?: number
    completed?: number
  }
}

export function QuoteFilters({ filters, onFiltersChange, stats }: QuoteFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value })
  }
  
  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value })
  }
  
  const clearFilters = () => {
    onFiltersChange({
      searchTerm: "",
      status: "all",
    })
    setShowAdvanced(false)
  }
  
  const activeFiltersCount = [
    filters.searchTerm,
    filters.status !== "all" ? filters.status : null,
    filters.minAmount,
    filters.maxAmount,
  ].filter(Boolean).length
  
  return (
    <GlassCard variant="elevated" padding="md" className="space-y-4">
      {/* Primary Filters - Mobile First */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca preventivi, clienti..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
          />
        </div>
        
        {/* Status Filter */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white/50 dark:bg-gray-800/50 border-gray-200/50">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Tutti {stats?.total ? `(${stats.total})` : ""}
            </SelectItem>
            <SelectItem value="draft">
              Bozze {stats?.draft ? `(${stats.draft})` : ""}
            </SelectItem>
            <SelectItem value="sent">
              Inviati {stats?.sent ? `(${stats.sent})` : ""}
            </SelectItem>
            <SelectItem value="pending">
              In Attesa {stats?.pending ? `(${stats.pending})` : ""}
            </SelectItem>
            <SelectItem value="accepted">
              Accettati {stats?.accepted ? `(${stats.accepted})` : ""}
            </SelectItem>
            {stats?.approved !== undefined && (
              <SelectItem value="approved">
                Approvati {stats?.approved ? `(${stats.approved})` : ""}
              </SelectItem>
            )}
            {stats?.completed !== undefined && (
              <SelectItem value="completed">
                Completati {stats?.completed ? `(${stats.completed})` : ""}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* Advanced Filter Toggle */}
        <LiquidButton
          variant={showAdvanced ? "primary" : "outline"}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full sm:w-auto"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtri Avanzati
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 bg-pink-500 text-white border-0">
              {activeFiltersCount}
            </Badge>
          )}
        </LiquidButton>
        
        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <LiquidButton
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Cancella
          </LiquidButton>
        )}
      </div>
      
      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50"
          >
            {/* Amount Range */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                Importo Minimo
              </label>
              <Input
                type="number"
                placeholder="€0"
                value={filters.minAmount || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                Importo Massimo
              </label>
              <Input
                type="number"
                placeholder="€10,000"
                value={filters.maxAmount || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
