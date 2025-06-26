"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Mail, Shield, Bell, Database, Save, TestTube } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user, userData } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    fromEmail: "",
    fromName: "",
  })

  useEffect(() => {
    if (user?.uid) {
      loadEmailSettings()
    }
  }, [user])

  const loadEmailSettings = async () => {
    try {
      const response = await fetch(`/api/settings/email?tenantId=${user?.uid}`)
      if (response.ok) {
        const settings = await response.json()
        setEmailSettings(settings)
      }
    } catch (error) {
      console.error("Error loading email settings:", error)
    }
  }

  const saveEmailSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/settings/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: user?.uid,
          ...emailSettings,
        }),
      })

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Impostazioni email salvate con successo",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving email settings:", error)
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio delle impostazioni",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testEmailConfiguration = async () => {
    setTestingEmail(true)
    try {
      const response = await fetch("/api/send-welcome-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: "Test User",
          clientEmail: emailSettings.fromEmail || userData?.email,
          password: "test123",
          agencyName: userData?.companyName || "Test Agency",
        }),
      })

      if (response.ok) {
        toast({
          title: "Test completato",
          description: "Email di test inviata con successo",
        })
      } else {
        throw new Error("Test failed")
      }
    } catch (error) {
      console.error("Error testing email:", error)
      toast({
        title: "Test fallito",
        description: "Errore durante l'invio dell'email di test",
        variant: "destructive",
      })
    } finally {
      setTestingEmail(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <p className="text-gray-600">Configura le impostazioni della piattaforma</p>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifiche
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configurazione Email
              </CardTitle>
              <CardDescription>
                Configura il server SMTP per l'invio automatico delle email di benvenuto ai nuovi clienti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-enabled"
                  checked={emailSettings.enabled}
                  onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, enabled: checked })}
                />
                <Label htmlFor="email-enabled">Abilita invio email automatico</Label>
              </div>

              {emailSettings.enabled && (
                <>
                  <Separator />

                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Configura i parametri SMTP per abilitare l'invio automatico delle email di benvenuto. Le
                      credenziali verranno salvate in modo sicuro.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">Host SMTP</Label>
                      <Input
                        id="smtp-host"
                        placeholder="smtp.gmail.com"
                        value={emailSettings.smtpHost}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Porta</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        placeholder="587"
                        value={emailSettings.smtpPort}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, smtpPort: Number.parseInt(e.target.value) || 587 })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="smtp-secure"
                      checked={emailSettings.smtpSecure}
                      onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, smtpSecure: checked })}
                    />
                    <Label htmlFor="smtp-secure">Connessione sicura (SSL/TLS)</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">Username SMTP</Label>
                      <Input
                        id="smtp-user"
                        placeholder="your-email@gmail.com"
                        value={emailSettings.smtpUser}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-pass">Password SMTP</Label>
                      <Input
                        id="smtp-pass"
                        type="password"
                        placeholder="••••••••"
                        value={emailSettings.smtpPass}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPass: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-email">Email mittente</Label>
                      <Input
                        id="from-email"
                        placeholder="noreply@youragency.com"
                        value={emailSettings.fromEmail}
                        onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-name">Nome mittente</Label>
                      <Input
                        id="from-name"
                        placeholder="Your Agency Name"
                        value={emailSettings.fromName}
                        onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <Button onClick={saveEmailSettings} disabled={loading} className="bg-pink-500 hover:bg-pink-600">
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? "Salvataggio..." : "Salva Impostazioni"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={testEmailConfiguration}
                      disabled={testingEmail || !emailSettings.enabled}
                    >
                      <TestTube className="mr-2 h-4 w-4" />
                      {testingEmail ? "Invio test..." : "Test Email"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Impostazioni di Sicurezza
              </CardTitle>
              <CardDescription>Gestisci le impostazioni di sicurezza e autenticazione</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Funzionalità di sicurezza in arrivo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifiche
              </CardTitle>
              <CardDescription>Configura le preferenze di notifica</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Impostazioni notifiche in arrivo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestione Database
              </CardTitle>
              <CardDescription>Strumenti per la gestione e manutenzione del database</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Strumenti database in arrivo...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
