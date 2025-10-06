import { create } from 'zustand'
import type { Client, User } from '@/lib/types'

interface CommandContextState {
  clients: Client[]
  users: User[]
  isLoaded: boolean
  clientsLastFetched: number | null
  usersLastFetched: number | null
  
  setClients: (clients: Client[]) => void
  setUsers: (users: User[]) => void
  setLoaded: (loaded: boolean) => void
  invalidate: () => void
}

export const useCommandContextStore = create<CommandContextState>((set) => ({
  clients: [],
  users: [],
  isLoaded: false,
  clientsLastFetched: null,
  usersLastFetched: null,
  
  setClients: (clients) => set({ 
    clients, 
    clientsLastFetched: Date.now()
  }),
  setUsers: (users) => set({ 
    users, 
    usersLastFetched: Date.now()
  }),
  setLoaded: (loaded) => set({ isLoaded: loaded }),
  invalidate: () => set({ 
    clients: [], 
    users: [], 
    isLoaded: false, 
    clientsLastFetched: null,
    usersLastFetched: null 
  })
}))
