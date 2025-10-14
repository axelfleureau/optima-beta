"use client"

import { useEffect, useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { useAIActionState } from "@/hooks/use-ai-action-state"
import { useAIFeedback } from "@/hooks/use-ai-feedback"
import { GlassInput } from "@/components/ui/glass-input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Sparkles, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NLPResponse } from "@/lib/types"

export function CommandInput() {
  const { inputValue, setInput, status, executeCommand, context, nlpResponse } = useCommandBarStore()
  const actionState = useAIActionState('command-bar')
  const feedback = useAIFeedback()
  const inputRef = useRef<HTMLInputElement>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingIntent, setPendingIntent] = useState<NLPResponse | null>(null)
  const [localInput, setLocalInput] = useState(inputValue)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const debouncedSetInput = useDebouncedCallback(
    (value: string) => {
      setInput(value)
    },
    300
  )

  // CRITICAL FIX: Sync with external value + cancel pending debounce
  // When inputValue changes externally (e.g., dialog reopen with clean state)
  useEffect(() => {
    setLocalInput(inputValue)
    debouncedSetInput.cancel() // Cancel any pending debounce to prevent stale writes
  }, [inputValue, debouncedSetInput])

  // CRITICAL FIX: Cleanup on unmount
  // Prevents pending callbacks from firing after component is unmounted
  useEffect(() => {
    return () => {
      debouncedSetInput.cancel()
    }
  }, [debouncedSetInput])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // CRITICAL FIX: Cancel pending debounce and sync store with latest localInput
    debouncedSetInput.cancel()
    setInput(localInput)
    
    console.log("🔵 Command Bar handleSubmit called")
    console.log("📝 Input value (local):", localInput)
    console.log("📍 Context:", context)
    console.log("⚡ Status:", status)

    if (!localInput.trim()) {
      console.log("❌ Empty input, returning")
      feedback.info('Inserisci un comando')
      return
    }

    if (!context) {
      console.error("❌ Context is null! Cannot execute command")
      feedback.error('Comando non disponibile', 'Contesto non caricato', 'Attendi o ricarica la pagina')
      return
    }

    if (status === "processing") {
      console.log("⏳ Already processing, returning")
      return
    }

    try {
      actionState.start('Analisi comando...')
      console.log("✅ Executing command with latest input...")
      await executeCommand(localInput, context)
      actionState.complete()
      feedback.success('Comando eseguito')
    } catch (error) {
      actionState.error(error instanceof Error ? error.message : 'Errore sconosciuto')
      feedback.error('Esecuzione comando', error instanceof Error ? error.message : 'Errore sconosciuto', 'Verifica input e riprova')
    }
  }

  const handleConfirmIntent = async (confirmed: boolean) => {
    setShowConfirmation(false)
    
    if (!confirmed || !pendingIntent) {
      feedback.info('Comando annullato')
      setPendingIntent(null)
      return
    }
    
    try {
      actionState.start('Esecuzione comando...')
      
      const { executeIntent } = await import("@/lib/command-bar/handlers")
      const result = await executeIntent(pendingIntent.intent, pendingIntent.entities, context!)
      
      if (result.success) {
        actionState.complete()
        feedback.success('Comando eseguito')
        
        setTimeout(() => {
          useCommandBarStore.getState().close()
        }, 1000)
      } else {
        actionState.error(result.error || 'Errore sconosciuto')
        feedback.error('Esecuzione comando', result.error || 'Errore sconosciuto')
      }
    } catch (error) {
      actionState.error(error instanceof Error ? error.message : 'Errore sconosciuto')
      feedback.error('Esecuzione comando', error instanceof Error ? error.message : 'Errore sconosciuto')
    } finally {
      setPendingIntent(null)
    }
  }
  
  // Watch for nlpResponse changes to check confirmation
  useEffect(() => {
    if (nlpResponse && nlpResponse.requiresConfirmation && status === "gathering") {
      setPendingIntent(nlpResponse)
      setShowConfirmation(true)
    }
  }, [nlpResponse, status])

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
            <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5 text-violet-500" />
          )}
        </div>

        <GlassInput
          ref={inputRef}
          value={localInput}
          onChange={(e) => {
            const newValue = e.target.value
            setLocalInput(newValue)
            debouncedSetInput(newValue)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Chiedi qualsiasi cosa... es: 'crea task per cliente Acme con priorità alta'"
          className={cn(
            "pl-12 pr-4 text-base h-14",
            "border-4 border-violet-500/50 dark:border-violet-400/50",
            "bg-black/80 dark:bg-black/90",
            "focus-visible:border-violet-500 focus-visible:ring-8 focus-visible:ring-violet-500/30",
            "focus-visible:shadow-[0_0_40px_rgba(139,92,246,0.4)]",
            isProcessing && "animate-pulse"
          )}
          disabled={isProcessing}
          variant="glass"
          autoComplete="off"
          autoFocus
        />

        {isProcessing && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent animate-shimmer" />
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

      {actionState.isLoading && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          <span className="text-sm text-muted-foreground">{actionState.message}</span>
        </div>
      )}

      {status === "idle" && !localInput && context && !actionState.isLoading && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">
            💡 Prova: "crea task per...", "cerca task di...", "assegna task a...", "vai al calendario"
          </p>
        </div>
      )}

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Comando</DialogTitle>
            <DialogDescription>
              {pendingIntent && (
                <div className="space-y-3 mt-4">
                  <p className="text-base font-medium text-foreground">
                    Ho capito: <span className="text-violet-600 dark:text-violet-400">{pendingIntent.intent}</span>
                  </p>
                  {pendingIntent.entities && Object.keys(pendingIntent.entities).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Parametri rilevati:</p>
                      <div className="bg-muted p-3 rounded-md space-y-1">
                        {Object.entries(pendingIntent.entities).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="font-medium capitalize">{key}:</span>
                            <span className="text-muted-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pendingIntent.suggestedAction && (
                    <p className="text-sm text-muted-foreground">
                      {pendingIntent.suggestedAction}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    Procedo con questa azione?
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleConfirmIntent(false)}>
              Annulla
            </Button>
            <Button onClick={() => handleConfirmIntent(true)}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
