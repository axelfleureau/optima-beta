'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { LiquidButton } from '@/components/ui/liquid-button'
import type { PaymentPlan, Milestone } from '@/types/payment'

interface QuoteWithPaymentPlan {
  id: string
  title: string
  total: number
  currency: string
  paymentPlan?: PaymentPlan
  depositPaidAt?: Date | null
}

interface QuoteMilestonesTabProps {
  quote: QuoteWithPaymentPlan
}

const formatCurrency = (amount: number, currency = 'EUR') => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

const toDate = (timestamp: Date | any): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate()
  }
  return new Date(timestamp)
}

export default function QuoteMilestonesTab({ quote }: QuoteMilestonesTabProps) {
  const [payingMilestone, setPayingMilestone] = useState<string | null>(null)
  
  const handlePayMilestone = async (milestone: Milestone) => {
    setPayingMilestone(milestone.id)
    
    try {
      const res = await fetch(`/api/quotes/${quote.id}/milestones/${milestone.id}/pay`, {
        method: 'POST',
        credentials: 'include',
      })
      
      const result = await res.json()
      
      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        alert('Errore creazione pagamento')
        setPayingMilestone(null)
      }
    } catch (error) {
      console.error('Error creating milestone payment:', error)
      alert('Errore creazione pagamento')
      setPayingMilestone(null)
    }
  }
  
  const getMilestoneStatusBadge = (status: Milestone['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">Pagato</Badge>
      case 'ready':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0">Pronto</Badge>
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-0">In attesa</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0">Fallito</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }
  
  const getDepositStatusBadge = (isPaid: boolean) => {
    if (isPaid) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">Pagato</Badge>
    }
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-0">In attesa</Badge>
  }
  
  if (!quote.paymentPlan) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400">Nessun piano di pagamento configurato.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Piano di Pagamento</h3>
      
      {/* Deposit */}
      {quote.paymentPlan?.type === 'deposit_milestone' && quote.paymentPlan.depositPercentage && (
        <GlassCard padding="md" hover={false}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Deposito Iniziale</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {quote.paymentPlan.depositPercentage}% del totale
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white mb-2">
                {formatCurrency((quote.total * quote.paymentPlan.depositPercentage) / 100, quote.currency)}
              </p>
              {getDepositStatusBadge(!!quote.depositPaidAt)}
              {quote.depositPaidAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {toDate(quote.depositPaidAt).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      )}
      
      {/* Milestones */}
      {quote.paymentPlan?.milestones && quote.paymentPlan.milestones.length > 0 ? (
        quote.paymentPlan.milestones.map((milestone) => (
          <GlassCard key={milestone.id} padding="md" hover={false}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">{milestone.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {milestone.percentage}% del totale
                </p>
                {milestone.dueDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Scadenza: {toDate(milestone.dueDate).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(milestone.amount, quote.currency)}
                </p>
                
                {milestone.status === 'paid' && milestone.paidAt && (
                  <div>
                    {getMilestoneStatusBadge('paid')}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {toDate(milestone.paidAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                )}
                
                {milestone.status === 'ready' && (
                  <LiquidButton
                    onClick={() => handlePayMilestone(milestone)}
                    disabled={payingMilestone === milestone.id}
                    size="sm"
                  >
                    {payingMilestone === milestone.id ? 'Creazione...' : 'Paga Ora'}
                  </LiquidButton>
                )}
                
                {milestone.status === 'pending' && getMilestoneStatusBadge('pending')}
                
                {milestone.status === 'failed' && getMilestoneStatusBadge('failed')}
              </div>
            </div>
          </GlassCard>
        ))
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Nessuna milestone configurata.</p>
      )}
    </div>
  )
}
