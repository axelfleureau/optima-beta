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
import { Save, Send, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateQuote } from "@/lib/quote-service"
import { useAuth } from "@/hooks/use-auth"
import { executeTransition } from "@/lib/quote-transitions"

const quoteFormSchema = z.object({
  obiettivi: z.array(z.string()).min(1, "Aggiungi almeno un obiettivo"),
  attivita: z.array(z.string()).optional(),
  voci: z.array(z.object({
    descrizione: z.string().min(1, "Descrizione richiesta"),
    quantita: z.number().min(1, "Quantità min: 1"),
    prezzoUnitario: z.number().min(0, "Prezzo >= 0"),
  })).optional(),
  terminiCondizioni: z.string().optional(),
})

type QuoteFormData = z.infer<typeof quoteFormSchema>

interface QuoteEditorFormProps {
  quote: Quote
}

export function QuoteEditorForm({ quote }: QuoteEditorFormProps) {
  const router = useRouter()
  const { userData } = useAuth()
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    mode: 'onChange',
    defaultValues: {
      obiettivi: quote.obiettivi || [],
      attivita: quote.attivita || [],
      voci: quote.voci || [],
      terminiCondizioni: quote.terminiCondizioni || "",
    },
  })
  
  const onSaveDraft = async (data: QuoteFormData) => {
    if (!userData?.tenantId) return
    
    setSaving(true)
    try {
      await updateQuote(quote.id, {
        ...data,
        status: "draft",
      }, userData.tenantId)
      
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
      await updateQuote(quote.id, data, userData.tenantId)
      
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
          <Accordion type="multiple" defaultValue={["obiettivi", "attivita", "voci", "condizioni"]} className="space-y-4">
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
