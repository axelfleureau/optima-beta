import type { Timestamp } from "firebase/firestore"

// Existing types (keeping what was already there)
export interface User {
  id: string
  clerkUserId?: string
  email: string
  emailMissing?: boolean
  firstName: string
  lastName: string
  role: "super-admin" | "admin" | "direzione" | "capo-reparto" | "junior" | "client"
  tenantId: string
  parentTenantId?: string
  clientId?: string
  companyName?: string
  createdAt: Timestamp | Date
  updatedAt?: Timestamp | Date
  aiTokensUsed?: number
  aiTokensLimit?: number
  isSuspended?: boolean
  assignedClientIds?: string[]
  plan?: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  stripeConnectedAccountId?: string
  stripeAccountStatus?: 'pending' | 'active' | 'restricted' | 'rejected'
  stripeOnboardingComplete?: boolean
  billingCycleEnd?: string
  status?: string
  lastLoginAt?: Timestamp | Date
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  tenantId: string
  clientTenantId?: string
  color?: string
  industry?: string
  code?: string
  type?: string
  source?: string
  contactName?: string
  pec?: string
  vatNumber?: string
  fiscalCode?: string
  sdiCode?: string
  city?: string
  postalCode?: string
  workType?: string
  notes?: string
  oneDriveFolder?: string
  oneDriveRemotePath?: string
  notionUrl?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  status?: string
  stripeCustomerId?: string
  defaultPaymentMethodId?: string
  paymentMethodType?: 'card' | 'sepa_debit' | 'bank_transfer'
  last4?: string // Last 4 digits of card/IBAN for display
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  projectsCount?: number
  activeTasksCount?: number
  completedTasksCount?: number
  totalValue?: number
  lastActivity?: Timestamp | Date
}

export interface ProjectMember {
  id: string
  name: string
  email: string
  role?: string
}

export interface Project {
  id: string
  name: string
  clientId?: string | null
  clientName?: string
  tenantId: string
  status: "planned" | "active" | "in-progress" | "completed" | "on-hold" | "archived"
  budgetCents?: number
  startsAt?: Timestamp | Date | null
  dueAt?: Timestamp | Date | null
  members?: ProjectMember[]
  memberIds?: string[]
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

export interface Campaign {
  id: string
  name: string
  description?: string
  status: "draft" | "active" | "paused" | "completed"
  startDate: Timestamp
  endDate?: Timestamp
  budget?: number
  clientId: string
  tenantId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// Task Management Types
export interface Task {
  id: string
  title: string
  description?: string
  richDescription?: string
  status:
    | "todo"
    | "to-do"
    | "urgenze"
    | "in-corso"
    | "in-progress"
    | "validation"
    | "review"
    | "done"
    | "completed"
    | "sospensioni"
    | "on-hold"
    | "attivita-ricorrenti"
    | "recurring"
    | "backlog"
    | "planning"
  columnId: string
  priority: "low" | "medium" | "high" | "urgent"
  type?: string
  contentType?: "post" | "video" | "campaign" | "analysis" | "website" | "promo-video" | "other"
  dueDate?: Timestamp | Date | null
  assignee?: string
  assignedUserId?: string | null
  assignmentStatus?: "accepted" | "pending" | "rejected"
  assignmentRequestedByMemberId?: string | null
  assignmentRequestedAt?: Timestamp | Date | null
  assignmentRespondedAt?: Timestamp | Date | null
  assignmentRejectionReason?: string | null
  clientId: string
  clientName?: string
  projectId?: string | null
  projectName?: string
  tenantId: string
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  createdBy?: string
  tags?: string[]
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  subItems?: SubItem[]
  parentItemId?: string | null
  dependencies?: string[] // IDs of tasks this task depends on
  estimatedHours?: number
  actualHours?: number
  score?: number // For AI optimization
  generatedAssets?: GeneratedAsset[] // DALL-E generated assets
  expectedDeliverable?: string // "Sito web responsive", "Logo vettoriale", etc
  deliverableType?: "file" | "design" | "feature" | "content" | "other"
}

export interface GeneratedAsset {
  id: string
  url: string // Firebase Storage download URL
  storagePath: string // For delete operation
  type: 'image' | 'video' // Type of asset
  format: 'png' | 'jpg' | 'mp4' // File format
  metadata: {
    prompt?: string // DALL-E prompt
    dalleModel?: string // dall-e-3
    platform?: string // instagram-feed-grid, etc
    dalleSourceSize?: string // Original DALL-E size
    targetFormat?: string // Final Instagram format
    generatedAt: string // ISO timestamp
    generatedBy: string // User ID
  }
}

export interface TaskAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: Timestamp
  uploadedBy: string
}

export interface TaskComment {
  id: string
  text: string
  authorId: string
  authorName: string
  authorAvatar?: string | null
  createdAt: Timestamp | Date
  updatedAt?: Timestamp | Date
}

export interface TaskSubItem {
  id: string
  title: string
  completed: boolean
  createdAt: Timestamp
}

export interface SubItem {
  id: string
  title: string
  completed: boolean
  createdAt: Timestamp | Date
}

// AI Task Optimization Types
export interface TaskOptimizationRequest {
  tasks: Task[]
  columnId: string
  optimizationType: "blocking_operations" | "priority_based" | "deadline_focused"
  clientId?: string
}

export interface TaskOptimizationResponse {
  optimizedTasks: Task[]
  reasoning: string
  estimatedTokens: number
  actualTokens: number
}

export interface AIOptimizationCostEstimate {
  estimatedTokens: number
  estimatedCost: string
  taskCount: number
  optimizationType: string
}

// Editorial Calendar Types
export enum EditorialPostStatus {
  IDEA = "idea",
  BOZZA = "bozza",
  REVISIONE_INTERNA = "revisione_interna",
  REVISIONE_CLIENTE = "revisione_cliente",
  APPROVATO = "approvato",
  PROGRAMMATO = "programmato",
  PUBBLICATO = "pubblicato",
  RIFIUTATO = "rifiutato",
  ARCHIVIATO = "archiviato",
}

export enum EditorialPostFormat {
  POST_SINGOLO = "post_singolo",
  CAROSELLO = "carosello",
  VIDEO = "video",
  REEL = "reel",
  STORY = "story",
  ARTICOLO_BLOG = "articolo_blog",
  NEWSLETTER = "newsletter",
  PODCAST = "podcast",
  LIVE = "live",
  ALTRO = "altro",
}

export enum SocialPlatform {
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
  LINKEDIN = "linkedin",
  TIKTOK = "tiktok",
  X = "x",
  YOUTUBE = "youtube",
  BLOG = "blog",
  PINTEREST = "pinterest",
  THREADS = "threads",
  ALTRO = "altro",
}

export enum PostObjective {
  AWARENESS = "awareness",
  ENGAGEMENT = "engagement",
  TRAFFIC = "traffic",
  CONVERSIONI = "conversioni",
  VENDITE = "vendite",
  LEAD_GENERATION = "lead_generation",
  BRAND_BUILDING = "brand_building",
  EDUCAZIONE = "educazione",
  INTRATTENIMENTO = "intrattenimento",
  COMMUNITY = "community",
}

export interface EditorialPostVisual {
  url: string
  type: "image" | "video" | "document"
  description?: string
}

export interface AIGeneratedContent {
  id: string
  postId: string // riferimento al post editorialPosts
  type: "caption" | "visual" | "hashtags" | "analysis"
  content: string
  metadata?: {
    score?: number
    suggestions?: string[]
    strengths?: string[]
    improvements?: string[]
    platform?: SocialPlatform
    generatedAt: Timestamp
    model?: string
    tokensUsed?: number
  }
  tenantId: string
  createdBy: string
  createdAt: Timestamp
}

export interface EditorialPost {
  id: string

  // Campi principali (esattamente come nel database Firebase)
  title: string
  content: string
  description?: string

  // Date e programmazione
  scheduledDate: string // formato "YYYY-MM-DD" come nel database
  scheduledTime?: string // formato "HH:MM" come nel database
  createdAt: Timestamp
  updatedAt: Timestamp

  // Stato e formato
  status:
    | "idea"
    | "bozza"
    | "revisione_interna"
    | "revisione_cliente"
    | "approvato"
    | "programmato"
    | "pubblicato"
    | "rifiutato"
    | "archiviato"
  type:
    | "post"
    | "carosello"
    | "video"
    | "reel"
    | "story"
    | "articolo_blog"
    | "newsletter"
    | "podcast"
    | "live"
    | "altro"
  format:
    | "post_singolo"
    | "carosello"
    | "video"
    | "reel"
    | "story"
    | "articolo_blog"
    | "newsletter"
    | "podcast"
    | "live"
    | "altro"

  // Piattaforma (singola stringa come nel database)
  platform:
    | "instagram"
    | "facebook"
    | "linkedin"
    | "tiktok"
    | "x"
    | "youtube"
    | "blog"
    | "pinterest"
    | "threads"
    | "altro"

  // Contenuti e metadata
  keywords?: string[] // array di parole chiave
  hashtags?: string[] // array di hashtag

  // Campi opzionali
  objective?:
    | "awareness"
    | "engagement"
    | "traffic"
    | "conversioni"
    | "vendite"
    | "lead_generation"
    | "brand_building"
    | "educazione"
    | "intrattenimento"
    | "community"
  targetAudience?: string
  notes?: string

  // Identificatori
  clientId: string
  tenantId: string
  createdBy: string

  // Campi legacy mantenuti per compatibilità (saranno rimossi nella migrazione)
  name?: string // deprecato, usa title
  date?: Timestamp // deprecato, usa scheduledDate
  postType?: string // deprecato, usa type
  caption?: string // deprecato, usa content
  visuals?: any[] // deprecato, i media saranno gestiti separatamente
  attachments?: any[] // deprecato, i media saranno gestiti separatamente

  // IMPORTANTE: Rimuovere completamente aiGenerated - sarà spostato in AIGeneratedContent
}

export interface PostFormData {
  title: string
  description?: string
  content: string
  platform: string
  type: string
  postType: string
  scheduledDate: string
  scheduledTime?: string
  status: string
  keywords?: string[]
  hashtags?: string[]
  mediaUrls?: string[]
  clientId: string
  objective?: string
  targetAudience?: string
  notes?: string
}

// Command Bar Types
export enum CommandIntent {
  CREATE_TASK = "CREATE_TASK",
  SEARCH_TASK = "SEARCH_TASK",
  ASSIGN_TASK = "ASSIGN_TASK",
  UPDATE_TASK = "UPDATE_TASK",
  DELETE_TASK = "DELETE_TASK",
  GENERATE_IMAGE = "GENERATE_IMAGE",
  PLAN_CAMPAIGN = "PLAN_CAMPAIGN",
  NAVIGATE = "NAVIGATE",
  SEARCH_GLOBAL = "SEARCH_GLOBAL",
  SHOW_ANALYTICS = "SHOW_ANALYTICS",
  CREATE_CLIENT = "CREATE_CLIENT",
  CREATE_CONTENT_POST = "CREATE_CONTENT_POST",
  CREATE_CONTENT_REEL = "CREATE_CONTENT_REEL",
  CREATE_CONTENT_VIDEO = "CREATE_CONTENT_VIDEO",
  CREATE_CONTENT_BATCH = "CREATE_CONTENT_BATCH",
  TASK_REFINEMENT = "TASK_REFINEMENT",
  GENERATE_DELIVERABLE = "GENERATE_DELIVERABLE",
  CREATE_WEBSITE = "CREATE_WEBSITE",
  CREATE_GRAPHIC_DESIGN = "CREATE_GRAPHIC_DESIGN",
  CREATE_VIDEO_PRODUCTION = "CREATE_VIDEO_PRODUCTION",
  CREATE_SOFTWARE_DEV = "CREATE_SOFTWARE_DEV",
  CREATE_CAMPAIGN_PROJECT = "CREATE_CAMPAIGN_PROJECT",
  UNKNOWN = "UNKNOWN",
}

export interface CommandSuggestion {
  id: string
  title: string
  description?: string
  icon?: string
  intent: CommandIntent
  shortcut?: string
  category?: "task" | "client" | "campaign" | "navigation" | "ai"
}

export interface CommandContext {
  tenantId: string
  userId: string
  userRole: string
  currentView?: string
  selectedClient?: string
  availableClients?: Client[]
  availableUsers?: User[]
}

export interface NLPResponse {
  intent: CommandIntent
  confidence: number
  entities: Record<string, any>
  missingParams?: string[]
  suggestedAction?: string
  reasoning?: string
  requiresConfirmation?: boolean
}

export interface CommandExecutionResult {
  success: boolean
  message: string
  data?: any
  error?: string
}
