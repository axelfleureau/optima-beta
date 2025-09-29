/**
 * Auth Initializer Component
 * 
 * Initializes the Redux auth state when the app starts
 * Should be placed at the root level of the app
 */

"use client"

import { useEffect } from 'react'
import { useAuthActions, useAuthStatus } from '@/hooks/viewmodels'

export function AuthInitializer() {
  const { initialize } = useAuthActions()
  const { isInitialized } = useAuthStatus()

  useEffect(() => {
    if (!isInitialized) {
      initialize().catch(error => {
        console.error('Failed to initialize auth:', error)
      })
    }
  }, [isInitialized, initialize])

  // This component doesn't render anything
  return null
}