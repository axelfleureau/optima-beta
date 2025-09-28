"use client"

import { useState } from "react"
import { useClients } from "@/hooks/use-clients"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Euro,
  Users,
  AlertCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const statusConfig = {
  active: {
    label: "Attivo",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  inactive: {
    label: "Inattivo",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  },
  prospect: {
    label: "Prospect",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  suspended: {
    label: "Sospeso",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
}

export default function ClientiPage() {
  const { clients, loading, error } = useClients()
  const [searchTerm, setSearchTerm] = useState("")
  const [clientDialogOpen, setClientDialogOpen] = useState(false)

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    prospects: clients.filter((c) => c.status === "prospect").length,
    totalValue: clients.reduce((sum, c) => sum + (c.totalValue || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-gradient-to-r from-indigo-200 to-purple-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="h-10 bg-gradient-to-r from-indigo-200 to-purple-200 rounded w-32"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white/50 rounded-2xl border border-gray-200/50"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                Clienti
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Gestisci i tuoi clienti e prospect</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg"
              onClick={() => setClientDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Cliente
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  Totale Clienti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">clienti registrati</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border-green-200/50 dark:border-green-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  Clienti Attivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">con progetti attivi</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-xl border-blue-200/50 dark:border-blue-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-sm">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  Prospect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.prospects}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">potenziali clienti</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl border-purple-200/50 dark:border-purple-700/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm">
                    <Euro className="h-4 w-4 text-white" />
                  </div>
                  Valore Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(stats.totalValue)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">valore portfolio</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cerca clienti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200/50"
              />
            </div>
          </div>

          {/* Clients Grid */}
          {filteredClients.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Nessun cliente trovato</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
                  {searchTerm
                    ? "Nessun cliente corrisponde ai criteri di ricerca."
                    : "Non hai ancora aggiunto nessun cliente."}
                </p>
                <Button 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg"
                  onClick={() => setClientDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi il tuo primo cliente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={client.avatar || "/placeholder.svg"} alt={client.name} />
                          <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-white">{client.name}</CardTitle>
                          {client.company && (
                            <CardDescription className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Building className="h-3 w-3" />
                              {client.company}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(client.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-gray-200/50">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Invia Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2">
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{client.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {client.projectsCount || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Progetti</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                          {client.totalValue ? formatCurrency(client.totalValue) : "€0"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Valore</div>
                      </div>
                    </div>

                    {/* Last Activity */}
                    {client.lastActivity && (
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Ultima attività
                        </span>
                        <span>{format(client.lastActivity, "dd MMM yyyy", { locale: it })}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ClientFormDialog 
        open={clientDialogOpen} 
        onOpenChange={setClientDialogOpen} 
      />
    </div>
  )
}
