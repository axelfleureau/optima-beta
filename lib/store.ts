import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "super-admin" | "admin" | "user" | "client"
  tenantId: string
  parentTenantId?: string
  assignedClientIds?: string[]
  isSuspended?: boolean
}

interface Tenant {
  id: string
  name: string
  companyName: string
  plan: string
  aiTokensLimit: number
  aiTokensUsed: number
  isSuspended?: boolean
}

interface AppState {
  user: User | null
  currentTenant: Tenant | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setCurrentTenant: (tenant: Tenant | null) => void
  setLoading: (loading: boolean) => void
  updateTokenUsage: (tokensUsed: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      currentTenant: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      setLoading: (loading) => set({ isLoading: loading }),
      updateTokenUsage: (tokensUsed) => {
        const { currentTenant } = get()
        if (currentTenant) {
          set({
            currentTenant: {
              ...currentTenant,
              aiTokensUsed: currentTenant.aiTokensUsed + tokensUsed,
            },
          })
        }
      },
    }),
    {
      name: "optima-store",
      partialize: (state) => ({
        user: state.user,
        currentTenant: state.currentTenant,
      }),
    },
  ),
)
