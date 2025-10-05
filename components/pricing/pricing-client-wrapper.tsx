"use client"

import { useRouter } from "next/navigation"
import { PricingCard } from "./pricing-card"
import { TokenPlan } from "@/lib/constants/token-plans"

interface PricingClientWrapperProps {
  plan: TokenPlan
  popular?: boolean
}

export function PricingClientWrapper({ plan, popular }: PricingClientWrapperProps) {
  const router = useRouter()
  
  const handleSelect = (planId: string) => {
    router.push(`/login?plan=${planId}`)
  }
  
  return (
    <PricingCard
      plan={plan}
      currentPlan={null}
      onSelect={handleSelect}
      popular={popular}
    />
  )
}
