/**
 * Auth ViewModel Hook - MVVM Pattern
 * 
 * Custom hook that provides auth state and actions following MVVM pattern
 * with complete memoization for optimal performance
 */

import { useMemo, useCallback } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import type { RootState, AppDispatch } from '@/app/store/store'
import type { AuthViewModel, SignInPayload, SignUpPayload, UpdateProfilePayload, UserPermissions } from '@/types/auth'
import type { UserRole } from '@/lib/role-hierarchy'
import { canManageUser, canAssignTaskTo, canViewResource } from '@/lib/role-hierarchy'
import {
  // Selectors
  selectUser,
  selectFirebaseUser,
  selectTenant,
  selectPermissions,
  selectIsAuthenticated,
  selectIsInitialized,
  selectAuthLoading,
  selectAuthErrors,
  selectRoleHelpers,
  selectSessionValid,
  selectHasPermission,
  selectCanManageUser,
  selectCanAssignTaskTo,
  selectCanViewResource,
  
  // Actions
  signIn,
  signUp,
  signOut,
  updateProfile,
  refreshToken,
  clearAuthErrors,
  initializeAuth,
} from '@/lib/store/auth-slice'

/**
 * Main Auth ViewModel Hook
 * 
 * Provides complete auth state management following MVVM pattern
 * All selectors are memoized for optimal performance
 */
export function useAuthViewModel(): AuthViewModel {
  const dispatch = useDispatch<AppDispatch>()

  // Memoized selectors with shallowEqual for performance
  const user = useSelector(selectUser, shallowEqual)
  const firebaseUser = useSelector(selectFirebaseUser, shallowEqual)
  const tenant = useSelector(selectTenant, shallowEqual)
  const permissions = useSelector(selectPermissions, shallowEqual)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitialized = useSelector(selectIsInitialized)
  const loading = useSelector(selectAuthLoading, shallowEqual)
  const errors = useSelector(selectAuthErrors, shallowEqual)
  const roleHelpers = useSelector(selectRoleHelpers, shallowEqual)
  const sessionValid = useSelector(selectSessionValid)

  // Memoized action creators
  const actions = useMemo(() => ({
    signIn: async (payload: SignInPayload) => {
      const result = await dispatch(signIn(payload))
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Sign in failed' }
    },

    signUp: async (payload: SignUpPayload) => {
      const result = await dispatch(signUp(payload))
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Sign up failed' }
    },

    signOut: async () => {
      await dispatch(signOut())
    },

    updateProfile: async (payload: UpdateProfilePayload) => {
      const result = await dispatch(updateProfile(payload))
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Update failed' }
    },

    refreshToken: async () => {
      const result = await dispatch(refreshToken())
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Token refresh failed' }
    },

    clearErrors: () => {
      dispatch(clearAuthErrors())
    },

    initialize: async () => {
      const result = await dispatch(initializeAuth())
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Initialization failed' }
    }
  }), [dispatch])

  // Memoized permission helpers (React hooks compliant)
  const permissionHelpers = useMemo(() => ({
    hasPermission: (permission: keyof UserPermissions) => {
      return permissions?.[permission] || false
    },

    canManageUser: (targetRole: UserRole) => {
      return user ? canManageUser(user.role, targetRole) : false
    },

    canAssignTaskTo: (assigneeRole: UserRole) => {
      return user ? canAssignTaskTo(user.role, assigneeRole) : false
    },

    canViewResource: (resourceOwnerId: string) => {
      return user ? canViewResource(user.role, resourceOwnerId, user.id) : false
    }
  }), [permissions, user])

  // Return complete ViewModel interface
  return {
    // State
    user,
    firebaseUser,
    tenant,
    permissions,
    isAuthenticated,
    isInitialized,
    loading,
    errors,
    roleHelpers,

    // Actions
    ...actions,

    // Permission Helpers
    ...permissionHelpers
  }
}

/**
 * Specialized hooks for specific auth aspects
 */

/**
 * Hook for auth status only (minimal re-renders)
 */
export function useAuthStatus() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitialized = useSelector(selectIsInitialized)
  const sessionValid = useSelector(selectSessionValid)
  const loading = useSelector((state: RootState) => state.auth.loading.initializing)

  return useMemo(() => ({
    isAuthenticated,
    isInitialized,
    sessionValid,
    loading
  }), [isAuthenticated, isInitialized, sessionValid, loading])
}

/**
 * Hook for user info only
 */
export function useAuthUser() {
  const user = useSelector(selectUser, shallowEqual)
  const roleHelpers = useSelector(selectRoleHelpers, shallowEqual)

  return useMemo(() => ({
    user,
    ...roleHelpers
  }), [user, roleHelpers])
}

/**
 * Hook for permissions only
 */
export function useAuthPermissions() {
  const permissions = useSelector(selectPermissions, shallowEqual)
  const user = useSelector(selectUser)

  const hasPermission = useCallback((permission: keyof UserPermissions) => {
    return permissions?.[permission] || false
  }, [permissions])

  const canManageUserFn = useCallback((targetRole: UserRole) => {
    return user ? canManageUser(user.role, targetRole) : false
  }, [user])

  const canAssignTaskToFn = useCallback((assigneeRole: UserRole) => {
    return user ? canAssignTaskTo(user.role, assigneeRole) : false
  }, [user])

  const canViewResourceFn = useCallback((resourceOwnerId: string) => {
    return user ? canViewResource(user.role, resourceOwnerId, user.id) : false
  }, [user])

  return useMemo(() => ({
    permissions,
    hasPermission,
    canManageUser: canManageUserFn,
    canAssignTaskTo: canAssignTaskToFn,
    canViewResource: canViewResourceFn
  }), [permissions, hasPermission, canManageUserFn, canAssignTaskToFn, canViewResourceFn])
}

/**
 * Hook for loading states only
 */
export function useAuthLoading() {
  const loading = useSelector(selectAuthLoading, shallowEqual)
  
  return useMemo(() => loading, [loading])
}

/**
 * Hook for error states only
 */
export function useAuthErrors() {
  const errors = useSelector(selectAuthErrors, shallowEqual)
  const dispatch = useDispatch<AppDispatch>()

  const clearErrors = useCallback(() => {
    dispatch(clearAuthErrors())
  }, [dispatch])

  return useMemo(() => ({
    errors,
    clearErrors
  }), [errors, clearErrors])
}

/**
 * Hook for tenant info only
 */
export function useAuthTenant() {
  const tenant = useSelector(selectTenant, shallowEqual)
  
  return useMemo(() => ({
    tenant
  }), [tenant])
}

/**
 * Hook for role-based conditional rendering
 */
export function useAuthRole() {
  const roleHelpers = useSelector(selectRoleHelpers, shallowEqual)
  const user = useSelector(selectUser)

  const isRole = useCallback((role: UserRole) => {
    return user?.role === role
  }, [user])

  const hasMinimumRole = useCallback((minRole: UserRole) => {
    if (!user) return false
    
    const roleHierarchy: Record<UserRole, number> = {
      'super-admin': 6,
      'admin': 5,
      'direzione': 4,
      'capo-reparto': 3,
      'junior': 2,
      'client': 1
    }
    
    return roleHierarchy[user.role] >= roleHierarchy[minRole]
  }, [user])

  return useMemo(() => ({
    ...roleHelpers,
    isRole,
    hasMinimumRole
  }), [roleHelpers, isRole, hasMinimumRole])
}

/**
 * Hook for auth actions only (no state)
 */
export function useAuthActions() {
  const dispatch = useDispatch<AppDispatch>()

  return useMemo(() => ({
    signIn: async (payload: SignInPayload) => {
      const result = await dispatch(signIn(payload))
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Sign in failed' }
    },

    signUp: async (payload: SignUpPayload) => {
      const result = await dispatch(signUp(payload))
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Sign up failed' }
    },

    signOut: async () => {
      await dispatch(signOut())
    },

    updateProfile: async (payload: UpdateProfilePayload) => {
      const result = await dispatch(updateProfile(payload))
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Update failed' }
    },

    refreshToken: async () => {
      const result = await dispatch(refreshToken())
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Token refresh failed' }
    },

    clearErrors: () => {
      dispatch(clearAuthErrors())
    },

    initialize: async () => {
      const result = await dispatch(initializeAuth())
      return result.meta.requestStatus === 'fulfilled' 
        ? { data: result.payload } 
        : { error: result.payload?.error || 'Initialization failed' }
    }
  }), [dispatch])
}