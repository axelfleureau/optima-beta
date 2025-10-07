"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useDebouncedCallback } from "use-debounce"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { useCommandContextStore } from "@/lib/stores/command-context-store"
import { useArchitectStore } from "@/lib/stores/architect-store"
import { ContextGatheringDialog } from "@/components/content-agent/context-gathering-dialog"
import { TokenConsentDialog } from "@/components/content-agent/token-consent-dialog"
import { OrchestrationFeedback } from "@/components/command-bar/orchestration-feedback"
import { ContentAgentOrchestrator, type OrchestrationResult } from "@/lib/services/content-agent-orchestrator"
import { auth } from "@/lib/firebase"
import type { CommandContext, NLPResponse } from "@/lib/types"
import { parseDateExpression, formatDateForCommand } from "@/lib/utils/date-parser"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const placeholders = [
  "Cosa vuoi fare oggi?",
  "Crea post Instagram per...",
  "Genera reel TikTok su...",
  "Pianifica contenuti per...",
]

export function DashboardCommandInput() {
  const [input, setInput] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [gatheringOpen, setGatheringOpen] = useState(false)
  const [currentIntent, setCurrentIntent] = useState<{ intent: string; entities: any } | null>(null)
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResult | null>(null)
  const [tokenConsentOpen, setTokenConsentOpen] = useState(false)
  const [dateSuggestion, setDateSuggestion] = useState<Date | null>(null)
  const [clientMatches, setClientMatches] = useState<string[]>([])

  const { userData } = useAuth()
  const { clients } = useClients()
  const { users } = useUsers()

  useEffect(() => {
    if (!isFocused && !input) {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [isFocused, input])

  useEffect(() => {
    const store = useCommandContextStore.getState()
    const now = Date.now()
    const CACHE_TTL = 5 * 60 * 1000
    
    if (clients && clients.length > 0) {
      const shouldUpdateClients = !store.clients.length || 
        (store.clientsLastFetched && now - store.clientsLastFetched > CACHE_TTL) ||
        !store.clientsLastFetched
      
      if (shouldUpdateClients) {
        store.setClients(clients)
      }
    }
    
    if (users && users.length > 0) {
      const shouldUpdateUsers = !store.users.length || 
        (store.usersLastFetched && now - store.usersLastFetched > CACHE_TTL) ||
        !store.usersLastFetched
      
      if (shouldUpdateUsers) {
        store.setUsers(users)
      }
    }
    
    if (clients?.length > 0 && users?.length > 0) {
      store.setLoaded(true)
    }
  }, [clients, users])

  const fuzzyMatchClients = useCallback((query: string) => {
    const cached = useCommandContextStore.getState().clients
    const availableClients = cached.length > 0 ? cached : (clients || [])
    
    if (!query || query.length < 2) return []
    
    const lower = query.toLowerCase()
    
    return availableClients
      .filter(c => c.name.toLowerCase().includes(lower))
      .slice(0, 5)
      .map(c => c.name)
  }, [clients])

  const debouncedInputChange = useDebouncedCallback(
    (value: string) => {
      if (!value || value.trim().length === 0) {
        setClientMatches([])
        setDateSuggestion(null)
        return
      }
      
      const parsedDate = parseDateExpression(value)
      if (parsedDate) {
        setDateSuggestion(parsedDate)
        console.log('📅 Parsed date:', formatDateForCommand(parsedDate))
      } else {
        setDateSuggestion(null)
      }
      
      const matches = fuzzyMatchClients(value)
      if (matches.length > 0) {
        setClientMatches(matches)
        console.log('👥 Client matches:', matches)
      } else {
        setClientMatches([])
      }
    },
    150
  )

  const clearAutocomplete = useCallback(() => {
    setClientMatches([])
    setDateSuggestion(null)
    debouncedInputChange.cancel()
  }, [debouncedInputChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInput(newValue)
    
    if (!newValue || newValue.trim().length === 0) {
      clearAutocomplete()
      return
    }
    
    debouncedInputChange(newValue)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isProcessing) return

    if (!userData?.tenantId || !userData?.id) {
      toast.error("Errore", {
        description: "Dati utente non disponibili",
      })
      return
    }

    const originalInput = input
    
    debouncedInputChange.cancel()
    
    setIsProcessing(true)
    
    const cachedStore = useCommandContextStore.getState()
    const context: CommandContext = {
      tenantId: userData.tenantId,
      userId: userData.id,
      userRole: userData.role,
      availableClients: cachedStore.clients.length > 0 ? cachedStore.clients : (clients || []),
      availableUsers: cachedStore.users.length > 0 ? cachedStore.users : (users || []),
      ...(dateSuggestion && { suggestedDate: formatDateForCommand(dateSuggestion) })
    }

    console.log("📤 Dashboard Command Input:", input)
    console.log("📍 Context:", context)

    try {
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, context }),
      })

      if (!response.ok) {
        throw new Error("Failed to process command")
      }

      const nlpResponse: NLPResponse = await response.json()
      
      console.log("✅ NLP Result:", nlpResponse)
      console.log("🎯 Intent:", nlpResponse.intent)
      console.log("📊 Entities:", nlpResponse.entities)
      console.log("💯 Confidence:", nlpResponse.confidence)

      // Check if task is complex and should trigger Technical Architect
      const complexKeywords = ['sito', 'website', 'landing', 'campagna', 'campaign', 'rebranding', 'brand', 'app', 'applicazione', 'piattaforma', 'sistema']
      const hasComplexKeywords = complexKeywords.some(kw => input.toLowerCase().includes(kw))
      
      // Multi-deliverable detection
      const deliverableKeywords = ['deliverable', 'fase', 'step', 'passaggio', 'componente']
      const hasMultipleDeliverables = 
        (nlpResponse.entities?.deliverables && Array.isArray(nlpResponse.entities.deliverables) && nlpResponse.entities.deliverables.length > 1) ||
        (input.match(/e\s+(anche|poi|inoltre|più)/gi)?.length || 0) > 0 ||
        deliverableKeywords.some(kw => input.toLowerCase().includes(kw))
      
      const isComplexTask = hasComplexKeywords || hasMultipleDeliverables
      
      if (isComplexTask && nlpResponse.intent === 'CREATE_TASK') {
        console.log('🎯 Complex task detected, triggering Technical Architect')
        
        const { openArchitect } = useArchitectStore.getState()
        
        // Extract client info if available
        const clientName = nlpResponse.entities?.clientName
        let clientId = null
        
        if (clientName) {
          const cachedStore = useCommandContextStore.getState()
          const availableClients = cachedStore.clients.length > 0 ? cachedStore.clients : (clients || [])
          const client = availableClients.find(c => 
            c.name.toLowerCase().includes(clientName?.toLowerCase() || '')
          )
          clientId = client?.id || null
        }
        
        await openArchitect(input, clientId || undefined, clientName || undefined, { ...context, entities: nlpResponse.entities })
        
        setInput("")
        clearAutocomplete()
        setIsProcessing(false)
        return
      }

      if (nlpResponse.intent.startsWith("CREATE_CONTENT_")) {
        const needsClient = !nlpResponse.entities?.clientName && !nlpResponse.entities?.clientId
        const needsDate = !nlpResponse.entities?.publishDate
        const needsPlatform = !nlpResponse.entities?.platform && 
          (nlpResponse.entities?.contentType === "post" || 
           nlpResponse.entities?.contentType === "reel" || 
           nlpResponse.entities?.contentType === "video")

        const isHighConfidence = nlpResponse.confidence >= 0.95
        const hasAllParams = !needsClient && !needsDate && !needsPlatform

        if (needsClient || needsDate || needsPlatform) {
          setCurrentIntent({ intent: nlpResponse.intent, entities: nlpResponse.entities })
          setGatheringOpen(true)
          toast.info("Raccolgo informazioni mancanti...", {
            description: "Compila i dettagli nel dialog",
          })
        } else {
          const user = auth.currentUser
          if (!user) {
            toast.error("Utente non autenticato")
            setIsProcessing(false)
            return
          }

          const clientName = nlpResponse.entities.clientName
          
          let availableClients = useCommandContextStore.getState().clients
          
          if (!availableClients || availableClients.length === 0) {
            availableClients = clients || []
          }
          
          const client = availableClients.find(c => 
            c.name.toLowerCase().includes(clientName?.toLowerCase() || '')
          )
          
          if (!client) {
            toast.error(`Cliente "${clientName}" non trovato`, {
              description: "Cliente non trovato nel workspace"
            })
            setIsProcessing(false)
            return
          }

          if (isHighConfidence && hasAllParams) {
            console.log("🚀 Auto-submit: High confidence + all params present")
            toast.success("Comando riconosciuto con alta confidenza!", {
              description: "Procedo automaticamente..."
            })
          }
          
          try {
            const result = await ContentAgentOrchestrator.orchestrateContentCreation({
              intent: nlpResponse.intent,
              contentType: nlpResponse.entities.contentType as "post" | "reel" | "video",
              platform: nlpResponse.entities.platform,
              clientId: client.id,
              clientName: client.name,
              topic: nlpResponse.entities.topic || "",
              publishDate: new Date(nlpResponse.entities.publishDate),
              userId: user.uid,
              tenantId: userData.tenantId
            })
            
            setCurrentIntent({ intent: nlpResponse.intent, entities: nlpResponse.entities })
            
            setOrchestrationResult(result)
            setTokenConsentOpen(true)
          } catch (error: any) {
            console.error("❌ Orchestration error:", error)
            toast.error("Errore nell'orchestrazione", {
              description: error.message || "Riprova"
            })
          }
        }
      } else {
        toast.success(`Intent: ${nlpResponse.intent}`, {
          description: `Confidence: ${(nlpResponse.confidence * 100).toFixed(0)}% | Entities: ${JSON.stringify(nlpResponse.entities)}`,
          duration: 5000,
        })
      }

      setInput("")
      clearAutocomplete()
    } catch (error: any) {
      console.error("❌ NLP API error:", error)
      setInput(originalInput)
      toast.error("Errore nell'elaborazione del comando", {
        description: error.message || "Riprova",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      const hasClientMatches = clientMatches.length > 0
      
      if (!hasClientMatches) {
        return
      }
      
      e.preventDefault()
      debouncedInputChange.cancel()
      setInput(clientMatches[0])
      clearAutocomplete()
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit(e)
      return
    }

    if (e.key === "Escape") {
      e.preventDefault()
      setInput("")
      clearAutocomplete()
      ;(e.target as HTMLInputElement).blur()
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const firstClient = clients?.[0]?.name || "il tuo cliente"

  const suggestions = [
    { 
      label: "📸 Crea post Instagram", 
      value: firstClient !== "il tuo cliente" 
        ? `Crea post Instagram per ${firstClient}` 
        : "Crea post Instagram"
    },
    { 
      label: "📊 Analizza progetti", 
      value: "Mostra analytics"
    },
    { 
      label: "📝 Genera preventivo", 
      value: firstClient !== "il tuo cliente"
        ? `Crea preventivo per ${firstClient}`
        : "Crea preventivo"
    },
    { 
      label: "🎯 Pianifica campagna", 
      value: "Pianifica campagna social per questa settimana"
    }
  ]

  return (
    <>
      <GlassCard
        variant="elevated"
        glow="subtle"
        padding="none"
        className="w-full max-w-4xl mx-auto relative"
      >
        <form onSubmit={handleSubmit} className="relative">
          {isProcessing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-50">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          )}
          <div className="flex items-center gap-3 p-4 md:p-5">
            <div className="flex-shrink-0 p-2.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-0 outline-none text-base md:text-lg font-medium text-gray-900 dark:text-white placeholder:text-transparent focus:placeholder:text-gray-400 dark:focus:placeholder:text-gray-500 transition-all"
                autoComplete="off"
              />
              
              {!input && (
                <div className="absolute inset-0 pointer-events-none flex items-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={placeholderIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        duration: 0.5,
                        ease: [0.4, 0.0, 0.2, 1],
                      }}
                      className="text-base md:text-lg font-medium text-gray-400 dark:text-gray-500"
                    >
                      {placeholders[placeholderIndex]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>

            <LiquidButton
              type="submit"
              variant="primary"
              disabled={!input.trim() || isProcessing}
              className="flex-shrink-0 h-11 w-11 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </LiquidButton>
          </div>
        </form>
      </GlassCard>

      {/* Smart Autocomplete Suggestions */}
      {(clientMatches.length > 0 || dateSuggestion) && (
        <div className="mt-3 space-y-2">
          {clientMatches.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center justify-center">
              <span className="text-xs text-muted-foreground">Clienti:</span>
              {clientMatches.map((name, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prev => prev + (prev.endsWith(' ') ? '' : ' ') + name)
                  }}
                  className="px-2 py-1 text-xs bg-purple-500/10 text-purple-400 rounded-md hover:bg-purple-500/20 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          
          {dateSuggestion && (
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs text-muted-foreground">Data rilevata:</span>
              <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-md">
                {format(dateSuggestion, 'dd MMM yyyy', { locale: it })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Suggestions */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <p className="w-full text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          Non sai da dove iniziare? Prova:
        </p>
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.label}
            variant="ghost"
            size="sm"
            onClick={() => {
              debouncedInputChange.cancel()
              setInput(suggestion.value)
              clearAutocomplete()
              setTimeout(() => {
                const form = document.querySelector('form') as HTMLFormElement
                form?.requestSubmit()
              }, 100)
            }}
            className="text-xs bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 border border-purple-200/50 dark:border-purple-700/50 transition-all"
          >
            {suggestion.label}
          </Button>
        ))}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          {clientMatches.length > 0 && (
            <>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Tab</kbd> accetta cliente • 
            </>
          )}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘ Enter</kbd> invia • 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> cancella
        </p>
      </div>

      <OrchestrationFeedback />

      <ContextGatheringDialog
        open={gatheringOpen}
        onOpenChange={setGatheringOpen}
        intent={currentIntent?.intent || ""}
        entities={currentIntent?.entities || {}}
        onComplete={(completeContext) => {
          console.log("✅ Contesto completo raccolto:", completeContext)
          toast.success("Contesto completo raccolto!", {
            description: "Esecuzione agent orchestration (prossimo task)...",
            duration: 5000,
          })
        }}
      />

      <TokenConsentDialog
        open={tokenConsentOpen}
        onOpenChange={setTokenConsentOpen}
        tokenCost={orchestrationResult?.tokenCost}
        contentType={currentIntent?.entities?.contentType || "post"}
        onConfirm={async () => {
          if (!orchestrationResult || !currentIntent) return
          
          const user = auth.currentUser
          if (!user || !userData) {
            toast.error("Utente non autenticato")
            return
          }

          try {
            await ContentAgentOrchestrator.executeGeneration(
              {
                intent: currentIntent.intent,
                contentType: currentIntent.entities.contentType as "post" | "reel" | "video",
                platform: currentIntent.entities.platform,
                clientId: orchestrationResult.task.clientId,
                clientName: orchestrationResult.task.clientName,
                topic: currentIntent.entities.topic || "",
                publishDate: new Date(orchestrationResult.calendarEntry.date),
                userId: user.uid,
                tenantId: userData.tenantId
              },
              orchestrationResult.calendarEntry.id,
              orchestrationResult.task.id
            )
            
            toast.success("✅ Contenuto creato e schedulato!")
            setTokenConsentOpen(false)
            setOrchestrationResult(null)
          } catch (error: any) {
            toast.error("Errore nella generazione", {
              description: error.message
            })
          }
        }}
        onCancel={() => {
          setTokenConsentOpen(false)
          setOrchestrationResult(null)
        }}
      />
    </>
  )
}
