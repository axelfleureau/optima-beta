"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ClientSelector } from "./client-selector"
import { PlatformSelector, type Platform } from "./platform-selector"
import { TokenConsentDialog } from "./token-consent-dialog"
import { ContentAgentOrchestrator, type OrchestrationResult } from "@/lib/services/content-agent-orchestrator"
import { useAuth } from "@/lib/auth-context"
import { useClients } from "@/hooks/use-clients"
import { useAIFeedback } from "@/hooks/use-ai-feedback"
import { cn } from "@/lib/utils"
import { normalizeFutureCommandDate } from "@/lib/utils/date-parser"

type Step = "client" | "date" | "platform" | "confirm"

function firstPlatform(value: unknown): Platform | null {
  if (Array.isArray(value)) return (value[0] as Platform) || null
  return (value as Platform) || null
}

interface ContextGatheringDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intent: string
  entities: {
    contentType?: string
    platform?: string
    clientName?: string
    clientId?: string
    topic?: string
    publishDate?: string
    quantity?: number
  }
  onComplete: (completeContext: any) => void
}

export function ContextGatheringDialog({
  open,
  onOpenChange,
  intent,
  entities,
  onComplete,
}: ContextGatheringDialogProps) {
  const { userData } = useAuth()
  const { clients } = useClients()
  const feedback = useAIFeedback()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [publishDate, setPublishDate] = useState<Date | undefined>(undefined)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [tokenConsentOpen, setTokenConsentOpen] = useState(false)
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const clientNameHint = entities?.clientName

  const getCurrentStep = (): Step => {
    if (!selectedClientId) return "client"
    if (!publishDate) return "date"
    if (!platform && (entities?.contentType === "post" || entities?.contentType === "reel" || entities?.contentType === "video")) {
      return "platform"
    }
    return "confirm"
  }

  const currentStep = getCurrentStep()

  const needsClient = !selectedClientId
  const needsDate = !publishDate
  const needsPlatform = !platform && 
    (entities?.contentType === "post" || entities?.contentType === "reel" || entities?.contentType === "video")

  const steps: Step[] = []
  if (needsClient) steps.push("client")
  if (needsDate) steps.push("date")
  if (needsPlatform) steps.push("platform")
  steps.push("confirm")

  const totalSteps = steps.length
  const currentStepIndex = steps.indexOf(currentStep)

  useEffect(() => {
    if (open) {
      const normalizedPublishDate = entities?.publishDate
        ? normalizeFutureCommandDate(entities.publishDate, "")
        : undefined

      setSelectedClientId(entities?.clientId || null)
      setSelectedClientName(entities?.clientName || null)
      setPublishDate(normalizedPublishDate ? new Date(`${normalizedPublishDate}T00:00:00`) : undefined)
      setPlatform(firstPlatform(entities?.platform))
    }
  }, [open, entities])

  const handlePreviousStep = () => {
    if (currentStep === "confirm") {
      if (needsPlatform) {
        setPlatform(null)
      } else if (needsDate) {
        setPublishDate(undefined)
      } else if (needsClient) {
        setSelectedClientId(null)
        setSelectedClientName(null)
      }
    } else if (currentStep === "platform") {
      if (needsDate) {
        setPublishDate(undefined)
      } else if (needsClient) {
        setSelectedClientId(null)
        setSelectedClientName(null)
      }
    } else if (currentStep === "date") {
      if (needsClient) {
        setSelectedClientId(null)
        setSelectedClientName(null)
      }
    }
  }

  const handleConfirm = async () => {
    if (!selectedClientId) {
      feedback.error('Validazione', 'Seleziona un cliente', 'È necessario selezionare un cliente')
      return
    }
    
    if (!publishDate) {
      feedback.error('Validazione', 'Seleziona una data di pubblicazione', 'È necessario selezionare una data')
      return
    }
    
    if ((entities?.contentType === "post" || entities?.contentType === "reel" || entities?.contentType === "video") && !platform) {
      feedback.error('Validazione', 'Seleziona una piattaforma', 'È necessario selezionare una piattaforma')
      return
    }
    
    if (!userData) {
      feedback.error('Autenticazione', 'Dati utente non disponibili', 'Ricarica la pagina')
      return
    }
    
    const client = clients.find(c => c.id === selectedClientId)
    if (!client) {
      feedback.error('Validazione', 'Cliente non valido', 'Seleziona un cliente valido')
      return
    }
    const clientName = client.name || selectedClientName || "Unknown"

    try {
      const result = await ContentAgentOrchestrator.orchestrateContentCreation({
        intent,
        contentType: (entities?.contentType || "post") as "post" | "reel" | "video",
        platform: platform || "instagram-feed-grid",
        clientId: selectedClientId,
        clientName: clientName,
        topic: entities?.topic || "contenuto",
        publishDate: publishDate,
        userId: userData.id,
        tenantId: userData.tenantId,
      })

      setOrchestrationResult(result)
      setTokenConsentOpen(true)
      onOpenChange(false)
    } catch (error) {
      console.error("Errore durante l'orchestrazione:", error)
      feedback.error(
        'Creazione task e calendario',
        error instanceof Error ? error.message : 'Errore sconosciuto',
        'Verifica i dati e riprova'
      )
    }
  }

  const handleTokenConfirm = async () => {
    if (!orchestrationResult || !userData || !selectedClientId || !publishDate) {
      return
    }

    const client = clients.find(c => c.id === selectedClientId)
    const clientName = client?.name || selectedClientName || "Unknown"

    setIsGenerating(true)
    try {
      await ContentAgentOrchestrator.executeGeneration(
        {
          intent,
          contentType: (entities?.contentType || "post") as "post" | "reel" | "video",
          platform: platform || "instagram-feed-grid",
          clientId: selectedClientId,
          clientName: clientName,
          topic: entities?.topic || "contenuto",
          publishDate: publishDate,
          userId: userData.id,
          tenantId: userData.tenantId,
        },
        orchestrationResult.calendarEntry.id,
        orchestrationResult.task.id
      )

      feedback.success('Contenuto creato e schedulato', {
        clientName: clientName,
        taskName: `${entities?.contentType || "contenuto"} - ${entities?.topic || ""}`
      })

      setTokenConsentOpen(false)
      setOrchestrationResult(null)

      const completeContext = {
        intent,
        entities: {
          ...entities,
          clientId: selectedClientId,
          clientName: clientName,
          publishDate: publishDate ? format(publishDate, "yyyy-MM-dd") : undefined,
          platform: platform,
        },
      }
      onComplete(completeContext)
    } catch (error) {
      console.error("Errore durante la generazione:", error)
      feedback.error(
        'Generazione contenuto',
        error instanceof Error ? error.message : 'Errore sconosciuto',
        'Verifica i token disponibili e riprova'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTokenCancel = () => {
    setTokenConsentOpen(false)
    setOrchestrationResult(null)
  }

  const canProceed = () => {
    if (currentStep === "client") return selectedClientId !== null
    if (currentStep === "date") return publishDate !== undefined
    if (currentStep === "platform") return platform !== null
    return true
  }

  const getContentTypeLabel = () => {
    const type = entities?.contentType || "contenuto"
    const labels: Record<string, string> = {
      post: "post",
      reel: "reel",
      video: "video",
      story: "story",
      carosello: "carosello",
    }
    return labels[type] || type
  }

  const animationProps = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: "easeInOut" as const },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white/80 dark:bg-black/50 backdrop-blur-lg border border-white/40 dark:border-white/20 shadow-glass-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Completa i Dettagli
          </DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} di {totalSteps}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[300px] mt-4">
          <AnimatePresence mode="wait">
            {currentStep === "client" && (
              <motion.div key="client" {...animationProps} className="space-y-4">
                <Label className="text-base font-semibold">Per quale cliente?</Label>
                <ClientSelector
                  value={selectedClientId}
                  onChange={(id, name) => {
                    setSelectedClientId(id)
                    setSelectedClientName(name)
                  }}
                  filterHint={clientNameHint}
                />
              </motion.div>
            )}

            {currentStep === "date" && (
              <motion.div key="date" {...animationProps} className="space-y-4">
                <Label className="text-base font-semibold">Quando vuoi pubblicarlo?</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <GlassButton
                      variant="glass"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !publishDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {publishDate ? (
                        format(publishDate, "dd MMMM yyyy", { locale: it })
                      ) : (
                        <span>Seleziona data</span>
                      )}
                    </GlassButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white/90 dark:bg-black/70 backdrop-blur-lg border-white/40 dark:border-white/20">
                    <Calendar
                      mode="single"
                      selected={publishDate}
                      onSelect={setPublishDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex justify-between pt-4">
                  <GlassButton
                    variant="ghost"
                    onClick={handlePreviousStep}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Indietro
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {currentStep === "platform" && (
              <motion.div key="platform" {...animationProps} className="space-y-4">
                <Label className="text-base font-semibold">Su quale piattaforma?</Label>
                <PlatformSelector
                  selected={platform || "instagram"}
                  onChange={setPlatform}
                />
                <div className="flex justify-between pt-4">
                  <GlassButton
                    variant="ghost"
                    onClick={handlePreviousStep}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Indietro
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {currentStep === "confirm" && (
              <motion.div key="confirm" {...animationProps} className="space-y-4">
                <GlassCard variant="gradient" padding="lg">
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Ho capito tutto!
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Creerò{" "}
                      <span className="font-semibold text-foreground">
                        {entities?.quantity && entities.quantity > 1
                          ? `${entities.quantity} ${getContentTypeLabel()}`
                          : `un ${getContentTypeLabel()}`}
                      </span>
                      {selectedClientName && (
                        <>
                          {" "}per{" "}
                          <span className="font-semibold text-foreground">
                            {selectedClientName}
                          </span>
                        </>
                      )}
                      {entities?.topic && (
                        <>
                          {" "}su{" "}
                          <span className="font-semibold text-foreground">
                            {entities.topic}
                          </span>
                        </>
                      )}
                      {publishDate && (
                        <>
                          , da pubblicare il{" "}
                          <span className="font-semibold text-foreground">
                            {format(publishDate, "dd MMMM yyyy", { locale: it })}
                          </span>
                        </>
                      )}
                      {platform && (
                        <>
                          {" "}su{" "}
                          <span className="font-semibold text-foreground capitalize">
                            {platform}
                          </span>
                        </>
                      )}
                      .
                    </p>
                  </div>
                </GlassCard>

                <div className="flex justify-between pt-4">
                  <GlassButton variant="ghost" onClick={handlePreviousStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Modifica
                  </GlassButton>
                  <GlassButton onClick={handleConfirm} className="min-w-[160px]">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Conferma e Crea
                  </GlassButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6">
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  index <= currentStepIndex
                    ? "bg-gradient-to-r from-purple-500 to-pink-600 shadow-glow-purple/50"
                    : "bg-white/30 dark:bg-black/30"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>

      <TokenConsentDialog
        open={tokenConsentOpen}
        onOpenChange={setTokenConsentOpen}
        tokenCost={orchestrationResult?.tokenCost}
        contentType={entities?.contentType || "post"}
        onConfirm={handleTokenConfirm}
        onCancel={handleTokenCancel}
      />
    </Dialog>
  )
}
