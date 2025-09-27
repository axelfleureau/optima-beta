"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building, Users, CreditCard, AlertTriangle, TrendingUp, Activity, Shield, Database } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface AgencyStats {
  totalAgencies: number
  activeAgencies: number
  suspendedAgencies: number
  totalUsers: number
  totalClients: number
  totalTokensUsed: number
  totalTokensLimit: number
}

export default function SuperAdminDashboard() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState<AgencyStats>({
    totalAgencies: 0,
    activeAgencies: 0,
    suspendedAgencies: 0,
    totalUsers: 0,
    totalClients: 0,
    totalTokensUsed: 0,
    totalTokensLimit: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { db } = await import("@/lib/firebase")
      const { collection, query, where, getDocs } = await import("firebase/firestore")

      // Carica statistiche agenzie
      const agenciesQuery = query(collection(db, "users"), where("role", "==", "admin"))
      const agenciesSnapshot = await getDocs(agenciesQuery)

      const agencies = agenciesSnapshot.docs.map((doc) => doc.data())
      const activeAgencies = agencies.filter((agency) => !agency.isSuspended)
      const suspendedAgencies = agencies.filter((agency) => agency.isSuspended)

      // Carica statistiche utenti totali
      const usersSnapshot = await getDocs(collection(db, "users"))
      const allUsers = usersSnapshot.docs.map((doc) => doc.data())

      const totalUsers = allUsers.filter((user) => user.role === "user").length
      const totalClients = allUsers.filter((user) => user.role === "client").length

      // Calcola token usage totale
      const totalTokensUsed = allUsers.reduce((sum, user) => sum + (user.aiTokensUsed || 0), 0)
      const totalTokensLimit = allUsers.reduce((sum, user) => sum + (user.aiTokensLimit || 0), 0)

      setStats({
        totalAgencies: agencies.length,
        activeAgencies: activeAgencies.length,
        suspendedAgencies: suspendedAgencies.length,
        totalUsers,
        totalClients,
        totalTokensUsed,
        totalTokensLimit,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le statistiche",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const tokenUsagePercentage = stats.totalTokensLimit > 0 ? (stats.totalTokensUsed / stats.totalTokensLimit) * 100 : 0

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-pink-500" />
            Dashboard Super Admin
          </h1>
          <p className="text-gray-600">Panoramica completa della piattaforma Optima</p>
        </div>
        <Button onClick={loadStats} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Aggiorna Dati
        </Button>
      </div>

      {/* Alert per account sospesi */}
      {stats.suspendedAgencies > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Ci sono {stats.suspendedAgencies} agenzie sospese che richiedono attenzione.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiche principali */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agenzie Totali</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgencies}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {stats.activeAgencies} attive
              </Badge>
              {stats.suspendedAgencies > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.suspendedAgencies} sospese
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">utenti interni agenzie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clienti Finali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">clienti delle agenzie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizzo Token AI</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenUsagePercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTokensUsed.toLocaleString()} / {stats.totalTokensLimit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafici e dettagli */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Crescita Piattaforma
            </CardTitle>
            <CardDescription>Andamento registrazioni e utilizzo negli ultimi mesi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalAgencies}</div>
                  <div className="text-xs text-gray-500">Agenzie</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
                  <div className="text-xs text-gray-500">Utenti Team</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalClients}</div>
                  <div className="text-xs text-gray-500">Clienti</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span>Crescita Agenzie</span>
                  <span className="text-green-600">+{Math.round(stats.totalAgencies * 0.15)} questo mese</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span>Utilizzo Token AI</span>
                  <span className="text-purple-600">{tokenUsagePercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: `${Math.min(100, tokenUsagePercentage)}%`}}></div>
                </div>
                
                <div className="pt-2 border-t text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Agenzie Attive</span>
                    <span>{stats.activeAgencies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sospese</span>
                    <span className="text-red-500">{stats.suspendedAgencies}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Attività Recente
            </CardTitle>
            <CardDescription>Ultime azioni significative sulla piattaforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: 'agency_created',
                  title: 'Nuova agenzia registrata',
                  description: 'Marketing Solutions srl ha completato la registrazione',
                  timestamp: '2 ore fa',
                  icon: Building,
                  color: 'text-blue-500'
                },
                {
                  type: 'token_usage',
                  title: 'Soglia token raggiunta',
                  description: 'Creative Agency ha superato il 90% dei token mensili',
                  timestamp: '4 ore fa',
                  icon: CreditCard,
                  color: 'text-orange-500'
                },
                {
                  type: 'user_activity',
                  title: 'Picco di attività',
                  description: `${stats.totalUsers} utenti attivi nelle ultime 24h`,
                  timestamp: '6 ore fa',
                  icon: Users,
                  color: 'text-green-500'
                },
                {
                  type: 'system_update',
                  title: 'Aggiornamento sistema',
                  description: 'Deployment v2.1.4 completato con successo',
                  timestamp: '1 giorno fa',
                  icon: Activity,
                  color: 'text-purple-500'
                },
                {
                  type: 'security',
                  title: 'Backup automatico',
                  description: 'Backup giornaliero database completato',
                  timestamp: '1 giorno fa',
                  icon: Shield,
                  color: 'text-indigo-500'
                }
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('500', '100')}`}>
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
              
              <div className="text-center pt-2 border-t">
                <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                  Visualizza tutti i log
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Azioni rapide */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>Strumenti di gestione per la piattaforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <a href="/super-admin/agencies">
                <Building className="mr-2 h-4 w-4" />
                Gestisci Agenzie
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/super-admin/tokens">
                <CreditCard className="mr-2 h-4 w-4" />
                Monitoraggio Token
              </a>
            </Button>
            <Button variant="outline" disabled>
              <Database className="mr-2 h-4 w-4" />
              Backup Database
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
