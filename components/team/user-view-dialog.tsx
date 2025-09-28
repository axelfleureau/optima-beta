"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Eye, 
  Mail, 
  Calendar, 
  Clock, 
  Building,
  Shield,
  User,
  Users,
  Crown,
  AlertTriangle,
  Settings
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { User as UserType } from "@/lib/types"

interface UserViewDialogProps {
  user: UserType
  open: boolean
  onOpenChange: (open: boolean) => void
}

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
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
  },
  invited: {
    label: "Invitato",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  suspended: {
    label: "Sospeso",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
}

export function UserViewDialog({ user, open, onOpenChange }: UserViewDialogProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "U"
  }

  const getFullName = (firstName?: string, lastName?: string) => {
    return [firstName, lastName].filter(Boolean).join(" ") || "Utente"
  }

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

  const getStatusBadge = (isSuspended?: boolean) => {
    const effectiveStatus = isSuspended ? "suspended" : "active"
    const config = statusConfig[effectiveStatus as keyof typeof statusConfig]
    if (!config) return null

    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
              <Eye className="h-5 w-5 text-white" />
            </div>
            Dettagli Utente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Header */}
          <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border">
            <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
              <AvatarImage 
                src={""} 
                alt={getFullName(user.firstName, user.lastName)} 
              />
              <AvatarFallback className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-lg">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {getFullName(user.firstName, user.lastName)}
                  </h3>
                  {user.companyName && (
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4" />
                      {user.companyName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {getRoleBadge(user.role || "user")}
                  {getStatusBadge(user.isSuspended)}
                </div>
              </div>
              {user.email && (
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Suspended Warning */}
          {user.isSuspended && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Account Sospeso</p>
                <p className="text-sm text-red-600">
                  Questo utente non può accedere alla piattaforma
                </p>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Account Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Informazioni Account</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">ID Utente</span>
                  <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {user.id}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Tenant ID</span>
                  <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {user.tenantId}
                  </span>
                </div>

                {user.parentTenantId && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Parent Tenant</span>
                    <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {user.parentTenantId}
                    </span>
                  </div>
                )}

                {user.plan && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Piano</span>
                    <Badge variant="outline">{user.plan}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Attività</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Registrato il</span>
                    <p className="font-medium">
                      {user.createdAt 
                        ? format(
                            user.createdAt instanceof Date ? user.createdAt : new Date(), 
                            "dd MMM yyyy", 
                            { locale: it }
                          )
                        : "N/A"
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Ultimo accesso</span>
                    <p className="font-medium">Mai</p>
                  </div>
                </div>

                {(user.aiTokensUsed !== undefined || user.aiTokensLimit !== undefined) && (
                  <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Token AI</span>
                      <p className="font-medium">
                        {user.aiTokensUsed || 0} / {user.aiTokensLimit || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}