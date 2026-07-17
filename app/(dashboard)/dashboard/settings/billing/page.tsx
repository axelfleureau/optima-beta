"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRealTimeTokens } from "@/hooks/use-real-time-tokens"
import { PricingCard, PlanUpgradeDialog } from "@/components/pricing"
import { GlassCard } from "@/components/ui/glass-card"
import { getAllPlans, getPlanById, formatTokenLimit, TokenPlan } from "@/lib/constants/token-plans"
import { Sparkles, TrendingUp, Calendar, CreditCard } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { auth } from "@/lib/firebase"

export default function BillingPage() {
  const { userData } = useAuth()
  const tokenData = useRealTimeTokens(userData?.id || "")
  const [selectedPlan, setSelectedPlan] = useState<TokenPlan | null>(null)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  
  const currentPlan = getPlanById(userData?.plan || "")
  const allPlans = getAllPlans()
  
  const usagePercentage = tokenData.tokensLimit > 0 
    ? (tokenData.tokensUsed / tokenData.tokensLimit) * 100 
    : 0
  
  const handlePlanSelect = async (planId: string) => {
    if (!userData) return
    
    const currentSubscriptionId = userData.stripeSubscriptionId
    const targetPlan = getPlanById(planId)
    if (!targetPlan) return
    
    // CASE 1: No existing subscription - create new
    if (!currentPlan || !currentSubscriptionId) {
      await handleCreateSubscription(planId)
      return
    }
    
    // CASE 2: Has existing subscription - update it
    setSelectedPlan(targetPlan)
    setIsUpgradeDialogOpen(true)
  }
  
  const handleCreateSubscription = async (planId: string) => {
    try {
      toast.loading("Creazione checkout session...")
      
      const user = auth.currentUser
      if (!user) {
        toast.error("Autenticazione richiesta")
        return
      }
      
      const token = await user.getIdToken()
      
      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      })
      
      const data = await response.json()
      
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        toast.error(data.error || "Errore nella creazione del checkout")
      }
    } catch (error) {
      const err = error as Error
      toast.error(`Errore: ${err.message}`)
    }
  }
  
  const handleUpgradeConfirm = async () => {
    if (!selectedPlan || !userData?.stripeSubscriptionId) return
    
    try {
      toast.loading("Aggiornamento piano...")
      
      const user = auth.currentUser
      if (!user) {
        toast.error("Autenticazione richiesta")
        return
      }
      
      const token = await user.getIdToken()
      
      // Call UPDATE subscription endpoint (not create)
      const response = await fetch("/api/stripe/update-subscription", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          subscriptionId: userData.stripeSubscriptionId,
          newPlanId: selectedPlan.id 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success("Piano aggiornato con successo!")
        setIsUpgradeDialogOpen(false)
      } else {
        toast.error(data.error || "Errore nell'aggiornamento")
      }
    } catch (error) {
      const err = error as Error
      toast.error(`Errore: ${err.message}`)
    }
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Fatturazione & Piano</h1>
        <p className="text-muted-foreground">
          Gestisci il tuo piano di token e monitora il consumo
        </p>
      </div>
      
      {currentPlan && (
        <GlassCard className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold">Piano Attuale: {currentPlan.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentPlan.tokenLimit.toLocaleString()} token mensili
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">€{currentPlan.price}</div>
              <div className="text-sm text-muted-foreground">/mese</div>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilizzo Token</span>
              <span className="font-medium">
                {formatTokenLimit(tokenData.tokensUsed)} / {formatTokenLimit(tokenData.tokensLimit)}
              </span>
            </div>
            <Progress 
              value={usagePercentage} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{usagePercentage.toFixed(1)}% utilizzato</span>
              <span>{formatTokenLimit(tokenData.tokensAvailable)} disponibili</span>
            </div>
          </div>
          
          {usagePercentage >= 80 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-200 mb-1">
                  Token in esaurimento
                </h3>
                <p className="text-sm text-orange-300/80">
                  Hai utilizzato {usagePercentage.toFixed(0)}% dei tuoi token mensili. 
                  Considera un upgrade per evitare interruzioni.
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Prossimo Rinnovo</div>
                <div className="text-sm text-muted-foreground">
                  {userData?.billingCycleEnd 
                    ? new Date(userData.billingCycleEnd).toLocaleDateString("it-IT")
                    : "N/A"
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Metodo di Pagamento</div>
                <div className="text-sm text-muted-foreground">
                  {userData?.stripeCustomerId ? "Card •••• 4242" : "Nessuno"}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
      
      <div>
        <h2 className="text-2xl font-semibold mb-6">
          {currentPlan ? "Cambia Piano" : "Scegli un Piano"}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan?.id}
              onSelect={handlePlanSelect}
              popular={plan.id === "180"}
            />
          ))}
        </div>
      </div>
      
      {currentPlan && selectedPlan && (
        <PlanUpgradeDialog
          open={isUpgradeDialogOpen}
          onOpenChange={setIsUpgradeDialogOpen}
          currentPlan={currentPlan}
          targetPlan={selectedPlan}
          onConfirm={handleUpgradeConfirm}
        />
      )}
    </div>
  )
}
