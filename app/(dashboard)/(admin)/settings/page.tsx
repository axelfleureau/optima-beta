"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Mail,
  Key,
  Globe,
  Sparkles,
  Save,
  CheckCircle,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function SettingsPage() {
  const { userData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    // Simulate save operation
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-gray-500 to-slate-600 rounded-2xl shadow-lg">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                Impostazioni
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Configura la tua piattaforma</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </div>

          {/* Success Alert */}
          {saved && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                Impostazioni salvate con successo!
              </AlertDescription>
            </Alert>
          )}

          {/* Settings Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-white/80 backdrop-blur-sm border-gray-200/50 p-1">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profilo
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifiche
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sicurezza
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Aspetto
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Integrazioni
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    Informazioni Personali
                  </CardTitle>
                  <CardDescription>Aggiorna le tue informazioni personali e di contatto</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        defaultValue={userData?.firstName || ""}
                        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Cognome</Label>
                      <Input
                        id="lastName"
                        defaultValue={userData?.lastName || ""}
                        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={userData?.email || ""}
                      className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Azienda</Label>
                    <Input
                      id="company"
                      defaultValue={userData?.companyName || ""}
                      className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Raccontaci qualcosa di te..."
                      className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <Sparkles className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    Piano e Utilizzo
                  </CardTitle>
                  <CardDescription>Informazioni sul tuo piano attuale</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Piano Attuale</span>
                    <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-0">
                      {userData?.plan || "Base"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stato Account</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
                      Attivo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl shadow-sm">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    Preferenze Notifiche
                  </CardTitle>
                  <CardDescription>Configura come e quando ricevere le notifiche</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Notifiche Email</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ricevi aggiornamenti via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Notifiche Push</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notifiche push nel browser</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Aggiornamenti Campagne</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notifiche per le tue campagne</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Nuovi Clienti</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notifiche per nuovi clienti</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-sm">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    Sicurezza Account
                  </CardTitle>
                  <CardDescription>Gestisci la sicurezza del tuo account</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Password Attuale</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nuova Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Conferma Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Autenticazione a Due Fattori</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Aggiungi un livello extra di sicurezza
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <Palette className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    Personalizzazione
                  </CardTitle>
                  <CardDescription>Personalizza l'aspetto della piattaforma</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Tema Scuro</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Attiva il tema scuro</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Animazioni</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Abilita animazioni nell'interfaccia</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Sidebar Compatta</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Riduci la dimensione della sidebar</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Settings */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    Integrazioni
                  </CardTitle>
                  <CardDescription>Connetti servizi esterni alla piattaforma</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Email Marketing</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connetti il tuo servizio email</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configura
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Database className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">CRM</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Sincronizza con il tuo CRM</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configura
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Key className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">API Keys</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Gestisci le tue chiavi API</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Gestisci
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
