"use client"

import type React from "react"
import { createContext, useContext, useMemo } from "react"
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs"
import type { User } from "./types"
import {
  canAssignTaskTo,
  canManageUser,
  canViewResource,
  getAssignableRoles,
  getManageableRoles,
  getRoleColor,
  getRoleDisplayName,
  hasPermission,
  type UserRole,
} from "@/lib/role-hierarchy"

type CompatAuthUser = {
  uid: string
  id: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
  getIdToken: () => Promise<string | undefined>
}

interface AuthContextType {
  user: CompatAuthUser | null
  userData: User | null
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isDirezione: boolean
  isCapoReparto: boolean
  isJunior: boolean
  isClient: boolean
  isSuspended: boolean
  signOut: () => Promise<void>
  hasPermission: (permission: any) => boolean
  canManageUser: (targetRole: UserRole) => boolean
  canAssignTaskTo: (assigneeRole: UserRole) => boolean
  getAssignableRoles: () => UserRole[]
  getManageableRoles: () => UserRole[]
  canViewResource: (resourceOwnerId: string) => boolean
  getRoleDisplayName: () => string
  getRoleColor: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const VALID_ROLES: UserRole[] = ["super-admin", "admin", "direzione", "capo-reparto", "junior", "client"]

function normalizeRole(value: unknown, email?: string): UserRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole
  }

  if (value === "org:admin" || value === "admin") {
    return "admin"
  }

  if (email?.endsWith("@wearerighello.com")) {
    return "admin"
  }

  return "junior"
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { user: clerkUser } = useUser()
  const clerk = useClerk()

  const email = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || ""
  const metadataRole = clerkUser?.publicMetadata?.role || clerkUser?.unsafeMetadata?.role
  const role = normalizeRole(metadataRole, email)
  const tenantId = String(clerkUser?.publicMetadata?.tenantId || clerkUser?.id || "")

  const user = useMemo<CompatAuthUser | null>(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return null

    return {
      uid: clerkUser.id,
      id: clerkUser.id,
      email,
      displayName: clerkUser.fullName || email,
      photoURL: clerkUser.imageUrl,
      getIdToken: async () => (await getToken()) || undefined,
    }
  }, [clerkUser, email, getToken, isLoaded, isSignedIn])

  const userData = useMemo<User | null>(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return null

    const now = new Date()
    return {
      id: clerkUser.id,
      email,
      firstName: clerkUser.firstName || clerkUser.fullName || email || "Utente",
      lastName: clerkUser.lastName || "",
      role,
      tenantId,
      createdAt: clerkUser.createdAt || now,
      updatedAt: clerkUser.updatedAt || now,
      isSuspended: false,
      companyName: String(clerkUser.publicMetadata?.companyName || "Righello"),
      plan: String(clerkUser.publicMetadata?.plan || "Base"),
      status: "active",
      aiTokensUsed: Number(clerkUser.publicMetadata?.aiTokensUsed || 0),
      aiTokensLimit: Number(clerkUser.publicMetadata?.aiTokensLimit || 1000000),
    }
  }, [clerkUser, email, isLoaded, isSignedIn, role, tenantId])

  const userRole = userData?.role as UserRole | undefined
  const userId = userData?.id || ""

  const value: AuthContextType = {
    user,
    userData,
    loading: !isLoaded,
    isSuperAdmin: userRole === "super-admin",
    isAdmin: userRole === "admin",
    isDirezione: userRole === "direzione",
    isCapoReparto: userRole === "capo-reparto",
    isJunior: userRole === "junior",
    isClient: userRole === "client",
    isSuspended: false,
    signOut: async () => {
      await clerk.signOut({ redirectUrl: "/login" })
    },
    hasPermission: (permission: any) => (userRole ? hasPermission(userRole, permission) : false),
    canManageUser: (targetRole: UserRole) => (userRole ? canManageUser(userRole, targetRole) : false),
    canAssignTaskTo: (assigneeRole: UserRole) => (userRole ? canAssignTaskTo(userRole, assigneeRole) : false),
    getAssignableRoles: () => (userRole ? getAssignableRoles(userRole) : []),
    getManageableRoles: () => (userRole ? getManageableRoles(userRole) : []),
    canViewResource: (resourceOwnerId: string) => (userRole ? canViewResource(userRole, resourceOwnerId, userId) : false),
    getRoleDisplayName: () => (userRole ? getRoleDisplayName(userRole) : ""),
    getRoleColor: () => (userRole ? getRoleColor(userRole) : ""),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
