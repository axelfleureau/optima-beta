import { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { FeatureComparisonGrid } from "@/components/pricing"
import { GlassButton } from "@/components/ui/glass-button"
import { getAllPlans } from "@/lib/constants/token-plans"
import { PricingClientWrapper } from "@/components/pricing/pricing-client-wrapper"

export const metadata: Metadata = {
  title: "Pricing - Optima AI Platform",
  description: "Scegli il piano perfetto per le tue esigenze. Token economy con 3x markup su costi API. Starter, Growth, Enterprise.",
}

export default function PricingPage() {
  const plans = getAllPlans()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-950 to-pink-950">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300">Token Economy con 3x Markup</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
          Scegli il Piano Perfetto
        </h1>
        
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
          Ottieni accesso illimitato a DALL-E 3, GPT-4 AI Assistant, e Command Bar. 
          Paga solo per quello che usi con la nostra token economy trasparente.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <GlassButton size="lg">
              Inizia Gratis
              <ArrowRight className="w-4 h-4 ml-2" />
            </GlassButton>
          </Link>
          <Link href="/login">
            <GlassButton variant="ghost" size="lg">
              Accedi
            </GlassButton>
          </Link>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <PricingClientWrapper
              key={plan.id}
              plan={plan}
              popular={plan.id === "180"}
            />
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Confronto Funzionalità Completo
          </h2>
          <FeatureComparisonGrid />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Domande Frequenti
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">
                Come funziona la token economy?
              </h3>
              <p className="text-gray-400">
                Ogni utilizzo di AI (DALL-E, GPT-4) consuma tokens. I nostri piani offrono 
                pacchetti mensili di tokens con 3x markup sui costi API. Monitori il tuo utilizzo 
                in tempo reale e upgrade quando serve.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">
                Posso cambiare piano in qualsiasi momento?
              </h3>
              <p className="text-gray-400">
                Sì! Upgrade immediato con accesso istantaneo ai nuovi token. Downgrade attivo 
                dal prossimo ciclo di fatturazione, mantenendo il piano corrente fino ad allora.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-2">
                I token non utilizzati rollover al mese successivo?
              </h3>
              <p className="text-gray-400">
                No, i token scadono alla fine del ciclo mensile. Ti consigliamo di monitorare 
                il tuo utilizzo e scegliere il piano più adatto alle tue esigenze.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Pronto per Iniziare?
          </h2>
          <p className="text-gray-300 mb-8">
            Unisciti a migliaia di agenzie e aziende che usano Optima per automatizzare 
            il loro marketing con AI.
          </p>
          <Link href="/login">
            <GlassButton size="lg">
              Inizia Ora Gratis
              <ArrowRight className="w-4 h-4 ml-2" />
            </GlassButton>
          </Link>
        </div>
      </section>
    </div>
  )
}
