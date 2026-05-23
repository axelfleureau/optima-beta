"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Globe, 
  Video, 
  Megaphone, 
  ChevronRight, 
  ChevronLeft,
  Building,
  Stethoscope,
  Hotel,
  Palette,
  Trophy,
  Home,
  Check,
  Edit2,
  Euro,
  Users,
  UserPlus,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SECTOR_TEMPLATES } from "@/lib/quote-templates"
import { useClients } from "@/hooks/use-clients"
import { 
  WEBSITE_180_TEMPLATE, 
  WEBSITE_360_TEMPLATE, 
  VIDEO_PACKAGES_TEMPLATE,
  COMMUNICATION_150_TEMPLATE,
  COMMUNICATION_180_TEMPLATE
} from "@/lib/righello-project-templates"

export interface EnrichedPromptData {
  projectType: string
  projectTypeLabel: string
  sector: string
  sectorLabel: string
  description: string
  budgetRange: { min: number; max: number }
  complexity: 'basic' | 'standard' | 'advanced'
  timeline: string
  
  // DUAL CLIENT MODE
  clientMode: 'platform' | 'external'
  
  // Platform Client fields (used when clientMode === 'platform')
  clientId?: string
  
  // External Client fields (used when clientMode === 'external')
  clientName: string
  clientEmail?: string
  clientCompany?: string
  
  additionalNotes?: string
}

interface PromptEnrichmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (enrichedData: EnrichedPromptData) => void | Promise<void>
}

const PROJECT_TYPES = [
  {
    id: 'website_180',
    label: 'Website "A 180°"',
    description: 'Sito web base/semplificato',
    icon: Globe,
    template: WEBSITE_180_TEMPLATE,
    priceLabel: '€3.500'
  },
  {
    id: 'website_360',
    label: 'Website "A 360°"',
    description: 'Sito web avanzato/integrazioni',
    icon: Globe,
    template: WEBSITE_360_TEMPLATE,
    priceLabel: '€6.170'
  },
  {
    id: 'video_packages',
    label: 'Video Production',
    description: 'Pacchetti foto/video',
    icon: Video,
    template: VIDEO_PACKAGES_TEMPLATE,
    priceLabel: '€300-1.190'
  },
  {
    id: 'communication_150',
    label: 'Piano Comunicazione "A 150°"',
    description: 'Documentazione cantieri/progetti',
    icon: Megaphone,
    template: COMMUNICATION_150_TEMPLATE,
    priceLabel: '€4.000'
  },
  {
    id: 'communication_180',
    label: 'Piano Comunicazione "A 180°"',
    description: 'Strategia completa digitale',
    icon: Megaphone,
    template: COMMUNICATION_180_TEMPLATE,
    priceLabel: '€3.500-5.000'
  }
]

const SECTOR_ICONS: Record<string, any> = {
  edilizia: Building,
  medicina: Stethoscope,
  hospitality: Hotel,
  creativi: Palette,
  sport: Trophy,
  immobiliare: Home
}

const COMPLEXITY_OPTIONS = [
  { value: 'basic', label: 'Basic', description: 'Soluzione semplificata' },
  { value: 'standard', label: 'Standard', description: 'Funzionalità complete' },
  { value: 'advanced', label: 'Advanced', description: 'Personalizzazioni avanzate' }
]

const TIMELINE_OPTIONS = [
  { value: '4-8 settimane', label: '4-8 settimane' },
  { value: '8-12 settimane', label: '8-12 settimane' },
  { value: '12-16 settimane', label: '12-16 settimane' },
  { value: '16+ settimane', label: '16+ settimane' }
]

export function PromptEnrichmentDialog({ open, onOpenChange, onComplete }: PromptEnrichmentDialogProps) {
  const { clients, loading: clientsLoading } = useClients()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleting, setIsCompleting] = useState(false)
  const [formData, setFormData] = useState<Partial<EnrichedPromptData>>({
    budgetRange: { min: 3000, max: 10000 },
    complexity: 'standard',
    timeline: '8-12 settimane',
    clientMode: 'external' // Default to external client mode
  })

  useEffect(() => {
    if (open) {
      setCurrentStep(1)
    }
  }, [open])

  const selectedProjectType = PROJECT_TYPES.find(pt => pt.id === formData.projectType)
  const selectedSector = SECTOR_TEMPLATES.find(s => s.id === formData.sector)

  const isStep1Valid = !!formData.projectType
  const isStep2Valid = !!formData.sector
  const isStep3Valid = formData.description && formData.description.length >= 50 &&
    (formData.budgetRange?.min || 0) >= 1000 && (formData.budgetRange?.min || 0) <= 20000 &&
    (formData.budgetRange?.max || 0) >= 1000 && (formData.budgetRange?.max || 0) <= 20000
  const isStep4Valid = formData.clientMode === 'platform' 
    ? !!formData.clientId 
    : !!(formData.clientName && formData.clientEmail)

  const resetFormData = () => {
    setFormData({
      budgetRange: { min: 3000, max: 10000 },
      complexity: 'standard',
      timeline: '8-12 settimane',
      clientMode: 'external'
    })
    setCurrentStep(1)
  }

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      if (isStep4Valid && formData.projectType && formData.sector && formData.description) {
        setIsCompleting(true)
        const enrichedData: EnrichedPromptData = {
          projectType: formData.projectType,
          projectTypeLabel: selectedProjectType?.label || '',
          sector: formData.sector,
          sectorLabel: selectedSector?.name || '',
          description: formData.description,
          budgetRange: formData.budgetRange || { min: 3000, max: 10000 },
          complexity: formData.complexity || 'standard',
          timeline: formData.timeline || '8-12 settimane',
          clientMode: formData.clientMode || 'external',
          clientId: formData.clientId,
          clientName: formData.clientName || '',
          clientEmail: formData.clientEmail,
          clientCompany: formData.clientCompany,
          additionalNotes: formData.additionalNotes
        }
        try {
          await Promise.resolve(onComplete(enrichedData))
          resetFormData()
        } finally {
          setIsCompleting(false)
        }
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 1: return isStep1Valid
      case 2: return isStep2Valid
      case 3: return isStep3Valid
      case 4: return isStep4Valid && !isCompleting
      default: return false
    }
  }

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isCompleting) return
        if (!isOpen) resetFormData()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 bg-white/90 dark:bg-black/75 backdrop-blur-xl border border-white/30 dark:border-white/10 sm:h-auto sm:max-h-[90dvh]">
        <DialogHeader className="flex-shrink-0 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle className="pr-8 text-xl text-gray-900 dark:text-white sm:text-2xl">
            Raccolta Informazioni Preventivo
          </DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={cn(
                  "h-2 rounded-full flex-1 transition-all duration-300",
                  currentStep >= step 
                    ? "bg-righello-pink" 
                    : "bg-white/40 dark:bg-black/40"
                )} />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep}/4
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 sm:px-6">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="pb-6"
            >
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      ⚡ Tipo Progetto
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Seleziona il tipo di progetto che desideri realizzare
                    </p>
                  </div>
                  
                  <RadioGroup 
                    value={formData.projectType} 
                    onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {PROJECT_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <label key={type.id} htmlFor={type.id}>
                          <GlassCard
                            variant="interactive"
                            padding="md"
                            className={cn(
                              "cursor-pointer transition-all duration-300",
                              formData.projectType === type.id && "border-purple-500/50 shadow-glow-purple"
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon className="w-5 h-5 text-purple-500" />
                                  <h4 className="font-semibold">{type.label}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                                  <Euro className="w-3 h-3 mr-1" />
                                  {type.priceLabel}
                                </Badge>
                              </div>
                            </div>
                          </GlassCard>
                        </label>
                      )
                    })}
                  </RadioGroup>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      🏢 Settore Cliente
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Seleziona il settore di attività del cliente
                    </p>
                  </div>

                  <RadioGroup 
                    value={formData.sector} 
                    onValueChange={(value) => setFormData({ ...formData, sector: value })}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {SECTOR_TEMPLATES.map((sector) => {
                      const Icon = SECTOR_ICONS[sector.id] || Building
                      return (
                        <label key={sector.id} htmlFor={sector.id}>
                          <GlassCard
                            variant="interactive"
                            padding="md"
                            className={cn(
                              "cursor-pointer transition-all duration-300",
                              formData.sector === sector.id && "border-purple-500/50 shadow-glow-purple"
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <RadioGroupItem value={sector.id} id={sector.id} className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon className="w-5 h-5 text-purple-500" />
                                  <h4 className="font-semibold">{sector.name}</h4>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {sector.keywords.slice(0, 4).map((keyword) => (
                                    <Badge 
                                      key={keyword} 
                                      variant="secondary" 
                                      className="text-xs bg-white/50 dark:bg-black/30"
                                    >
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </GlassCard>
                        </label>
                      )
                    })}
                  </RadioGroup>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      📋 Dettagli Progetto
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Descrivi il progetto e specifica i dettagli tecnici
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description" className="flex items-center justify-between">
                        <span>Descrizione Progetto *</span>
                        <span className="text-xs text-muted-foreground">
                          {formData.description?.length || 0}/50 min
                        </span>
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrivi in dettaglio il progetto, gli obiettivi, le funzionalità desiderate..."
                        className="mt-2 min-h-[120px] bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                        autoFocus
                      />
                      {formData.description && formData.description.length < 50 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Inserisci almeno 50 caratteri per una descrizione accurata
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="complexity">Complessità</Label>
                        <Select 
                          value={formData.complexity} 
                          onValueChange={(value: 'basic' | 'standard' | 'advanced') => 
                            setFormData({ ...formData, complexity: value })
                          }
                        >
                          <SelectTrigger className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLEXITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timeline">Timeline Stimata</Label>
                        <Select 
                          value={formData.timeline} 
                          onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                        >
                          <SelectTrigger className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMELINE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Budget Range</Label>
                      <div className="mt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="budgetMin" className="text-xs text-muted-foreground mb-1 block">
                              Budget Minimo (€)
                            </Label>
                            <Input
                              id="budgetMin"
                              type="number"
                              min={1000}
                              max={20000}
                              step={500}
                              value={formData.budgetRange?.min || 3000}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1000
                                const clamped = Math.max(1000, Math.min(20000, value))
                                setFormData({ 
                                  ...formData, 
                                  budgetRange: { 
                                    min: clamped, 
                                    max: Math.max(clamped, formData.budgetRange?.max || 10000) 
                                  } 
                                })
                              }}
                              className="bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                            />
                            {(formData.budgetRange?.min && (formData.budgetRange.min < 1000 || formData.budgetRange.min > 20000)) && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Il budget deve essere tra €1.000 e €20.000
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="budgetMax" className="text-xs text-muted-foreground mb-1 block">
                              Budget Massimo (€)
                            </Label>
                            <Input
                              id="budgetMax"
                              type="number"
                              min={1000}
                              max={20000}
                              step={500}
                              value={formData.budgetRange?.max || 10000}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 10000
                                const clamped = Math.max(1000, Math.min(20000, value))
                                setFormData({ 
                                  ...formData, 
                                  budgetRange: { 
                                    min: Math.min(formData.budgetRange?.min || 3000, clamped),
                                    max: clamped
                                  } 
                                })
                              }}
                              className="bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                            />
                            {(formData.budgetRange?.max && (formData.budgetRange.max < 1000 || formData.budgetRange.max > 20000)) && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Il budget deve essere tra €1.000 e €20.000
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-2 py-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2">
                            <Euro className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              Range: €{formData.budgetRange?.min.toLocaleString()} - €{formData.budgetRange?.max.toLocaleString()}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                            Δ €{((formData.budgetRange?.max || 10000) - (formData.budgetRange?.min || 3000)).toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      👤 Info Cliente
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Seleziona il tipo di cliente e inserisci le informazioni
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* CLIENT MODE SELECTOR */}
                    <div>
                      <Label className="mb-3 block">Tipo Cliente *</Label>
                      <RadioGroup 
                        value={formData.clientMode} 
                        onValueChange={(value: 'platform' | 'external') => {
                          setFormData({ 
                            ...formData, 
                            clientMode: value,
                            clientId: undefined,
                            clientName: '',
                            clientEmail: '',
                            clientCompany: ''
                          })
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <label htmlFor="platform">
                          <GlassCard
                            variant="interactive"
                            padding="md"
                            className={cn(
                              "cursor-pointer transition-all duration-300",
                              formData.clientMode === 'platform' && "border-purple-500/50 shadow-glow-purple"
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
                              formData.clientMode === 'external' && "border-purple-500/50 shadow-glow-purple"
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

                    {/* PLATFORM CLIENT MODE */}
                    {formData.clientMode === 'platform' && (
                      <div>
                        <Label htmlFor="clientId">Seleziona Cliente *</Label>
                        <Select 
                          value={formData.clientId} 
                          onValueChange={(value) => {
                            const selectedClient = clients.find(c => c.id === value)
                            setFormData({ 
                              ...formData, 
                              clientId: value,
                              clientName: selectedClient?.name || '',
                              clientEmail: selectedClient?.email || '',
                              clientCompany: selectedClient?.company || ''
                            })
                          }}
                        >
                          <SelectTrigger className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm">
                            <SelectValue placeholder={clientsLoading ? "Caricamento..." : "Seleziona un cliente"} />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                <div>
                                  <div className="font-medium">{client.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.email} {client.company && `• ${client.company}`}
                                  </div>
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
                      </div>
                    )}

                    {/* EXTERNAL CLIENT MODE */}
                    {formData.clientMode === 'external' && (
                      <>
                        <div>
                          <Label htmlFor="clientName">Nome Cliente *</Label>
                          <Input
                            id="clientName"
                            value={formData.clientName || ''}
                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                            placeholder="Mario Rossi"
                            className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                            autoFocus
                          />
                        </div>

                        <div>
                          <Label htmlFor="clientEmail">Email Cliente *</Label>
                          <Input
                            id="clientEmail"
                            type="email"
                            value={formData.clientEmail || ''}
                            onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                            placeholder="mario@azienda.it"
                            className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                          />
                        </div>

                        <div>
                          <Label htmlFor="clientCompany">Azienda (Opzionale)</Label>
                          <Input
                            id="clientCompany"
                            value={formData.clientCompany || ''}
                            onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                            placeholder="Nome Azienda S.r.l."
                            className="mt-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                          />
                        </div>
                        
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ℹ️ Cliente esterno: link approvazione pubblico, nessun pagamento automatico
                        </p>
                      </>
                    )}

                    <div>
                      <Label htmlFor="additionalNotes">Note Aggiuntive</Label>
                      <Textarea
                        id="additionalNotes"
                        value={formData.additionalNotes || ''}
                        onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                        placeholder="Eventuali richieste specifiche o informazioni aggiuntive..."
                        className="mt-2 min-h-[80px] bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      Riepilogo Informazioni
                    </h4>
                    
                    <GlassCard variant="elevated" padding="md" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo Progetto</p>
                          <p className="font-medium">{selectedProjectType?.label}</p>
                        </div>
                        <GlassButton 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCurrentStep(1)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </GlassButton>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Settore</p>
                          <p className="font-medium">{selectedSector?.name}</p>
                        </div>
                        <GlassButton 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCurrentStep(2)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </GlassButton>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-medium">
                            €{formData.budgetRange?.min.toLocaleString()} - €{formData.budgetRange?.max.toLocaleString()}
                          </p>
                        </div>
                        <GlassButton 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCurrentStep(3)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </GlassButton>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Descrizione</p>
                        <p className="text-sm line-clamp-3">{formData.description}</p>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex-shrink-0 border-t border-white/20 bg-white/75 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/50 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <GlassButton
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || isCompleting}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Indietro
            </GlassButton>

            <GlassButton
              variant="primary"
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === 4 ? (isCompleting ? 'Genero...' : 'Genera Preventivo') : 'Avanti'}
              {!isCompleting && <ChevronRight className="w-4 h-4 ml-2" />}
            </GlassButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
