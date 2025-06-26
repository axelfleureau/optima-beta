"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building, Search, Ban, CheckCircle, AlertTriangle, Calendar, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { UserData } from "@/lib/types"

interface Agency extends UserData {
  id: string
  totalUsers: number
  totalClients: number
  totalTasks: number
}

export default function AgenciesManagement() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadAgencies()
  }, [])

  const loadAgencies = async () => {
    try {
      const { db } = await import("@/lib/firebase")
      const { collection, query, where, getDocs } = await import("firebase/firestore")

      // Carica tutte le agenzie (utenti con ruolo admin)
      const agenciesQuery = query(collection(db, "users"), where("role", "==", "admin"))
      const agenciesSnapshot = await getDocs(agenciesQuery)

      const agenciesData = await Promise.all(
        agenciesSnapshot.docs.map(async (doc) => {
          const agencyData = doc.data() as UserData
          const agencyId = doc.id

          // Conta utenti dell'agenzia
          const usersQuery = query(collection(db, "users"), where("parentTenantId", "==", agencyId))
          const usersSnapshot = await getDocs(usersQuery)
          const users = usersSnapshot.docs.map((d) => d.data())

          const totalUsers = users.filter((u) => u.role === "user").length
          const totalClients = users.filter((u) => u.role === "client").length

          // Conta task dell'agenzia
          const tasksQuery = query(collection(db, "tasks"), where("tenantId", "==", agencyId))
          const tasksSnapshot = await getDocs(tasksQuery)

          return {
            id: agencyId,
            ...agencyData,
            createdAt: agencyData.createdAt?.toDate?.() || new Date(),
            totalUsers,
            totalClients,
            totalTasks: tasksSnapshot.size,
          } as Agency
        }),
      )

      setAgencies(agenciesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
    } catch (error) {
      console.error("Error loading agencies:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le agenzie",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleAgencySuspension = async (agencyId: string, currentStatus: boolean) => {
    setActionLoading(agencyId)
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      await updateDoc(doc(db, "users", agencyId), {
        isSuspended: !currentStatus,
        updatedAt: new Date(),
      })

      // Aggiorna lo stato locale
      setAgencies((prev) =>
        prev.map((agency) => (agency.id === agencyId ? { ...agency, isSuspended: !currentStatus } : agency)),
      )

      toast({
        title: "Successo",
        description: `Agenzia ${!currentStatus ? "sospesa" : "riattivata"} con successo`,
      })
    } catch (error) {
      console.error("Error toggling agency suspension:", error)
      toast({
        title: "Errore",
        description: "Impossibile modificare lo stato dell'agenzia",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const filteredAgencies = agencies.filter(
    (agency) =>
      agency.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${agency.firstName} ${agency.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const activeAgencies = agencies.filter((a) => !a.isSuspended).length
  const suspendedAgencies = agencies.filter((a) => a.isSuspended).length

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
            <Building className="h-8 w-8 text-pink-500" />
            Gestione Agenzie
          </h1>
          <p className="text-gray-600">Monitora e gestisci tutte le agenzie registrate</p>
        </div>
        <Button onClick={loadAgencies} variant="outline">
          Aggiorna
        </Button>
      </div>

      {/* Statistiche rapide */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agenzie Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agenzie Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAgencies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agenzie Sospese</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspendedAgencies}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per nome azienda, email o nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista agenzie */}
      <Card>
        <CardHeader>
          <CardTitle>Agenzie ({filteredAgencies.length})</CardTitle>
          <CardDescription>Elenco completo delle agenzie registrate sulla piattaforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAgencies.map((agency) => (
              <div
                key={agency.id}
                className={`p-4 border rounded-lg ${
                  agency.isSuspended ? "border-red-200 bg-red-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold text-lg">
                          {agency.companyName || "Nome azienda non specificato"}
                        </h3>
                      </div>
                      {agency.isSuspended ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          Sospesa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Attiva
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Contatto:</span>
                        <br />
                        {agency.firstName} {agency.lastName}
                        <br />
                        {agency.email}
                      </div>
                      <div>
                        <span className="font-medium">Statistiche:</span>
                        <br />
                        {agency.totalUsers} utenti team
                        <br />
                        {agency.totalClients} clienti
                        <br />
                        {agency.totalTasks} task totali
                      </div>
                      <div>
                        <span className="font-medium">Token AI:</span>
                        <br />
                        {(agency.aiTokensUsed || 0).toLocaleString()} / {(agency.aiTokensLimit || 0).toLocaleString()}
                        <br />
                        Piano: {agency.plan || "Non specificato"}
                      </div>
                      <div>
                        <span className="font-medium">Registrazione:</span>
                        <br />
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {agency.createdAt.toLocaleDateString("it-IT")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={actionLoading === agency.id}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleAgencySuspension(agency.id, agency.isSuspended || false)}
                        className={agency.isSuspended ? "text-green-600" : "text-red-600"}
                      >
                        {agency.isSuspended ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Riattiva Agenzia
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Sospendi Agenzia
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {agency.isSuspended && (
                  <Alert className="mt-3 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Questa agenzia è sospesa. Gli utenti non possono accedere alla piattaforma.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}

            {filteredAgencies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna agenzia trovata</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
