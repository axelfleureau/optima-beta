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
  ArrowRight,
  Film,
  Layers,
  Video,
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
  Video,
  Film,
  Layers,
}

export function CommandResults() {
  const { suggestions, inputValue, error, nlpResponse, status, searchResults } = useCommandBarStore()

  const showSuggestions = !inputValue && status === "idle" && searchResults.length === 0
  const showReadyState = inputValue.trim().length > 0 && status === "idle" && !error && !nlpResponse && searchResults.length === 0
  const showResults = searchResults.length > 0
  const showSuccess = status === "idle" && nlpResponse && !error && searchResults.length === 0
  const showError = error

  return (
    <div className="min-h-0">
      {showError && (
        <motion.div
          initial={liquidFadeIn.initial}
          animate={liquidFadeIn.animate}
          className="p-4 m-5 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900"
        >
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Errore</p>
              <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {showSuccess && nlpResponse && (
        <motion.div
          initial={liquidFadeIn.initial}
          animate={liquidFadeIn.animate}
          className="p-4 m-5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Comando eseguito con successo
              </p>
              {nlpResponse.suggestedAction && (
                <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                  {nlpResponse.suggestedAction}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {showResults && (
        <div className="p-4 pt-2">
          <div className="px-1 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
                  "hover:bg-slate-100 dark:hover:bg-slate-900",
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

      {showReadyState && (
        <motion.div
          initial={liquidFadeIn.initial}
          animate={liquidFadeIn.animate}
          className="mx-3 mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 sm:mx-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Pronto a eseguire</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Premi Invio o usa il pulsante Esegui. Se mancano dati, te li chiederò nel passaggio successivo.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 sm:flex">
              <span>Enter</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </motion.div>
      )}

      {showSuggestions && (
        <div className="px-3 pb-3 sm:px-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Azioni rapide</p>
            <p className="text-xs text-muted-foreground">Click per preparare il comando</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion: CommandSuggestion, index: number) => {
              const Icon = iconMap[suggestion.icon || "FileText"]
              return (
                <motion.button
                  key={suggestion.id}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    const { setInput } = useCommandBarStore.getState()
                    setInput(suggestion.title)
                  }}
                  className={cn(
                    "group flex min-h-[60px] items-start gap-3 rounded-lg px-3 py-2.5 text-left",
                    "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
                    "hover:border-righello-pink/60 hover:bg-righello-pink/5",
                    "transition-all duration-200"
                  )}
                >
                  {Icon && (
                    <span className="mt-0.5 rounded-md bg-righello-pink/10 p-1.5 text-righello-pink transition-colors group-hover:bg-righello-pink group-hover:text-white">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 dark:text-slate-50">{suggestion.title}</span>
                    {suggestion.description && (
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{suggestion.description}</span>
                    )}
                  </span>
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
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-righello-pink via-pink-500 to-cyan-500 animate-spin" />
              <div className="absolute inset-1 rounded-full bg-white dark:bg-black" />
            </div>
            <span>Elaborazione comando...</span>
          </div>
        </div>
      )}
    </div>
  )
}
