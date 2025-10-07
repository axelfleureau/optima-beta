"use client"

import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { motion } from "framer-motion"
import { liquidFadeIn } from "@/lib/animations/liquid"
import {
  Plus,
  Search,
  UserPlus,
  BarChart,
  Image,
  Briefcase,
  Calendar,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CommandSuggestion } from "@/lib/types"

const iconMap: Record<string, any> = {
  Plus,
  Search,
  UserPlus,
  BarChart,
  Image,
  Briefcase,
  Calendar,
  Users,
  FileText,
}

export function CommandResults() {
  const { suggestions, inputValue, error, nlpResponse, status, searchResults } = useCommandBarStore()

  const showSuggestions = !inputValue && status === "idle" && searchResults.length === 0
  const showResults = searchResults.length > 0
  const showSuccess = status === "idle" && nlpResponse && !error && searchResults.length === 0
  const showError = error

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {showError && (
        <motion.div
          initial={liquidFadeIn.initial}
          animate={liquidFadeIn.animate}
          className="p-4 m-4 rounded-lg bg-red-500/10 border border-red-500/30"
        >
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Errore</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {showSuccess && nlpResponse && (
        <motion.div
          initial={liquidFadeIn.initial}
          animate={liquidFadeIn.animate}
          className="p-4 m-4 rounded-lg bg-green-500/10 border border-green-500/30"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Comando eseguito con successo
              </p>
              {nlpResponse.suggestedAction && (
                <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                  {nlpResponse.suggestedAction}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {showResults && (
        <div className="p-2">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              Risultati ({searchResults.length})
            </p>
          </div>
          <div className="space-y-1">
            {searchResults.map((result, index) => (
              <motion.div
                key={result.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "px-3 py-2 rounded-lg cursor-pointer",
                  "hover:bg-white/60 dark:hover:bg-black/30",
                  "transition-all duration-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title || result.name}</p>
                    {result.description && (
                      <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {showSuggestions && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2">Suggerimenti:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion: CommandSuggestion, index: number) => {
              const Icon = iconMap[suggestion.icon || "FileText"]
              return (
                <motion.button
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    const { setInput } = useCommandBarStore.getState()
                    setInput(suggestion.title)
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full",
                    "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
                    "border border-purple-500/30",
                    "hover:border-purple-500/60 hover:bg-purple-500/30",
                    "transition-all duration-200"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 text-purple-400 flex-shrink-0" />}
                  <span className="text-sm font-medium whitespace-nowrap">{suggestion.title}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="relative h-4 w-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-spin" />
              <div className="absolute inset-1 rounded-full bg-white dark:bg-black" />
            </div>
            <span>Elaborazione comando...</span>
          </div>
        </div>
      )}
    </div>
  )
}
