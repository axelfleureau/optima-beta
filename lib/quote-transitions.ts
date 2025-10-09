import { Quote } from "@/types/quote"
import { UserRole } from "@/lib/role-hierarchy"
import { updateQuote } from "@/lib/quote-service"

export type QuoteStatus = "draft" | "sent" | "in_review" | "pending_payment" | "approved" | "in_progress" | "completed" | "rejected" | "expired"

export interface QuoteTransition {
  from: QuoteStatus[]
  to: QuoteStatus
  requiredRole?: UserRole[]
  webhookTriggered?: boolean
  validate?: (quote: Quote) => boolean | string
}

export const QUOTE_TRANSITIONS: Record<string, QuoteTransition> = {
  send: {
    from: ["draft"],
    to: "sent",
    requiredRole: ["super-admin", "admin", "direzione", "capo-reparto"],
    validate: (quote) => {
      // DUAL CLIENT MODE: Check for email regardless of client type
      const hasEmail = quote.clientEmail || quote.externalClientEmail
      if (!hasEmail) return "Email cliente richiesta per inviare"
      
      // Check for client data (either platform or external)
      const hasClientData = quote.clientId || (quote.externalClientName && quote.externalClientEmail)
      if (!hasClientData) return "Dati cliente richiesti (piattaforma o esterno)"
      
      if (quote.items?.length === 0 && (!quote.voci || quote.voci.length === 0)) return "Aggiungi almeno una voce"
      return true
    }
  },
  
  requestReview: {
    from: ["sent"],
    to: "in_review",
    webhookTriggered: true,
  },
  
  approve: {
    from: ["sent", "in_review"],
    to: "approved",
    webhookTriggered: true,
  },
  
  paymentPending: {
    from: ["approved"],
    to: "pending_payment",
    webhookTriggered: true,
  },
  
  startWork: {
    from: ["pending_payment", "approved"],
    to: "in_progress",
    requiredRole: ["super-admin", "admin", "direzione"],
    validate: (quote) => {
      if (quote.paymentPlan?.type === 'deposit_milestone') {
        const depositPaid = quote.paymentPlan.milestones?.some(m => m.name.includes('Deposito') && m.status === 'paid')
        if (!depositPaid) return "Deposito non pagato"
      }
      return true
    }
  },
  
  complete: {
    from: ["in_progress"],
    to: "completed",
    requiredRole: ["super-admin", "admin", "direzione"],
    validate: (quote) => {
      if (quote.paymentPlan?.type === 'deposit_milestone') {
        const allPaid = quote.paymentPlan.milestones?.every(m => m.status === 'paid')
        if (!allPaid) return "Non tutti i pagamenti completati"
      }
      return true
    }
  },
  
  reject: {
    from: ["sent", "in_review"],
    to: "rejected",
    webhookTriggered: true,
  },
  
  markExpired: {
    from: ["sent", "in_review"],
    to: "expired",
    validate: (quote) => {
      const now = new Date()
      if (quote.validUntil > now) return "Preventivo non ancora scaduto"
      return true
    }
  }
}

export function canTransition(
  quote: Quote,
  transition: keyof typeof QUOTE_TRANSITIONS,
  userRole?: UserRole
): { allowed: boolean; reason?: string } {
  const trans = QUOTE_TRANSITIONS[transition]
  if (!trans) return { allowed: false, reason: "Transizione non valida" }
  
  if (!trans.from.includes(quote.status as QuoteStatus)) {
    return { allowed: false, reason: `Non puoi fare questa azione da stato ${quote.status}` }
  }
  
  // Check role permission - HARD FAIL if role required but missing
  if (trans.requiredRole) {
    if (!userRole) {
      return { allowed: false, reason: "Autenticazione richiesta per questa azione" }
    }
    if (!trans.requiredRole.includes(userRole)) {
      return { allowed: false, reason: "Non hai i permessi per questa azione" }
    }
  }
  
  if (trans.validate) {
    const result = trans.validate(quote)
    if (result !== true) {
      return { allowed: false, reason: result as string }
    }
  }
  
  return { allowed: true }
}

export async function executeTransition(
  quoteId: string,
  transition: keyof typeof QUOTE_TRANSITIONS,
  tenantId: string,
  userId: string,
  userName?: string,
  userRole?: UserRole
): Promise<void> {
  // ✅ VALIDATE FIRST - fetch quote via API and check canTransition
  const response = await fetch(`/api/quotes/${quoteId}`)
  
  if (!response.ok) {
    throw new Error("Preventivo non trovato")
  }
  
  const quote = await response.json()
  
  if (!quote) {
    throw new Error("Preventivo non trovato")
  }
  
  const { allowed, reason } = canTransition(quote, transition, userRole)
  
  if (!allowed) {
    throw new Error(reason || "Transizione non permessa")
  }
  
  // Execute transition
  const trans = QUOTE_TRANSITIONS[transition]
  
  const updateData: any = { 
    status: trans.to,
    updatedAt: new Date()
  }
  
  if (trans.to === 'sent') {
    updateData.sentAt = new Date()
  } else if (trans.to === 'approved') {
    updateData.approvedAt = new Date()
  }
  
  await updateQuote(quoteId, updateData, tenantId, userId, userName)
}
