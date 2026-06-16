"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  Loader2,
  ImageIcon,
  FileText,
  HelpCircle,
  Sparkles,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SECTOR_TEMPLATES } from "@/lib/quote-templates"
import { getQuoteClientDataQuality } from "@/lib/quote-data-quality"
import {
  RIGHELLO_QUOTE_DISCOVERY_QUESTIONS,
  RIGHELLO_QUOTE_SERVICE_AREAS,
} from "@/lib/righello-quote-operating-model"
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
  brandNames?: string[]
  primaryBrandName?: string
  logoStatus?: 'available' | 'to_request' | 'not_defined'
  logoNotes?: string
  brandAssets?: string
  referenceMaterials?: string
  missingMaterials?: string[]
  discoveryQuestions?: string[]
}

interface PromptEnrichmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (enrichedData: EnrichedPromptData) => void | Promise<void>
}

const PROJECT_TYPES = [
  {
    id: 'website_180_core',
    pricingTemplateId: 'website_180',
    label: 'Sito e presenza digitale',
    description: 'Sito vetrina, landing, SEO locale, contenuti iniziali e GDPR.',
    icon: Globe,
    template: WEBSITE_180_TEMPLATE,
    priceLabel: 'da €3.500'
  },
  {
    id: 'website_360_platform',
    pricingTemplateId: 'website_360',
    label: 'Piattaforma web e integrazioni',
    description: 'CMS, aree riservate, booking, e-commerce, API e automazioni.',
    icon: Globe,
    template: WEBSITE_360_TEMPLATE,
    priceLabel: 'da €6.170'
  },
  {
    id: 'ai_ops_automation',
    pricingTemplateId: 'messaging_automation',
    label: 'AI, automazioni e sistemi operativi',
    description: 'WhatsApp/API, AI FAQ, dashboard operatori, MCP/API e workflow agentici.',
    icon: Sparkles,
    template: WEBSITE_360_TEMPLATE,
    priceLabel: 'da discovery'
  },
  {
    id: 'crm_sige_platform',
    pricingTemplateId: 'website_360',
    label: 'CRM/SIGE e gestionale',
    description: 'Moduli dipendenti, formazione, DPI, documenti, certificazioni e dashboard operative.',
    icon: FileText,
    template: WEBSITE_360_TEMPLATE,
    priceLabel: 'su misura'
  },
  {
    id: 'video_packages_media',
    pricingTemplateId: 'video_packages',
    label: 'Produzione foto/video',
    description: 'Shooting, video hero, reel, contenuti verticali e asset commerciali.',
    icon: Video,
    template: VIDEO_PACKAGES_TEMPLATE,
    priceLabel: '€300-1.190'
  },
  {
    id: 'communication_150_field',
    pricingTemplateId: 'communication_150',
    label: 'Documentazione cantieri/eventi',
    description: 'Copertura operativa, produzione contenuti e racconto avanzamento lavori.',
    icon: Megaphone,
    template: COMMUNICATION_150_TEMPLATE,
    priceLabel: 'da €4.000'
  },
  {
    id: 'communication_180_growth',
    pricingTemplateId: 'communication_180',
    label: 'Comunicazione e crescita',
    description: 'Strategia editoriale, campagne, social, contenuti e coordinamento mensile.',
    icon: Megaphone,
    template: COMMUNICATION_180_TEMPLATE,
    priceLabel: '€3.500-5.000'
  },
  {
    id: 'brand_content_strategy',
    pricingTemplateId: 'communication_180',
    label: 'Brand, contenuti e direzione creativa',
    description: 'Posizionamento, copy, identita visiva, materiali commerciali e presentazioni.',
    icon: Palette,
    template: COMMUNICATION_180_TEMPLATE,
    priceLabel: 'da €3.500'
  }
]

const MIN_BUDGET = 500
const MAX_BUDGET = 100000

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

const DEFAULT_BUDGET_RANGE = { min: 3000, max: 15000 }

const clampBudget = (value: number) => Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, value))

export function PromptEnrichmentDialog({ open, onOpenChange, onComplete }: PromptEnrichmentDialogProps) {
  const { clients, loading: clientsLoading } = useClients()
  const wasOpenRef = useRef(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleting, setIsCompleting] = useState(false)
  const [formData, setFormData] = useState<Partial<EnrichedPromptData>>({
    budgetRange: DEFAULT_BUDGET_RANGE,
    complexity: 'standard',
    timeline: '8-12 settimane',
    clientMode: 'external', // Default to external client mode
    logoStatus: 'to_request',
    brandNames: [],
    missingMaterials: [],
    discoveryQuestions: []
  })
  const [budgetInputs, setBudgetInputs] = useState({
    min: String(DEFAULT_BUDGET_RANGE.min),
    max: String(DEFAULT_BUDGET_RANGE.max),
  })

  const splitList = (value: string) => value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true
      setCurrentStep(1)
      setBudgetInputs({
        min: String(formData.budgetRange?.min || DEFAULT_BUDGET_RANGE.min),
        max: String(formData.budgetRange?.max || DEFAULT_BUDGET_RANGE.max),
      })
      return
    }

    if (!open) {
      wasOpenRef.current = false
    }
  }, [open])

  const selectedProjectType = PROJECT_TYPES.find(pt => pt.id === formData.projectType)
  const selectedSector = SECTOR_TEMPLATES.find(s => s.id === formData.sector)
  const budgetDraftMin = Number(budgetInputs.min)
  const budgetDraftMax = Number(budgetInputs.max)
  const isBudgetDraftValid =
    Number.isFinite(budgetDraftMin) &&
    Number.isFinite(budgetDraftMax) &&
    budgetDraftMin >= MIN_BUDGET &&
    budgetDraftMin <= MAX_BUDGET &&
    budgetDraftMax >= MIN_BUDGET &&
    budgetDraftMax <= MAX_BUDGET &&
    budgetDraftMin <= budgetDraftMax

  const isStep1Valid = !!formData.projectType
  const isStep2Valid = !!formData.sector
  const isStep3Valid = formData.description && formData.description.length >= 50 && isBudgetDraftValid
  const clientDataQuality = getQuoteClientDataQuality({
    nome: formData.clientName,
    email: formData.clientEmail,
    azienda: formData.clientCompany,
  })
  const isStep4Valid = formData.clientMode === 'platform' 
    ? !!formData.clientId 
    : !!(formData.clientName && formData.clientEmail)
  const isStep5Valid = !!formData.logoStatus

  const resetFormData = () => {
    setFormData({
      budgetRange: DEFAULT_BUDGET_RANGE,
      complexity: 'standard',
      timeline: '8-12 settimane',
      clientMode: 'external',
      logoStatus: 'to_request',
      brandNames: [],
      missingMaterials: [],
      discoveryQuestions: []
    })
    setBudgetInputs({
      min: String(DEFAULT_BUDGET_RANGE.min),
      max: String(DEFAULT_BUDGET_RANGE.max),
    })
    setCurrentStep(1)
  }

  const setBudgetDraft = (field: 'min' | 'max', rawValue: string) => {
    const cleaned = rawValue.replace(/[^\d]/g, '').slice(0, 6)
    setBudgetInputs((current) => ({ ...current, [field]: cleaned }))
  }

  const normalizeBudgetInputs = (field?: 'min' | 'max') => {
    const previousRange = formData.budgetRange || DEFAULT_BUDGET_RANGE
    let min = clampBudget(Number(budgetInputs.min || previousRange.min || DEFAULT_BUDGET_RANGE.min))
    let max = clampBudget(Number(budgetInputs.max || previousRange.max || DEFAULT_BUDGET_RANGE.max))

    if (min > max) {
      if (field === 'max') {
        min = max
      } else {
        max = min
      }
    }

    const normalized = { min, max }
    setBudgetInputs({ min: String(min), max: String(max) })
    setFormData({ ...formData, budgetRange: normalized })
    return normalized
  }

  const handleNext = async () => {
    if (currentStep < 5) {
      if (currentStep === 3) {
        normalizeBudgetInputs()
      }
      setCurrentStep(currentStep + 1)
    } else {
      if (isStep5Valid && formData.projectType && formData.sector && formData.description) {
        setIsCompleting(true)
        const budgetRange = normalizeBudgetInputs()
        const enrichedData: EnrichedPromptData = {
          projectType: selectedProjectType?.pricingTemplateId || formData.projectType,
          projectTypeLabel: selectedProjectType?.label || '',
          sector: formData.sector,
          sectorLabel: selectedSector?.name || '',
          description: formData.description,
          budgetRange,
          complexity: formData.complexity || 'standard',
          timeline: formData.timeline || '8-12 settimane',
          clientMode: formData.clientMode || 'external',
          clientId: formData.clientId,
          clientName: formData.clientName || '',
          clientEmail: formData.clientEmail,
          clientCompany: formData.clientCompany,
          additionalNotes: formData.additionalNotes,
          brandNames: formData.brandNames || [],
          primaryBrandName: formData.primaryBrandName,
          logoStatus: formData.logoStatus || 'to_request',
          logoNotes: formData.logoNotes,
          brandAssets: formData.brandAssets,
          referenceMaterials: formData.referenceMaterials,
          missingMaterials: formData.missingMaterials || [],
          discoveryQuestions: formData.discoveryQuestions || []
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
      case 4: return isStep4Valid
      case 5: return isStep5Valid && !isCompleting
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
      <DialogContent
        stableViewport
        className="!flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden !p-0 bg-white/90 dark:bg-black/75 backdrop-blur-xl border border-white/30 dark:border-white/10 sm:h-[min(900px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)]"
      >
        <DialogHeader className="shrink-0 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle className="pr-8 text-xl text-gray-900 dark:text-white sm:text-2xl">
            Raccolta Informazioni Preventivo
          </DialogTitle>
          <DialogDescription className="sr-only">
            Procedura guidata per raccogliere progetto, settore, materiali brand, cliente e note prima di generare il preventivo.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((step) => (
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
            Step {currentStep}/5
          </p>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="min-h-full pb-2"
            >
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      Linea di servizio
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Parti da una famiglia Righello: il prezzo usa template controllati, il testo viene personalizzato sul brief.
                    </p>
                  </div>
                  
                  <RadioGroup
                    value={formData.projectType || ""}
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
                  <div className="rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                      Catalogo operativo Righello
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {RIGHELLO_QUOTE_SERVICE_AREAS.map((area) => (
                        <Badge
                          key={area.id}
                          variant="outline"
                          className="rounded-[8px] border-cyan-300/30 bg-cyan-300/10 text-cyan-900 dark:text-cyan-100"
                          title={area.summary}
                        >
                          {area.shortLabel}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-cyan-950/70 dark:text-cyan-100/70">
                      Il preventivo deve collegare servizi, cliente, progetto, fonte e storico commerciale quando disponibili.
                    </p>
                  </div>
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
                    value={formData.sector || ""}
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
                        placeholder="Descrivi progetto, macro-servizi, costi una tantum/mensili/annuali, materiali disponibili, varianti richieste e vincoli commerciali..."
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
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={budgetInputs.min}
                              onChange={(e) => setBudgetDraft('min', e.target.value)}
                              onBlur={() => normalizeBudgetInputs('min')}
                              className="bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                            />
                            {Boolean(budgetInputs.min && (budgetDraftMin < MIN_BUDGET || budgetDraftMin > MAX_BUDGET)) && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Il budget deve essere tra €500 e €100.000
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="budgetMax" className="text-xs text-muted-foreground mb-1 block">
                              Budget Massimo (€)
                            </Label>
                            <Input
                              id="budgetMax"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={budgetInputs.max}
                              onChange={(e) => setBudgetDraft('max', e.target.value)}
                              onBlur={() => normalizeBudgetInputs('max')}
                              className="bg-white/50 dark:bg-black/30 backdrop-blur-sm"
                            />
                            {Boolean(budgetInputs.max && (budgetDraftMax < MIN_BUDGET || budgetDraftMax > MAX_BUDGET)) && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Il budget deve essere tra €500 e €100.000
                              </p>
                            )}
                            {Boolean(budgetInputs.min && budgetInputs.max && budgetDraftMin > budgetDraftMax) && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Il massimo deve essere maggiore o uguale al minimo
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-2 py-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2">
                            <Euro className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              Range: €{(budgetDraftMin || DEFAULT_BUDGET_RANGE.min).toLocaleString()} - €{(budgetDraftMax || DEFAULT_BUDGET_RANGE.max).toLocaleString()}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                            Δ €{Math.max(0, (budgetDraftMax || DEFAULT_BUDGET_RANGE.max) - (budgetDraftMin || DEFAULT_BUDGET_RANGE.min)).toLocaleString()}
                          </Badge>
                        </div>
                        <div className="rounded-[8px] border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-700 dark:text-emerald-200">
                          Il massimo indicato viene trattato come limite reale: se il perimetro non entra, Optima sposta voci in fase 2/opzionali invece di gonfiare il totale.
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[8px] border border-white/10 bg-white/40 p-4 dark:bg-black/20">
                      <p className="text-sm font-semibold">Domande da non saltare</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {RIGHELLO_QUOTE_DISCOVERY_QUESTIONS.slice(0, 6).map((question) => (
                          <p key={question} className="text-xs leading-5 text-muted-foreground">
                            {question}
                          </p>
                        ))}
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
                        value={formData.clientMode || "external"}
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
                          Pagamento Stripe automatico se i dati cliente sono completi.
                        </p>
                        {formData.clientId && (
                          <div className={cn(
                            "mt-3 rounded-xl border p-3 text-sm",
                            clientDataQuality.status === "complete"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                          )}>
                            <div className="flex items-start gap-2">
                              {clientDataQuality.status === "complete" ? (
                                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              )}
                              <div>
                                <p className="font-semibold">
                                  {clientDataQuality.status === "complete"
                                    ? "Dati cliente pronti"
                                    : "Dati cliente da completare"}
                                </p>
                                {clientDataQuality.status === "complete" ? (
                                  <p className="mt-1 opacity-80">Optima usera solo campi reali presenti in anagrafica.</p>
                                ) : (
                                  <ul className="mt-1 space-y-1 opacity-90">
                                    {clientDataQuality.warnings.map((warning) => (
                                      <li key={warning}>{warning}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
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
                          Cliente esterno: link approvazione pubblico, nessun pagamento automatico.
                        </p>
                        <div className={cn(
                          "rounded-xl border p-3 text-sm",
                          clientDataQuality.status === "complete"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                        )}>
                          <div className="flex items-start gap-2">
                            {clientDataQuality.status === "complete" ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold">
                                {clientDataQuality.status === "complete"
                                  ? "Nessun dato fittizio rilevato"
                                  : "Optima non inserisce dati mock"}
                              </p>
                              {clientDataQuality.status === "complete" ? (
                                <p className="mt-1 opacity-80">Il PDF puo usare i dati cliente inseriti.</p>
                              ) : (
                                <ul className="mt-1 space-y-1 opacity-90">
                                  {clientDataQuality.warnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
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

              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                      <ImageIcon className="h-5 w-5 text-righello-pink" />
                      Materiali brand
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Raccogli loghi, brand coinvolti, materiali disponibili e domande da chiarire prima di generare il PDF.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="primaryBrandName">Brand principale</Label>
                        <Input
                          id="primaryBrandName"
                          value={formData.primaryBrandName || ''}
                          onChange={(e) => setFormData({ ...formData, primaryBrandName: e.target.value })}
                          placeholder={formData.clientCompany || formData.clientName || "Nome brand"}
                          className="mt-2 bg-white/50 backdrop-blur-sm dark:bg-black/30"
                        />
                      </div>

                      <div>
                        <Label htmlFor="brandNames">Brand coinvolti</Label>
                        <Input
                          id="brandNames"
                          value={(formData.brandNames || []).join(', ')}
                          onChange={(e) => setFormData({ ...formData, brandNames: splitList(e.target.value) })}
                          placeholder="Brand cliente, sub-brand, partner..."
                          className="mt-2 bg-white/50 backdrop-blur-sm dark:bg-black/30"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-3 block">Logo cliente / brand *</Label>
                      <RadioGroup
                        value={formData.logoStatus || "to_request"}
                        onValueChange={(value: 'available' | 'to_request' | 'not_defined') => setFormData({ ...formData, logoStatus: value })}
                        className="grid grid-cols-1 gap-3 md:grid-cols-3"
                      >
                        {[
                          { value: 'available', label: 'Logo disponibile', text: 'Abbiamo gia file o link utili.' },
                          { value: 'to_request', label: 'Da richiedere', text: 'Il PDF deve segnalarlo tra i materiali.' },
                          { value: 'not_defined', label: 'Da definire', text: 'Brand o asset non sono ancora chiari.' },
                        ].map((option) => (
                          <label key={option.value} htmlFor={`logo-${option.value}`}>
                            <GlassCard
                              variant="interactive"
                              padding="md"
                              className={cn(
                                "cursor-pointer transition-all duration-300",
                                formData.logoStatus === option.value && "border-righello-pink/60 shadow-glow-pink"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <RadioGroupItem value={option.value} id={`logo-${option.value}`} className="mt-1" />
                                <div>
                                  <p className="font-semibold">{option.label}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{option.text}</p>
                                </div>
                              </div>
                            </GlassCard>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="brandAssets" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Link e materiali disponibili
                        </Label>
                        <Textarea
                          id="brandAssets"
                          value={formData.brandAssets || ''}
                          onChange={(e) => setFormData({ ...formData, brandAssets: e.target.value })}
                          placeholder="Drive, sito attuale, brand book, cartella loghi, foto, video, credenziali gia note..."
                          className="mt-2 min-h-[110px] bg-white/50 backdrop-blur-sm dark:bg-black/30"
                        />
                      </div>

                      <div>
                        <Label htmlFor="missingMaterials">Materiali da chiedere</Label>
                        <Textarea
                          id="missingMaterials"
                          value={(formData.missingMaterials || []).join('\n')}
                          onChange={(e) => setFormData({ ...formData, missingMaterials: splitList(e.target.value) })}
                          placeholder={"Logo vettoriale SVG/PDF\nFoto ufficiali\nBrand guideline\nCredenziali dominio/hosting"}
                          className="mt-2 min-h-[110px] bg-white/50 backdrop-blur-sm dark:bg-black/30"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="referenceMaterials">Reference e direzione visiva</Label>
                      <Textarea
                        id="referenceMaterials"
                        value={formData.referenceMaterials || ''}
                        onChange={(e) => setFormData({ ...formData, referenceMaterials: e.target.value })}
                        placeholder="Siti competitor, tono desiderato, materiali da evitare, benchmark visivi, stile fotografico..."
                        className="mt-2 min-h-[90px] bg-white/50 backdrop-blur-sm dark:bg-black/30"
                      />
                    </div>

                    <div>
                      <Label htmlFor="discoveryQuestions" className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Domande aperte per il cliente
                      </Label>
                      <Textarea
                        id="discoveryQuestions"
                        value={(formData.discoveryQuestions || []).join('\n')}
                        onChange={(e) => setFormData({ ...formData, discoveryQuestions: splitList(e.target.value) })}
                        placeholder={"Chi approva il preventivo e i contenuti?\nQuali brand/prodotti devono comparire?\nEsistono vincoli legali o linee guida da rispettare?"}
                        className="mt-2 min-h-[110px] bg-white/50 backdrop-blur-sm dark:bg-black/30"
                      />
                    </div>

                    <GlassCard variant="elevated" padding="md">
                      <p className="mb-3 text-sm font-semibold">Checklist consigliata</p>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        {[
                          "Logo vettoriale o PNG alta risoluzione",
                          "Brand guideline e palette ufficiale",
                          "Foto/video/prodotti da usare nel PDF",
                          "Referente approvazione e dati fiscali",
                          "Accessi tecnici necessari",
                          "Vincoli su privacy, claim o licenze",
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="shrink-0 border-t border-white/20 bg-white/75 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/50 sm:px-6 sm:pb-4 sm:pt-4">
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
              {currentStep === 5 ? (isCompleting ? 'Genero...' : 'Genera Preventivo') : 'Avanti'}
              {!isCompleting && <ChevronRight className="w-4 h-4 ml-2" />}
            </GlassButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
