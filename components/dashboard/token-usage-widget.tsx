"use client"

import { useAuth } from "@/lib/auth-context"
import { useRealTimeTokens } from "@/hooks/use-real-time-tokens"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { Progress } from "@/components/ui/progress"
import { Zap, ArrowRight } from "lucide-react"
import { formatTokenLimit } from "@/lib/constants/token-plans"
import Link from "next/link"

export function TokenUsageWidget() {
  const { userData } = useAuth()
  const tokenData = useRealTimeTokens(userData?.id || "")
  
  const usagePercentage = tokenData.tokensLimit > 0 
    ? (tokenData.tokensUsed / tokenData.tokensLimit) * 100 
    : 0
  
  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">Token Mensili</h3>
        </div>
        <Link href="/dashboard/settings/billing">
          <GlassButton variant="ghost" size="sm">
            Gestisci
            <ArrowRight className="w-3 h-3 ml-1" />
          </GlassButton>
        </Link>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">
            {formatTokenLimit(tokenData.tokensUsed)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatTokenLimit(tokenData.tokensLimit)}
          </span>
        </div>
        
        <Progress value={usagePercentage} className="h-2" />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{usagePercentage.toFixed(0)}% utilizzato</span>
          <span>{formatTokenLimit(tokenData.tokensAvailable)} disponibili</span>
        </div>
      </div>
    </GlassCard>
  )
}
