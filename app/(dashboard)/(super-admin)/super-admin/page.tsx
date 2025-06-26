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
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Grafici di crescita in sviluppo</p>
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
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Log attività in sviluppo</p>
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
