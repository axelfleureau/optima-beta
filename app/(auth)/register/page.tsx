"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User, Building, Chrome, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ready) {
      setError("Il sistema non è ancora pronto. Attendi un momento.")
      return
    }

    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Le password non corrispondono")
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("Devi accettare i termini e condizioni")
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        companyName: formData.companyName,
        tenantId: user.uid,
        createdAt: new Date(),
        plan: "trial",
        role: "user",
        aiTokensUsed: 0,
        aiTokensLimit: 1000000,
      })

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Registration error:", err)
      setError(err.message || "Errore durante la registrazione")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    if (!ready) {
      setError("Il sistema non è ancora pronto. Attendi un momento.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstName: user.displayName?.split(" ")[0] || "",
        lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
        email: user.email,
        companyName: "",
        tenantId: user.uid,
        createdAt: new Date(),
        plan: "trial",
        role: "user",
        aiTokensUsed: 0,
        aiTokensLimit: 1000000,
      })

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Google registration error:", err)
      setError(err.message || "Errore durante la registrazione con Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image
                src="/assets/logos/righello-logo.svg"
                alt="Righello Logo"
                width={64}
                height={64}
                className="w-16 h-16"
              />
            </div>
          </div>
          <p className="text-gray-400">Crea il tuo account e inizia subito</p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">Registrati</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Compila i campi per creare il tuo account
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

            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-300">
                    Nome
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Mario"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                      required
                      disabled={!ready || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-300">
                    Cognome
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Rossi"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                    required
                    disabled={!ready || loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-gray-300">
                  Nome Azienda
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="La tua azienda"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                    disabled={!ready || loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={formData.email}
                    onChange={handleInputChange}
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Conferma Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500"
                    required
                    disabled={!ready || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                    disabled={!ready || loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="border-gray-600 data-[state=checked]:bg-pink-500"
                  disabled={!ready || loading}
                />
                <Label htmlFor="terms" className="text-sm text-gray-300">
                  Accetto i{" "}
                  <Link href="/terms" className="text-pink-400 hover:text-pink-300">
                    termini e condizioni
                  </Link>{" "}
                  e la{" "}
                  <Link href="/privacy" className="text-pink-400 hover:text-pink-300">
                    privacy policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                disabled={loading || !ready}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrazione in corso...
                  </>
                ) : (
                  "Registrati"
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
              onClick={handleGoogleRegister}
              disabled={loading || !ready}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Continua con Google
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-400">Hai già un account? </span>
              <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium">
                Accedi
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
