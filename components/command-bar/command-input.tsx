"use client"

import { useEffect, useRef } from "react"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { GlassInput } from "@/components/ui/glass-input"
import { Loader2, Sparkles, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function CommandInput() {
  const { inputValue, setInput, status, executeCommand, context } = useCommandBarStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔵 Command Bar handleSubmit called")
    console.log("📝 Input value:", inputValue)
    console.log("📍 Context:", context)
    console.log("⚡ Status:", status)

    if (!inputValue.trim()) {
      console.log("❌ Empty input, returning")
      return
    }

    if (!context) {
      console.error("❌ Context is null! Cannot execute command")
      console.error("Please wait for context to load or refresh the page")
      return
    }

    if (status === "processing") {
      console.log("⏳ Already processing, returning")
      return
    }

    console.log("✅ Executing command...")
    await executeCommand(inputValue, context)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("⌨️ Enter key pressed - triggering submit")
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const isProcessing = status === "processing" || status === "executing"

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative p-4">
        <div className="absolute left-7 top-1/2 -translate-y-1/2 pointer-events-none">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5 text-purple-500" />
          )}
        </div>

        <GlassInput
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chiedi qualsiasi cosa... es: 'crea task per cliente Acme con priorità alta'"
          className={cn(
            "pl-12 pr-4 text-base h-14",
            "border-2 border-white/40 dark:border-white/20",
            "focus-visible:border-purple-500/60 focus-visible:ring-4 focus-visible:ring-purple-500/20",
            isProcessing && "animate-pulse"
          )}
          disabled={isProcessing}
          variant="glass"
          autoComplete="off"
          autoFocus
        />

        {isProcessing && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-shimmer" />
          </div>
        )}
      </div>

      {!context && (
        <div className="px-4 pb-2">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Caricamento contesto in corso... Attendi prima di eseguire comandi.
          </p>
        </div>
      )}

      {status === "idle" && !inputValue && context && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">
            💡 Prova: "crea task per...", "cerca task di...", "assegna task a...", "vai al calendario"
          </p>
        </div>
      )}
    </form>
  )
}
