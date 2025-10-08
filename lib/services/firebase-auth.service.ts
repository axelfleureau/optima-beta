/**
 * Firebase Authentication Service Layer
 * 
 * This service provides a clean abstraction over Firebase Auth operations
 * Used by Redux thunks for consistent auth handling
 */

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  type User as FirebaseUser,
  type UserCredential
} from "firebase/auth"
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  serverTimestamp
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import type { UserProfile, TenantData, SignInPayload, SignUpPayload } from "@/types/auth"
import type { UserRole } from "@/lib/role-hierarchy"

// Error types for better error handling
export interface AuthServiceError {
  code: string
  message: string
  details?: any
}

// Service response types
export interface AuthServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: AuthServiceError
}

export interface UserWithTenant {
  user: UserProfile
  tenant: TenantData | null
  firebaseUser: FirebaseUser
}

/**
 * Firebase Authentication Service
 * Provides clean abstraction for auth operations
 */
export class FirebaseAuthService {
  /**
   * Sign in user with email and password
   */
  async signIn(payload: SignInPayload): Promise<AuthServiceResponse<UserWithTenant>> {
    try {
      const { email, password } = payload
      
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Get user profile and tenant data
      const userDataResult = await this.getUserWithTenant(firebaseUser.uid)
      
      if (!userDataResult.success || !userDataResult.data) {
        return {
          success: false,
          error: {
            code: 'user-not-found',
            message: 'User profile not found'
          }
        }
      }

      const { user: userProfile, tenant } = userDataResult.data

      // Check if user is suspended
      if (userProfile.isSuspended) {
        await firebaseSignOut(auth)
        return {
          success: false,
          error: {
            code: 'user-suspended',
            message: 'Account suspended'
          }
        }
      }

      // Update last login timestamp
      await this.updateLastLogin(userProfile.id)

      return {
        success: true,
        data: {
          user: userProfile,
          tenant,
          firebaseUser
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'auth-error',
          message: this.getErrorMessage(error),
          details: error
        }
      }
    }
  }

  /**
   * Sign up new user
   */
  async signUp(payload: SignUpPayload): Promise<AuthServiceResponse<UserWithTenant>> {
    try {
      const { email, password, firstName, lastName, companyName, role = "junior" } = payload

      // Check if email already exists in users collection (for better error handling)
      const existingUser = await this.checkEmailExists(email)
      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'email-already-in-use',
            message: 'Email is already registered'
          }
        }
      }

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Generate tenant ID for admin users, use parent tenant for others
      let tenantId = ""
      let parentTenantId: string | undefined = undefined

      if (role === "admin") {
        // Create new tenant for admin users
        tenantId = `tenant_${firebaseUser.uid}`
      } else {
        // For non-admin users, they need to be invited by an admin
        // This is a security measure - regular signups should be limited
        return {
          success: false,
          error: {
            code: 'signup-not-allowed',
            message: 'Direct signup not allowed for this role. Please contact an administrator.'
          }
        }
      }

      // Create user profile
      const userProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        firstName,
        lastName,
        role,
        tenantId,
        parentTenantId,
        companyName,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiTokensUsed: 0,
        aiTokensLimit: role === "admin" ? 10000 : 1000,
        isSuspended: false,
      }

      // Create tenant data for admin users
      let tenantData: TenantData | null = null
      if (role === "admin") {
        tenantData = {
          id: tenantId,
          name: companyName || `${firstName} ${lastName}'s Agency`,
          type: "agency",
          aiTokensLimit: 10000,
          aiTokensUsed: 0,
          settings: {
            maxUsers: 50,
            features: ["quotes", "campaigns", "team", "ai_assistant"]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Save tenant to Firestore
        await setDoc(doc(db, "tenants", tenantId), {
          ...tenantData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }

      // Save user profile to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return {
        success: true,
        data: {
          user: userProfile,
          tenant: tenantData,
          firebaseUser
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'signup-error',
          message: this.getErrorMessage(error),
          details: error
        }
      }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthServiceResponse> {
    try {
      await firebaseSignOut(auth)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'signout-error',
          message: this.getErrorMessage(error),
          details: error
        }
      }
    }
  }

  /**
   * Get user profile with tenant data
   */
  async getUserWithTenant(userId: string): Promise<AuthServiceResponse<{ user: UserProfile; tenant: TenantData | null }>> {
    try {
      // Get user document
      const userDoc = await getDoc(doc(db, "users", userId))
      
      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            code: 'user-not-found',
            message: 'User profile not found'
          }
        }
      }

      const userData = userDoc.data()
      const userProfile: UserProfile = {
        ...userData,
        id: userId,
        createdAt: this.safeToDate(userData.createdAt),
        updatedAt: this.safeToDate(userData.updatedAt),
      } as UserProfile

      // Get tenant data if user has tenantId
      let tenantData: TenantData | null = null
      if (userData.tenantId) {
        const tenantDoc = await getDoc(doc(db, "tenants", userData.tenantId))
        if (tenantDoc.exists()) {
          const tenant = tenantDoc.data()
          tenantData = {
            ...tenant,
            id: tenantDoc.id,
            createdAt: this.safeToDate(tenant.createdAt),
            updatedAt: this.safeToDate(tenant.updatedAt),
          } as TenantData
        }
      }

      return {
        success: true,
        data: {
          user: userProfile,
          tenant: tenantData
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'fetch-error',
          message: 'Failed to fetch user data',
          details: error
        }
      }
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthServiceResponse<UserProfile>> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      await updateDoc(doc(db, "users", userId), updateData)

      // Fetch updated user data
      const result = await this.getUserWithTenant(userId)
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.user
        }
      }

      return {
        success: false,
        error: {
          code: 'update-error',
          message: 'Failed to fetch updated user data'
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'update-error',
          message: 'Failed to update user profile',
          details: error
        }
      }
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<AuthServiceResponse> {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'password-reset-error',
          message: this.getErrorMessage(error),
          details: error
        }
      }
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(newPassword: string): Promise<AuthServiceResponse> {
    try {
      if (!auth.currentUser) {
        return {
          success: false,
          error: {
            code: 'no-user',
            message: 'No authenticated user'
          }
        }
      }

      await updatePassword(auth.currentUser, newPassword)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'password-update-error',
          message: this.getErrorMessage(error),
          details: error
        }
      }
    }
  }

  /**
   * Update user email
   */
  async updateUserEmail(newEmail: string): Promise<AuthServiceResponse> {
    try {
      if (!auth.currentUser) {
        return {
          success: false,
          error: {
            code: 'no-user',
            message: 'No authenticated user'
          }
        }
      }

      await updateEmail(auth.currentUser, newEmail)
      
      // Update email in user profile
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        email: newEmail,
        updatedAt: serverTimestamp()
      })

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'email-update-error',
          message: this.getErrorMessage(error),
          details: error
        }
      }
    }
  }

  /**
   * Get user's ID token
   */
  async getIdToken(forceRefresh = false): Promise<AuthServiceResponse<string>> {
    try {
      if (!auth.currentUser) {
        return {
          success: false,
          error: {
            code: 'no-user',
            message: 'No authenticated user'
          }
        }
      }

      const token = await auth.currentUser.getIdToken(forceRefresh)
      return {
        success: true,
        data: token
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'token-error',
          message: 'Failed to get ID token',
          details: error
        }
      }
    }
  }

  // Private helper methods

  /**
   * Check if email already exists in users collection
   */
  private async checkEmailExists(email: string): Promise<boolean> {
    try {
      const q = query(collection(db, "users"), where("email", "==", email))
      const snapshot = await getDocs(q)
      return !snapshot.empty
    } catch (error) {
      console.warn("Error checking email existence:", error)
      return false
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "users", userId), {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.warn("Failed to update last login:", error)
    }
  }

  /**
   * Safely convert Firestore timestamp to Date
   */
  private safeToDate(timestamp: any): Date {
    if (!timestamp) return new Date()
    if (timestamp instanceof Date) return timestamp
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      try {
        return timestamp.toDate()
      } catch (e) {
        console.warn("Error converting timestamp:", e)
        return new Date()
      }
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    return new Date()
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'Utente non trovato',
      'auth/wrong-password': 'Password non corretta',
      'auth/email-already-in-use': 'Email già in uso',
      'auth/weak-password': 'Password troppo debole',
      'auth/invalid-email': 'Email non valida',
      'auth/user-disabled': 'Account disabilitato',
      'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi',
      'auth/operation-not-allowed': 'Operazione non consentita',
      'auth/requires-recent-login': 'Richiesto login recente per questa operazione',
    }

    return errorMessages[error.code] || error.message || 'Errore sconosciuto'
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService()