"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useQuotes } from "@/hooks/use-quotes"
import { useAIActionState } from "@/hooks/use-ai-action-state"
import { useAIFeedback } from "@/hooks/use-ai-feedback"
import { convertToQuoteFormat, type GeneratedQuoteData } from "@/lib/ai-quote-service"
import { downloadQuotePDF } from "@/lib/pdf-generator"
import { PromptEnrichmentDialog, type EnrichedPromptData } from "@/components/quotes/prompt-enrichment-dialog"
import {
  Wand2,
  FileText,
  User,
  Euro,
  Calendar,
  Download,
  Save,
  Loader2,
  Sparkles,
  ChevronRight,
  Plus,
  Pencil,
  Check,
  X
} from "lucide-react"

interface AIQuoteGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuoteGenerated?: (quote: any) => void
}

interface QuoteFormData {
  projectDescription: string
  clientName: string
  clientEmail: string
  clientCompany: string
  budget: string
  deadline: string
  additionalRequirements: string
}

export function AIQuoteGenerator({ open, onOpenChange, onQuoteGenerated }: AIQuoteGeneratorProps) {
  const { toast } = useToast()
  const { userData } = useAuth()
  const { createQuote } = useQuotes()
  const actionState = useAIActionState('quote-gen')
  const feedback = useAIFeedback()
  
  const [step, setStep] = useState<'enrichment' | 'generating' | 'review'>('enrichment')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuoteData | null>(null)
  const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false)
  
  const [editMode, setEditMode] = useState<{
    obiettivi?: boolean
    attivita?: boolean
    sitemap?: boolean
    descrizione?: boolean
  }>({})
  const [editedData, setEditedData] = useState<Partial<GeneratedQuoteData>>({})
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [enrichedContext, setEnrichedContext] = useState<EnrichedPromptData | null>(null)

  useEffect(() => {
    if (open && step === 'enrichment') {
      setEnrichmentDialogOpen(true)
    }
  }, [open, step])
  
  const [formData, setFormData] = useState<QuoteFormData>({
    projectDescription: '',
    clientName: '',
    clientEmail: '',
    clientCompany: '',
    budget: '',
    deadline: '',
    additionalRequirements: ''
  })

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEnrichmentComplete = async (enrichedData: EnrichedPromptData) => {
    if (!userData?.tenantId) {
      feedback.error('Autenticazione', 'Dati utente non disponibili', 'Ricarica la pagina o effettua nuovamente il login')
      return
    }

    try {
      actionState.start('Raccolta dati preventivo...')
      setIsGenerating(true)
      setStep('generating')
      setEnrichmentDialogOpen(false)
      setEnrichedContext(enrichedData)

      actionState.callAI('Generazione preventivo AI...')
      const response = await fetch('/api/ai/quote-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectDescription: enrichedData.description,
          clientName: enrichedData.clientName,
          clientEmail: enrichedData.clientEmail || '',
          clientCompany: enrichedData.clientCompany || '',
          budget: `${enrichedData.budgetRange.min}-${enrichedData.budgetRange.max}`,
          deadline: enrichedData.timeline,
          additionalRequirements: enrichedData.additionalNotes || '',
          projectType: enrichedData.projectType,
          projectTypeLabel: enrichedData.projectTypeLabel,
          sector: enrichedData.sector,
          sectorLabel: enrichedData.sectorLabel,
          complexity: enrichedData.complexity
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Errore nella generazione del preventivo')
      }

      const result = await response.json()
      setGeneratedQuote(result.data)
      
      actionState.apply('Preparazione anteprima...')
      setStep('review')
      
      actionState.complete()
      feedback.success('Preventivo generato', {
        quoteName: result.data.preventivo.titolo,
        amount: result.data.totali.totale * 100
      })

    } catch (error) {
      console.error('Error generating quote:', error)
      actionState.error(error instanceof Error ? error.message : 'Errore sconosciuto')
      feedback.error(
        'Generazione preventivo',
        error instanceof Error ? error.message : 'Errore sconosciuto',
        'Controlla i dati inseriti e riprova'
      )
      setStep('enrichment')
      setEnrichmentDialogOpen(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveQuote = async () => {
    if (!generatedQuote || !userData?.tenantId || !enrichedContext) return

    try {
      // Prepare client mode data based on enrichment context
      const clientMode = enrichedContext.clientMode === 'platform' && enrichedContext.clientId
        ? { clientId: enrichedContext.clientId }
        : {
            externalClientName: enrichedContext.clientName,
            externalClientEmail: enrichedContext.clientEmail || ''
          }

      const quoteToCreate = convertToQuoteFormat(
        generatedQuote,
        userData.tenantId,
        userData.id || userData.tenantId,
        clientMode
      )

      await createQuote(quoteToCreate)
      
      feedback.success('Preventivo salvato', {
        quoteName: generatedQuote.preventivo.titolo
      })

      onQuoteGenerated?.(generatedQuote)
      onOpenChange(false)
      resetForm()

    } catch (error) {
      console.error('Error saving quote:', error)
      feedback.error(
        'Salvataggio preventivo',
        'Non è stato possibile salvare il preventivo',
        'Riprova o contatta il supporto'
      )
    }
  }

  const handleDownloadPDF = () => {
    if (!generatedQuote) return

    try {
      downloadQuotePDF(generatedQuote)
      feedback.success('PDF generato', {
        quoteName: generatedQuote.preventivo.titolo
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      feedback.error(
        'Generazione PDF',
        'Non è stato possibile generare il PDF',
        'Verifica i dati del preventivo'
      )
    }
  }

  const toggleEditMode = (section: 'obiettivi' | 'attivita' | 'sitemap' | 'descrizione') => {
    const isCurrentlyEditing = editMode[section]
    
    if (isCurrentlyEditing) {
      if (generatedQuote) {
        if (section === 'descrizione' && editedData.preventivo) {
          setGeneratedQuote({
            ...generatedQuote,
            preventivo: {
              ...generatedQuote.preventivo,
              descrizione: editedData.preventivo.descrizione
            }
          })
        } else if (editedData[section] !== undefined) {
          setGeneratedQuote({
            ...generatedQuote,
            [section]: editedData[section]
          })
        }
        feedback.success('Modifiche salvate', {})
      }
      setEditMode({ ...editMode, [section]: false })
      setEditedData({ ...editedData, [section]: undefined, preventivo: undefined })
    } else {
      setEditMode({ ...editMode, [section]: true })
      if (generatedQuote) {
        if (section === 'descrizione') {
          setEditedData({
            ...editedData,
            preventivo: {
              ...generatedQuote.preventivo,
              descrizione: generatedQuote.preventivo.descrizione
            }
          })
        } else {
          setEditedData({
            ...editedData,
            [section]: generatedQuote[section]
          })
        }
      }
    }
  }

  const cancelEdit = (section: 'obiettivi' | 'attivita' | 'sitemap' | 'descrizione') => {
    setEditMode({ ...editMode, [section]: false })
    if (section === 'descrizione') {
      setEditedData({ ...editedData, [section]: undefined, preventivo: undefined })
    } else {
      setEditedData({ ...editedData, [section]: undefined })
    }
  }

  const handleRegenerateSection = async (section: 'obiettivi' | 'attivita' | 'sitemap' | 'descrizione') => {
    if (!generatedQuote || !enrichedContext) return
    
    try {
      setIsRegenerating(true)
      actionState.start(`Rigenerazione ${section}...`)
      
      const sectionLabels: Record<string, string> = {
        obiettivi: 'obiettivi',
        attivita: 'attività',
        sitemap: 'sitemap',
        descrizione: 'descrizione'
      }
      
      const response = await fetch('/api/ai/quote-regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section,
          context: {
            projectDescription: enrichedContext.description,
            sector: enrichedContext.sector,
            projectType: enrichedContext.projectType,
            projectTypeLabel: enrichedContext.projectTypeLabel,
            sectorLabel: enrichedContext.sectorLabel,
            currentData: generatedQuote[section]
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nella rigenerazione')
      }

      const result = await response.json()
      
      if (section === 'descrizione') {
        setGeneratedQuote({
          ...generatedQuote,
          preventivo: {
            ...generatedQuote.preventivo,
            descrizione: result.data
          }
        })
      } else {
        setGeneratedQuote({
          ...generatedQuote,
          [section]: result.data
        })
      }
      
      actionState.complete()
      feedback.success(`${sectionLabels[section]} rigenerati con successo`, {})
      
    } catch (error) {
      console.error('Error regenerating section:', error)
      actionState.error(error instanceof Error ? error.message : 'Errore sconosciuto')
      feedback.error(
        'Rigenerazione sezione',
        error instanceof Error ? error.message : 'Errore nella rigenerazione',
        'Riprova o modifica manualmente'
      )
    } finally {
      setIsRegenerating(false)
    }
  }

  const resetForm = () => {
    setFormData({
      projectDescription: '',
      clientName: '',
      clientEmail: '',
      clientCompany: '',
      budget: '',
      deadline: '',
      additionalRequirements: ''
    })
    setGeneratedQuote(null)
    setStep('enrichment')
    setEnrichmentDialogOpen(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleOpenEnrichmentDialog = () => {
    setEnrichmentDialogOpen(true)
  }

  return (
    <>
      <PromptEnrichmentDialog
        open={open && enrichmentDialogOpen}
        onOpenChange={(isOpen) => {
          setEnrichmentDialogOpen(isOpen)
          if (!isOpen && step === 'enrichment') {
            onOpenChange(false)
          }
        }}
        onComplete={handleEnrichmentComplete}
      />

      <Dialog open={open && !enrichmentDialogOpen && step !== 'enrichment'} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Preventivo Generato con AI
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden">
            {step === 'enrichment' && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] max-h-[60vh] space-y-6">
                <div className="text-center space-y-4">
                  <Sparkles className="w-16 h-16 text-pink-500 mx-auto" />
                  <h3 className="text-xl font-semibold">Inizia a creare il tuo preventivo</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Raccogli le informazioni essenziali per generare un preventivo accurato basato sui template Righello
                  </p>
                  <Button onClick={handleOpenEnrichmentDialog} className="bg-pink-600 hover:bg-pink-700 mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Inizia Raccolta Dati
                  </Button>
                </div>
              </div>
            )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] max-h-[60vh] space-y-6">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                <Sparkles className="w-6 h-6 text-pink-300 absolute -top-2 -right-2 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Generazione preventivo in corso...</h3>
                <p className="text-sm text-muted-foreground">
                  L'AI sta analizzando i tuoi input e creando un preventivo professionale
                </p>
              </div>
            </div>
          )}

          {step === 'review' && generatedQuote && (
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Riepilogo</TabsTrigger>
                <TabsTrigger value="project">Progetto</TabsTrigger>
                <TabsTrigger value="details">Dettagli</TabsTrigger>
                <TabsTrigger value="client">Cliente</TabsTrigger>
                <TabsTrigger value="legal">Legale</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <ScrollArea className="h-full max-h-[50vh]">
                  <div className="space-y-6">
                    <Card className={editMode.descrizione ? "border-pink-500" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            {generatedQuote.preventivo.titolo}
                            <Badge variant="outline">
                              {generatedQuote.preventivo.numeroPreventivo}
                            </Badge>
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleRegenerateSection('descrizione')}
                              disabled={isRegenerating || editMode.descrizione}
                              className="hover:bg-pink-100 dark:hover:bg-pink-900"
                            >
                              <Wand2 className="w-4 h-4 mr-1" />
                              Rigenera
                            </Button>
                            {editMode.descrizione ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => cancelEdit('descrizione')}
                                  className="hover:bg-red-100 dark:hover:bg-red-900"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toggleEditMode('descrizione')}
                                  className="bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleEditMode('descrizione')}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {editMode.descrizione ? (
                          <Textarea
                            value={(editedData.preventivo?.descrizione as string) || generatedQuote.preventivo.descrizione}
                            onChange={(e) => setEditedData({
                              ...editedData,
                              preventivo: {
                                ...generatedQuote.preventivo,
                                descrizione: e.target.value
                              }
                            })}
                            className="min-h-[100px] text-sm"
                            placeholder="Descrizione del preventivo..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mb-4">
                            {generatedQuote.preventivo.descrizione}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-2xl font-bold">
                          <span>Totale:</span>
                          <span className="text-green-600">
                            €{generatedQuote.totali.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          IVA {generatedQuote.totali.percentualeIva}% inclusa
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Voci di costo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {generatedQuote.voci.map((voce, index) => (
                            <div key={index} className="flex justify-between items-start p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                              <div className="flex-1">
                                <h4 className="font-medium">{voce.descrizione}</h4>
                                <p className="text-sm text-muted-foreground">{voce.categoria}</p>
                                <p className="text-xs text-muted-foreground">
                                  {voce.quantita} x €{voce.prezzoUnitario.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  €{voce.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <ScrollArea className="h-full max-h-[50vh]">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Condizioni</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="font-medium">Metodo di pagamento:</Label>
                          <p className="text-sm">{generatedQuote.condizioni.paymentTerms}</p>
                        </div>
                        <div>
                          <Label className="font-medium">Variazione costi:</Label>
                          <p className="text-sm">Fino a +{generatedQuote.condizioni.costVariation}%</p>
                        </div>
                        <div>
                          <Label className="font-medium">Penale cancellazione:</Label>
                          <p className="text-sm">{generatedQuote.condizioni.cancellationPenalty}% del totale</p>
                        </div>
                        <div>
                          <Label className="font-medium">Validità:</Label>
                          <p className="text-sm">{generatedQuote.condizioni.validityDays} giorni</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Dettaglio Economico</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Subtotale:</span>
                          <span>€{generatedQuote.totali.subtotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {generatedQuote.totali.sconto && (
                          <div className="flex justify-between text-red-600">
                            <span>Sconto ({generatedQuote.totali.percentualeSconto}%):</span>
                            <span>-€{generatedQuote.totali.sconto.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>IVA ({generatedQuote.totali.percentualeIva}%):</span>
                          <span>€{generatedQuote.totali.iva.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Totale:</span>
                          <span>€{generatedQuote.totali.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {generatedQuote.gestioneAnnuale && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Gestione Annuale</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            {generatedQuote.gestioneAnnuale.items.map((item, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                <span className="text-sm">{item.description}</span>
                                <span className="text-sm font-medium">€{item.monthly}/mese</span>
                              </div>
                            ))}
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center font-medium">
                            <span>Totale Mensile:</span>
                            <span>€{generatedQuote.gestioneAnnuale.totalMonthly}/mese</span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-lg">
                            <span>Totale Annuale:</span>
                            <span className="text-orange-600">€{generatedQuote.gestioneAnnuale.totalAnnual}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="client" className="mt-4">
                <ScrollArea className="h-full max-h-[50vh]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informazioni Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Nome:</Label>
                          <p className="text-sm">{generatedQuote.cliente.nome}</p>
                        </div>
                        {generatedQuote.cliente.email && (
                          <div>
                            <Label className="font-medium">Email:</Label>
                            <p className="text-sm">{generatedQuote.cliente.email}</p>
                          </div>
                        )}
                      </div>
                      {generatedQuote.cliente.azienda && (
                        <div>
                          <Label className="font-medium">Azienda:</Label>
                          <p className="text-sm">{generatedQuote.cliente.azienda}</p>
                        </div>
                      )}
                      {generatedQuote.cliente.telefono && (
                        <div>
                          <Label className="font-medium">Telefono:</Label>
                          <p className="text-sm">{generatedQuote.cliente.telefono}</p>
                        </div>
                      )}
                      {generatedQuote.cliente.indirizzo && (
                        <div>
                          <Label className="font-medium">Indirizzo:</Label>
                          <p className="text-sm">{generatedQuote.cliente.indirizzo}</p>
                        </div>
                      )}
                      {generatedQuote.cliente.partitaIva && (
                        <div>
                          <Label className="font-medium">Partita IVA:</Label>
                          <p className="text-sm">{generatedQuote.cliente.partitaIva}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="project" className="mt-4">
                <ScrollArea className="h-full max-h-[50vh]">
                  <div className="space-y-6">
                    {generatedQuote.preventivo.settore && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Settore e Timeline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="font-medium">Settore identificato:</Label>
                            <p className="text-sm">{generatedQuote.preventivo.settore}</p>
                          </div>
                          {generatedQuote.preventivo.timeline && (
                            <div>
                              <Label className="font-medium">Timeline progetto:</Label>
                              <p className="text-sm">{generatedQuote.preventivo.timeline}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {generatedQuote.obiettivi && (
                      <Card className={editMode.obiettivi ? "border-pink-500" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <CardTitle>Obiettivi del Progetto</CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleRegenerateSection('obiettivi')}
                              disabled={isRegenerating || editMode.obiettivi}
                              className="hover:bg-pink-100 dark:hover:bg-pink-900"
                            >
                              <Wand2 className="w-4 h-4 mr-1" />
                              Rigenera
                            </Button>
                            {editMode.obiettivi ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => cancelEdit('obiettivi')}
                                  className="hover:bg-red-100 dark:hover:bg-red-900"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toggleEditMode('obiettivi')}
                                  className="bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleEditMode('obiettivi')}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editMode.obiettivi ? (
                            <Textarea
                              value={(editedData.obiettivi as string[] || generatedQuote.obiettivi).join('\n')}
                              onChange={(e) => setEditedData({
                                ...editedData,
                                obiettivi: e.target.value.split('\n').filter(line => line.trim())
                              })}
                              className="min-h-[150px] font-mono text-sm"
                              placeholder="Un obiettivo per riga..."
                            />
                          ) : (
                            <ul className="space-y-2">
                              {generatedQuote.obiettivi.map((obiettivo, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-sm">{obiettivo}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {generatedQuote.attivita && (
                      <Card className={editMode.attivita ? "border-pink-500" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <CardTitle>Attività Principali</CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleRegenerateSection('attivita')}
                              disabled={isRegenerating || editMode.attivita}
                              className="hover:bg-pink-100 dark:hover:bg-pink-900"
                            >
                              <Wand2 className="w-4 h-4 mr-1" />
                              Rigenera
                            </Button>
                            {editMode.attivita ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => cancelEdit('attivita')}
                                  className="hover:bg-red-100 dark:hover:bg-red-900"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toggleEditMode('attivita')}
                                  className="bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleEditMode('attivita')}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editMode.attivita ? (
                            <Textarea
                              value={(editedData.attivita as string[] || generatedQuote.attivita).join('\n')}
                              onChange={(e) => setEditedData({
                                ...editedData,
                                attivita: e.target.value.split('\n').filter(line => line.trim())
                              })}
                              className="min-h-[150px] font-mono text-sm"
                              placeholder="Un'attività per riga..."
                            />
                          ) : (
                            <ul className="space-y-2">
                              {generatedQuote.attivita.map((attivita, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-sm">{attivita}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {generatedQuote.sitemap && (
                      <Card className={editMode.sitemap ? "border-pink-500" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <CardTitle>Struttura Sito (Sitemap)</CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleRegenerateSection('sitemap')}
                              disabled={isRegenerating || editMode.sitemap}
                              className="hover:bg-pink-100 dark:hover:bg-pink-900"
                            >
                              <Wand2 className="w-4 h-4 mr-1" />
                              Rigenera
                            </Button>
                            {editMode.sitemap ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => cancelEdit('sitemap')}
                                  className="hover:bg-red-100 dark:hover:bg-red-900"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toggleEditMode('sitemap')}
                                  className="bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleEditMode('sitemap')}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editMode.sitemap ? (
                            <Textarea
                              value={(editedData.sitemap as string[] || generatedQuote.sitemap).join('\n')}
                              onChange={(e) => setEditedData({
                                ...editedData,
                                sitemap: e.target.value.split('\n').filter(line => line.trim())
                              })}
                              className="min-h-[150px] font-mono text-sm"
                              placeholder="Una pagina per riga..."
                            />
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {generatedQuote.sitemap.map((pagina, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">{pagina}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="legal" className="mt-4">
                <ScrollArea className="h-full max-h-[50vh]">
                  <div className="space-y-6">
                    {generatedQuote.sezioniStandard && (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle>Utilizzo Materiali</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {generatedQuote.sezioniStandard.utilizzoMateriali}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Variazione Costi</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                              {generatedQuote.sezioniStandard.variazioneCosti}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Oggetto del Contratto</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                              {generatedQuote.sezioniStandard.oggettoContratto}
                            </p>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => { setStep('enrichment'); setEnrichmentDialogOpen(true); }}>
                  <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                  Modifica
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadPDF}
                  className="border-pink-200 text-pink-700 hover:bg-pink-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Scarica PDF
                </Button>
                <Button onClick={handleSaveQuote} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salva Preventivo
                </Button>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}