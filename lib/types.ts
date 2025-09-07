import type { Timestamp } from "firebase/firestore"

// Existing types (keeping what was already there)
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "super-admin" | "admin" | "user" | "client"
  tenantId: string
  parentTenantId?: string
  clientId?: string
  companyName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  aiTokensUsed?: number
  aiTokensLimit?: number
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  tenantId: string
  clientTenantId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
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
  status: "todo" | "in-progress" | "review" | "done"
  columnId: string
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: Timestamp
  assignee?: string
  clientId: string
  clientName?: string
  tenantId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  tags?: string[]
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  subItems?: TaskSubItem[]
  dependencies?: string[] // IDs of tasks this task depends on
  estimatedHours?: number
  actualHours?: number
  score?: number // For AI optimization
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
  authorAvatar?: string
  createdAt: Timestamp
}

export interface TaskSubItem {
  id: string
  title: string
  completed: boolean
  createdAt: Timestamp
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

export interface EditorialPost {
  id: string
  name: string
  date: Timestamp
  status: EditorialPostStatus
  platform: SocialPlatform[]
  format: EditorialPostFormat
  objective?: PostObjective
  keywords?: string[]
  targetAudience?: string
  caption?: string
  notes?: string
  visuals?: EditorialPostVisual[]
  clientId: string
  tenantId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}
