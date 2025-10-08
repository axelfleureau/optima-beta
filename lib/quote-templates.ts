// Template preventivi per settore basati sui preventivi reali Righello
// Estratti dall'analisi dei PDF preventivi forniti

import {
  ProjectTemplate,
  getProjectTemplate as getProjectTemplateFromLib,
  calculateDynamicPrice as calculateDynamicPriceFromLib,
  generateQuoteNumber as generateQuoteNumberFromLib,
  applyCostVariation,
  getStandardManagementCosts,
  ANNUAL_MANAGEMENT_COSTS,
  PROJECT_TEMPLATES
} from './righello-project-templates'

export interface ServiceItem {
  id: string
  name: string
  description: string
  price: number
  category: 'base' | 'optional' | 'recurring'
}

export interface SectorTemplate {
  id: string
  name: string
  keywords: string[]
  baseServices: ServiceItem[]
  optionalServices: ServiceItem[]
  recurringServices: ServiceItem[]
  standardSections: {
    objectives: string[]
    activities: string[]
    timeline: string
  }
}

// TEMPLATE SETTORI
export const SECTOR_TEMPLATES: SectorTemplate[] = [
  {
    id: 'edilizia',
    name: 'Edilizia e Costruzioni',
    keywords: ['edile', 'costruzioni', 'cantiere', 'impresa', 'demolizioni', 'infrastrutture', 'cemento', 'muratura'],
    baseServices: [
      {
        id: 'planning',
        name: 'Progettazione e Pianificazione',
        description: 'Raccolta dei requisiti, analisi della concorrenza, e definizione della struttura del sito (sitemap). Creazione del design (mockup e wireframe).',
        price: 1000,
        category: 'base'
      },
      {
        id: 'development',
        name: 'Sviluppo Tecnico',
        description: 'Implementazione delle pagine principali (Homepage, Chi siamo, Servizi, Opere, Sostenibilità, Contatti). Creazione di gallerie dinamiche per progetti.',
        price: 1500,
        category: 'base'
      },
      {
        id: 'seo',
        name: 'SEO Optimization',
        description: 'Ottimizzazione dei contenuti per il settore edile, creazione di meta tag, URL ottimizzati e descrizioni. Miglioramento posizionamento motori di ricerca.',
        price: 650,
        category: 'base'
      },
      {
        id: 'privacy',
        name: 'Configurazione Privacy Policy',
        description: 'Configurazione del modulo di contatto e delle policy GDPR.',
        price: 200,
        category: 'base'
      }
    ],
    optionalServices: [
      {
        id: 'content_insertion',
        name: 'Inserimento Contenuti',
        description: 'Inserimento di 10 progetti iniziali con foto e descrizioni.',
        price: 150,
        category: 'optional'
      },
      {
        id: 'video_production',
        name: 'Piano di Comunicazione 150°',
        description: 'Documentazione di 10 cantieri attraverso video e fotografie professionali.',
        price: 4000,
        category: 'optional'
      }
    ],
    recurringServices: [
      {
        id: 'technical_support',
        name: 'Gestione Tecnica e Supporto',
        description: 'Risoluzione bug, monitoraggio sicurezza, aggiornamenti sistema.',
        price: 150,
        category: 'recurring'
      },
      {
        id: 'content_management',
        name: 'Gestione Contenuti',
        description: 'Inserimento nuovi contenuti (progetti, immagini, testi) fino a 2-3 aggiornamenti mensili.',
        price: 170,
        category: 'recurring'
      },
      {
        id: 'hosting',
        name: 'Hosting (Costo Esterno)',
        description: 'Hosting professionale con prestazioni affidabili e sicurezza.',
        price: 27,
        category: 'recurring'
      }
    ],
    standardSections: {
      objectives: [
        'Realizzare un sito web con grafica moderna che valorizzi l\'identità aziendale',
        'Strutturare sezioni: Homepage, Chi siamo, Servizi, Opere, Sostenibilità, Contatti',
        'Implementare galleria dinamica per progetti e cantieri',
        'Aumentare visibilità sui motori di ricerca per il settore edile',
        'Garantire esperienza utente ottimale su desktop e mobile'
      ],
      activities: [
        'Pianificazione e progettazione con analisi esigenze aziendali',
        'Sviluppo tecnico con design responsive ottimizzato',
        'Creazione gallerie dinamiche per progetti svolti',
        'SEO optimization specifica per il settore edile',
        'Test e consegna con controlli funzionalità complete'
      ],
      timeline: '12-16 settimane'
    }
  },
  {
    id: 'medicina',
    name: 'Medicina e Sanità',
    keywords: ['medico', 'clinica', 'poliambulatorio', 'diagnostica', 'radiologia', 'analisi', 'sanitario', 'dottore'],
    baseServices: [
      {
        id: 'planning',
        name: 'Progettazione e Pianificazione',
        description: 'Definizione struttura sito con sezioni: Area Medica, Area Diagnostica, Laboratorio Analisi, Area Radiologica. Analisi esigenze specifiche.',
        price: 1300,
        category: 'base'
      },
      {
        id: 'development',
        name: 'Sviluppo Tecnico',
        description: 'Implementazione pagine principali con focus su servizi medici. Collegamento a sistemi di prenotazione e referti online.',
        price: 1500,
        category: 'base'
      },
      {
        id: 'seo',
        name: 'SEO Optimization',
        description: 'Ottimizzazione per il settore medico-sanitario, meta tag e URL ottimizzati per servizi medici.',
        price: 250,
        category: 'base'
      },
      {
        id: 'privacy',
        name: 'Configurazione Privacy Policy',
        description: 'Adeguamento alle normative GDPR per settore sanitario.',
        price: 200,
        category: 'base'
      }
    ],
    optionalServices: [
      {
        id: 'content_insertion',
        name: 'Inserimento Contenuti',
        description: 'Trasferimento contenutistica esistente e ottimizzazione.',
        price: 250,
        category: 'optional'
      },
      {
        id: 'video_shooting',
        name: 'Video e Shooting Fotografico',
        description: 'Video presentazione 45-60 secondi + shooting fotografico professionale.',
        price: 770,
        category: 'optional'
      }
    ],
    recurringServices: [
      {
        id: 'privacy_management',
        name: 'Gestione Privacy Policy',
        description: 'Aggiornamento periodico privacy policy per conformità normative.',
        price: 20,
        category: 'recurring'
      },
      {
        id: 'content_management',
        name: 'Gestione Contenuti',
        description: 'Aggiornamenti contenuti su richiesta.',
        price: 0,
        category: 'recurring'
      },
      {
        id: 'hosting',
        name: 'Hosting (Costo Esterno)',
        description: 'Hosting sicuro per strutture sanitarie.',
        price: 27,
        category: 'recurring'
      }
    ],
    standardSections: {
      objectives: [
        'Restyling del sito web con estetica moderna e funzionale',
        'Organizzare sezioni: Area Medica, Area Diagnostica, Laboratorio Analisi',
        'Migliorare navigazione con categorie chiare per servizi medici',
        'Integrare sistemi di prenotazione e accesso referti online',
        'Garantire conformità alle normative del settore sanitario'
      ],
      activities: [
        'Analisi preliminare e raccolta requisiti specifici settore sanitario',
        'Sviluppo tecnico con focus su servizi medici e diagnostici',
        'Integrazione con sistemi di prenotazione e referti esistenti',
        'Ottimizzazione per dispositivi mobili e accessibilità',
        'Test funzionalità e conformità normative'
      ],
      timeline: '12-16 settimane'
    }
  },
  {
    id: 'hospitality',
    name: 'Hospitality e Turismo',
    keywords: ['hotel', 'resort', 'ristorante', 'turismo', 'ospitalità', 'eventi', 'ristorazione', 'albergo'],
    baseServices: [
      {
        id: 'brand_analysis',
        name: 'Sistemazione Generale',
        description: 'Ristrutturazione presenza digitale, unificazione account social, pulizia contenuti obsoleti.',
        price: 1000,
        category: 'base'
      },
      {
        id: 'video_main',
        name: 'Video Principale',
        description: 'Video professionale 45-60 secondi + shooting fotografico + clip per contenuti digitali.',
        price: 400,
        category: 'base'
      },
      {
        id: 'photo_shooting',
        name: 'Shooting Fotografico',
        description: 'Immagini ad alta risoluzione per valorizzare struttura e atmosfera.',
        price: 250,
        category: 'base'
      }
    ],
    optionalServices: [
      {
        id: 'communication_plan',
        name: 'Piano di Comunicazione 180°',
        description: 'Strategia editoriale completa con produzione contenuti mensili.',
        price: 2500,
        category: 'optional'
      },
      {
        id: 'branding_discount',
        name: 'Sconto Co-Branding',
        description: 'Riduzione 50% costi in cambio integrazione branding Righello.',
        price: -385,
        category: 'optional'
      }
    ],
    recurringServices: [
      {
        id: 'technical_management',
        name: 'Gestione Tecnica',
        description: 'Sistemazione profili social, gestione strumenti digitali.',
        price: 30,
        category: 'recurring'
      },
      {
        id: 'content_production',
        name: 'Produzione Contenuti',
        description: 'Uscite mensili per documentazione attività e produzione video.',
        price: 800,
        category: 'recurring'
      }
    ],
    standardSections: {
      objectives: [
        'Valorizzare lifestyle e identità del resort/struttura',
        'Promuovere attività stagionali e eventi',
        'Posizionare brand come luogo esclusivo ma accessibile',
        'Fidelizzare target specifico e aumentare visibilità',
        'Creare presenza digitale coerente e professionale'
      ],
      activities: [
        'Analisi e sistemazione presenza digitale esistente',
        'Produzione contenuti multimediali di alta qualità',
        'Sviluppo strategia editoriale integrata',
        'Ottimizzazione visual branding per coerenza',
        'Gestione social media e monitoraggio performance'
      ],
      timeline: '8-12 settimane'
    }
  },
  {
    id: 'creativi',
    name: 'Creativi e Design',
    keywords: ['design', 'creativo', 'fotografia', 'architettura', 'interni', 'grafica', 'artistico'],
    baseServices: [
      {
        id: 'photo_package',
        name: 'Pacchetto Foto',
        description: 'Servizio fotografico professionale per catturare dettagli e atmosfere degli spazi.',
        price: 300,
        category: 'base'
      }
    ],
    optionalServices: [
      {
        id: 'photo_video_package',
        name: 'Pacchetto Foto + Video Interno',
        description: 'Foto + riprese video interne per valorizzare dinamicamente gli spazi.',
        price: 650,
        category: 'optional'
      },
      {
        id: 'complete_package',
        name: 'Pacchetto Completo',
        description: 'Foto + video interno + riprese esterne con drone per visione completa.',
        price: 1190,
        category: 'optional'
      }
    ],
    recurringServices: [],
    standardSections: {
      objectives: [
        'Fornire contenuti multimediali di alta qualità',
        'Valorizzare design e spazi attraverso immagini professionali',
        'Creare materiali versatili per web, social e presentazioni',
        'Catturare essenza creativa e atmosfera unica dei progetti',
        'Produrre contenuti pronti per comunicazione aziendale'
      ],
      activities: [
        'Pianificazione e briefing per identificare caratteristiche chiave',
        'Studio ambienti per ottimizzare riprese fotografiche e video',
        'Produzione shooting fotografico e riprese video professionali',
        'Post-produzione e editing per garantire qualità eccellente',
        'Consegna materiali in formati ottimizzati per tutti gli usi'
      ],
      timeline: '7-14 giorni lavorativi'
    }
  },
  {
    id: 'sport',
    name: 'Sport e Tempo Libero',
    keywords: ['sport', 'sci', 'scuola', 'maestri', 'lezioni', 'discipline', 'fitness', 'palestra'],
    baseServices: [
      {
        id: 'planning_advanced',
        name: 'Progettazione e Pianificazione Avanzata',
        description: 'Definizione struttura sito con sezioni specializzate: Discipline, Maestri, Tariffe, Prenotazioni. Design funzionale per settore sport.',
        price: 1700,
        category: 'base'
      },
      {
        id: 'development_advanced',
        name: 'Sviluppo Tecnico Avanzato',
        description: 'Implementazione con funzionalità avanzate e integrazione sistemi di prenotazione specifici per attività sportive.',
        price: 2800,
        category: 'base'
      },
      {
        id: 'content_insertion',
        name: 'Inserimento Contenuti',
        description: 'Trasferimento e ottimizzazione contenuti esistenti + implementazione materiali multimediali.',
        price: 850,
        category: 'base'
      },
      {
        id: 'seo_advanced',
        name: 'SEO Optimization Avanzata',
        description: 'Ottimizzazione avanzata per settore sport e turismo, parole chiave specifiche per discipline sportive.',
        price: 620,
        category: 'base'
      },
      {
        id: 'privacy',
        name: 'Configurazione Privacy Policy',
        description: 'Adeguamento normative GDPR per settore sportivo e gestione dati clienti.',
        price: 200,
        category: 'base'
      }
    ],
    optionalServices: [
      {
        id: 'video_shooting_sport',
        name: 'Video e Shooting Sportivo',
        description: 'Video presentazione emozionale + shooting fotografico specifico per attività sportive.',
        price: 1200,
        category: 'optional'
      }
    ],
    recurringServices: [
      {
        id: 'technical_support',
        name: 'Gestione Tecnica e Supporto',
        description: 'Bug fixing, aggiornamenti sicurezza specifici per piattaforme di prenotazione sportive.',
        price: 150,
        category: 'recurring'
      },
      {
        id: 'content_management',
        name: 'Gestione Contenuti',
        description: 'Aggiornamenti tariffe, maestri, discipline fino a 2-3 modifiche mensili.',
        price: 170,
        category: 'recurring'
      },
      {
        id: 'hosting',
        name: 'Hosting (Costo Esterno)',
        description: 'Hosting ottimizzato per alta disponibilità durante stagioni sportive.',
        price: 27,
        category: 'recurring'
      }
    ],
    standardSections: {
      objectives: [
        'Creare portale moderno per rappresentare al meglio la scuola/centro sportivo',
        'Integrare sistema prenotazioni online semplificato',
        'Valorizzare discipline e servizi offerti con sezioni dedicate',
        'Ottimizzare per dispositivi mobili e user experience ottimale',
        'Migliorare posizionamento motori di ricerca per settore sport'
      ],
      activities: [
        'Analisi esigenze specifiche e identificazione sezioni principali',
        'Sviluppo sito responsive con integrazione sistemi prenotazione',
        'Produzione contenuti multimediali per trasmettere atmosfera sportiva',
        'Ottimizzazione SEO per settore sport e turismo',
        'Test funzionalità prenotazioni e gestione dinamica contenuti'
      ],
      timeline: '12-18 settimane'
    }
  },
  {
    id: 'immobiliare',
    name: 'Immobiliare e Interior Design',
    keywords: ['immobiliare', 'interior', 'design', 'progettazione', 'immobili', 'casa', 'appartamento', 'villa'],
    baseServices: [
      {
        id: 'planning',
        name: 'Progettazione e Pianificazione',
        description: 'Raccolta requisiti, analisi concorrenza, definizione struttura sito per settore immobiliare. Design specifico per gallerie progetti.',
        price: 1000,
        category: 'base'
      },
      {
        id: 'development',
        name: 'Sviluppo Tecnico',
        description: 'Implementazione pagine principali con gallerie dinamiche per progetti immobiliari e cataloghi. Ottimizzazione mobile.',
        price: 1500,
        category: 'base'
      },
      {
        id: 'seo_multilingual',
        name: 'SEO Multilingua',
        description: 'Ottimizzazione SEO per italiano, tedesco e inglese. Meta tag e URL ottimizzati per mercato immobiliare internazionale.',
        price: 800,
        category: 'base'
      },
      {
        id: 'privacy',
        name: 'Configurazione Privacy Policy',
        description: 'Configurazione modulo contatto e policy GDPR per settore immobiliare.',
        price: 200,
        category: 'base'
      }
    ],
    optionalServices: [
      {
        id: 'video_production_immobili',
        name: 'Produzione Video per 20 Immobili',
        description: 'Video orizzontale + shooting fotografico + video verticale per social per 20 progetti immobiliari.',
        price: 8000,
        category: 'optional'
      }
    ],
    recurringServices: [
      {
        id: 'technical_support',
        name: 'Gestione Tecnica e Supporto',
        description: 'Risoluzione bug, monitoraggio sicurezza, aggiornamenti sistema.',
        price: 150,
        category: 'recurring'
      },
      {
        id: 'content_management',
        name: 'Gestione Contenuti',
        description: 'Inserimento nuovi progetti immobiliari, aggiornamento portfolio fino a 2-3 modifiche mensili.',
        price: 170,
        category: 'recurring'
      },
      {
        id: 'hosting',
        name: 'Hosting (Costo Esterno)',
        description: 'Hosting professionale per gallerie ad alta risoluzione.',
        price: 27,
        category: 'recurring'
      },
      {
        id: 'domain',
        name: 'Dominio (Se Necessario)',
        description: 'Dominio dedicato se non già in possesso.',
        price: 4,
        category: 'recurring'
      }
    ],
    standardSections: {
      objectives: [
        'Modernizzare sito web mantenendo stile grafico di qualità',
        'Aggiungere sezione Progetti completa e dinamica',
        'Creare pagina servizi dettagliata per interior design',
        'Ottimizzare per target multilingue (italiano, tedesco, inglese)',
        'Aumentare visibilità sui motori di ricerca per mercato immobiliare'
      ],
      activities: [
        'Sviluppo basato su design esistente con miglioramenti UX',
        'Creazione sezioni: Homepage, Progetti, Servizi, Chi siamo, Contatti',
        'Inserimento progetti iniziali con possibilità aggiornamenti mensili',
        'SEO multilingua per target internazionale',
        'Ottimizzazione mobile e test cross-browser'
      ],
      timeline: '8-12 settimane'
    }
  }
]

// SEZIONI STANDARD CHE APPAIONO IN TUTTI I PREVENTIVI
export const STANDARD_LEGAL_SECTIONS = {
  utilizzoMateriali: `Confermiamo che i video prodotti nell'ambito di questo progetto potranno essere utilizzati da Righello ed Edis Balihodzic anche per fini interni di pubblicità, promozione, e portfolio. Questo include, ma non è limitato a, l'uso sui nostri canali social media, siti web, e presentazioni a clienti futuri come esempi del nostro lavoro. Ci impegniamo a utilizzare questi materiali in modo che rispetti l'integrità e l'immagine degli organizzatori coinvolti.`,
  
  variazioneCosti: `Il budget proposto per la nostra strategia di comunicazione digitale è concepito per essere il più accurato e trasparente possibile. Tuttavia, riconosciamo che ogni progetto può incontrare variabilità e imprevisti che possono influenzare i costi finali. Pertanto, prevediamo una potenziale variazione dei costi complessivi fino a un massimo del +10%. Questa flessibilità è intesa per accomodare eventuali modifiche nelle specifiche del progetto, imprevisti durante la produzione, o variazioni nei costi dei servizi terzi che potrebbero non essere stati completamente anticipati.

La nostra politica prevede una comunicazione chiara e trasparente in caso di necessità di adeguare il budget oltre la stima iniziale. Qualsiasi potenziale superamento del budget originariamente concordato entro questo margine del +10% sarà comunicato dettagliatamente, includendo le motivazioni di tali variazioni. Ci impegniamo a ottenere l'approvazione scritta prima di procedere con qualsiasi attività che comporti costi aggiuntivi. Questo assicura che i nostri clienti siano sempre informati e in controllo del budget, permettendo una gestione finanziaria efficace e responsabile del progetto.`,

  oggettoContratto: `Il sottoscritto _____________________________ (nome e cognome), in qualità di _____________________________ (titolo/ruolo) per conto della società _____________________________ (nome della società), con la presente accetta il preventivo presentato per la realizzazione di servizi di comunicazione digitale, come dettagliato nella documentazione fornita.

Si riconosce che questo accordo rappresenta un impegno formale alla collaborazione e che qualsiasi variazione nei servizi richiesti o nella portata del progetto può comportare adeguamenti del preventivo iniziale. Inoltre, si prende atto che il preventivo ha validità fino al [DATA], oltre la quale i termini potrebbero essere soggetti a revisione.

In caso di recesso unilaterale dal presente accordo senza giustificato motivo dopo l'accettazione formale del preventivo, si accetta l'applicazione di una penale pari al 10% del costo totale del preventivo accettato. Questa misura è intesa a coprire le spese sostenute e le risorse allocate fino al momento della cancellazione e verrà calcolata solo se i lavori saranno realmente iniziati.

Si impegna, inoltre, a comunicare tempestivamente eventuali cambiamenti nelle necessità o nelle aspettative relative al progetto, per permettere una gestione ottimale del lavoro e delle risorse.`
}

// FUNZIONE PER IDENTIFICARE IL SETTORE DALLA DESCRIZIONE
export function identifySector(description: string): SectorTemplate | null {
  const normalizedDesc = description.toLowerCase()
  
  for (const template of SECTOR_TEMPLATES) {
    const hasKeyword = template.keywords.some(keyword => 
      normalizedDesc.includes(keyword.toLowerCase())
    )
    if (hasKeyword) {
      return template
    }
  }
  
  return null // Default a sito web standard se non riconosciuto
}

// FUNZIONE PER CALCOLARE PREZZO TOTALE
export function calculateTotalPrice(services: ServiceItem[]): number {
  return services.reduce((total, service) => total + service.price, 0)
}

// PRICE RANGES PER CATEGORIA DI SERVIZIO (da analisi PDF)
export const PRICE_RANGES = {
  planning: {
    basic: { min: 1000, max: 1300, standard: 1000 },
    advanced: { min: 1700, max: 1700, standard: 1700 }
  },
  development: {
    basic: { min: 1500, max: 1500, standard: 1500 },
    advanced: { min: 2800, max: 2800, standard: 2800 }
  },
  seo: {
    basic: { min: 250, max: 800, standard: 650 },
    advanced: { min: 620, max: 620, standard: 620 },
    multilingual: { min: 800, max: 800, standard: 800 }
  },
  privacy: {
    standard: { min: 200, max: 200, standard: 200 }
  },
  content: {
    basic: { min: 150, max: 250, standard: 150 },
    advanced: { min: 850, max: 850, standard: 850 }
  },
  video: {
    main: { min: 400, max: 770, standard: 400 },
    shooting: { min: 1200, max: 1200, standard: 1200 }
  },
  photo: {
    basic: { min: 250, max: 300, standard: 250 },
    package: { min: 300, max: 300, standard: 300 }
  },
  communication: {
    digitalSetup: { min: 1000, max: 1000, standard: 1000 },
    editorialStrategy: { min: 1000, max: 1500, standard: 1200 }
  },
  recurring: {
    technical: { monthly: 150, annual: 1800 },
    content: { monthly: 170, annual: 2040 },
    hosting: { monthly: 27, annual: 324 },
    domain: { monthly: 4, annual: 48 }
  }
}

// RE-EXPORT HELPER FUNCTIONS FROM PROJECT TEMPLATES
export const getProjectTemplate = getProjectTemplateFromLib
export const calculateDynamicPrice = calculateDynamicPriceFromLib
export const generateQuoteNumber = generateQuoteNumberFromLib

// RE-EXPORT TYPES
export type { ProjectTemplate }

// RE-EXPORT PROJECT TEMPLATES AND UTILITIES
export {
  applyCostVariation,
  getStandardManagementCosts,
  ANNUAL_MANAGEMENT_COSTS,
  PROJECT_TEMPLATES
}

// INTEGRATION HELPERS

export function identifyProjectType(description: string): {
  type: ProjectTemplate['type']
  complexity?: ProjectTemplate['complexity']
} | null {
  const normalized = description.toLowerCase()
  
  if (normalized.includes('360') || normalized.includes('avanzato') || normalized.includes('complesso')) {
    return { type: 'website', complexity: '360' }
  }
  
  if (normalized.includes('180') || normalized.includes('sito') || normalized.includes('web')) {
    return { type: 'website', complexity: '180' }
  }
  
  if (normalized.includes('comunicazione') && (normalized.includes('150') || normalized.includes('cantieri'))) {
    return { type: 'communication', complexity: '150' }
  }
  
  if (normalized.includes('comunicazione') || normalized.includes('strategia') || normalized.includes('editoriale')) {
    return { type: 'communication', complexity: '180' }
  }
  
  if (normalized.includes('video') || normalized.includes('foto') || normalized.includes('shooting') || normalized.includes('drone')) {
    return { type: 'video', complexity: 'basic' }
  }
  
  return null
}

export function getRecommendedTemplate(
  description: string,
  sector?: SectorTemplate | null
): ProjectTemplate | null {
  const projectType = identifyProjectType(description)
  if (!projectType) {
    return getProjectTemplate('website', '180')
  }
  
  return getProjectTemplate(projectType.type, projectType.complexity)
}

export function calculateQuoteWithSectorAndTemplate(
  description: string,
  customizations?: {
    includeOptionals?: string[]
    excludeItems?: string[]
    recurringMonths?: number
    applyDiscount?: number
    sectorVariation?: number
  }
): {
  sector: SectorTemplate | null
  template: ProjectTemplate | null
  pricing: ReturnType<typeof calculateDynamicPrice> | null
  quoteNumber: string
} {
  const sector = identifySector(description)
  const template = getRecommendedTemplate(description, sector)
  
  const pricing = template ? calculateDynamicPrice(template, customizations) : null
  const quoteNumber = generateQuoteNumber()
  
  return {
    sector,
    template,
    pricing,
    quoteNumber
  }
}

export function getCostVariationRange(
  projectType: ProjectTemplate['type']
): { min: number; max: number } {
  const variationRanges = {
    website: { min: -10, max: 10 },
    video: { min: -30, max: 30 },
    communication: { min: -10, max: 10 },
    branding: { min: -10, max: 10 }
  }
  
  return variationRanges[projectType] || { min: -10, max: 10 }
}

export function formatQuoteTimeline(weeks: string): {
  weeks: string
  startDate: Date
  estimatedEndDate: Date
} {
  const match = weeks.match(/(\d+)-?(\d+)?/)
  if (!match) {
    return {
      weeks,
      startDate: new Date(),
      estimatedEndDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000)
    }
  }
  
  const minWeeks = parseInt(match[1])
  const maxWeeks = match[2] ? parseInt(match[2]) : minWeeks
  const avgWeeks = Math.floor((minWeeks + maxWeeks) / 2)
  
  const startDate = new Date()
  const estimatedEndDate = new Date(Date.now() + avgWeeks * 7 * 24 * 60 * 60 * 1000)
  
  return {
    weeks,
    startDate,
    estimatedEndDate
  }
}