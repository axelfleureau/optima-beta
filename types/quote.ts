export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  title: string
  description?: string
  
  // DUAL CLIENT MODE: Platform Client (with clientId) OR External Client (with name+email)
  clientMode?: 'platform' | 'external' // Track which client mode is active
  
  // Platform Client fields - used when client exists in the platform
  clientId?: string
  clientName: string
  
  // External Client fields - used for clients outside the platform
  externalClientName?: string
  externalClientEmail?: string
  
  status: "draft" | "sent" | "in_review" | "pending_payment" | "approved" | "in_progress" | "completed" | "rejected" | "expired"
  currency: string
  items: QuoteItem[]
  total: number
  
  // Financial breakdown (optional for backward compatibility)
  subtotale?: number
  iva?: number
  percentualeIva?: number
  
  validUntil: Date
  createdAt: Date
  updatedAt: Date
  tenantId: string
  createdBy: string
  
  // Public sharing and approval fields
  shareToken?: string
  sentAt?: Date
  approvedAt?: Date
  approvedBy?: string
  clientEmail?: string
  
  // Pending payment approval fields
  pendingApprovalAt?: Date
  pendingApprovalBy?: string
  
  // Payment plan
  paymentPlan?: {
    type: 'full' | 'deposit_milestone'
    depositPercentage?: number
    milestones?: Array<{
      id: string
      name: string
      percentage: number
      amount: number
      status: 'pending' | 'paid' | 'failed'
    }>
  }
  
  // Editor fields
  obiettivi?: string[]
  attivita?: string[]
  voci?: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
  }>
  terminiCondizioni?: string
}

// Validation helpers for dual client mode
export function validateQuoteClientMode(quote: Partial<Quote>): { valid: boolean; error?: string } {
  const hasClientId = !!quote.clientId
  const hasExternalClient = !!(quote.externalClientName && quote.externalClientEmail)
  
  // Must have EITHER clientId OR external client data
  if (!hasClientId && !hasExternalClient) {
    return { 
      valid: false, 
      error: "Quote must have either clientId (platform client) or externalClientName + externalClientEmail (external client)" 
    }
  }
  
  // Cannot have BOTH modes
  if (hasClientId && hasExternalClient) {
    return { 
      valid: false, 
      error: "Quote cannot have both clientId and external client data. Choose one client mode." 
    }
  }
  
  // Email validation for external clients
  if (hasExternalClient && quote.externalClientEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(quote.externalClientEmail)) {
      return { 
        valid: false, 
        error: "Invalid email format for external client" 
      }
    }
  }
  
  return { valid: true }
}

export function isPlatformClient(quote: Quote): boolean {
  return !!quote.clientId
}

export function isExternalClient(quote: Quote): boolean {
  return !!(quote.externalClientName && quote.externalClientEmail)
}

export function getClientIdentifier(quote: Quote): string {
  if (isPlatformClient(quote)) {
    return `Platform Client: ${quote.clientName} (ID: ${quote.clientId})`
  }
  if (isExternalClient(quote)) {
    return `External Client: ${quote.externalClientName} (${quote.externalClientEmail})`
  }
  return 'Unknown Client'
}

export interface QuoteEvent {
  id: string
  quoteId: string
  tenantId: string
  eventType: 'created' | 'updated' | 'sent' | 'approved' | 'rejected' | 'status_changed'
  eventData: Record<string, any>
  userId: string
  userName?: string
  timestamp: Date
}
