"use client"

import { Sparkles, Zap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Separator } from "@/components/ui/separator"

interface TokenCost {
  gpt4?: number
  dalle?: number
  sora?: number
  total: number
}

interface TokenConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenCost: TokenCost | undefined
  contentType: string
  onConfirm: () => void
  onCancel: () => void
}

export function TokenConsentDialog({
  open,
  onOpenChange,
  tokenCost,
  contentType,
  onConfirm,
  onCancel,
}: TokenConsentDialogProps) {
  if (!tokenCost) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white/80 dark:bg-black/50 backdrop-blur-lg border border-white/40 dark:border-white/20 shadow-glass-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Conferma Generazione AI
          </DialogTitle>
          <DialogDescription>
            Questa operazione consumerà tokens dal tuo piano
          </DialogDescription>
        </DialogHeader>
        
        <GlassCard variant="default" padding="md">
          <h3 className="font-semibold mb-3">Breakdown Costi</h3>
          
          <div className="space-y-2 text-sm">
            {tokenCost.gpt4 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPT-4 Copy Generation</span>
                <span className="font-medium">{tokenCost.gpt4} tokens</span>
              </div>
            )}
            
            {tokenCost.dalle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">DALL-E 3 Image</span>
                <span className="font-medium">{tokenCost.dalle} tokens</span>
              </div>
            )}
            
            {tokenCost.sora && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sora 2 Video ({contentType})</span>
                <span className="font-medium">{tokenCost.sora} tokens</span>
              </div>
            )}
            
            <Separator className="my-3" />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Totale</span>
              <span>{tokenCost.total} tokens</span>
            </div>
          </div>
        </GlassCard>
        
        <div className="flex gap-3 mt-4">
          <GlassButton variant="ghost" onClick={onCancel} className="flex-1">
            Annulla
          </GlassButton>
          <GlassButton onClick={onConfirm} className="flex-1">
            <Zap className="h-4 w-4 mr-2" />
            Conferma e Genera
          </GlassButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
