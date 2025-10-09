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
  clientId: string
  clientName: string
  status: "draft" | "sent" | "in_review" | "pending_payment" | "approved" | "in_progress" | "completed" | "rejected" | "expired"
  currency: string
  items: QuoteItem[]
  total: number
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
