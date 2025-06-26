"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail, Lock, Chrome, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("demo@righello.com")
  const [password, setPassword] = useState("password123")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Set a timeout to ensure Firebase is ready
    const timer = setTimeout(() => {
      setReady(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ready) {
      setError("Il sistema non è ancora pronto. Attendi un momento.")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Login error:", err)
      if (err.code === "auth/user-not-found") {
        setError("Utente non trovato")
      } else if (err.code === "auth/wrong-password") {
        setError("Password non corretta")
      } else if (err.code === "auth/invalid-email") {
        setError("Email non valida")
      } else if (err.code === "auth/invalid-credential") {
        setError("Credenziali non valide")
      } else {
        setError(err.message || "Errore durante il login")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!ready) {
      setError("Il sistema non è ancora pronto. Attendi un momento.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Google login error:", err)
      setError(err.message || "Errore durante il login con Google")
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
          <p className="text-gray-400">Accedi alla tua piattaforma di marketing</p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">Accedi</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Inserisci le tue credenziali per accedere
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!ready && (
              <Alert className="bg-blue-900/20 border-blue-500/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription className="text-blue-400">Inizializzazione in corso...</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="bg-red-900/20 border-red-500/50">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="demo@righello.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                    required
                    disabled={!ready || loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="password123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                    required
                    disabled={!ready || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                    disabled={!ready || loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                disabled={loading || !ready}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accesso in corso...
                  </>
                ) : (
                  "Accedi"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 text-gray-400">Oppure</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600/50"
              onClick={handleGoogleLogin}
              disabled={loading || !ready}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Continua con Google
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-400">Non hai un account? </span>
              <Link href="/register" className="text-pink-400 hover:text-pink-300 font-medium">
                Registrati
              </Link>
            </div>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-gray-300">
                Password dimenticata?
              </Link>
            </div>

            <div className="text-center text-xs text-gray-500 mt-4 p-3 bg-gray-700/30 rounded">
              <p className="font-medium text-gray-400 mb-1">Account demo:</p>
              <p>Email: demo@righello.com</p>
              <p>Password: password123</p>
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
