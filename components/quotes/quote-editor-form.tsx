"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Quote } from "@/types/quote"
import { GlassCard } from "@/components/ui/glass-card"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Form } from "@/components/ui/form"
import { QuoteObjectivesSection } from "@/components/quotes/sections/quote-objectives-section"
import { QuoteActivitiesSection } from "@/components/quotes/sections/quote-activities-section"
import { QuoteItemsSection } from "@/components/quotes/sections/quote-items-section"
import { QuoteConditionsSection } from "@/components/quotes/sections/quote-conditions-section"
import { Save, Send, Loader2, Users, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateQuote } from "@/lib/quote-service"
import { useAuth } from "@/hooks/use-auth"
import { executeTransition } from "@/lib/quote-transitions"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useClients } from "@/hooks/use-clients"
import { cn } from "@/lib/utils"

const quoteFormSchema = z.object({
  clientMode: z.enum(['platform', 'external']),
  clientId: z.string().optional(),
  externalClientName: z.string().optional(),
  externalClientEmail: z.string().email("Email non valida").optional(),
  obiettivi: z.array(z.string()).min(1, "Aggiungi almeno un obiettivo"),
  attivita: z.array(z.string()).optional(),
  voci: z.array(z.object({
    descrizione: z.string().min(1, "Descrizione richiesta"),
    quantita: z.number().min(1, "Quantità min: 1"),
    prezzoUnitario: z.number().min(0, "Prezzo >= 0"),
  })).optional(),
  terminiCondizioni: z.string().optional(),
}).refine((data) => {
  if (data.clientMode === 'platform') {
    return !!data.clientId
  }
  if (data.clientMode === 'external') {
    return !!(data.externalClientName && data.externalClientEmail)
  }
  return false
}, {
  message: "Seleziona un cliente dalla piattaforma o inserisci i dati del cliente esterno",
  path: ["clientMode"]
})

type QuoteFormData = z.infer<typeof quoteFormSchema>

interface QuoteEditorFormProps {
  quote: Quote
}

export function QuoteEditorForm({ quote }: QuoteEditorFormProps) {
  const router = useRouter()
  const { userData } = useAuth()
  const { clients, loading: clientsLoading } = useClients()
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    mode: 'onChange',
    defaultValues: {
      clientMode: quote.clientId ? 'platform' : 'external',
      clientId: quote.clientId || undefined,
      externalClientName: quote.externalClientName || "",
      externalClientEmail: quote.externalClientEmail || "",
      obiettivi: quote.obiettivi || [],
      attivita: quote.attivita || [],
      voci: quote.voci || [],
      terminiCondizioni: quote.terminiCondizioni || "",
    },
  })
  
  const clientMode = form.watch("clientMode")
  
  const onSaveDraft = async (data: QuoteFormData) => {
    if (!userData?.tenantId) return
    
    setSaving(true)
    try {
      // Prepare clean payload based on client mode
      const payload: Partial<Quote> = {
        ...data,
        status: "draft",
      }
      
      // Clean opposite client fields based on mode
      if (data.clientMode === 'platform') {
        delete payload.externalClientName
        delete payload.externalClientEmail
      } else {
        delete payload.clientId
      }
      
      await updateQuote(quote.id, payload, userData.tenantId)
      
      toast.success("Bozza salvata con successo")
      router.push(`/preventivi/${quote.id}`)
    } catch (error) {
      console.error("Error saving draft:", error)
      toast.error("Errore nel salvataggio della bozza")
    } finally {
      setSaving(false)
    }
  }
  
  const onSubmit = async (data: QuoteFormData) => {
    if (!userData?.tenantId || !userData?.role) return
    
    setSending(true)
    try {
      // Prepare clean payload based on client mode
      const payload: Partial<Quote> = { ...data }
      
      // Clean opposite client fields based on mode
      if (data.clientMode === 'platform') {
        delete payload.externalClientName
        delete payload.externalClientEmail
      } else {
        delete payload.clientId
      }
      
      await updateQuote(quote.id, payload, userData.tenantId)
      
      // executeTransition now validates internally with canTransition
      await executeTransition(quote.id, 'send', userData.tenantId, userData.role)
      toast.success("Preventivo inviato con successo")
      router.push(`/preventivi/${quote.id}`)
    } catch (error) {
      console.error("Error sending quote:", error)
      const errorMessage = error instanceof Error ? error.message : "Errore nell'invio del preventivo"
      toast.error(errorMessage)
    } finally {
      setSending(false)
    }
  }
  
  return (
    <Form {...form}>
      <form className="space-y-6">
        <GlassCard variant="elevated" padding="lg">
          <Accordion type="multiple" defaultValue={["cliente", "obiettivi", "attivita", "voci", "condizioni"]} className="space-y-4">
            <AccordionItem value="cliente" className="border-0">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:no-underline">
                Dati Cliente
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  <div>
                    <Label className="mb-3 block">Tipo Cliente *</Label>
                    <RadioGroup 
                      value={clientMode} 
                      onValueChange={(value: 'platform' | 'external') => {
                        form.setValue('clientMode', value)
                        if (value === 'platform') {
                          form.setValue('externalClientName', undefined)
                          form.setValue('externalClientEmail', undefined)
                        } else {
                          form.setValue('clientId', undefined)
                        }
                      }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <label htmlFor="platform">
                        <GlassCard
                          variant="interactive"
                          padding="md"
                          className={cn(
                            "cursor-pointer transition-all duration-300",
                            clientMode === 'platform' && "border-purple-500/50 shadow-glow-purple"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value="platform" id="platform" className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-purple-500" />
                                <h4 className="font-semibold">Cliente Piattaforma</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Seleziona un cliente esistente con pagamento automatizzato Stripe
                              </p>
                            </div>
                          </div>
                        </GlassCard>
                      </label>

                      <label htmlFor="external">
                        <GlassCard
                          variant="interactive"
                          padding="md"
                          className={cn(
                            "cursor-pointer transition-all duration-300",
                            clientMode === 'external' && "border-purple-500/50 shadow-glow-purple"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value="external" id="external" className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <UserPlus className="w-5 h-5 text-blue-500" />
                                <h4 className="font-semibold">Cliente Esterno</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Inserisci nome ed email per cliente non registrato
                              </p>
                            </div>
                          </div>
                        </GlassCard>
                      </label>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {clientMode === 'platform' && (
                    <div>
                      <Label htmlFor="clientId">Seleziona Cliente *</Label>
                      <Select 
                        value={form.watch('clientId')} 
                        onValueChange={(value) => form.setValue('clientId', value)}
                      >
                        <SelectTrigger className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm">
                          <SelectValue placeholder={clientsLoading ? "Caricamento..." : "Seleziona un cliente"} />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div>
                                <div className="font-medium">{client.name}</div>
                                {client.industry && (
                                  <div className="text-xs text-muted-foreground">
                                    {client.industry}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          {clients.length === 0 && !clientsLoading && (
                            <SelectItem value="_none" disabled>
                              Nessun cliente disponibile
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        ✓ Pagamento Stripe automatico • Dati cliente precompilati
                      </p>
                      {form.formState.errors.clientMode && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {form.formState.errors.clientMode.message}
                        </p>
                      )}
                    </div>
                  )}

                  {clientMode === 'external' && (
                    <>
                      <div>
                        <Label htmlFor="externalClientName">Nome Cliente *</Label>
                        <Input
                          id="externalClientName"
                          {...form.register('externalClientName')}
                          placeholder="Mario Rossi"
                          className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                        />
                        {form.formState.errors.externalClientName && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {form.formState.errors.externalClientName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="externalClientEmail">Email Cliente *</Label>
                        <Input
                          id="externalClientEmail"
                          type="email"
                          {...form.register('externalClientEmail')}
                          placeholder="mario@azienda.it"
                          className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                        />
                        {form.formState.errors.externalClientEmail && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {form.formState.errors.externalClientEmail.message}
                          </p>
                        )}
                        {form.formState.errors.clientMode && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {form.formState.errors.clientMode.message}
                          </p>
                        )}
                      </div>
                      
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ℹ️ Cliente esterno: link approvazione pubblico, nessun pagamento automatico
                      </p>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="obiettivi" className="border-0">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:no-underline">
                Obiettivi del Progetto
              </AccordionTrigger>
              <AccordionContent>
                <QuoteObjectivesSection control={form.control} />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="attivita" className="border-0">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:no-underline">
                Attività Previste
              </AccordionTrigger>
              <AccordionContent>
                <QuoteActivitiesSection control={form.control} />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="voci" className="border-0">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:no-underline">
                Voci di Costo
              </AccordionTrigger>
              <AccordionContent>
                <QuoteItemsSection control={form.control} />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="condizioni" className="border-0">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:no-underline">
                Termini e Condizioni
              </AccordionTrigger>
              <AccordionContent>
                <QuoteConditionsSection control={form.control} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </GlassCard>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <LiquidButton
            type="button"
            variant="outline"
            onClick={form.handleSubmit(onSaveDraft)}
            disabled={saving || sending}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva Bozza
              </>
            )}
          </LiquidButton>
          
          <LiquidButton
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saving || sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Invio...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invia Preventivo
              </>
            )}
          </LiquidButton>
        </div>
      </form>
    </Form>
  )
}
