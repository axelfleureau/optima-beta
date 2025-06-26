import { createSlice, type PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import type { Client } from "@/lib/types" // Assicurati che Client sia definito qui
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase" // Assicurati che il path sia corretto

interface ClientsState {
  clients: Client[]
  selectedClient: Client | null
  loading: boolean
  error: string | null
}

const initialState: ClientsState = {
  clients: [],
  selectedClient: null,
  loading: false,
  error: null,
}

// Thunk per fetchare i client per un tenantId (workspaceId)
export const fetchClientsByTenant = createAsyncThunk(
  "clients/fetchByTenant",
  async (tenantId: string, { rejectWithValue }) => {
    try {
      const clientsQuery = query(collection(db, "clients"), where("tenantId", "==", tenantId))
      const querySnapshot = await getDocs(clientsQuery)
      const clients = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Client)
      return clients
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

// Thunk per aggiungere un client
export const addClient = createAsyncThunk(
  "clients/addClient",
  async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt"> & { tenantId: string }, { rejectWithValue }) => {
    try {
      const docRef = await addDoc(collection(db, "clients"), {
        ...clientData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      // Ritorna il client completo con l'ID generato e le date
      return {
        id: docRef.id,
        ...clientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Client
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

// Thunk per aggiornare un client
export const updateClient = createAsyncThunk(
  "clients/updateClient",
  async (clientData: Partial<Client> & { id: string }, { rejectWithValue }) => {
    try {
      const { id, ...dataToUpdate } = clientData
      const clientDocRef = doc(db, "clients", id)
      await updateDoc(clientDocRef, { ...dataToUpdate, updatedAt: new Date() })
      return { id, ...dataToUpdate, updatedAt: new Date().toISOString() } as Partial<Client> & { id: string } // Ritorna i dati aggiornati
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

// Thunk per eliminare un client
export const deleteClient = createAsyncThunk("clients/deleteClient", async (clientId: string, { rejectWithValue }) => {
  try {
    const clientDocRef = doc(db, "clients", clientId)
    await deleteDoc(clientDocRef)
    return clientId // Ritorna l'ID del client eliminato
  } catch (error: any) {
    return rejectWithValue(error.message)
  }
})

export const clientsSlice = createSlice({
  name: "clients",
  initialState,
  reducers: {
    setSelectedClient: (state, action: PayloadAction<Client | null>) => {
      state.selectedClient = action.payload
    },
    // Altre azioni sincrone se necessarie
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientsByTenant.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClientsByTenant.fulfilled, (state, action: PayloadAction<Client[]>) => {
        state.loading = false
        state.clients = action.payload
      })
      .addCase(fetchClientsByTenant.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(addClient.fulfilled, (state, action: PayloadAction<Client>) => {
        state.clients.push(action.payload) // Aggiungi il nuovo client alla lista
      })
      .addCase(addClient.rejected, (state, action) => {
        state.error = action.payload as string // Gestisci l'errore di aggiunta
      })
      .addCase(updateClient.fulfilled, (state, action: PayloadAction<Partial<Client> & { id: string }>) => {
        const index = state.clients.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) {
          state.clients[index] = { ...state.clients[index], ...action.payload }
        }
        if (state.selectedClient?.id === action.payload.id) {
          state.selectedClient = { ...state.selectedClient, ...action.payload } as Client
        }
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(deleteClient.fulfilled, (state, action: PayloadAction<string>) => {
        state.clients = state.clients.filter((c) => c.id !== action.payload)
        if (state.selectedClient?.id === action.payload) {
          state.selectedClient = null
        }
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { setSelectedClient } = clientsSlice.actions

// Selettori
export const selectAllClients = (state: { clients: ClientsState }) => state.clients.clients
export const selectSelectedClient = (state: { clients: ClientsState }) => state.clients.selectedClient
export const selectClientsLoading = (state: { clients: ClientsState }) => state.clients.loading
export const selectClientsError = (state: { clients: ClientsState }) => state.clients.error

export default clientsSlice.reducer
