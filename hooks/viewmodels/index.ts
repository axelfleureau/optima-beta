/**
 * ViewModel Hooks Index
 * 
 * Central export point for all ViewModel hooks following MVVM pattern
 */

// Auth ViewModels
export {
  useAuthViewModel,
  useAuthStatus,
  useAuthUser,
  useAuthPermissions,
  useAuthLoading,
  useAuthErrors,
  useAuthTenant,
  useAuthRole,
  useAuthActions
} from './use-auth-viewmodel'

// Export types
export type { AuthViewModel } from '@/types/auth'