"use client"

import { useEffect, useState } from "react"
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
  Github,
  GitBranch,
  Lock,
  RefreshCw,
  Rocket,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const panelClass =
  "overflow-hidden rounded-lg border border-white/10 bg-[#101927]/90 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
const panelHeaderClass =
  "border-b border-white/10 bg-gradient-to-r from-white/[0.045] via-cyan-400/[0.035] to-pink-500/[0.045]"
const fieldClass =
  "border-white/[0.12] bg-[#070d18] text-white placeholder:text-slate-600 shadow-inner shadow-black/20 focus-visible:border-cyan-300/70 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
const tabClass =
  "gap-2 rounded-md px-3 py-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-[#e14483] data-[state=active]:text-white data-[state=active]:shadow-[0_10px_30px_rgba(225,68,131,0.24)]"
const integrationCardClass =
  "flex items-center justify-between rounded-lg border border-white/10 bg-[#0b1321]/80 p-4 transition-colors hover:border-cyan-300/35 hover:bg-[#101c2d]"
const outlineActionClass =
  "border-white/15 bg-white/[0.03] text-slate-100 hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"

type GitHubPolicy = {
  ownerEmails: string[]
  allowedRepositoryPatterns: string[]
  commitPushEnabled: boolean
  deployEnabled: boolean
  connectorInstallState: string
  oauthSubject: string | null
  updatedAt: string | null
}

type GitHubPolicyResponse = {
  policy: GitHubPolicy
  canEdit: boolean
  currentUserEmail: string
}

function listToTextarea(value: string[]) {
  return value.join("\n")
}

function textareaToList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function AgenticGitHubPolicyCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState("")
  const [policy, setPolicy] = useState<GitHubPolicy | null>(null)
  const [ownerEmails, setOwnerEmails] = useState("")
  const [repoPatterns, setRepoPatterns] = useState("")
  const [commitPushEnabled, setCommitPushEnabled] = useState(true)
  const [deployEnabled, setDeployEnabled] = useState(true)

  async function loadPolicy() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/settings/agentic-github", { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Policy GitHub non caricata.")

      const payload = data as GitHubPolicyResponse
      setPolicy(payload.policy)
      setCanEdit(payload.canEdit)
      setCurrentUserEmail(payload.currentUserEmail)
      setOwnerEmails(listToTextarea(payload.policy.ownerEmails))
      setRepoPatterns(listToTextarea(payload.policy.allowedRepositoryPatterns))
      setCommitPushEnabled(payload.policy.commitPushEnabled)
      setDeployEnabled(payload.policy.deployEnabled)
    } catch (loadError: any) {
      setError(loadError?.message || "Errore caricamento policy GitHub.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicy()
  }, [])

  async function savePolicy() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch("/api/settings/agentic-github", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmails: textareaToList(ownerEmails),
          allowedRepositoryPatterns: textareaToList(repoPatterns),
          commitPushEnabled,
          deployEnabled,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Policy GitHub non salvata.")

      const payload = data as GitHubPolicyResponse
      setPolicy(payload.policy)
      setCanEdit(payload.canEdit)
      setOwnerEmails(listToTextarea(payload.policy.ownerEmails))
      setRepoPatterns(listToTextarea(payload.policy.allowedRepositoryPatterns))
      setCommitPushEnabled(payload.policy.commitPushEnabled)
      setDeployEnabled(payload.policy.deployEnabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (saveError: any) {
      setError(saveError?.message || "Errore salvataggio policy GitHub.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-cyan-300/20 bg-[#0b1321]/90 p-5 shadow-[0_20px_70px_rgba(34,211,238,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-2">
              <Github className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-white">GitHub MCP owner-scoped</h4>
              <p className="max-w-3xl text-sm text-slate-400">
                Le repo aziendali sono accessibili al sistema agentico, ma commit, push e deploy con l'account GitHub di Axel
                restano una capability personale dell'owner tecnico.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              {policy?.connectorInstallState || "loading"}
            </Badge>
            <Badge className="border border-pink-300/20 bg-pink-400/10 text-pink-100">
              solo owner GitHub
            </Badge>
            {policy?.oauthSubject && (
              <Badge className="border border-white/10 bg-white/[0.05] text-slate-200">
                {policy.oauthSubject}
              </Badge>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className={outlineActionClass}
          onClick={loadPolicy}
          disabled={loading || saving}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Aggiorna
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor="github-owner-emails" className="flex items-center gap-2 text-slate-200">
            <Lock className="h-4 w-4 text-pink-300" />
            Email owner abilitate
          </Label>
          <Textarea
            id="github-owner-emails"
            value={ownerEmails}
            onChange={(event) => setOwnerEmails(event.target.value)}
            disabled={!canEdit || loading}
            className={`${fieldClass} min-h-[118px]`}
            placeholder="axel@wearerighello.com"
          />
          <p className="text-xs text-slate-500">
            Utente corrente: {currentUserEmail || "non disponibile"}. Gli altri ruoli possono proporre/revisionare, non usare il tuo GitHub.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="github-repo-patterns" className="flex items-center gap-2 text-slate-200">
            <GitBranch className="h-4 w-4 text-cyan-200" />
            Repository aziendali in scope
          </Label>
          <Textarea
            id="github-repo-patterns"
            value={repoPatterns}
            onChange={(event) => setRepoPatterns(event.target.value)}
            disabled={!canEdit || loading}
            className={`${fieldClass} min-h-[118px]`}
            placeholder="axelfleureau/*"
          />
          <p className="text-xs text-slate-500">
            Accetta pattern come `axelfleureau/*` o URL GitHub specifici. I repo fuori scope non generano job publish/deploy.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#070d18]/80 p-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-200">Commit e push</Label>
            <p className="text-xs text-slate-500">Permette al job approvato di pubblicare su GitHub.</p>
          </div>
          <Switch checked={commitPushEnabled} onCheckedChange={setCommitPushEnabled} disabled={!canEdit || loading} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#070d18]/80 p-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Rocket className="h-4 w-4 text-emerald-300" />
              Deploy dopo approvazione
            </Label>
            <p className="text-xs text-slate-500">Crea il job di deploy solo quando approva l'owner GitHub autorizzato.</p>
          </div>
          <Switch checked={deployEnabled} onCheckedChange={setDeployEnabled} disabled={!canEdit || loading} />
        </div>
      </div>

      {(error || saved || !canEdit) && (
        <div className="mt-4">
          {error && (
            <Alert className="border-red-400/25 bg-red-500/[0.12] text-red-100">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert className="border-emerald-400/25 bg-emerald-400/[0.12] text-emerald-100">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              <AlertDescription>Policy GitHub salvata.</AlertDescription>
            </Alert>
          )}
          {!canEdit && !loading && !error && (
            <Alert className="border-amber-300/25 bg-amber-300/[0.1] text-amber-100">
              <AlertDescription>
                Vista in sola lettura: solo l'owner GitHub configurato può cambiare questa policy.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Nessun token viene salvato qui: Optima conserva solo policy, scope, stato MCP e riferimento protetto.
        </p>
        <Button
          type="button"
          onClick={savePolicy}
          disabled={!canEdit || loading || saving}
          className="rounded-lg bg-[#e14483] text-white shadow-[0_14px_42px_rgba(225,68,131,0.22)] hover:bg-[#f05296]"
        >
          {saving ? "Salvataggio..." : "Salva policy GitHub"}
        </Button>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen bg-[#08111f] bg-[radial-gradient(circle_at_top_left,rgba(225,68,131,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent_30%)]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[#e14483] via-[#8d4dff] to-[#22d3ee] rounded-lg shadow-[0_18px_50px_rgba(225,68,131,0.28)]">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                Impostazioni
              </h1>
              <p className="text-slate-400 text-lg">Configura la tua piattaforma</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-[#e14483] text-white shadow-[0_14px_42px_rgba(225,68,131,0.28)] hover:bg-[#f05296] disabled:border disabled:border-white/10 disabled:bg-[#101927] disabled:text-slate-500"
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
            <Alert className="border-emerald-400/25 bg-emerald-400/[0.12]">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              <AlertDescription className="text-emerald-100">
                Impostazioni salvate con successo!
              </AlertDescription>
            </Alert>
          )}

          {/* Settings Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="h-auto w-fit flex-wrap gap-1 rounded-lg border border-white/10 bg-[#070d18]/90 p-1 backdrop-blur-xl">
              <TabsTrigger value="profile" className={tabClass}>
                <User className="h-4 w-4" />
                Profilo
              </TabsTrigger>
              <TabsTrigger value="notifications" className={tabClass}>
                <Bell className="h-4 w-4" />
                Notifiche
              </TabsTrigger>
              <TabsTrigger value="security" className={tabClass}>
                <Shield className="h-4 w-4" />
                Sicurezza
              </TabsTrigger>
              <TabsTrigger value="appearance" className={tabClass}>
                <Palette className="h-4 w-4" />
                Aspetto
              </TabsTrigger>
              <TabsTrigger value="integrations" className={tabClass}>
                <Globe className="h-4 w-4" />
                Integrazioni
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card className={panelClass}>
                <CardHeader className={panelHeaderClass}>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <User className="h-5 w-5 text-cyan-200" />
                    Informazioni Personali
                  </CardTitle>
                  <CardDescription className="text-slate-400">Aggiorna le tue informazioni personali e di contatto</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-200">Nome</Label>
                      <Input
                        id="firstName"
                        defaultValue={userData?.firstName || ""}
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-200">Cognome</Label>
                      <Input
                        id="lastName"
                        defaultValue={userData?.lastName || ""}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={userData?.email || ""}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-200">Azienda</Label>
                    <Input
                      id="company"
                      defaultValue={userData?.companyName || ""}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-200">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Raccontaci qualcosa di te..."
                      className={fieldClass}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className={panelClass}>
                <CardHeader className={panelHeaderClass}>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Sparkles className="h-5 w-5 text-pink-300" />
                    Piano e Utilizzo
                  </CardTitle>
                  <CardDescription className="text-slate-400">Informazioni sul tuo piano attuale</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Piano Attuale</span>
                    <Badge className="border border-white/10 bg-white/[0.06] text-slate-100">
                      {userData?.plan || "Base"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Stato Account</span>
                    <Badge className="border border-emerald-400/20 bg-emerald-400/[0.12] text-emerald-200">
                      Attivo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className={panelClass}>
                <CardHeader className={panelHeaderClass}>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-gradient-to-br from-[#f6c85f] to-[#e14483] rounded-lg shadow-sm">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    Preferenze Notifiche
                  </CardTitle>
                  <CardDescription className="text-slate-400">Configura come e quando ricevere le notifiche</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Notifiche Email</Label>
                        <p className="text-xs text-slate-500">Ricevi aggiornamenti via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Notifiche Push</Label>
                        <p className="text-xs text-slate-500">Notifiche push nel browser</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Aggiornamenti Campagne</Label>
                        <p className="text-xs text-slate-500">Notifiche per le tue campagne</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Nuovi Clienti</Label>
                        <p className="text-xs text-slate-500">Notifiche per nuovi clienti</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card className={panelClass}>
                <CardHeader className={panelHeaderClass}>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-gradient-to-br from-[#e14483] to-[#8d4dff] rounded-lg shadow-sm">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    Sicurezza Account
                  </CardTitle>
                  <CardDescription className="text-slate-400">Gestisci la sicurezza del tuo account</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-slate-200">Password Attuale</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-slate-200">Nuova Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-200">Conferma Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Autenticazione a Due Fattori</Label>
                        <p className="text-xs text-slate-500">
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
              <Card className={panelClass}>
                <CardHeader className={panelHeaderClass}>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Palette className="h-5 w-5 text-cyan-200" />
                    Personalizzazione
                  </CardTitle>
                  <CardDescription className="text-slate-400">Personalizza l'aspetto della piattaforma</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Tema Scuro</Label>
                        <p className="text-xs text-slate-500">Attiva il tema scuro</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Animazioni</Label>
                        <p className="text-xs text-slate-500">Abilita animazioni nell'interfaccia</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-200">Sidebar Compatta</Label>
                        <p className="text-xs text-slate-500">Riduci la dimensione della sidebar</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Settings */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className={panelClass}>
                <CardHeader className={panelHeaderClass}>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg shadow-sm">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    Integrazioni
                  </CardTitle>
                  <CardDescription className="text-slate-400">Connetti servizi esterni alla piattaforma</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <AgenticGitHubPolicyCard />

                  <div className="grid gap-4">
                    <div className={integrationCardClass}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Email Marketing</h4>
                          <p className="text-sm text-slate-500">Connetti il tuo servizio email</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className={outlineActionClass}>
                        Configura
                      </Button>
                    </div>

                    <div className={integrationCardClass}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Database className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">CRM</h4>
                          <p className="text-sm text-slate-500">Sincronizza con il tuo CRM</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className={outlineActionClass}>
                        Configura
                      </Button>
                    </div>

                    <div className={integrationCardClass}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Key className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">API Keys</h4>
                          <p className="text-sm text-slate-500">Gestisci le tue chiavi API</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className={outlineActionClass}>
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
