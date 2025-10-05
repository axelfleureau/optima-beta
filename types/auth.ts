import type { Timestamp } from "firebase/firestore"
import type { UserRole } from "@/lib/role-hierarchy"

/**
 * Redux Auth State Types - MVVM Architecture
 * 
 * These types define the structure for Redux auth state management
 * following MVVM pattern with complete type safety
 */

// Firebase User Auth State
export interface FirebaseAuthUser {
  uid: string
  email: string | null
  emailVerified: boolean
  displayName: string | null
  photoURL: string | null
  phoneNumber: string | null
  tenantId?: string
  metadata: {
    creationTime?: string
    lastSignInTime?: string
  }
}

// Complete User Profile from Firestore
export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  tenantId: string
  parentTenantId?: string
  clientId?: string
  companyName?: string
  createdAt: Timestamp | Date
  updatedAt?: Timestamp | Date
  aiTokensUsed?: number
  aiTokensLimit?: number
  isSuspended?: boolean
  assignedClientIds?: string[]
  plan?: string
}

// Tenant/Agency Information
export interface TenantData {
  id: string
  name: string
  type: "agency" | "client"
  parentTenantId?: string
  aiTokensLimit?: number
  aiTokensUsed?: number
  settings?: {
    maxUsers: number
    features: string[]
  }
  plan?: "90" | "180" | "360" | null
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | null
  billingCycleStart?: Timestamp | Date
  billingCycleEnd?: Timestamp | Date
  cancelAtPeriodEnd?: boolean
  canceledAt?: Timestamp | Date
  createdAt: Date
  updatedAt: Date
}

// User Permissions (computed from role)
export interface UserPermissions {
  // Team management
  canInviteUsers: boolean
  canDeleteUsers: boolean
  canModifyUserRoles: boolean
  
  // Client management
  canCreateClients: boolean
  canEditClients: boolean
  canDeleteClients: boolean
  canViewAllClients: boolean
  
  // Task management
  canCreateTasks: boolean
  canDeleteTasks: boolean
  canAssignTasks: boolean
  canViewAllTasks: boolean
  
  // Campaign management
  canCreateCampaigns: boolean
  canEditCampaigns: boolean
  canDeleteCampaigns: boolean
  canViewAllCampaigns: boolean
  
  // Quote management
  canCreateQuotes: boolean
  canApproveQuotes: boolean
  canViewAllQuotes: boolean
  
  // Assignable and manageable roles
  assignableRoles: UserRole[]
  manageableRoles: UserRole[]
}

// Loading states for different auth operations
export interface AuthLoadingStates {
  initializing: boolean
  signIn: boolean
  signUp: boolean
  signOut: boolean
  updateProfile: boolean
  refreshToken: boolean
  loadingUserData: boolean
}

// Error states for auth operations
export interface AuthErrorStates {
  signIn: string | null
  signUp: string | null
  signOut: string | null
  updateProfile: string | null
  general: string | null
}

// Main Redux Auth State
export interface AuthState {
  // Firebase Auth
  firebaseUser: FirebaseAuthUser | null
  
  // User Profile & Data
  user: UserProfile | null
  
  // Tenant Information
  tenant: TenantData | null
  
  // Computed Permissions (memoized)
  permissions: UserPermissions | null
  
  // Loading States
  loading: AuthLoadingStates
  
  // Error States
  errors: AuthErrorStates
  
  // Auth Session State
  isAuthenticated: boolean
  isInitialized: boolean
  sessionValid: boolean
  
  // Token Management
  idToken: string | null
  tokenExpiry: number | null
  
  // Role-based computed properties
  roleHelpers: {
    isSuperAdmin: boolean
    isAdmin: boolean
    isDirezione: boolean
    isCapoReparto: boolean
    isJunior: boolean
    isClient: boolean
    isSuspended: boolean
    roleDisplayName: string
    roleColor: string
  }
}

// Auth Action Payloads
export interface SignInPayload {
  email: string
  password: string
}

export interface SignUpPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName?: string
  role?: UserRole
}

export interface UpdateProfilePayload {
  firstName?: string
  lastName?: string
  companyName?: string
  aiTokensLimit?: number
}

export interface SetUserPayload {
  firebaseUser: FirebaseAuthUser
  userProfile: UserProfile
  tenant: TenantData
}

// Async Thunk Return Types
export interface AuthThunkReturn<T = any> {
  data?: T
  error?: string
}

export interface SignInThunkReturn extends AuthThunkReturn {
  data?: {
    user: UserProfile
    tenant: TenantData
    token: string
  }
}

export interface SignUpThunkReturn extends AuthThunkReturn {
  data?: {
    user: UserProfile
    tenant: TenantData
    token: string
  }
}

// Selectors Return Types
export interface AuthSelectors {
  selectAuthState: AuthState
  selectUser: UserProfile | null
  selectFirebaseUser: FirebaseAuthUser | null
  selectTenant: TenantData | null
  selectPermissions: UserPermissions | null
  selectIsAuthenticated: boolean
  selectIsInitialized: boolean
  selectAuthLoading: AuthLoadingStates
  selectAuthErrors: AuthErrorStates
  selectRoleHelpers: AuthState['roleHelpers']
}

// ViewModel Hook Return Type
export interface AuthViewModel {
  // State
  user: UserProfile | null
  firebaseUser: FirebaseAuthUser | null
  tenant: TenantData | null
  permissions: UserPermissions | null
  isAuthenticated: boolean
  isInitialized: boolean
  loading: AuthLoadingStates
  errors: AuthErrorStates
  roleHelpers: AuthState['roleHelpers']
  
  // Actions
  signIn: (payload: SignInPayload) => Promise<AuthThunkReturn>
  signUp: (payload: SignUpPayload) => Promise<AuthThunkReturn>
  signOut: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthThunkReturn>
  refreshToken: () => Promise<AuthThunkReturn>
  clearErrors: () => void
  
  // Permission Helpers (memoized)
  hasPermission: (permission: keyof UserPermissions) => boolean
  canManageUser: (targetRole: UserRole) => boolean
  canAssignTaskTo: (assigneeRole: UserRole) => boolean
  canViewResource: (resourceOwnerId: string) => boolean
}