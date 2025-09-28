"use client"

import { useState } from "react"
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
import { convertToQuoteFormat, type GeneratedQuoteData } from "@/lib/ai-quote-service"
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
  Plus
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
  
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuoteData | null>(null)
  
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

  const handleGenerateQuote = async () => {
    if (!formData.projectDescription.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci almeno la descrizione del progetto",
        variant: "destructive"
      })
      return
    }

    if (!userData?.tenantId) {
      toast({
        title: "Errore",
        description: "Dati utente non disponibili",
        variant: "destructive"
      })
      return
    }

    try {
      setIsGenerating(true)
      setStep('generating')

      const response = await fetch('/api/ai/quote-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Send firebase-auth-token cookie
        body: JSON.stringify({
          ...formData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Errore nella generazione del preventivo')
      }

      const result = await response.json()
      setGeneratedQuote(result.data)
      setStep('review')
      
      toast({
        title: "Preventivo generato!",
        description: "Il preventivo è stato creato con successo dall'AI"
      })

    } catch (error) {
      console.error('Error generating quote:', error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive"
      })
      setStep('input')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveQuote = async () => {
    if (!generatedQuote || !userData?.tenantId) return

    try {
      const quoteToCreate = convertToQuoteFormat(
        generatedQuote,
        userData.tenantId,
        userData.id || userData.tenantId // Use actual user ID for createdBy
      )

      await createQuote(quoteToCreate)
      
      toast({
        title: "Preventivo salvato!",
        description: "Il preventivo è stato salvato nel sistema"
      })

      onQuoteGenerated?.(generatedQuote)
      onOpenChange(false)
      resetForm()

    } catch (error) {
      console.error('Error saving quote:', error)
      toast({
        title: "Errore nel salvataggio",
        description: "Non è stato possibile salvare il preventivo",
        variant: "destructive"
      })
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
    setStep('input')
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            Genera Preventivo con AI
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {step === 'input' && (
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Descrizione Progetto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">Descrivi il progetto o servizio richiesto *</Label>
                      <Textarea
                        id="description"
                        value={formData.projectDescription}
                        onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                        placeholder="Es: Gestione social media per azienda nel settore tech, creazione contenuti per 3 mesi, advertising su Facebook e Instagram con budget mensile di 2000€..."
                        className="mt-1 min-h-[120px]"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="requirements">Requisiti aggiuntivi</Label>
                      <Textarea
                        id="requirements"
                        value={formData.additionalRequirements}
                        onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
                        placeholder="Specifiche tecniche, preferenze creative, vincoli di budget..."
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informazioni Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clientName">Nome cliente</Label>
                        <Input
                          id="clientName"
                          value={formData.clientName}
                          onChange={(e) => handleInputChange('clientName', e.target.value)}
                          placeholder="Mario Rossi"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientEmail">Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={formData.clientEmail}
                          onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                          placeholder="mario@azienda.it"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="clientCompany">Azienda</Label>
                      <Input
                        id="clientCompany"
                        value={formData.clientCompany}
                        onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                        placeholder="Nome Azienda S.r.l."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Dettagli Progetto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budget">Budget indicativo</Label>
                        <Input
                          id="budget"
                          value={formData.budget}
                          onChange={(e) => handleInputChange('budget', e.target.value)}
                          placeholder="€5000 - €10000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deadline">Scadenza</Label>
                        <Input
                          id="deadline"
                          value={formData.deadline}
                          onChange={(e) => handleInputChange('deadline', e.target.value)}
                          placeholder="Entro fine mese"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={handleClose}>
                    Annulla
                  </Button>
                  <Button onClick={handleGenerateQuote} className="bg-pink-600 hover:bg-pink-700">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Genera Preventivo
                  </Button>
                </div>
              </div>
            </ScrollArea>
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {generatedQuote.preventivo.titolo}
                          <Badge variant="outline">
                            {generatedQuote.preventivo.numeroPreventivo}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {generatedQuote.preventivo.descrizione}
                        </p>
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
                          <p className="text-sm">{generatedQuote.condizioni.metodoPagamento}</p>
                        </div>
                        <div>
                          <Label className="font-medium">Tempi di consegna:</Label>
                          <p className="text-sm">{generatedQuote.condizioni.tempiConsegna}</p>
                        </div>
                        {generatedQuote.condizioni.garanzia && (
                          <div>
                            <Label className="font-medium">Garanzia:</Label>
                            <p className="text-sm">{generatedQuote.condizioni.garanzia}</p>
                          </div>
                        )}
                        {generatedQuote.condizioni.note && (
                          <div>
                            <Label className="font-medium">Note:</Label>
                            <p className="text-sm">{generatedQuote.condizioni.note}</p>
                          </div>
                        )}
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
                            {generatedQuote.gestioneAnnuale.costiMensili.map((costo, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                <span className="text-sm">{costo.descrizione}</span>
                                <span className="text-sm font-medium">€{costo.costo}/mese</span>
                              </div>
                            ))}
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center font-medium">
                            <span>Totale Mensile:</span>
                            <span>€{generatedQuote.gestioneAnnuale.totaleMensile}/mese</span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-lg">
                            <span>Totale Annuale:</span>
                            <span className="text-orange-600">€{generatedQuote.gestioneAnnuale.totaleAnnuale}</span>
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
                      <Card>
                        <CardHeader>
                          <CardTitle>Obiettivi del Progetto</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {generatedQuote.obiettivi.map((obiettivo, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm">{obiettivo}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {generatedQuote.attivita && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Attività Principali</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {generatedQuote.attivita.map((attivita, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm">{attivita}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {generatedQuote.sitemap && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Struttura Sito (Sitemap)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2">
                            {generatedQuote.sitemap.map((pagina, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{pagina}</span>
                              </div>
                            ))}
                          </div>
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

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('input')}>
                  <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                  Modifica
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
  )
}