// Righello Project Templates - Real patterns from PDF analysis
// Comprehensive project templates for standardized quote generation

export interface PriceRange {
  min: number
  max: number
  standard: number
}

export interface TemplateItem {
  id: string
  name: string
  description: string
  priceRange: PriceRange
  category: 'base' | 'optional' | 'recurring'
  unit?: 'one_time' | 'monthly' | 'annual'
  quantity?: number
  variability?: number
}

export interface ProjectTemplate {
  id: string
  type: 'website' | 'video' | 'communication' | 'branding'
  complexity: '180' | '360' | '150' | 'basic' | 'advanced' | 'complete'
  name: string
  description: string
  basePrice: number
  priceRange: PriceRange
  items: TemplateItem[]
  timeline: string
  deliverables: string[]
  standardClauses: {
    costVariation: number
    validityDays: number
    paymentTerms: string
    cancellationPenalty: number
  }
  examples?: string[]
}

export const WEBSITE_180_TEMPLATE: ProjectTemplate = {
  id: 'website_180',
  type: 'website',
  complexity: '180',
  name: 'Sito Web "A 180°" - Base/Semplificato',
  description: 'Sito web professionale con funzionalità base, design moderno e SEO ottimizzato. Soluzione ideale per aziende che necessitano di una presenza digitale efficace e professionale.',
  basePrice: 3500,
  priceRange: {
    min: 3200,
    max: 3950,
    standard: 3500
  },
  items: [
    {
      id: 'planning',
      name: 'Progettazione e Pianificazione',
      description: 'Raccolta requisiti, analisi concorrenza, definizione sitemap, creazione wireframe e mockup design',
      priceRange: { min: 1000, max: 1300, standard: 1000 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'development',
      name: 'Sviluppo Tecnico',
      description: 'Implementazione pagine principali (Homepage, Chi siamo, Servizi, Portfolio, Contatti), design responsive, ottimizzazione performance',
      priceRange: { min: 1500, max: 1500, standard: 1500 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 5
    },
    {
      id: 'seo',
      name: 'SEO Optimization',
      description: 'Ottimizzazione motori di ricerca, meta tag, URL structure, sitemap XML, integrazione Google Analytics',
      priceRange: { min: 250, max: 800, standard: 650 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'privacy',
      name: 'Configurazione Privacy Policy',
      description: 'Setup GDPR compliance, cookie policy, privacy policy, form di contatto conformi',
      priceRange: { min: 200, max: 200, standard: 200 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 0
    },
    {
      id: 'content_insertion',
      name: 'Inserimento Contenuti',
      description: 'Inserimento contenuti iniziali, ottimizzazione immagini, setup portfolio/progetti',
      priceRange: { min: 150, max: 250, standard: 150 },
      category: 'optional',
      unit: 'one_time',
      quantity: 1,
      variability: 15
    },
    {
      id: 'technical_support',
      name: 'Gestione Tecnica e Supporto',
      description: 'Bug fixing, security monitoring, system updates, backup management',
      priceRange: { min: 150, max: 150, standard: 150 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    },
    {
      id: 'content_management',
      name: 'Gestione Contenuti',
      description: 'Aggiornamenti contenuti mensili (2-3 modifiche), inserimento news, aggiornamento portfolio',
      priceRange: { min: 170, max: 170, standard: 170 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    },
    {
      id: 'hosting',
      name: 'Hosting (Costo Esterno)',
      description: 'Hosting professionale con SSL, backup automatici, supporto tecnico',
      priceRange: { min: 27, max: 27, standard: 27 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    },
    {
      id: 'domain',
      name: 'Dominio (Se Necessario)',
      description: 'Registrazione e gestione dominio annuale',
      priceRange: { min: 4, max: 4, standard: 4 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    }
  ],
  timeline: '12-16 settimane',
  deliverables: [
    'Sito web responsive completo',
    'Pannello amministrazione contenuti',
    'Documentazione tecnica',
    'Form di contatto funzionante',
    'Ottimizzazione SEO base',
    'Conformità GDPR'
  ],
  standardClauses: {
    costVariation: 10,
    validityDays: 30,
    paymentTerms: "50% all'accettazione, 50% a completamento",
    cancellationPenalty: 10
  },
  examples: ['Fiumedica', 'Impresa Edile Maccan']
}

export const WEBSITE_360_TEMPLATE: ProjectTemplate = {
  id: 'website_360',
  type: 'website',
  complexity: '360',
  name: 'Sito Web "A 360°" - Avanzato/Integrazioni',
  description: 'Sito web avanzato con funzionalità complesse, integrazioni sistemi esterni, CMS avanzato. Ideale per business che necessitano di funzionalità specifiche come prenotazioni, e-commerce, o aree riservate.',
  basePrice: 6170,
  priceRange: {
    min: 5750,
    max: 6800,
    standard: 6170
  },
  items: [
    {
      id: 'planning_advanced',
      name: 'Progettazione e Pianificazione Avanzata',
      description: 'Analisi approfondita requisiti, architettura informazione complessa, UX design avanzato, prototipazione interattiva',
      priceRange: { min: 1700, max: 1700, standard: 1700 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'development_advanced',
      name: 'Sviluppo Tecnico Avanzato',
      description: 'Implementazione funzionalità complesse, integrazioni API, sistemi di prenotazione/e-commerce, aree riservate',
      priceRange: { min: 2800, max: 2800, standard: 2800 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'content_insertion_advanced',
      name: 'Inserimento Contenuti Completo',
      description: 'Trasferimento contenuti esistenti, ottimizzazione multimediale, setup database prodotti/servizi',
      priceRange: { min: 850, max: 850, standard: 850 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'seo_advanced',
      name: 'SEO Optimization Avanzata',
      description: 'SEO tecnico avanzato, schema markup, ottimizzazione multilingua, strategia keywords complessa',
      priceRange: { min: 620, max: 620, standard: 620 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'privacy',
      name: 'Configurazione Privacy Policy',
      description: 'GDPR compliance avanzata, gestione consensi complessa, integrazione cookie banner avanzato',
      priceRange: { min: 200, max: 200, standard: 200 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 0
    },
    {
      id: 'video_shooting',
      name: 'Video e Shooting Fotografico',
      description: 'Video presentazione 45-60s, shooting fotografico professionale, post-produzione',
      priceRange: { min: 1200, max: 1200, standard: 1200 },
      category: 'optional',
      unit: 'one_time',
      quantity: 1,
      variability: 15
    },
    {
      id: 'technical_support',
      name: 'Gestione Tecnica e Supporto',
      description: 'Monitoraggio avanzato, security updates, bug fixing prioritario, supporto integrazioni',
      priceRange: { min: 150, max: 150, standard: 150 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    },
    {
      id: 'content_management',
      name: 'Gestione Contenuti',
      description: 'Aggiornamenti contenuti mensili avanzati, gestione database prodotti, ottimizzazione SEO continua',
      priceRange: { min: 170, max: 170, standard: 170 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    },
    {
      id: 'hosting',
      name: 'Hosting (Costo Esterno)',
      description: 'Hosting performante con risorse dedicate, backup incrementali, CDN',
      priceRange: { min: 27, max: 27, standard: 27 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    }
  ],
  timeline: '12-18 settimane',
  deliverables: [
    'Sito web responsive con funzionalità avanzate',
    'CMS avanzato personalizzato',
    'Integrazioni sistemi esterni (prenotazioni/e-commerce/CRM)',
    'Area riservata clienti/utenti',
    'Documentazione tecnica completa',
    'Training utilizzo backend',
    'SEO avanzato e analytics',
    'Conformità GDPR completa'
  ],
  standardClauses: {
    costVariation: 10,
    validityDays: 30,
    paymentTerms: "50% all'accettazione, 30% a milestone, 20% a completamento",
    cancellationPenalty: 10
  },
  examples: ['Scuola Sci Piancavallo']
}

export const VIDEO_PACKAGES_TEMPLATE: ProjectTemplate = {
  id: 'video_packages',
  type: 'video',
  complexity: 'basic',
  name: 'Pacchetti Video Production',
  description: 'Servizi di produzione video e foto professionali con pacchetti modulari: solo foto, foto+video interno, o pacchetto completo con drone.',
  basePrice: 650,
  priceRange: {
    min: 300,
    max: 1190,
    standard: 650
  },
  items: [
    {
      id: 'photo_only',
      name: 'Pacchetto Solo Foto',
      description: 'Shooting fotografico professionale per progetti, cantieri o strutture. Consegna 20-30 immagini ottimizzate.',
      priceRange: { min: 300, max: 300, standard: 300 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 30
    },
    {
      id: 'photo_video_indoor',
      name: 'Pacchetto Foto + Video Interno',
      description: 'Foto professionale + riprese video interne (1-2 minuti), editing e color grading, formati multipli',
      priceRange: { min: 650, max: 650, standard: 650 },
      category: 'optional',
      unit: 'one_time',
      quantity: 1,
      variability: 30
    },
    {
      id: 'complete_package',
      name: 'Pacchetto Completo (+ Drone)',
      description: 'Foto + video interno + riprese aeree con drone, 2 round di revisioni, consegna file raw + edited',
      priceRange: { min: 1190, max: 1190, standard: 1190 },
      category: 'optional',
      unit: 'one_time',
      quantity: 1,
      variability: 30
    },
    {
      id: 'social_vertical_video',
      name: 'Video Verticale per Social',
      description: 'Clip verticale ottimizzato per Instagram/TikTok da materiale esistente',
      priceRange: { min: 70, max: 70, standard: 70 },
      category: 'optional',
      unit: 'one_time',
      quantity: 1,
      variability: 20
    }
  ],
  timeline: '7-14 giorni lavorativi',
  deliverables: [
    'Immagini ad alta risoluzione (web + print)',
    'Video edited con color grading professionale',
    'Formati multipli per web e social',
    'File raw su richiesta',
    '2 round di revisioni incluse (pacchetto completo)'
  ],
  standardClauses: {
    costVariation: 30,
    validityDays: 60,
    paymentTerms: "50% prenotazione, 50% consegna materiali",
    cancellationPenalty: 10
  },
  examples: ['Cantiere CreAttivo']
}

export const COMMUNICATION_150_TEMPLATE: ProjectTemplate = {
  id: 'communication_150',
  type: 'communication',
  complexity: '150',
  name: 'Piano Comunicazione "A 150°"',
  description: 'Piano di comunicazione completo con documentazione video+foto di cantieri/progetti, ottimizzazione contenuti per social e web.',
  basePrice: 4000,
  priceRange: {
    min: 3800,
    max: 4500,
    standard: 4000
  },
  items: [
    {
      id: 'site_documentation',
      name: 'Documentazione 10 Cantieri/Progetti',
      description: '10 uscite per documentazione video+foto di cantieri, progetti o eventi. Include shooting, editing, consegna formati multipli.',
      priceRange: { min: 3000, max: 3500, standard: 3000 },
      category: 'base',
      unit: 'one_time',
      quantity: 10,
      variability: 15
    },
    {
      id: 'content_optimization',
      name: 'Ottimizzazione Contenuti',
      description: '2 uscite mensili ottimizzate per social media con caption, hashtag strategy, planning editoriale',
      priceRange: { min: 1000, max: 1000, standard: 1000 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    }
  ],
  timeline: '3-6 mesi (distribuzione uscite)',
  deliverables: [
    '10 set completi foto+video documentazione',
    'Video edited per ogni cantiere/progetto',
    'Foto professionali ottimizzate',
    'Caption e copy per pubblicazione',
    'Strategia hashtag settoriale',
    'Calendario editoriale suggerito'
  ],
  standardClauses: {
    costVariation: 10,
    validityDays: 30,
    paymentTerms: "30% all'inizio, 40% a metà progetto, 30% a completamento",
    cancellationPenalty: 10
  },
  examples: ['Demo Costruzioni']
}

export const COMMUNICATION_180_TEMPLATE: ProjectTemplate = {
  id: 'communication_180',
  type: 'communication',
  complexity: '180',
  name: 'Piano Comunicazione "A 180°"',
  description: 'Strategia di comunicazione completa con sistemazione digitale generale, video principale, shooting fotografico e gestione editoriale mensile.',
  basePrice: 3500,
  priceRange: {
    min: 3500,
    max: 5000,
    standard: 4000
  },
  items: [
    {
      id: 'digital_setup',
      name: 'Sistemazione Digitale Generale',
      description: 'Audit e ristrutturazione presenza digitale: social unification, brand consistency, cleanup contenuti obsoleti',
      priceRange: { min: 1000, max: 1000, standard: 1000 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 10
    },
    {
      id: 'main_video',
      name: 'Video Principale (45-60s)',
      description: 'Video presentazione aziendale professionale 45-60 secondi con script, shooting, editing, musica, color grading',
      priceRange: { min: 400, max: 770, standard: 400 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 20
    },
    {
      id: 'photo_shooting',
      name: 'Shooting Fotografico',
      description: 'Servizio fotografico professionale per valorizzare brand, team, location o prodotti',
      priceRange: { min: 250, max: 300, standard: 250 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 15
    },
    {
      id: 'editorial_strategy',
      name: 'Strategia Editoriale Mensile',
      description: 'Planning contenuti mensile, calendario editoriale, tone of voice, linee guida brand',
      priceRange: { min: 1000, max: 1500, standard: 1200 },
      category: 'base',
      unit: 'one_time',
      quantity: 1,
      variability: 20
    },
    {
      id: 'monthly_content',
      name: 'Produzione Contenuti Mensile',
      description: 'Uscite mensili per documentazione, video stories, foto, gestione pubblicazioni',
      priceRange: { min: 800, max: 800, standard: 800 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 10
    },
    {
      id: 'technical_management',
      name: 'Gestione Tecnica',
      description: 'Sistemazione profili social, ottimizzazione bio, setup analytics, strumenti digitali',
      priceRange: { min: 30, max: 30, standard: 30 },
      category: 'recurring',
      unit: 'monthly',
      quantity: 12,
      variability: 0
    }
  ],
  timeline: '8-12 settimane setup + gestione continuativa',
  deliverables: [
    'Audit digitale completo',
    'Brand guidelines aggiornate',
    'Video principale professionale',
    'Gallery fotografica brand',
    'Strategia editoriale annuale',
    'Calendario contenuti mensile',
    'Gestione profili social ottimizzati',
    'Report analytics mensili'
  ],
  standardClauses: {
    costVariation: 10,
    validityDays: 30,
    paymentTerms: "40% all'inizio, 60% a milestone + gestione mensile",
    cancellationPenalty: 10
  },
  examples: ['La Vie en Rose']
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  WEBSITE_180_TEMPLATE,
  WEBSITE_360_TEMPLATE,
  VIDEO_PACKAGES_TEMPLATE,
  COMMUNICATION_150_TEMPLATE,
  COMMUNICATION_180_TEMPLATE
]

export const ANNUAL_MANAGEMENT_COSTS = {
  technical: {
    monthly: 150,
    description: 'Gestione Tecnica e Supporto: bug fixing, security monitoring, system updates'
  },
  content: {
    monthly: 170,
    description: 'Gestione Contenuti: 2-3 aggiornamenti mensili, ottimizzazione SEO'
  },
  hosting: {
    monthly: 27,
    description: 'Hosting (Costo Esterno): hosting professionale con SSL e backup'
  },
  domain: {
    monthly: 4,
    description: 'Dominio (Se Necessario): registrazione e gestione dominio'
  },
  getTotalMonthly: (includeDomain = false): number => {
    return 150 + 170 + 27 + (includeDomain ? 4 : 0)
  },
  getTotalAnnual: (includeDomain = false): number => {
    return (150 + 170 + 27 + (includeDomain ? 4 : 0)) * 12
  }
}

export function getProjectTemplate(
  type: ProjectTemplate['type'],
  complexity?: ProjectTemplate['complexity']
): ProjectTemplate | null {
  if (!complexity) {
    const defaultTemplates = {
      website: WEBSITE_180_TEMPLATE,
      video: VIDEO_PACKAGES_TEMPLATE,
      communication: COMMUNICATION_180_TEMPLATE,
      branding: COMMUNICATION_180_TEMPLATE
    }
    return defaultTemplates[type] || null
  }

  return PROJECT_TEMPLATES.find(
    t => t.type === type && t.complexity === complexity
  ) || null
}

export function calculateDynamicPrice(
  template: ProjectTemplate,
  customizations?: {
    includeOptionals?: string[]
    excludeItems?: string[]
    recurringMonths?: number
    applyDiscount?: number
    sectorVariation?: number
  }
): {
  oneTimeTotal: number
  recurringMonthly: number
  recurringAnnual: number
  total: number
  breakdown: {
    item: TemplateItem
    calculatedPrice: number
    isIncluded: boolean
  }[]
} {
  const {
    includeOptionals = [],
    excludeItems = [],
    recurringMonths = 12,
    applyDiscount = 0,
    sectorVariation = 0
  } = customizations || {}

  let oneTimeTotal = 0
  let recurringMonthly = 0
  const breakdown: {
    item: TemplateItem
    calculatedPrice: number
    isIncluded: boolean
  }[] = []

  for (const item of template.items) {
    const isExcluded = excludeItems.includes(item.id)
    const isOptional = item.category === 'optional'
    const shouldInclude = !isExcluded && (!isOptional || includeOptionals.includes(item.id))

    let calculatedPrice = item.priceRange.standard
    
    if (sectorVariation !== 0 && item.variability) {
      const maxVariation = (calculatedPrice * item.variability) / 100
      const actualVariation = (maxVariation * sectorVariation) / 100
      calculatedPrice = calculatedPrice + actualVariation
    }

    breakdown.push({
      item,
      calculatedPrice: Number(calculatedPrice.toFixed(2)),
      isIncluded: shouldInclude
    })

    if (shouldInclude) {
      if (item.category === 'recurring') {
        recurringMonthly += calculatedPrice
      } else {
        oneTimeTotal += calculatedPrice * (item.quantity || 1)
      }
    }
  }

  if (applyDiscount > 0) {
    oneTimeTotal = oneTimeTotal * (1 - applyDiscount / 100)
  }

  const recurringAnnual = recurringMonthly * recurringMonths
  const total = oneTimeTotal + recurringAnnual

  return {
    oneTimeTotal: Number(oneTimeTotal.toFixed(2)),
    recurringMonthly: Number(recurringMonthly.toFixed(2)),
    recurringAnnual: Number(recurringAnnual.toFixed(2)),
    total: Number(total.toFixed(2)),
    breakdown
  }
}

export function generateQuoteNumber(prefix = 'RIG-PVTN'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const sequence = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  
  return `${prefix}-${year}${month}${day}-${sequence}`
}

export function applyCostVariation(
  basePrice: number,
  variationPercent: number,
  maxVariation: number = 30
): number {
  const clampedVariation = Math.max(-maxVariation, Math.min(maxVariation, variationPercent))
  const newPrice = basePrice * (1 + clampedVariation / 100)
  return Number(newPrice.toFixed(2))
}

export function getStandardManagementCosts(includeDomain = false) {
  return {
    items: [
      {
        description: ANNUAL_MANAGEMENT_COSTS.technical.description,
        monthly: ANNUAL_MANAGEMENT_COSTS.technical.monthly,
        annual: ANNUAL_MANAGEMENT_COSTS.technical.monthly * 12
      },
      {
        description: ANNUAL_MANAGEMENT_COSTS.content.description,
        monthly: ANNUAL_MANAGEMENT_COSTS.content.monthly,
        annual: ANNUAL_MANAGEMENT_COSTS.content.monthly * 12
      },
      {
        description: ANNUAL_MANAGEMENT_COSTS.hosting.description,
        monthly: ANNUAL_MANAGEMENT_COSTS.hosting.monthly,
        annual: ANNUAL_MANAGEMENT_COSTS.hosting.monthly * 12
      },
      ...(includeDomain ? [{
        description: ANNUAL_MANAGEMENT_COSTS.domain.description,
        monthly: ANNUAL_MANAGEMENT_COSTS.domain.monthly,
        annual: ANNUAL_MANAGEMENT_COSTS.domain.monthly * 12
      }] : [])
    ],
    totalMonthly: ANNUAL_MANAGEMENT_COSTS.getTotalMonthly(includeDomain),
    totalAnnual: ANNUAL_MANAGEMENT_COSTS.getTotalAnnual(includeDomain)
  }
}
