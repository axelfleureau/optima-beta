"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Target, Users, BarChart3, Bot, Calendar, FileText, ArrowRight, Check, Star, Play, Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import Image from "next/image"

const features = [
  {
    icon: Target,
    title: "Gestione Campagne",
    description: "Crea, monitora e ottimizza le tue campagne marketing con metriche avanzate",
  },
  {
    icon: Users,
    title: "Multi-Client",
    description: "Gestisci tutti i tuoi clienti da un'unica piattaforma con workspace dedicati",
  },
  {
    icon: BarChart3,
    title: "Analytics Avanzati",
    description: "Analizza le performance con report dettagliati e dashboard personalizzabili",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "Genera contenuti e ottimizza le strategie con l'intelligenza artificiale",
  },
  {
    icon: Calendar,
    title: "Calendario Editoriale",
    description: "Pianifica e programma i contenuti social con un calendario integrato",
  },
  {
    icon: FileText,
    title: "Preventivi Automatici",
    description: "Crea preventivi professionali e gestisci la fatturazione con Stripe",
  },
]

const plans = [
  {
    name: "Piano 90°",
    description: "Essenziale, preciso, perfetto per iniziare",
    price: "14,99",
    period: "/mese",
    annual: "€149,99 (risparmi 17%)",
    features: [
      "1.000.000 token mensili GPT-4o",
      "Accesso a GPT-4o",
      "Supporto via email",
      "Personalizzazione base delle card",
      "Accesso alla Community OpenAI",
      "Workspace collaborativo limitato (fino a 5 progetti attivi)",
      "Archivio file max 500 MB",
    ],
    ideal: "freelance, piccole realtà, creator autonomi",
    popular: false,
  },
  {
    name: "Piano 180°",
    description: "Ampia visione, più spazio di manovra",
    price: "39,99",
    period: "/mese",
    annual: "€399,99 (risparmi 17%)",
    features: [
      "3.500.000 token mensili GPT-4o",
      "Tutto il piano 90°",
      "Supporto priorità 24h",
      "Personalizzazione avanzata delle card",
      "Assistenza su prompt AI",
      "Storage file fino a 2 GB",
      "Integrazione base (Google Drive / Calendario)",
      "20 progetti attivi / workspace",
    ],
    ideal: "team marketing, PMI, agenzie",
    popular: true,
  },
  {
    name: "Piano 360°",
    description: "Potenza completa, gestione su vasta scala",
    price: "99,99",
    period: "/mese",
    annual: "€999,99 (risparmi 17%)",
    features: [
      "10.000.000 token mensili GPT-4o",
      "Tutto il piano 180°",
      "Supporto diretto via chat",
      "AI Assistant addestrato dinamicamente con i tuoi dati",
      "Board collaborativa avanzata (senza limiti)",
      "50 GB storage file incluso",
      "Accesso API Optima + webhooks",
      "Branding personalizzato",
      "Invio preventivi integrato via PandaDoc",
    ],
    ideal: "aziende strutturate, team in crescita, partner strategici",
    popular: false,
  },
]

const testimonials = [
  {
    name: "Marco Bianchi",
    role: "Marketing Director",
    company: "TechStart SRL",
    content:
      "Optima ha rivoluzionato il nostro workflow. L'AI Assistant ci ha permesso di risparmiare ore di lavoro ogni settimana.",
    rating: 5,
  },
  {
    name: "Laura Rossi",
    role: "Freelance Marketing",
    company: "Studio Creativo",
    content:
      "Finalmente una piattaforma che unisce tutto quello che serve. Gestisco 15 clienti senza stress grazie ai workspace dedicati.",
    rating: 5,
  },
  {
    name: "Giuseppe Verdi",
    role: "CEO",
    company: "Digital Agency",
    content:
      "I preventivi automatici e l'integrazione con Stripe hanno automatizzato completamente la nostra fatturazione.",
    rating: 5,
  },
]

export default function HomePage() {
  const [email, setEmail] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image
                  src="/assets/logos/righello-logo.svg"
                  alt="Righello Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <span className="font-bold text-xl">Optima</span>
              <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 border-pink-500/30">
                by Righello
              </Badge>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
                Funzionalità
              </Link>
              <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">
                Prezzi
              </Link>
              <Link href="#testimonials" className="text-gray-300 hover:text-white transition-colors">
                Testimonianze
              </Link>
              <Link href="/login">
                <Button className="bg-gray-700 hover:bg-gray-600 text-white">Accedi</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-pink-500 hover:bg-pink-600">Inizia Gratis</Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 border-t border-gray-700 pt-4">
              <nav className="flex flex-col gap-4">
                <Link
                  href="#features"
                  className="text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Funzionalità
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Prezzi
                </Link>
                <Link
                  href="#testimonials"
                  className="text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonianze
                </Link>
                <div className="flex flex-col gap-3 pt-4">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                      Accedi
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-pink-500 hover:bg-pink-600">
                      Inizia Gratis
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 border-pink-500/30 mb-6">
            🚀 Nuova versione disponibile
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Misura il tuo marketing
            <br />
            con precisione
            <br />
            <span className="text-pink-400">millimetrica</span>
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Ottimizza le tue campagne con l'intelligenza artificiale e analisi avanzate per massimizzare il ROI.
            Gestisci clienti, progetti e contenuti da un'unica piattaforma.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Input
              placeholder="Il tuo indirizzo email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-sm bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
            />
            <Link href="/register">
              <Button className="bg-pink-500 hover:bg-pink-600 px-8">
                Inizia gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-400">Prova gratuita di 14 giorni. Nessuna carta di credito richiesta.</p>

          {/* Hero Image/Video Placeholder */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-8 backdrop-blur-sm border border-gray-700">
              <div className="aspect-video bg-gray-800/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="h-16 w-16 text-pink-400 mx-auto mb-4" />
                  <p className="text-gray-300">Guarda la demo della piattaforma</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-900/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Funzionalità che potenziano il tuo marketing</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Optima offre tutti gli strumenti necessari per ottimizzare le tue strategie di marketing e misurarne
              l'efficacia.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700 hover:border-pink-500/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-pink-400" />
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Scegli il piano più adatto alle tue esigenze</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Offriamo piani flessibili per soddisfare le esigenze di qualsiasi business, dal freelance all'azienda
              strutturata.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative bg-gray-800/50 border-gray-700 ${
                  plan.popular ? "border-pink-500 ring-2 ring-pink-500/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-pink-500 text-white">Più popolare</Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-300">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">€{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-400">Annuale: {plan.annual}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400">
                      <strong>Ideale per:</strong> {plan.ideal}
                    </p>
                  </div>

                  <Link href="/register">
                    <Button
                      className={`w-full ${
                        plan.popular ? "bg-pink-500 hover:bg-pink-600" : "bg-gray-700 hover:bg-gray-600 text-white"
                      }`}
                    >
                      Inizia ora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gray-900/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Cosa dicono i nostri clienti</h2>
            <p className="text-xl text-gray-300">
              Scopri come Optima sta trasformando il marketing di aziende e freelance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-gray-300 italic">"{testimonial.content}"</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">
                      {testimonial.role} • {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-12 backdrop-blur-sm border border-gray-700">
            <h2 className="text-4xl font-bold mb-4">Pronto a ottimizzare il tuo marketing?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Unisciti a centinaia di professionisti che stanno già utilizzando Optima per crescere il loro business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-pink-500 hover:bg-pink-600 px-8">
                  Inizia la prova gratuita
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" className="bg-gray-700 hover:bg-gray-600 text-white">
                Prenota una demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image
                    src="/assets/logos/righello-logo.svg"
                    alt="Righello Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <span className="font-bold text-xl">Optima</span>
              </div>
              <p className="text-gray-400 text-sm">
                La piattaforma di marketing intelligence che trasforma i dati in risultati concreti.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Prodotto</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#features" className="hover:text-white transition-colors">
                    Funzionalità
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Prezzi
                  </Link>
                </li>
                <li>
                  <Link href="/api" className="hover:text-white transition-colors">
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Supporto</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/help" className="hover:text-white transition-colors">
                    Centro assistenza
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contattaci
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="hover:text-white transition-colors">
                    Stato servizi
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legale</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Termini di Servizio
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-white transition-colors">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 Righello. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
