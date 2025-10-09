'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento preventivo...</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops!</h2>
          <p className="text-gray-600">{error}</p>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento in sospeso
          </h2>
          <p className="text-gray-600 mb-6">
            Il preventivo è in attesa di completamento del pagamento. 
            Se hai annullato il checkout, puoi ritentare.
          </p>
          
          <Button
            onClick={() => {
              // Reset to show approval form - local state only, server remains pending_payment
              setQuote({ ...quote, status: 'sent' })
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Riprova Pagamento
          </Button>
          
          <p className="text-xs text-gray-500 mt-4">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="p-8 bg-white/80 backdrop-blur-sm border-purple-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {quote.title}
              </h1>
              {quote.description && (
                <p className="text-gray-600">{quote.description}</p>
              )}
            </div>
            <Badge 
              variant={isApproved ? "default" : "secondary"}
              className="ml-4"
            >
              {isApproved ? (
                <><CheckCircle2 className="h-4 w-4 mr-1" /> Approvato</>
              ) : (
                <><Clock className="h-4 w-4 mr-1" /> In Attesa</>
              )}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">
                  {quote.externalClientName || quote.clientName}
                </p>
                {quote.externalClientEmail && (
                  <p className="text-xs text-gray-500">{quote.externalClientEmail}</p>
                )}
                {quote.clientId && (
                  <p className="text-xs text-purple-600">Cliente Piattaforma</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Valido fino al</p>
                <p className="font-medium text-gray-900">{formatDate(quote.validUntil)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Euro className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Totale</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(quote.total, quote.currency)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Cancelled Alert */}
        {paymentCancelled && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Pagamento annullato</p>
                <p className="text-sm text-yellow-700">
                  Il pagamento è stato annullato. Puoi riprovare quando sei pronto.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Items Card */}
        <Card className="p-8 bg-white/80 backdrop-blur-sm border-purple-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Dettagli Preventivo
          </h2>

          <div className="space-y-4">
            {quote.items.map((item, index) => (
              <div key={index} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-900 flex-1">{item.description}</p>
                  <p className="font-semibold text-purple-600 ml-4">
                    {formatCurrency(item.total, quote.currency)}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
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
            <span className="text-lg font-semibold text-gray-900">Totale</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatCurrency(quote.total, quote.currency)}
            </span>
          </div>

          {/* Payment Plan Info */}
          {depositAmount && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-900 mb-1">
                Piano di Pagamento: Acconto + Saldo
              </p>
              <p className="text-sm text-purple-700">
                Acconto richiesto ({quote.paymentPlan?.depositPercentage}%): {' '}
                <span className="font-semibold">{formatCurrency(depositAmount, quote.currency)}</span>
              </p>
            </div>
          )}
        </Card>

        {/* Approval Form Card */}
        {!isApproved && (
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-purple-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Approva e Procedi al Pagamento
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
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
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  Accetto i termini e le condizioni del preventivo. Confermo di aver letto 
                  e compreso tutti i dettagli e mi impegno a procedere con il pagamento.
                </label>
              </div>

              <Button
                onClick={handleApprove}
                disabled={approving || !formData.acceptedTerms || !formData.clientName || !formData.clientEmail}
                className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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

              <p className="text-xs text-center text-gray-500">
                Sarai reindirizzato alla pagina di pagamento sicura di Stripe
              </p>
            </div>
          </Card>
        )}

        {/* Already Approved Message */}
        {isApproved && (
          <Card className="p-8 bg-green-50 border-green-200 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              Preventivo Approvato!
            </h2>
            <p className="text-green-700">
              Questo preventivo è già stato approvato e processato.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
