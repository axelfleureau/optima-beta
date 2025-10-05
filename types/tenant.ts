import type { Timestamp } from "firebase/firestore"

export interface TenantSubscription {
  plan?: "90" | "180" | "360" | null
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | null
  billingCycleStart?: Timestamp | Date
  billingCycleEnd?: Timestamp | Date
  cancelAtPeriodEnd?: boolean
  canceledAt?: Timestamp | Date
}

export interface Tenant extends TenantSubscription {
  id: string
  name: string
  type: "agency" | "client"
  parentTenantId?: string
  aiTokensLimit: number
  aiTokensUsed: number
  settings?: {
    maxUsers: number
    features: string[]
  }
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}
