export const TOKEN_PLANS = {
  "90": {
    id: "90",
    name: "Piano 90°",
    displayName: "Starter",
    price: 14.99,
    currency: "EUR",
    interval: "month",
    tokenLimit: 1_000_000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_90 || "",
    features: [
      "1.000.000 token mensili",
      "DALL-E 3 image generation",
      "GPT-4 AI assistant",
      "Command Bar access",
      "Email support",
      "Basic analytics"
    ],
    target: "Freelancers & Creators",
    popular: false
  },
  "180": {
    id: "180",
    name: "Piano 180°",
    displayName: "Growth",
    price: 39.99,
    currency: "EUR",
    interval: "month",
    tokenLimit: 3_500_000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_180 || "",
    features: [
      "3.500.000 token mensili",
      "DALL-E 3 HD quality",
      "GPT-4 AI assistant",
      "Command Bar access",
      "Priority email support",
      "Advanced analytics",
      "Team collaboration",
      "Export reports"
    ],
    target: "Marketing Teams & SMEs",
    popular: true
  },
  "360": {
    id: "360",
    name: "Piano 360°",
    displayName: "Enterprise",
    price: 99.99,
    currency: "EUR",
    interval: "month",
    tokenLimit: 10_000_000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_360 || "",
    features: [
      "10.000.000 token mensili",
      "DALL-E 3 HD quality",
      "GPT-4 AI assistant unlimited",
      "Command Bar access",
      "Dedicated support",
      "Full analytics suite",
      "Team collaboration",
      "Export reports",
      "Custom integrations",
      "SLA guarantee"
    ],
    target: "Companies & Partners",
    popular: false
  }
} as const

export type PlanId = keyof typeof TOKEN_PLANS
export type TokenPlan = typeof TOKEN_PLANS[PlanId]

export const PLAN_FEATURES = [
  { name: "Token mensili", "90": "1M", "180": "3.5M", "360": "10M" },
  { name: "DALL-E 3 Standard", "90": true, "180": true, "360": true },
  { name: "DALL-E 3 HD", "90": false, "180": true, "360": true },
  { name: "GPT-4 Assistant", "90": "Basic", "180": "Advanced", "360": "Unlimited" },
  { name: "Command Bar", "90": true, "180": true, "360": true },
  { name: "Team Collaboration", "90": false, "180": true, "360": true },
  { name: "Analytics", "90": "Basic", "180": "Advanced", "360": "Full Suite" },
  { name: "Support", "90": "Email", "180": "Priority Email", "360": "Dedicated" },
  { name: "Export Reports", "90": false, "180": true, "360": true },
  { name: "Custom Integrations", "90": false, "180": false, "360": true },
  { name: "SLA", "90": false, "180": false, "360": true }
] as const

export const getPlanById = (planId: string): TokenPlan | null => {
  return TOKEN_PLANS[planId as PlanId] || null
}

export const getAllPlans = (): TokenPlan[] => {
  return Object.values(TOKEN_PLANS)
}

export const formatTokenLimit = (limit: number): string => {
  if (limit >= 1_000_000) {
    return `${(limit / 1_000_000).toFixed(1)}M`
  }
  if (limit >= 1_000) {
    return `${(limit / 1_000).toFixed(0)}K`
  }
  return limit.toString()
}
