import { createSlice, type PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase" // Assicurati che il path sia corretto
import { doc, setDoc, getDoc } from "firebase/firestore"
import type { User } from "@/lib/types" // Assumendo che User sia definito qui

interface AuthState {
  currentUser: User | null
  loading: boolean
  error: string | null
  token: string | null // Potresti voler gestire i token JWT se li usi direttamente
}

const initialState: AuthState = {
  currentUser: null,
  loading: false,
  error: null,
  token: null,
}

// Thunk per il login
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }: Record<string, string>, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      // Recupera dati aggiuntivi dell'utente da Firestore se necessario
      const userDocRef = doc(db, "users", firebaseUser.uid)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        return { uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() } as User
      } else {
        // Potrebbe essere un utente solo autenticato senza record in 'users'
        return { uid: firebaseUser.uid, email: firebaseUser.email } as User // O gestisci come errore
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

// Thunk per la registrazione
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ email, password, name, role = "user" }: Record<string, string>, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      // Salva dati aggiuntivi dell'utente in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid)
      const userData: Partial<User> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name,
        role,
        createdAt: new Date(),
        // altri campi...
      }
      await setDoc(userDocRef, userData)
      return userData as User
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

// Thunk per il logout
export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { rejectWithValue }) => {
  try {
    await signOut(auth)
    return null
  } catch (error: any) {
    return rejectWithValue(error.message)
  }
})

// Potresti voler un thunk per inizializzare lo stato dell'utente al caricamento dell'app
// export const initializeAuth = createAsyncThunk(...)

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload
      state.loading = false
      state.error = null
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.loading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false
        state.currentUser = action.payload
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false
        state.currentUser = action.payload
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.currentUser = null
        state.token = null
        state.loading = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string // Potresti voler gestire diversamente l'errore di logout
      })
  },
})

export const { setCurrentUser, setAuthLoading, setAuthError } = authSlice.actions

// Selettori
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.currentUser
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error

export default authSlice.reducer
