"use client"

import { useState } from "react"
import { useUsers } from "@/hooks/use-users"
import { UserInviteDialog } from "@/components/team/user-invite-dialog"
import { UserActionsMenu } from "@/components/team/user-actions-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Search,
  Shield,
  Users,
  Crown,
  User,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  Mail,
  Settings,
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const roleConfig = {
  "super-admin": {
    label: "Super Admin",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Shield,
  },
  direzione: {
    label: "Direzione",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Crown,
  },
  "capo-reparto": {
    label: "Capo Reparto",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: Settings,
  },
  junior: {
    label: "Junior",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: User,
  },
  client: {
    label: "Cliente",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: Users,
  },
}

const statusConfig = {
  active: {
    label: "Attivo",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  inactive: {
    label: "Inattivo",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-700/60 dark:text-slate-200",
  },
  invited: {
    label: "Invitato",
    color: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  },
  suspended: {
    label: "Sospeso",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
}

const pageClass =
  "h-[calc(100dvh-73px)] overflow-y-auto overscroll-contain bg-[#0b1323] text-slate-100 md:h-auto md:min-h-screen md:overflow-visible"
const surfaceClass =
  "border border-white/10 bg-[#172235] text-slate-100 shadow-[0_18px_60px_rgba(2,6,23,0.24)]"
const mutedSurfaceClass = "border border-white/10 bg-[#111b2d] text-slate-100"
const inputClass =
  "h-11 border-white/10 bg-[#172235] pl-10 text-slate-100 placeholder:text-slate-500 shadow-none outline-none focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"

export default function TeamPage() {
  const { users, loading, error, refreshUsers } = useUsers()
  const [searchTerm, setSearchTerm] = useState("")
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const filteredUsers = users.filter(
    (user) =>
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getRoleBadge = (role: string) => {
    const config = roleConfig[role as keyof typeof roleConfig]
    if (!config) return null

    const Icon = config.icon
    return (
      <Badge className={`${config.color} flex items-center gap-1 border-0`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "U"
  }

  const getFullName = (firstName?: string, lastName?: string) => {
    return [firstName, lastName].filter(Boolean).join(" ") || "Utente"
  }

  const toDate = (value: any): Date | null => {
    if (!value) return null
    if (value instanceof Date) return value
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate()
    if (typeof value === 'string' || typeof value === 'number') return new Date(value)
    return null
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    admins: users.filter((u) => u.role === "admin" || u.role === "super-admin").length,
    clients: users.filter((u) => u.role === "client").length,
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
                <div key={`loading-card-${i}`} className="h-32 rounded-lg border border-white/10 bg-white/5"></div>
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
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-8 max-w-7xl">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-3 md:gap-4">
                <Users className="h-8 w-8 text-slate-400" />
                <span className="leading-tight">Team</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-lg">Gestisci il tuo team e i permessi</p>
            </div>
            <Button 
              className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium"
              onClick={() => setInviteDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Invita Utente
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <Users className="h-5 w-5 text-slate-400" />
                  Totale Utenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
                <p className="text-xs text-slate-400 mt-1">utenti registrati</p>
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <Sparkles className="h-5 w-5 text-slate-400" />
                  Utenti Attivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.active}</div>
                <p className="text-xs text-slate-400 mt-1">attualmente online</p>
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <Shield className="h-5 w-5 text-slate-400" />
                  Amministratori
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.admins}</div>
                <p className="text-xs text-slate-400 mt-1">con privilegi admin</p>
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-3 text-slate-200">
                  <User className="h-5 w-5 text-slate-400" />
                  Clienti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{stats.clients}</div>
                <p className="text-xs text-slate-400 mt-1">accesso clienti</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
              <Input
                placeholder="Cerca utenti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Users Grid */}
          {filteredUsers.length === 0 ? (
            <Card className={surfaceClass}>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-slate-400 mb-6" />
                <h3 className="text-xl font-semibold mb-3 text-white">Nessun utente trovato</h3>
                <p className="text-slate-400 text-center mb-6 max-w-md">
                  {searchTerm
                    ? "Nessun utente corrisponde ai criteri di ricerca."
                    : "Non ci sono ancora utenti nel team."}
                </p>
                <Button 
                  className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Invita il primo utente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className={`${surfaceClass} overflow-hidden transition-all duration-300 hover:border-righello-pink/35`}
                >
                  <CardHeader className={`${mutedSurfaceClass} border-x-0 border-t-0 border-b`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white/90 shadow-sm">
                          <AvatarImage src="" alt={getFullName(user.firstName, user.lastName)} />
                          <AvatarFallback className="bg-[#24324a] text-slate-100 font-semibold">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg text-white">
                            {getFullName(user.firstName, user.lastName)}
                          </CardTitle>
                          {user.companyName && (
                            <CardDescription className="truncate text-slate-400">
                              {user.companyName}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 self-end sm:self-start">
                        {user.status && getStatusBadge(user.status)}
                        <UserActionsMenu user={user} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2">
                      {user.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Role and Plan */}
                    <div className="flex items-center justify-between">
                      {getRoleBadge(user.role)}
                      {user.plan && (
                        <Badge variant="outline" className="text-xs">
                          Piano {user.plan}
                        </Badge>
                      )}
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ultimo accesso
                      </span>
                      <span>{toDate(user.lastLoginAt) ? format(toDate(user.lastLoginAt)!, "dd MMM yyyy", { locale: it }) : "Mai"}</span>
                    </div>

                    {/* Registration Date */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Registrato il
                      </span>
                      <span>{toDate(user.createdAt) ? format(toDate(user.createdAt)!, "dd MMM yyyy", { locale: it }) : "N/A"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Invite Dialog */}
          <UserInviteDialog 
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            onInvited={refreshUsers}
          />
        </div>
      </div>
    </div>
  )
}
