export interface UserSession {
  uid: string
  email: string | null
  displayName: string | null
  firstName?: string
  lastName?: string
  role: "super-admin" | "admin" | "user" | "client"
  tenantId: string
  isSuspended?: boolean
  companyName?: string
}

// Session verification supporting both client and server contexts
export async function getSession(): Promise<UserSession | null> {
  try {
    // Server-side: use next/headers to read cookies and verify directly
    if (typeof window === 'undefined') {
      const { cookies } = await import('next/headers')
      const { verifyFirebaseToken, getUserData } = await import('./firebase-admin')
      
      try {
        const cookieStore = await cookies()
        const token = cookieStore.get('firebase-auth-token')?.value

        if (!token) {
          return null
        }

        // Verify token and get user data
        const decodedToken = await verifyFirebaseToken(token)
        const userData = await getUserData(decodedToken.uid)
        
        if (!userData || userData.isSuspended) {
          return null
        }

        return {
          uid: decodedToken.uid,
          email: userData.email || decodedToken.email,
          displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || "user",
          tenantId: userData.tenantId || "",
          isSuspended: userData.isSuspended || false,
          companyName: userData.companyName
        }
        
      } catch (serverError) {
        console.error('Server session verification error:', serverError)
        return null
      }
    }

    // Client-side: attempt to verify session via API
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user || null

  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

// Set session by calling secure token API (already implemented in auth-context)
export async function setSession(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/set-secure-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    return response.ok
  } catch (error) {
    console.error('Error setting session:', error)
    return false
  }
}

// Clear session by calling secure logout API
export async function clearSession(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } catch (error) {
    console.error('Error clearing session:', error)
  }
}
