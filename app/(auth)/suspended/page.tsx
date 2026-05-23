"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ban, Mail, Phone, AlertTriangle } from "lucide-react"

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Ban className="text-white h-6 w-6" />
            </div>
            <span className="text-white font-bold text-2xl">Account Sospeso</span>
          </div>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              Accesso Limitato
            </CardTitle>
            <CardDescription className="text-center text-gray-400">
              Il tuo account è stato temporaneamente sospeso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-900/20 border-red-500/50">
              <Ban className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                <strong>Account Sospeso</strong>
                <br />
                Il tuo accesso alla piattaforma Optima è stato temporaneamente limitato.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-gray-300">
              <h3 className="font-semibold text-white">Possibili motivi della sospensione:</h3>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-400">
                <li>Mancato pagamento del piano di abbonamento</li>
                <li>Superamento dei limiti di utilizzo</li>
                <li>Violazione dei termini di servizio</li>
                <li>Problemi tecnici temporanei</li>
              </ul>
            </div>

            <div className="space-y-3 text-gray-300">
              <h3 className="font-semibold text-white">Come risolvere:</h3>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>Contatta il supporto: support@optima.com</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span>Chiama: +39 02 1234 5678</span>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-900/20 border-blue-500/50">
              <AlertDescription className="text-blue-400">
                <strong>Sei un amministratore di agenzia?</strong>
                <br />
                Verifica lo stato del tuo piano di abbonamento o contatta il supporto per assistenza immediata.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 pt-4">
              <Button
                variant="outline"
                className="w-full bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600/50"
                asChild
              >
                <a href="mailto:support@optima.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Contatta Supporto
                </a>
              </Button>

              <Button variant="ghost" className="w-full text-gray-400 hover:text-gray-300" asChild>
                <a href="/login">Torna al login</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 Optima Platform. Tutti i diritti riservati.</p>
        </div>
      </div>
    </div>
  )
}
