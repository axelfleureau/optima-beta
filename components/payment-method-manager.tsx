"use client"

import { useState, useEffect } from "react"
import { loadStripe, Stripe, StripeElements, StripeCardElement, StripeIbanElement } from "@stripe/stripe-js"
import { CardElement, IbanElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { CreditCard, Building2, Loader2 } from "lucide-react"

let stripePromise: Promise<Stripe | null> | null = null

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
      return null
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

interface PaymentMethodManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onSuccess?: () => void
}

interface PaymentFormProps {
  clientId: string
  clientName: string
  onSuccess: () => void
  onClose: () => void
}

function PaymentForm({ clientId, clientName, onSuccess, onClose }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'sepa_debit'>('card')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  }

  const ibanElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    supportedCountries: ['SEPA'],
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !user) {
      toast.error("Sistema non pronto. Riprova.")
      return
    }

    setLoading(true)

    try {
      const token = await user.getIdToken()

      const setupIntentResponse = await fetch('/api/stripe/setup-intent/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          paymentMethodType
        })
      })

      if (!setupIntentResponse.ok) {
        const error = await setupIntentResponse.json()
        throw new Error(error.error || 'Errore nella creazione del SetupIntent')
      }

      const { clientSecret, intentId } = await setupIntentResponse.json()

      setLoading(false)
      setConfirming(true)

      let confirmResult

      if (paymentMethodType === 'card') {
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Card Element non trovato')
        }

        confirmResult = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: clientName,
            },
          },
        })
      } else {
        const ibanElement = elements.getElement(IbanElement)
        if (!ibanElement) {
          throw new Error('IBAN Element non trovato')
        }

        confirmResult = await stripe.confirmSepaDebitSetup(clientSecret, {
          payment_method: {
            sepa_debit: ibanElement,
            billing_details: {
              name: clientName,
              ...(user.email ? { email: user.email } : {}),
            } as any,
          },
        })
      }

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message || 'Errore nella conferma del metodo di pagamento')
      }

      const attachResponse = await fetch('/api/stripe/payment-method/attach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          setupIntentId: intentId,
          clientId
        })
      })

      if (!attachResponse.ok) {
        const error = await attachResponse.json()
        throw new Error(error.error || 'Errore nel salvataggio del metodo di pagamento')
      }

      const result = await attachResponse.json()

      toast.success(`Metodo di pagamento salvato: ${result.paymentMethod.type === 'card' ? 'Carta' : 'SEPA'} terminante in ${result.paymentMethod.last4}`)
      
      onSuccess()
      onClose()

    } catch (error) {
      const err = error as Error
      console.error('Payment method error:', err)
      toast.error(err.message || 'Errore nel salvataggio del metodo di pagamento')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Tipo di Metodo di Pagamento
        </Label>
        <RadioGroup
          value={paymentMethodType}
          onValueChange={(value) => setPaymentMethodType(value as 'card' | 'sepa_debit')}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem
              value="card"
              id="card"
              className="peer sr-only"
            />
            <Label
              htmlFor="card"
              className="flex flex-col items-center justify-between rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/70 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-50/50 dark:peer-data-[state=checked]:bg-purple-900/20 cursor-pointer transition-all backdrop-blur-sm"
            >
              <CreditCard className="mb-3 h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium">Carta di Credito</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="sepa_debit"
              id="sepa_debit"
              className="peer sr-only"
            />
            <Label
              htmlFor="sepa_debit"
              className="flex flex-col items-center justify-between rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/70 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-50/50 dark:peer-data-[state=checked]:bg-purple-900/20 cursor-pointer transition-all backdrop-blur-sm"
            >
              <Building2 className="mb-3 h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium">SEPA Direct Debit</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {paymentMethodType === 'card' ? 'Dettagli Carta' : 'Dettagli IBAN'}
        </Label>
        <div className="p-4 border-2 border-purple-200 dark:border-purple-800/50 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          {paymentMethodType === 'card' ? (
            <CardElement options={cardElementOptions} />
          ) : (
            <IbanElement options={ibanElementOptions} />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {paymentMethodType === 'card' 
            ? 'I tuoi dati sono protetti e crittografati da Stripe'
            : 'Autorizzando questo addebito SEPA, consenti i pagamenti automatici dal tuo conto'}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading || confirming}
          className="flex-1"
        >
          Annulla
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading || confirming}
          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Preparazione...' : confirming ? 'Salvataggio...' : 'Salva Metodo di Pagamento'}
        </Button>
      </div>
    </form>
  )
}

export function PaymentMethodManager({ open, onOpenChange, clientId, clientName, onSuccess }: PaymentMethodManagerProps) {
  const stripePromise = getStripe()

  const handleSuccess = () => {
    onSuccess?.()
  }

  if (!stripePromise) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Errore Configurazione</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Chiave pubblica Stripe mancante. Contatta l&apos;amministratore.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            Aggiungi Metodo di Pagamento
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Configura il metodo di pagamento per <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <PaymentForm
            clientId={clientId}
            clientName={clientName}
            onSuccess={handleSuccess}
            onClose={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}
