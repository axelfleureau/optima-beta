"use client"

import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { TokenPlan } from "@/lib/constants/token-plans"
import { liquidExpand, glowPulse } from "@/lib/animations/liquid"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  plan: TokenPlan
  currentPlan?: string | null
  onSelect: (planId: string) => void
  loading?: boolean
  popular?: boolean
}

export function PricingCard({ 
  plan, 
  currentPlan, 
  onSelect, 
  loading = false,
  popular = false 
}: PricingCardProps) {
  const isCurrentPlan = currentPlan === plan.id
  const canUpgrade = currentPlan && parseInt(currentPlan) < parseInt(plan.id)
  const canDowngrade = currentPlan && parseInt(currentPlan) > parseInt(plan.id)
  
  return (
    <motion.div
      variants={liquidExpand}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="relative h-full"
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Più Popolare
          </div>
        </div>
      )}
      
      <GlassCard 
        variant={popular ? "gradient" : "default"}
        glow={popular ? "medium" : "none"}
        className={cn(
          "h-full flex flex-col p-6 relative overflow-hidden",
          popular && "border-purple-500/50"
        )}
      >
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            {plan.name}
          </h3>
          <p className="text-sm text-muted-foreground">{plan.target}</p>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{plan.currency === "EUR" ? "€" : "$"}{plan.price}</span>
            <span className="text-muted-foreground">/{plan.interval === "month" ? "mese" : "anno"}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {plan.tokenLimit.toLocaleString()} token mensili
          </p>
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <GlassButton
          onClick={() => onSelect(plan.id)}
          disabled={loading || isCurrentPlan}
          className={cn(
            "w-full",
            isCurrentPlan && "opacity-50 cursor-not-allowed",
            popular && !isCurrentPlan && "bg-gradient-to-r from-purple-500 to-pink-500"
          )}
        >
          {loading ? (
            "Caricamento..."
          ) : isCurrentPlan ? (
            "Piano Attuale"
          ) : canUpgrade ? (
            "Upgrade"
          ) : canDowngrade ? (
            "Downgrade"
          ) : (
            "Inizia Ora"
          )}
        </GlassButton>
      </GlassCard>
    </motion.div>
  )
}
