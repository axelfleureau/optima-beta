"use client"

import { Check, X } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { PLAN_FEATURES } from "@/lib/constants/token-plans"
import { cn } from "@/lib/utils"

export function FeatureComparisonGrid() {
  return (
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 font-semibold">Funzionalità</th>
              <th className="text-center p-4 font-semibold">Piano 90°</th>
              <th className="text-center p-4 font-semibold">Piano 180°</th>
              <th className="text-center p-4 font-semibold">Piano 360°</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature, idx) => (
              <tr 
                key={idx} 
                className={cn(
                  "border-b border-white/5 transition-colors hover:bg-white/5",
                  idx === PLAN_FEATURES.length - 1 && "border-b-0"
                )}
              >
                <td className="p-4 text-sm font-medium">{feature.name}</td>
                <td className="p-4 text-center">
                  {renderFeatureValue(feature["90"])}
                </td>
                <td className="p-4 text-center">
                  {renderFeatureValue(feature["180"])}
                </td>
                <td className="p-4 text-center">
                  {renderFeatureValue(feature["360"])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

function renderFeatureValue(value: boolean | string) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-5 h-5 text-green-500 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-red-500/50 mx-auto" />
    )
  }
  return <span className="text-sm text-muted-foreground">{value}</span>
}
