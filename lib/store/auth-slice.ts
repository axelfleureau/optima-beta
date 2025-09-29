import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from "@reduxjs/toolkit"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { 
  hasPermission, 
  canManageUser, 
  canAssignTaskTo, 
  getAssignableRoles, 
  getManageableRoles, 
  canViewResource,
  getRoleDisplayName,
  getRoleColor,
  type UserRole 
} from "@/lib/role-hierarchy"
import type {
  AuthState,
  FirebaseAuthUser,
  UserProfile,
  TenantData,
  UserPermissions,
  SignInPayload,
  SignUpPayload,
  UpdateProfilePayload,
  SetUserPayload,
  SignInThunkReturn,
  SignUpThunkReturn,
  AuthThunkReturn
} from "@/types/auth"

// Helper function to safely convert Firestore timestamp to Date
const safeToDate = (timestamp: any): Date => {
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

// Helper to convert Firebase User to our type
const mapFirebaseUser = (user: FirebaseUser): FirebaseAuthUser => ({
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified,
  displayName: user.displayName,
  photoURL: user.photoURL,
  phoneNumber: user.phoneNumber,
  tenantId: user.tenantId || undefined,
  metadata: {
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime,
  }
})

// Helper to compute user permissions based on role
const computePermissions = (role: UserRole): UserPermissions => ({
  canInviteUsers: hasPermission(role, 'canInviteUsers'),
  canDeleteUsers: hasPermission(role, 'canDeleteUsers'),
  canModifyUserRoles: hasPermission(role, 'canModifyUserRoles'),
  canCreateClients: hasPermission(role, 'canCreateClients'),
  canEditClients: hasPermission(role, 'canEditClients'),
  canDeleteClients: hasPermission(role, 'canDeleteClients'),
  canViewAllClients: hasPermission(role, 'canViewAllClients'),
  canCreateTasks: hasPermission(role, 'canCreateTasks'),
  canDeleteTasks: hasPermission(role, 'canDeleteTasks'),
  canAssignTasks: hasPermission(role, 'canAssignTasks'),
  canViewAllTasks: hasPermission(role, 'canViewAllTasks'),
  canCreateCampaigns: hasPermission(role, 'canCreateCampaigns'),
  canEditCampaigns: hasPermission(role, 'canEditCampaigns'),
  canDeleteCampaigns: hasPermission(role, 'canDeleteCampaigns'),
  canViewAllCampaigns: hasPermission(role, 'canViewAllCampaigns'),
  canCreateQuotes: hasPermission(role, 'canCreateQuotes'),
  canApproveQuotes: hasPermission(role, 'canApproveQuotes'),
  canViewAllQuotes: hasPermission(role, 'canViewAllQuotes'),
  assignableRoles: getAssignableRoles(role),
  manageableRoles: getManageableRoles(role),
})

// Helper to compute role helpers
const computeRoleHelpers = (user: UserProfile | null) => {
  if (!user) {
    return {
      isSuperAdmin: false,
      isAdmin: false,
      isDirezione: false,
      isCapoReparto: false,
      isJunior: false,
      isClient: false,
      isSuspended: false,
      roleDisplayName: "",
      roleColor: ""
    }
  }

  return {
    isSuperAdmin: user.role === "super-admin",
    isAdmin: user.role === "admin",
    isDirezione: user.role === "direzione",
    isCapoReparto: user.role === "capo-reparto",
    isJunior: user.role === "junior",
    isClient: user.role === "client",
    isSuspended: user.isSuspended || false,
    roleDisplayName: getRoleDisplayName(user.role),
    roleColor: getRoleColor(user.role)
  }
}

// Initial state
const initialState: AuthState = {
  firebaseUser: null,
  user: null,
  tenant: null,
  permissions: null,
  loading: {
    initializing: true,
    signIn: false,
    signUp: false,
    signOut: false,
    updateProfile: false,
    refreshToken: false,
    loadingUserData: false,
  },
  errors: {
    signIn: null,
    signUp: null,
    signOut: null,
    updateProfile: null,
    general: null,
  },
  isAuthenticated: false,
  isInitialized: false,
  sessionValid: false,
  idToken: null,
  tokenExpiry: null,
  roleHelpers: {
    isSuperAdmin: false,
    isAdmin: false,
    isDirezione: false,
    isCapoReparto: false,
    isJunior: false,
    isClient: false,
    isSuspended: false,
    roleDisplayName: "",
    roleColor: ""
  }
}

// Async Thunks

// Initialize Auth State Listener
export const initializeAuth = createAsyncThunk(
  "auth/initializeAuth",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      return new Promise<AuthThunkReturn>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              dispatch(setAuthLoading({ field: 'loadingUserData', value: true }))
              
              // Get user profile and tenant data in parallel
              const [userDoc, token] = await Promise.all([
                getDoc(doc(db, "users", firebaseUser.uid)),
                firebaseUser.getIdToken()
              ])

              if (userDoc.exists()) {
                const userData = userDoc.data() as any
                const userProfile: UserProfile = {
                  ...userData,
                  id: firebaseUser.uid,
                  createdAt: safeToDate(userData.createdAt),
                  updatedAt: safeToDate(userData.updatedAt),
                }

                // Get tenant data
                let tenantData: TenantData | null = null
                if (userData.tenantId) {
                  const tenantDoc = await getDoc(doc(db, "tenants", userData.tenantId))
                  if (tenantDoc.exists()) {
                    const tenant = tenantDoc.data() as any
                    tenantData = {
                      ...tenant,
                      id: tenantDoc.id,
                      createdAt: safeToDate(tenant.createdAt),
                      updatedAt: safeToDate(tenant.updatedAt),
                    }
                  }
                }

                dispatch(setUser({
                  firebaseUser: mapFirebaseUser(firebaseUser),
                  userProfile,
                  tenant: tenantData!
                }))

                dispatch(setIdToken(token))
                
                // Set secure token for API calls
                try {
                  await fetch("/api/auth/set-secure-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                  })
                } catch (error) {
                  console.warn("Failed to set secure token:", error)
                }

                resolve({ data: { user: userProfile, tenant: tenantData, token } })
              } else {
                dispatch(clearAuth())
                resolve({ error: "User profile not found" })
              }
            } catch (error) {
              console.error("Error loading user data:", error)
              dispatch(setAuthError({ field: 'general', message: "Failed to load user data" }))
              resolve({ error: "Failed to load user data" })
            } finally {
              dispatch(setAuthLoading({ field: 'loadingUserData', value: false }))
              dispatch(setAuthLoading({ field: 'initializing', value: false }))
              dispatch(setInitialized(true))
            }
          } else {
            dispatch(clearAuth())
            dispatch(setAuthLoading({ field: 'initializing', value: false }))
            dispatch(setInitialized(true))
            resolve({ data: null })
          }
        })

        // Return unsubscribe function for cleanup
        return unsubscribe
      })
    } catch (error: any) {
      dispatch(setAuthLoading({ field: 'initializing', value: false }))
      dispatch(setInitialized(true))
      return rejectWithValue(error.message)
    }
  }
)

// Sign In Thunk
export const signIn = createAsyncThunk<SignInThunkReturn, SignInPayload>(
  "auth/signIn",
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Get user profile and token
      const [userDoc, token] = await Promise.all([
        getDoc(doc(db, "users", firebaseUser.uid)),
        firebaseUser.getIdToken()
      ])

      if (!userDoc.exists()) {
        throw new Error("User profile not found")
      }

      const userData = userDoc.data() as any
      const userProfile: UserProfile = {
        ...userData,
        id: firebaseUser.uid,
        createdAt: safeToDate(userData.createdAt),
        updatedAt: safeToDate(userData.updatedAt),
      }

      // Check if user is suspended
      if (userProfile.isSuspended) {
        await firebaseSignOut(auth)
        throw new Error("Account suspended")
      }

      // Get tenant data
      let tenantData: TenantData | null = null
      if (userData.tenantId) {
        const tenantDoc = await getDoc(doc(db, "tenants", userData.tenantId))
        if (tenantDoc.exists()) {
          const tenant = tenantDoc.data() as any
          tenantData = {
            ...tenant,
            id: tenantDoc.id,
            createdAt: safeToDate(tenant.createdAt),
            updatedAt: safeToDate(tenant.updatedAt),
          }
        }
      }

      // Set secure token for API calls
      try {
        await fetch("/api/auth/set-secure-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
      } catch (error) {
        console.warn("Failed to set secure token:", error)
      }

      return {
        data: {
          user: userProfile,
          tenant: tenantData!,
          token
        }
      }
    } catch (error: any) {
      return rejectWithValue({ error: error.message })
    }
  }
)

// Sign Up Thunk
export const signUp = createAsyncThunk<SignUpThunkReturn, SignUpPayload>(
  "auth/signUp",
  async ({ email, password, firstName, lastName, companyName, role = "junior" }, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Create user profile
      const userProfile: Partial<UserProfile> = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        firstName,
        lastName,
        role,
        companyName,
        createdAt: new Date(),
        aiTokensUsed: 0,
        aiTokensLimit: 1000,
        isSuspended: false,
      }

      // Save to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        ...userProfile,
        createdAt: Timestamp.now(),
      })

      const token = await firebaseUser.getIdToken()

      return {
        data: {
          user: userProfile as UserProfile,
          tenant: null!,
          token
        }
      }
    } catch (error: any) {
      return rejectWithValue({ error: error.message })
    }
  }
)

// Sign Out Thunk
export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue }) => {
    try {
      // Call logout API to clear secure cookies
      try {
        await fetch("/api/auth/logout", { method: "POST" })
      } catch (error) {
        console.warn("Failed to clear secure token:", error)
      }

      await firebaseSignOut(auth)
      return null
    } catch (error: any) {
      return rejectWithValue({ error: error.message })
    }
  }
)

// Update Profile Thunk
export const updateProfile = createAsyncThunk<AuthThunkReturn, UpdateProfilePayload>(
  "auth/updateProfile",
  async (updates, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const userId = state.auth.user?.id

      if (!userId) {
        throw new Error("User not authenticated")
      }

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      }

      await setDoc(doc(db, "users", userId), updateData, { merge: true })

      return { data: updateData }
    } catch (error: any) {
      return rejectWithValue({ error: error.message })
    }
  }
)

// Refresh Token Thunk
export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const firebaseUser = state.auth.firebaseUser

      if (!firebaseUser || !auth.currentUser) {
        throw new Error("No authenticated user")
      }

      const token = await auth.currentUser.getIdToken(true) // Force refresh

      // Set secure token for API calls
      try {
        await fetch("/api/auth/set-secure-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
      } catch (error) {
        console.warn("Failed to set secure token:", error)
      }

      return { data: { token } }
    } catch (error: any) {
      return rejectWithValue({ error: error.message })
    }
  }
)

// Auth Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SetUserPayload>) => {
      const { firebaseUser, userProfile, tenant } = action.payload
      state.firebaseUser = firebaseUser
      state.user = userProfile
      state.tenant = tenant
      state.permissions = computePermissions(userProfile.role)
      state.roleHelpers = computeRoleHelpers(userProfile)
      state.isAuthenticated = true
      state.sessionValid = true
      state.errors.general = null
    },

    setIdToken: (state, action: PayloadAction<string>) => {
      state.idToken = action.payload
      // Set token expiry to 1 hour from now
      state.tokenExpiry = Date.now() + (60 * 60 * 1000)
    },

    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload
    },

    setAuthLoading: (state, action: PayloadAction<{ field: keyof AuthState['loading']; value: boolean }>) => {
      state.loading[action.payload.field] = action.payload.value
    },

    setAuthError: (state, action: PayloadAction<{ field: keyof AuthState['errors']; message: string | null }>) => {
      state.errors[action.payload.field] = action.payload.message
    },

    clearAuthErrors: (state) => {
      state.errors = {
        signIn: null,
        signUp: null,
        signOut: null,
        updateProfile: null,
        general: null,
      }
    },

    clearAuth: (state) => {
      state.firebaseUser = null
      state.user = null
      state.tenant = null
      state.permissions = null
      state.isAuthenticated = false
      state.sessionValid = false
      state.idToken = null
      state.tokenExpiry = null
      state.roleHelpers = computeRoleHelpers(null)
      state.errors.general = null
    },

    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        state.permissions = computePermissions(state.user.role)
        state.roleHelpers = computeRoleHelpers(state.user)
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.loading.initializing = true
      })
      .addCase(initializeAuth.fulfilled, (state) => {
        state.loading.initializing = false
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading.initializing = false
        state.errors.general = action.payload as string
      })

      // Sign In
      .addCase(signIn.pending, (state) => {
        state.loading.signIn = true
        state.errors.signIn = null
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading.signIn = false
        if (action.payload.data) {
          const { user, tenant, token } = action.payload.data
          state.firebaseUser = state.firebaseUser // Keep existing firebase user
          state.user = user
          state.tenant = tenant
          state.permissions = computePermissions(user.role)
          state.roleHelpers = computeRoleHelpers(user)
          state.isAuthenticated = true
          state.sessionValid = true
          state.idToken = token
          state.tokenExpiry = Date.now() + (60 * 60 * 1000)
        }
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading.signIn = false
        state.errors.signIn = (action.payload as any)?.error || "Sign in failed"
      })

      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.loading.signUp = true
        state.errors.signUp = null
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading.signUp = false
        if (action.payload.data) {
          const { user, tenant, token } = action.payload.data
          state.user = user
          state.tenant = tenant
          state.permissions = computePermissions(user.role)
          state.roleHelpers = computeRoleHelpers(user)
          state.isAuthenticated = true
          state.sessionValid = true
          state.idToken = token
          state.tokenExpiry = Date.now() + (60 * 60 * 1000)
        }
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading.signUp = false
        state.errors.signUp = (action.payload as any)?.error || "Sign up failed"
      })

      // Sign Out
      .addCase(signOut.pending, (state) => {
        state.loading.signOut = true
        state.errors.signOut = null
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loading.signOut = false
        state.firebaseUser = null
        state.user = null
        state.tenant = null
        state.permissions = null
        state.isAuthenticated = false
        state.sessionValid = false
        state.idToken = null
        state.tokenExpiry = null
        state.roleHelpers = computeRoleHelpers(null)
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loading.signOut = false
        state.errors.signOut = (action.payload as any)?.error || "Sign out failed"
      })

      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading.updateProfile = true
        state.errors.updateProfile = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading.updateProfile = false
        if (state.user && action.payload.data) {
          state.user = { ...state.user, ...action.payload.data }
          if (state.user) {
            state.permissions = computePermissions(state.user.role)
            state.roleHelpers = computeRoleHelpers(state.user)
          }
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading.updateProfile = false
        state.errors.updateProfile = (action.payload as any)?.error || "Update failed"
      })

      // Refresh Token
      .addCase(refreshToken.pending, (state) => {
        state.loading.refreshToken = true
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading.refreshToken = false
        if (action.payload.data?.token) {
          state.idToken = action.payload.data.token
          state.tokenExpiry = Date.now() + (60 * 60 * 1000)
          state.sessionValid = true
        }
      })
      .addCase(refreshToken.rejected, (state) => {
        state.loading.refreshToken = false
        state.sessionValid = false
      })
  },
})

// Actions
export const {
  setUser,
  setIdToken,
  setInitialized,
  setAuthLoading,
  setAuthError,
  clearAuthErrors,
  clearAuth,
  updateUserProfile,
} = authSlice.actions

// Selectors (memoized with createSelector for performance)
export const selectAuthState = (state: { auth: AuthState }) => state.auth

export const selectUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
)

export const selectFirebaseUser = createSelector(
  [selectAuthState],
  (auth) => auth.firebaseUser
)

export const selectTenant = createSelector(
  [selectAuthState],
  (auth) => auth.tenant
)

export const selectPermissions = createSelector(
  [selectAuthState],
  (auth) => auth.permissions
)

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
)

export const selectIsInitialized = createSelector(
  [selectAuthState],
  (auth) => auth.isInitialized
)

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loading
)

export const selectAuthErrors = createSelector(
  [selectAuthState],
  (auth) => auth.errors
)

export const selectRoleHelpers = createSelector(
  [selectAuthState],
  (auth) => auth.roleHelpers
)

export const selectSessionValid = createSelector(
  [selectAuthState],
  (auth) => auth.sessionValid
)

export const selectTokenExpiry = createSelector(
  [selectAuthState],
  (auth) => auth.tokenExpiry
)

// Permission Selectors
export const selectHasPermission = createSelector(
  [selectPermissions, (state, permission: keyof UserPermissions) => permission],
  (permissions, permission) => permissions?.[permission] || false
)

export const selectCanManageUser = createSelector(
  [selectUser, (state, targetRole: UserRole) => targetRole],
  (user, targetRole) => user ? canManageUser(user.role, targetRole) : false
)

export const selectCanAssignTaskTo = createSelector(
  [selectUser, (state, assigneeRole: UserRole) => assigneeRole],
  (user, assigneeRole) => user ? canAssignTaskTo(user.role, assigneeRole) : false
)

export const selectCanViewResource = createSelector(
  [selectUser, (state, resourceOwnerId: string) => resourceOwnerId],
  (user, resourceOwnerId) => {
    if (!user) return false
    return canViewResource(user.role, resourceOwnerId, user.id)
  }
)

export default authSlice.reducer