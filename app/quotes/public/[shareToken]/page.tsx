'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { RighelloIcon } from '@/components/brand/righello-icon'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  User, 
  FileText,
  Euro,
  Calendar,
  AlertCircle,
  RotateCcw
} from 'lucide-react'

interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface Quote {
  id: string
  title: string
  description?: string
  // DUAL CLIENT MODE
  clientId?: string
  clientName: string
  externalClientName?: string
  externalClientEmail?: string
  items: QuoteItem[]
  total: number
  currency: string
  validUntil: string
  status: string
  paymentPlan?: {
    type: 'full' | 'deposit_milestone'
    depositPercentage?: number
    milestones?: Array<{
      id: string
      name: string
      percentage: number
      amount: number
      status: string
    }>
  }
}

export default function QuotePublicApprovalPage({ 
  params 
}: { 
  params: Promise<{ shareToken: string }> 
}) {
  const [shareToken, setShareToken] = useState<string>('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    acceptedTerms: false
  })
  
  const searchParams = useSearchParams()
  const paymentCancelled = searchParams.get('payment_cancelled') === 'true'

  useEffect(() => {
    params.then(p => setShareToken(p.shareToken))
  }, [params])

  useEffect(() => {
    if (!shareToken) return

    const fetchQuote = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/quotes/public/${shareToken}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          
          if (response.status === 410) {
            setError('Questo preventivo è scaduto')
          } else if (response.status === 404) {
            setError('Preventivo non trovato')
          } else {
            setError(errorData.error || 'Errore nel caricamento del preventivo')
          }
          return
        }

        const data = await response.json()
        setQuote(data)
        
        // DUAL CLIENT MODE: Pre-fill client data based on mode
        if (data.externalClientName && data.externalClientEmail) {
          // External client mode - pre-fill from external data
          setFormData(prev => ({ 
            ...prev, 
            clientName: data.externalClientName,
            clientEmail: data.externalClientEmail
          }))
        } else if (data.clientName) {
          // Platform client or legacy - pre-fill from clientName
          setFormData(prev => ({ ...prev, clientName: data.clientName }))
        }
      } catch (err) {
        console.error('Error fetching quote:', err)
        setError('Errore di connessione. Riprova più tardi.')
      } finally {
        setLoading(false)
      }
    }

    fetchQuote()
  }, [shareToken])

  const handleApprove = async () => {
    if (!formData.clientName || !formData.clientEmail || !formData.acceptedTerms) {
      alert('Tutti i campi sono obbligatori')
      return
    }

    setApproving(true)

    try {
      const response = await fetch(`/api/quotes/public/${shareToken}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        if (result.checkoutUrl) {
          // PLATFORM CLIENT: Redirect to Stripe Checkout
          window.location.href = result.checkoutUrl
        } else if (result.approved) {
          // EXTERNAL CLIENT: Direct approval without payment
          // Refresh quote to show approved state
          const updatedQuote = await fetch(`/api/quotes/public/${shareToken}`)
          const quoteData = await updatedQuote.json()
          setQuote(quoteData)
          setApproving(false)
          alert(result.message || 'Preventivo approvato con successo!')
        } else {
          alert('Approvazione completata')
          setApproving(false)
        }
      } else {
        alert(result.error || 'Errore durante approvazione preventivo')
        setApproving(false)
      }
    } catch (err) {
      console.error('Error approving quote:', err)
      alert('Errore di connessione. Riprova più tardi.')
      setApproving(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f] p-4 text-white">
        <Card className="w-full max-w-md border-white/[0.08] bg-[#11151f]/92 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-righello-pink"></div>
          <p className="text-white/56">Sto preparando il preventivo…</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f] p-4 text-white">
        <Card className="w-full max-w-md border-white/[0.08] bg-[#11151f]/92 p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Ops!</h2>
          <p className="text-white/56">{error}</p>
        </Card>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  // Handle pending_payment status - Allow retry after cancelled checkout
  if (quote.status === 'pending_payment') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f] p-4 text-white">
        <Card className="w-full max-w-md border-white/[0.08] bg-[#11151f]/92 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Pagamento in sospeso
          </h2>
          <p className="text-white/56 mb-6">
            Il preventivo è in attesa di completamento del pagamento. 
            Se hai annullato il checkout, puoi ritentare.
          </p>
          
          <Button
            onClick={() => {
              // Reset to show approval form - local state only, server remains pending_payment
              setQuote({ ...quote, status: 'sent' })
            }}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Riprova Pagamento
          </Button>
          
          <p className="text-xs text-white/42 mt-4">
            Il sistema creerà una nuova sessione di pagamento
          </p>
        </Card>
      </div>
    )
  }

  const isApproved = quote.status === 'approved' || quote.status === 'accepted' || quote.status === 'paid'
  const depositAmount = quote.paymentPlan?.type === 'deposit_milestone' && quote.paymentPlan.depositPercentage
    ? (quote.total * quote.paymentPlan.depositPercentage) / 100
    : null

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090f] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_-10%,rgba(214,72,126,0.18),transparent_30rem),radial-gradient(circle_at_95%_5%,rgba(6,182,212,0.08),transparent_28rem)]" />
      <div className="relative mx-auto max-w-4xl space-y-5 sm:space-y-6">
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <RighelloIcon className="h-11 w-11" imageClassName="h-6 w-6" priority />
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-[-0.02em]">Óptima</p>
              <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Preventivo Righello</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-white/46">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Documento verificato
          </div>
        </header>

        {/* Header Card */}
        <Card className="border-white/[0.08] bg-[#11151f]/92 p-5 backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-righello-pink-light">Proposta commerciale</p>
              <h1 className="break-words text-3xl font-black leading-none tracking-[-0.035em] text-white sm:text-4xl">
                {quote.title}
              </h1>
              {quote.description && (
                <p className="mt-3 max-w-2xl text-white/56">{quote.description}</p>
              )}
            </div>
            <Badge 
              variant={isApproved ? "default" : "secondary"}
              className="w-fit shrink-0 border-white/10"
            >
              {isApproved ? (
                <><CheckCircle2 className="h-4 w-4 mr-1" /> Approvato</>
              ) : (
                <><Clock className="h-4 w-4 mr-1" /> In Attesa</>
              )}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-5 md:grid-cols-3">
            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.025] p-3">
              <User className="h-5 w-5 text-righello-pink" />
              <div>
                <p className="text-sm text-white/42">Cliente</p>
                <p className="font-medium text-white">
                  {quote.externalClientName || quote.clientName}
                </p>
                {quote.externalClientEmail && (
                  <p className="text-xs text-white/42">{quote.externalClientEmail}</p>
                )}
                {quote.clientId && (
                  <p className="text-xs text-righello-pink">Cliente Piattaforma</p>
                )}
              </div>
            </div>
            
            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.025] p-3">
              <Calendar className="h-5 w-5 text-righello-pink" />
              <div>
                <p className="text-sm text-white/42">Valido fino al</p>
                <p className="font-medium text-white">{formatDate(quote.validUntil)}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.025] p-3">
              <Euro className="h-5 w-5 text-righello-pink" />
              <div>
                <p className="text-sm text-white/42">Totale</p>
                <p className="text-2xl font-bold text-righello-pink">
                  {formatCurrency(quote.total, quote.currency)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Cancelled Alert */}
        {paymentCancelled && (
          <Card className="border-amber-400/20 bg-amber-400/[0.08] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
              <div>
                <p className="font-bold text-amber-100">Pagamento annullato</p>
                <p className="text-sm text-amber-100/68">
                  Il pagamento è stato annullato. Puoi riprovare quando sei pronto.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Items Card */}
        <Card className="border-white/[0.08] bg-[#11151f]/92 p-5 backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-righello-pink" />
            Dettagli Preventivo
          </h2>

          <div className="space-y-4">
            {quote.items.map((item, index) => (
              <div key={index} className="pb-4 border-b border-white/[0.08] last:border-0">
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-medium text-white flex-1">{item.description}</p>
                  <p className="shrink-0 font-bold text-righello-pink sm:ml-4">
                    {formatCurrency(item.total, quote.currency)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/42">
                  <span>Quantità: {item.quantity}</span>
                  <span>•</span>
                  <span>Prezzo unitario: {formatCurrency(item.unitPrice, quote.currency)}</span>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">Totale</span>
            <span className="text-2xl font-bold text-righello-pink">
              {formatCurrency(quote.total, quote.currency)}
            </span>
          </div>

          {/* Payment Plan Info */}
          {depositAmount && (
            <div className="mt-4 rounded-xl border border-righello-pink/15 bg-righello-pink/[0.08] p-4">
              <p className="text-sm font-medium text-white mb-1">
                Piano di Pagamento: Acconto + Saldo
              </p>
              <p className="text-sm text-righello-pink-light">
                Acconto richiesto ({quote.paymentPlan?.depositPercentage}%): {' '}
                <span className="font-semibold">{formatCurrency(depositAmount, quote.currency)}</span>
              </p>
            </div>
          )}
        </Card>

        {/* Approval Form Card */}
        {!isApproved && (
          <Card className="border-white/[0.08] bg-[#11151f]/92 p-5 backdrop-blur-xl sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              Approva e Procedi al Pagamento
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/72 mb-2">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/32" />
                  <Input
                    type="text"
                    placeholder="Mario Rossi"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="pl-10"
                    disabled={approving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/72 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/32" />
                  <Input
                    type="email"
                    placeholder="mario.rossi@esempio.it"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="pl-10"
                    disabled={approving}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">
                <Checkbox
                  id="terms"
                  checked={formData.acceptedTerms}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, acceptedTerms: checked as boolean })
                  }
                  disabled={approving}
                />
                <label 
                  htmlFor="terms" 
                  className="text-sm text-white/72 leading-relaxed cursor-pointer"
                >
                  Accetto i termini e le condizioni del preventivo. Confermo di aver letto 
                  e compreso tutti i dettagli e mi impegno a procedere con il pagamento.
                </label>
              </div>

              <Button
                onClick={handleApprove}
                disabled={approving || !formData.acceptedTerms || !formData.clientName || !formData.clientEmail}
                className="h-12 w-full text-base sm:text-lg"
              >
                {approving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Elaborazione...
                  </div>
                ) : (
                  depositAmount ? (
                    `Approva e Paga Acconto (${formatCurrency(depositAmount, quote.currency)})`
                  ) : (
                    `Approva e Paga (${formatCurrency(quote.total, quote.currency)})`
                  )
                )}
              </Button>

              <p className="text-xs text-center text-white/42">
                Sarai reindirizzato alla pagina di pagamento sicura di Stripe
              </p>
            </div>
          </Card>
        )}

        {/* Already Approved Message */}
        {isApproved && (
          <Card className="border-emerald-400/20 bg-emerald-400/[0.08] p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
            <h2 className="mb-2 text-2xl font-black text-emerald-100">
              Preventivo Approvato!
            </h2>
            <p className="text-emerald-100/68">
              Questo preventivo è già stato approvato e processato.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
