"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/glass-button"
import { TokenPlan } from "@/lib/constants/token-plans"
import { liquidExpand } from "@/lib/animations/liquid"
import { toast } from "sonner"

interface PlanUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: TokenPlan
  targetPlan: TokenPlan
  onConfirm: () => Promise<void>
}

export function PlanUpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  onConfirm
}: PlanUpgradeDialogProps) {
  const [loading, setLoading] = useState(false)
  
  const isUpgrade = parseInt(targetPlan.id) > parseInt(currentPlan.id)
  const priceDifference = targetPlan.price - currentPlan.price
  const tokenIncrease = targetPlan.tokenLimit - currentPlan.tokenLimit
  
  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      toast.success(
        isUpgrade 
          ? `Upgrade a ${targetPlan.name} completato!` 
          : `Downgrade pianificato per fine ciclo`
      )
      onOpenChange(false)
    } catch (error) {
      const err = error as Error
      toast.error(`Errore: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <>
                <ArrowUp className="w-5 h-5 text-green-500" />
                Upgrade Piano
              </>
            ) : (
              <>
                <ArrowDown className="w-5 h-5 text-orange-500" />
                Downgrade Piano
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade 
              ? `Passa a ${targetPlan.name} e ottieni più token`
              : `Il downgrade a ${targetPlan.name} sarà effettivo dal prossimo ciclo di fatturazione`
            }
          </DialogDescription>
        </DialogHeader>

        <motion.div 
          className="space-y-4 py-4"
          variants={liquidExpand}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-white/5 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Piano Attuale:</span>
              <span className="font-medium">{currentPlan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nuovo Piano:</span>
              <span className="font-medium">{targetPlan.name}</span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token mensili:</span>
                <span className="font-medium">
                  {tokenIncrease > 0 ? "+" : ""}{tokenIncrease.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo mensile:</span>
                <span className="font-medium">
                  {priceDifference > 0 ? "+" : ""}€{Math.abs(priceDifference).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {!isUpgrade && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-sm text-orange-200">
              Il downgrade sarà attivo dal prossimo ciclo. Fino ad allora, manterrai il piano corrente.
            </div>
          )}

          <div className="flex gap-3">
            <GlassButton
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Annulla
            </GlassButton>
            <GlassButton
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                isUpgrade ? "Conferma Upgrade" : "Conferma Downgrade"
              )}
            </GlassButton>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
