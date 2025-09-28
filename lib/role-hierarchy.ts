export type UserRole = "super-admin" | "admin" | "direzione" | "capo-reparto" | "junior" | "client"

/**
 * Role hierarchy levels (higher number = higher authority)
 */
export const ROLE_LEVELS: Record<UserRole, number> = {
  "super-admin": 6,
  "admin": 5,
  "direzione": 4,
  "capo-reparto": 3,
  "junior": 2,
  "client": 1,
}

/**
 * Role permissions for various actions
 */
export const ROLE_PERMISSIONS = {
  // Team management permissions
  canInviteUsers: ["super-admin", "admin"] as UserRole[],
  canDeleteUsers: ["super-admin", "admin"] as UserRole[],
  canModifyUserRoles: ["super-admin", "admin"] as UserRole[],
  
  // Client management permissions  
  canCreateClients: ["super-admin", "admin", "direzione"] as UserRole[],
  canEditClients: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  canDeleteClients: ["super-admin", "admin", "direzione"] as UserRole[],
  canViewAllClients: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  
  // Task management permissions
  canCreateTasks: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  canDeleteTasks: ["super-admin", "admin", "direzione"] as UserRole[],
  canAssignTasks: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  canViewAllTasks: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  
  // Campaign management permissions
  canCreateCampaigns: ["super-admin", "admin", "direzione"] as UserRole[],
  canEditCampaigns: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  canDeleteCampaigns: ["super-admin", "admin", "direzione"] as UserRole[],
  canViewAllCampaigns: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  
  // Quote generation permissions
  canCreateQuotes: ["super-admin", "admin", "direzione", "capo-reparto"] as UserRole[],
  canApproveQuotes: ["super-admin", "admin", "direzione"] as UserRole[],
  canViewAllQuotes: ["super-admin", "admin", "direzione"] as UserRole[],
} as const

/**
 * Check if a role has permission for a specific action
 */
export function hasPermission(userRole: UserRole, permission: keyof typeof ROLE_PERMISSIONS): boolean {
  return ROLE_PERMISSIONS[permission].includes(userRole)
}

/**
 * Check if user can manage another user based on role hierarchy
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  const manageableRoles = getManageableRoles(managerRole)
  return manageableRoles.includes(targetRole)
}

/**
 * Check if user can assign tasks to another user
 */
export function canAssignTaskTo(assignerRole: UserRole, assigneeRole: UserRole): boolean {
  // Can't assign to higher or equal level (except super-admin assigns to anyone)
  if (assignerRole === "super-admin") return true
  
  const assignerLevel = ROLE_LEVELS[assignerRole]
  const assigneeLevel = ROLE_LEVELS[assigneeRole]
  
  return assignerLevel > assigneeLevel
}

/**
 * Get roles that a user can assign tasks to
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_LEVELS[userRole]
  return (Object.keys(ROLE_LEVELS) as UserRole[]).filter(role => {
    return ROLE_LEVELS[role] < userLevel
  })
}

/**
 * Get roles that a user can manage (invite, edit, delete)
 */
export function getManageableRoles(userRole: UserRole): UserRole[] {
  if (userRole === "super-admin") {
    return ["admin", "direzione", "capo-reparto", "junior", "client"]
  }
  
  if (userRole === "admin") {
    return ["direzione", "capo-reparto", "junior", "client"]
  }
  
  if (userRole === "direzione") {
    return ["capo-reparto", "junior", "client"]
  }
  
  if (userRole === "capo-reparto") {
    return ["junior", "client"]
  }
  
  return []
}

/**
 * Check if user can view resource based on role
 */
export function canViewResource(userRole: UserRole, resourceOwnerId: string, currentUserId: string): boolean {
  // Super admin and admin can view everything
  if (["super-admin", "admin"].includes(userRole)) return true
  
  // Direzione and capo-reparto can view most resources
  if (["direzione", "capo-reparto"].includes(userRole)) return true
  
  // Junior and client can only view their own resources
  return resourceOwnerId === currentUserId
}

/**
 * Get role display name in Italian
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    "super-admin": "Super Admin",
    "admin": "Amministratore",
    "direzione": "Direzione",
    "capo-reparto": "Capo Reparto", 
    "junior": "Junior",
    "client": "Cliente"
  }
  
  return roleNames[role] || role
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    "super-admin": "bg-red-100 text-red-800",
    "admin": "bg-purple-100 text-purple-800",
    "direzione": "bg-blue-100 text-blue-800",
    "capo-reparto": "bg-green-100 text-green-800",
    "junior": "bg-yellow-100 text-yellow-800",
    "client": "bg-gray-100 text-gray-800"
  }
  
  return roleColors[role] || "bg-gray-100 text-gray-800"
}