"use client"

import { useEffect, useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { useAIActionState } from "@/hooks/use-ai-action-state"
import { useAIFeedback } from "@/hooks/use-ai-feedback"
import { GlassInput } from "@/components/ui/glass-input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react"
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
    
    if (!localInput.trim()) {
      feedback.info('Inserisci un comando')
      return
    }

    if (!context) {
      feedback.error('Comando non disponibile', 'Contesto non caricato', 'Attendi o ricarica la pagina')
      return
    }

    if (status === "processing") {
      return
    }

    try {
      actionState.start('Analisi comando...')
      await executeCommand(localInput, context)

      const commandState = useCommandBarStore.getState()
      if (commandState.error) {
        actionState.error(commandState.error)
        feedback.error('Esecuzione comando', commandState.error, 'Riprova o rendi il comando più specifico')
        return
      }

      if (commandState.status === 'gathering') {
        actionState.complete()
        feedback.info('Mi servono alcuni dettagli per completare il comando')
        return
      }

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
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const isProcessing = status === "processing" || status === "executing"

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative p-3 pb-2 sm:p-4 sm:pb-2.5">
        <div className="pointer-events-none absolute left-6 top-[1.55rem] sm:left-7 sm:top-[1.85rem]">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 text-righello-pink animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-righello-pink" />
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
          placeholder="Chiedi o comanda... es: crea task urgente per G&M"
          className={cn(
            "h-12 pl-10 pr-14 text-sm sm:h-12 sm:pl-11 sm:pr-24 sm:text-base",
            "border border-slate-300 dark:border-slate-700",
            "bg-white dark:bg-slate-900",
            "text-slate-950 dark:text-slate-50 placeholder:text-slate-400",
            "focus-visible:border-righello-pink focus-visible:ring-4 focus-visible:ring-righello-pink/15",
            isProcessing && "animate-pulse"
          )}
          disabled={isProcessing}
          variant="glass"
          autoComplete="off"
          autoFocus
        />

        <Button
          type="submit"
          size="sm"
          disabled={isProcessing || !localInput.trim() || !context}
          className="absolute right-5 top-[1.25rem] h-9 min-w-9 bg-righello-pink px-2 text-white hover:bg-righello-pink-dark sm:right-6 sm:top-[1.55rem] sm:px-3"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">Esegui</span>
        </Button>

        {isProcessing && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-righello-pink/10 to-transparent animate-shimmer" />
          </div>
        )}
      </div>

      {!context && (
        <div className="px-4 pb-3 sm:px-5">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Caricamento contesto in corso. Tra un istante potrai eseguire il comando.
          </p>
        </div>
      )}

      {actionState.isLoading && (
        <div className="flex items-center gap-2 px-4 pb-2.5 sm:px-5">
          <Loader2 className="h-4 w-4 animate-spin text-righello-pink" />
          <span className="text-sm text-muted-foreground">{actionState.message}</span>
        </div>
      )}

      {status === "idle" && !localInput && context && !actionState.isLoading && (
        <div className="hidden flex-wrap items-center gap-2 px-4 pb-2.5 text-xs text-muted-foreground sm:flex sm:px-5">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Prova:</span>
          <span>"crea task per G&M urgente"</span>
          <span className="hidden sm:inline">•</span>
          <span>"cerca task validation"</span>
          <span className="hidden sm:inline">•</span>
          <span>"vai al team"</span>
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
