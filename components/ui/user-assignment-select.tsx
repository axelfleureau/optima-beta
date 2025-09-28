"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Shield, Crown, Settings, Users, UserX } from "lucide-react"
import { useUsers } from "@/hooks/use-users"
import { useAuth } from "@/lib/auth-context"
import { canAssignTaskTo, type UserRole } from "@/lib/role-hierarchy"
import type { User as UserType } from "@/lib/types"

interface UserAssignmentSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

const roleIcons = {
  "super-admin": Crown,
  admin: Shield,
  direzione: Crown,
  "capo-reparto": Settings,
  junior: User,
  client: Users,
}

const roleColors = {
  "super-admin": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  direzione: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "capo-reparto": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  junior: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  client: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
}

export function UserAssignmentSelect({ 
  value, 
  onValueChange, 
  placeholder = "Seleziona utente...",
  className 
}: UserAssignmentSelectProps) {
  const { userData } = useAuth()
  const { users, loading } = useUsers()

  // Filtra gli utenti che l'utente corrente può assegnare task
  const assignableUsers = users.filter(user => {
    if (!userData?.role) return false
    return canAssignTaskTo(userData.role as UserRole, user.role as UserRole)
  })

  const getFullName = (user: UserType) => {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Utente"
  }

  const getInitials = (user: UserType) => {
    const first = user.firstName?.[0] || ""
    const last = user.lastName?.[0] || ""
    return (first + last).toUpperCase() || "U"
  }

  const selectedUser = assignableUsers.find(user => 
    `${user.firstName} ${user.lastName}`.trim() === value ||
    user.email === value ||
    user.id === value
  )

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Caricamento utenti..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedUser && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs">
                  {getInitials(selectedUser)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{getFullName(selectedUser)}</span>
              <Badge className={`text-xs ${roleColors[selectedUser.role as keyof typeof roleColors]} border-0`}>
                {selectedUser.role}
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Opzione per non assegnare */}
        <SelectItem value="">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <UserX className="h-4 w-4 text-gray-400" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Non assegnato</span>
          </div>
        </SelectItem>
        
        {assignableUsers.length === 0 ? (
          <SelectItem value="__no_users__" disabled>
            <span className="text-sm text-gray-500">Nessun utente disponibile</span>
          </SelectItem>
        ) : (
          assignableUsers.map((user) => {
            const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || User
            const fullName = getFullName(user)
            
            return (
              <SelectItem key={user.id} value={fullName}>
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{fullName}</span>
                      <Badge className={`text-xs ${roleColors[user.role as keyof typeof roleColors]} border-0 flex items-center gap-1`}>
                        <RoleIcon className="h-3 w-3" />
                        {user.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500 truncate">{user.email}</span>
                  </div>
                </div>
              </SelectItem>
            )
          })
        )}
      </SelectContent>
    </Select>
  )
}