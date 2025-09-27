"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err: any) {
      console.error("Password reset error:", err)
      if (err.code === "auth/user-not-found") {
        setError("Nessun utente trovato con questa email")
      } else if (err.code === "auth/invalid-email") {
        setError("Email non valida")
      } else {
        setError(err.message || "Errore durante il reset della password")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image
                src="/assets/logos/righello-logo.svg"
                alt="Righello Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
            </div>
            <span className="text-white font-bold text-2xl">Optima</span>
          </div>
          <p className="text-gray-400">
            {success ? "Email inviata!" : "Reimposta la tua password"}
          </p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">
              {success ? "Controlla la tua email" : "Password dimenticata?"}
            </CardTitle>
            <CardDescription className="text-center text-gray-400">
              {success
                ? "Ti abbiamo inviato le istruzioni per reimpostare la password"
                : "Inserisci la tua email per ricevere le istruzioni di reset"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-900/20 border-red-500/50">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <div className="space-y-4">
                <Alert className="bg-green-900/20 border-green-500/50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-400">
                    Email di reset inviata con successo a <strong>{email}</strong>
                  </AlertDescription>
                </Alert>
                <div className="text-center text-sm text-gray-400">
                  <p>Non hai ricevuto l'email?</p>
                  <button
                    onClick={() => {
                      setSuccess(false)
                      setEmail("")
                    }}
                    className="text-pink-400 hover:text-pink-300 font-medium"
                  >
                    Riprova
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Inserisci la tua email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    "Invia email di reset"
                  )}
                </Button>
              </form>
            )}

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center text-gray-400 hover:text-gray-300 text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna al login
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 Righello. Tutti i diritti riservati.</p>
        </div>
      </div>
    </div>
  )
}