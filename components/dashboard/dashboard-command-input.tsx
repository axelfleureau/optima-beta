"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { ContextGatheringDialog } from "@/components/content-agent/context-gathering-dialog"
import { TokenConsentDialog } from "@/components/content-agent/token-consent-dialog"
import { ContentAgentOrchestrator, type OrchestrationResult } from "@/lib/services/content-agent-orchestrator"
import { auth } from "@/lib/firebase"
import type { CommandContext, NLPResponse } from "@/lib/types"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isProcessing) return

    if (!userData?.tenantId || !userData?.id) {
      toast.error("Errore", {
        description: "Dati utente non disponibili",
      })
      return
    }

    setIsProcessing(true)
    
    const context: CommandContext = {
      tenantId: userData.tenantId,
      userId: userData.id,
      userRole: userData.role,
      availableClients: clients || [],
      availableUsers: users || [],
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

      if (nlpResponse.intent.startsWith("CREATE_CONTENT_")) {
        const needsClient = !nlpResponse.entities?.clientName && !nlpResponse.entities?.clientId
        const needsDate = !nlpResponse.entities?.publishDate
        const needsPlatform = !nlpResponse.entities?.platform && 
          (nlpResponse.entities?.contentType === "post" || 
           nlpResponse.entities?.contentType === "reel" || 
           nlpResponse.entities?.contentType === "video")

        if (needsClient || needsDate || needsPlatform) {
          setCurrentIntent({ intent: nlpResponse.intent, entities: nlpResponse.entities })
          setGatheringOpen(true)
          toast.info("Raccolgo informazioni mancanti...", {
            description: "Compila i dettagli nel dialog",
          })
        } else {
          // ✅ FIX: HAS ALL PARAMS → TRIGGER ORCHESTRATION DIRECTLY
          const user = auth.currentUser
          if (!user) {
            toast.error("Utente non autenticato")
            return
          }

          // Resolve client from clientName
          const client = clients?.find(c => 
            c.name.toLowerCase() === nlpResponse.entities.clientName.toLowerCase()
          )
          
          if (!client) {
            toast.error("Cliente non trovato", {
              description: `"${nlpResponse.entities.clientName}" non esiste nel workspace`
            })
            return
          }
          
          // Call orchestrator with complete context
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
            
            // Store intent for token consent dialog
            setCurrentIntent({ intent: nlpResponse.intent, entities: nlpResponse.entities })
            
            // Show token consent dialog
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
    } catch (error: any) {
      console.error("❌ NLP API error:", error)
      toast.error("Errore nell'elaborazione del comando", {
        description: error.message || "Riprova",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      <GlassCard
        variant="elevated"
        glow="subtle"
        padding="none"
        className="w-full max-w-4xl mx-auto"
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-3 p-4 md:p-5">
            <div className="flex-shrink-0 p-2.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
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

            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isProcessing}
              className="flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      </GlassCard>

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
