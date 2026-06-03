"use client"

import Link from "next/link"
import { useState } from "react"
import { useClients } from "@/hooks/use-clients"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { PaymentMethodManager } from "@/components/payment-method-manager"
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
  DollarSign,
  Users,
  AlertCircle,
  Sparkles,
  TrendingUp,
  CreditCard,
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
    color: "bg-slate-100 text-slate-800 dark:bg-slate-700/70 dark:text-slate-200",
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

const pageClass = "min-h-screen bg-[#0b1323] text-slate-100"
const surfaceClass =
  "border border-white/10 bg-[#172235] text-slate-100 shadow-[0_18px_60px_rgba(2,6,23,0.24)]"
const elevatedSurfaceClass =
  "border border-white/10 bg-[#172235] text-slate-100 shadow-[0_18px_60px_rgba(2,6,23,0.28)]"
const headerSurfaceClass = "border-x-0 border-t-0 border-b border-white/10 bg-[#111b2d]"
const inputClass =
  "h-11 border-white/10 bg-[#172235] pl-10 text-slate-100 placeholder:text-slate-500 shadow-none outline-none focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"

export default function ClientiPage() {
  const { clients, loading, error } = useClients()
  const [searchTerm, setSearchTerm] = useState("")
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [paymentMethodDialog, setPaymentMethodDialog] = useState<{ open: boolean; clientId: string; clientName: string }>({
    open: false,
    clientId: "",
    clientName: "",
  })

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
    totalValue: 0,
  }

  if (loading) {
    return (
      <div className={pageClass}>
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-8 max-w-7xl">
          <div className="space-y-6 md:space-y-8 animate-pulse">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
              <div className="space-y-2">
                <div className="h-8 bg-white/10 rounded w-48"></div>
                <div className="h-4 bg-white/10 rounded w-64"></div>
              </div>
              <div className="h-10 bg-white/10 rounded w-32"></div>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-lg border border-white/10 bg-white/5"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={pageClass}>
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-8 max-w-7xl">
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className={pageClass}>
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-3 md:gap-4">
                <Users className="h-8 w-8 text-slate-400" />
                <span className="leading-tight">Clienti</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-lg">Gestisci i tuoi clienti e prospect</p>
            </div>
            <Button 
              className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-lg"
              onClick={() => setClientDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Cliente
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <Users className="h-5 w-5 text-slate-400" />
                  Totale Clienti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
                <p className="text-xs text-slate-400 mt-1">clienti registrati</p>
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <TrendingUp className="h-5 w-5 text-slate-400" />
                  Clienti Attivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.active}</div>
                <p className="text-xs text-slate-400 mt-1">con progetti attivi</p>
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <Sparkles className="h-5 w-5 text-slate-400" />
                  Prospect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.prospects}</div>
                <p className="text-xs text-slate-400 mt-1">potenziali clienti</p>
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                  Valore Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">
                  {formatCurrency(stats.totalValue)}
                </div>
                <p className="text-xs text-slate-400 mt-1">valore portfolio</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
              <Input
                placeholder="Cerca clienti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Clients Grid */}
          {filteredClients.length === 0 ? (
            <Card className={surfaceClass}>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-white/10 bg-[#111b2d]">
                  <Users className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Nessun cliente trovato</h3>
                <p className="text-slate-400 text-center mb-6 max-w-md">
                  {searchTerm
                    ? "Nessun cliente corrisponde ai criteri di ricerca."
                    : "Non hai ancora aggiunto nessun cliente."}
                </p>
                <Button 
                  className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-lg"
                  onClick={() => setClientDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi il tuo primo cliente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className={`${elevatedSurfaceClass} overflow-hidden transition-all duration-300 hover:border-righello-pink/35`}
                >
                  <CardHeader className={headerSurfaceClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <Avatar className="h-12 w-12 flex-shrink-0 border border-white/20 shadow-sm">
                          <AvatarImage src="" alt={client.name} />
                          <AvatarFallback className="bg-gradient-to-br from-righello-pink to-cyan-400 text-white font-semibold">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg text-white">{client.name}</CardTitle>
                          {client.company && (
                            <CardDescription className="flex min-w-0 items-center gap-1 text-slate-400">
                              <Building className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{client.company}</span>
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 self-end sm:self-start">
                        {client.status && getStatusBadge(client.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-300 hover:bg-white/10 hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-white/10 bg-[#111b2d] text-slate-100 shadow-2xl">
                            <DropdownMenuItem asChild>
                              <Link href={`/clienti/${client.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Portale cliente
                              </Link>
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
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span className="min-w-0 break-words">{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{client.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="pt-3 border-t border-white/10">
                      {client.defaultPaymentMethodId ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <CreditCard className="h-4 w-4 text-righello-pink" />
                            <span>
                              {client.paymentMethodType === 'card' ? 'Carta' : 'SEPA'} terminante in{' '}
                              <span className="font-medium text-white">{client.last4}</span>
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPaymentMethodDialog({
                                open: true,
                                clientId: client.id,
                                clientName: client.name,
                              })
                            }
                            className="h-8 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                          >
                            Modifica
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPaymentMethodDialog({
                              open: true,
                              clientId: client.id,
                              clientName: client.name,
                            })
                          }
                          className="w-full border-righello-pink/40 bg-[#0a0f1d] text-slate-100 hover:border-righello-pink/70 hover:bg-righello-pink/10"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Aggiungi Metodo di Pagamento
                        </Button>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-cyan-300">
                          {client.projectsCount || 0}
                        </div>
                        <div className="text-xs text-slate-400">Progetti</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-righello-pink">
                          {client.totalValue ? formatCurrency(client.totalValue) : "€0"}
                        </div>
                        <div className="text-xs text-slate-400">Valore</div>
                      </div>
                    </div>

                    {/* Last Activity */}
                    {client.lastActivity && (
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Ultima attività
                        </span>
                        <span>{format(client.lastActivity instanceof Date ? client.lastActivity : (client.lastActivity as any).toDate(), "dd MMM yyyy", { locale: it })}</span>
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

      <PaymentMethodManager
        open={paymentMethodDialog.open}
        onOpenChange={(open) =>
          setPaymentMethodDialog({ open, clientId: "", clientName: "" })
        }
        clientId={paymentMethodDialog.clientId}
        clientName={paymentMethodDialog.clientName}
        onSuccess={() => {
          // Data updates automatically via onSnapshot listener
        }}
      />
    </div>
  )
}
