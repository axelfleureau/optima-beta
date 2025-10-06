"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, Zap, Sparkles } from "lucide-react"

const smartBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 backdrop-blur-md",
  {
    variants: {
      variant: {
        incomplete: 
          "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50",
        blocking: 
          "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50",
        urgent: 
          "bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 animate-pulse",
        "ai-generatable": 
          "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "incomplete",
      size: "sm",
    },
  }
)

export interface SmartBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof smartBadgeVariants> {
  showIcon?: boolean
  label?: string
}

const SmartBadge = React.forwardRef<HTMLDivElement, SmartBadgeProps>(
  ({ className, variant, size, showIcon = true, label, ...props }, ref) => {
    const iconMap = {
      incomplete: AlertCircle,
      blocking: AlertTriangle,
      urgent: Zap,
      "ai-generatable": Sparkles,
    }
    
    const Icon = variant ? iconMap[variant] : AlertCircle
    const iconSizeClass = size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4"
    
    return (
      <div
        ref={ref}
        className={cn(smartBadgeVariants({ variant, size }), className)}
        {...props}
      >
        {showIcon && <Icon className={iconSizeClass} />}
        {label && <span>{label}</span>}
      </div>
    )
  }
)
SmartBadge.displayName = "SmartBadge"

export { SmartBadge, smartBadgeVariants }

/**
 * USAGE EXAMPLES:
 * 
 * // Incomplete task - missing data
 * <SmartBadge variant="incomplete" label="Dati incompleti" />
 * 
 * // Blocking task - dependencies
 * <SmartBadge variant="blocking" label="Blocca 3 task" size="md" />
 * 
 * // Urgent task - deadline soon
 * <SmartBadge variant="urgent" label="Scadenza 24h" />
 * 
 * // AI-generatable content
 * <SmartBadge variant="ai-generatable" label="Genera contenuto" showIcon />
 * 
 * // Icon only (no label)
 * <SmartBadge variant="incomplete" />
 */
