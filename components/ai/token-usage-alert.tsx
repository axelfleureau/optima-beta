"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Info, Zap, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TokenUsageAlertProps {
  tokensUsed: number
  tokensLimit: number
  className?: string
  loading?: boolean
}

export function TokenUsageAlert({ tokensUsed, tokensLimit, className, loading }: TokenUsageAlertProps) {
  const [dismissed, setDismissed] = useState<string[]>([])
  
  // Guard against division by zero and loading states
  if (loading || tokensLimit <= 0 || tokensUsed < 0) {
    return null
  }

  const usagePercentage = (tokensUsed / tokensLimit) * 100

  const getAlertLevel = () => {
    if (usagePercentage >= 95) return "critical"
    if (usagePercentage >= 80) return "warning"
    if (usagePercentage >= 60) return "info"
    return "normal"
  }

  const alertLevel = getAlertLevel()
  const alertId = `token-alert-${alertLevel}-${Math.floor(usagePercentage / 5) * 5}`

  // Reset dismissed alerts when usage drops to lower levels
  useEffect(() => {
    if (usagePercentage < 60) {
      setDismissed([])
    }
  }, [usagePercentage])

  if (alertLevel === "normal" || dismissed.includes(alertId)) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(prev => [...prev, alertId])
  }

  const getAlertContent = () => {
    switch (alertLevel) {
      case "critical":
        return {
          icon: AlertTriangle,
          title: "Token quasi esauriti!",
          description: `Hai utilizzato ${tokensUsed.toLocaleString()} dei ${tokensLimit.toLocaleString()} token mensili (${usagePercentage.toFixed(1)}%). Le funzioni AI potrebbero essere limitate presto.`,
          variant: "destructive" as const,
          badgeText: "Critico",
          badgeVariant: "destructive" as const,
        }
      case "warning":
        return {
          icon: AlertTriangle,
          title: "Utilizzo token elevato",
          description: `Hai utilizzato ${tokensUsed.toLocaleString()} dei ${tokensLimit.toLocaleString()} token mensili (${usagePercentage.toFixed(1)}%). Considera di gestire l'utilizzo AI.`,
          variant: "default" as const,
          badgeText: "Attenzione",
          badgeVariant: "secondary" as const,
        }
      case "info":
        return {
          icon: Info,
          title: "Monitoraggio token attivo",
          description: `Hai utilizzato ${tokensUsed.toLocaleString()} dei ${tokensLimit.toLocaleString()} token mensili (${usagePercentage.toFixed(1)}%). Tutto sotto controllo!`,
          variant: "default" as const,
          badgeText: "Info",
          badgeVariant: "outline" as const,
        }
      default:
        return null
    }
  }

  const content = getAlertContent()
  if (!content) return null

  const IconComponent = content.icon

  return (
    <Alert className={cn("relative", className)} variant={content.variant}>
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 mt-0.5" />
          <Badge variant={content.badgeVariant} className="text-xs">
            {content.badgeText}
          </Badge>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1">{content.title}</div>
          <AlertDescription className="text-xs leading-relaxed">
            {content.description}
          </AlertDescription>
          
          {/* Token usage bar */}
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Utilizzo corrente</span>
              <span>{usagePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  usagePercentage >= 95 ? "bg-red-500" :
                  usagePercentage >= 80 ? "bg-yellow-500" :
                  usagePercentage >= 60 ? "bg-blue-500" :
                  "bg-green-500"
                )}
                style={{ width: `${Math.min(100, usagePercentage)}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-background/50"
          onClick={handleDismiss}
        >
          ×
        </Button>
      </div>
    </Alert>
  )
}

// Enhanced token usage component with trend analysis
interface TokenUsageStatsProps {
  tokensUsed: number
  tokensLimit: number
  dailyUsage?: number[]
  className?: string
  loading?: boolean
}

export function TokenUsageStats({ tokensUsed, tokensLimit, dailyUsage = [], className, loading }: TokenUsageStatsProps) {
  // Guard against invalid states
  if (loading || tokensLimit <= 0 || tokensUsed < 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
            <span className="font-medium text-sm">Token AI</span>
          </div>
          <Badge variant="outline" className="text-xs animate-pulse">
            Caricamento...
          </Badge>
        </div>
      </div>
    )
  }

  const usagePercentage = Math.max(0, Math.min(100, (tokensUsed / tokensLimit) * 100))
  const remainingTokens = Math.max(0, tokensLimit - tokensUsed)
  const avgDailyUsage = dailyUsage.length > 0 ? dailyUsage.reduce((a, b) => a + b, 0) / dailyUsage.length : 0
  const daysRemaining = avgDailyUsage > 0 ? Math.floor(remainingTokens / avgDailyUsage) : Infinity

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-sm">Token AI</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              usagePercentage >= 95 ? "bg-red-500" :
              usagePercentage >= 80 ? "bg-yellow-500" :
              usagePercentage >= 60 ? "bg-blue-500" :
              "bg-green-500"
            )}
            style={{ width: `${Math.min(100, usagePercentage)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="text-center">
            <div className="font-medium text-foreground">{usagePercentage.toFixed(1)}%</div>
            <div>Utilizzato</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{remainingTokens.toLocaleString()}</div>
            <div>Rimanenti</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">
              {daysRemaining === Infinity ? "∞" : daysRemaining}
            </div>
            <div>Giorni</div>
          </div>
        </div>

        {avgDailyUsage > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-1 border-t">
            Media giornaliera: {avgDailyUsage.toFixed(0)} token/giorno
          </div>
        )}
      </div>
    </div>
  )
}