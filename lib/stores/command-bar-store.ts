import { create } from "zustand"
import type { CommandIntent, CommandSuggestion, NLPResponse, CommandContext } from "@/lib/types"

interface CommandBarState {
  isOpen: boolean
  inputValue: string
  status: "idle" | "processing" | "gathering" | "executing"
  intent: CommandIntent | null
  nlpResponse: NLPResponse | null
  suggestions: CommandSuggestion[]
  missingParams: string[]
  error: string | null
  context: CommandContext | null
  searchResults: any[]

  open: () => void
  close: () => void
  setInput: (value: string) => void
  setStatus: (status: "idle" | "processing" | "gathering" | "executing") => void
  setIntent: (intent: CommandIntent | null) => void
  setNLPResponse: (response: NLPResponse | null) => void
  setSuggestions: (suggestions: CommandSuggestion[]) => void
  setMissingParams: (params: string[]) => void
  setError: (error: string | null) => void
  setContext: (context: CommandContext) => void
  setSearchResults: (results: any[]) => void
  executeCommand: (message: string, context: CommandContext) => Promise<void>
  reset: () => void
}

const defaultSuggestions: CommandSuggestion[] = [
  {
    id: "create-task",
    title: "Crea task per [cliente]...",
    description: "Crea una nuova task per un cliente specifico",
    icon: "Plus",
    intent: "CREATE_TASK" as CommandIntent,
    category: "task",
  },
  {
    id: "search-task",
    title: "Cerca task di [cliente]...",
    description: "Cerca tasks esistenti per cliente",
    icon: "Search",
    intent: "SEARCH_TASK" as CommandIntent,
    category: "task",
  },
  {
    id: "assign-task",
    title: "Assegna task a [utente]...",
    description: "Assegna una task a un membro del team",
    icon: "UserPlus",
    intent: "ASSIGN_TASK" as CommandIntent,
    category: "task",
  },
  {
    id: "show-analytics",
    title: "Mostrami analytics di questa settimana",
    description: "Visualizza le statistiche della settimana",
    icon: "BarChart",
    intent: "SHOW_ANALYTICS" as CommandIntent,
    category: "navigation",
  },
  {
    id: "generate-image",
    title: "Genera immagine per Instagram su [topic]",
    description: "Genera contenuti visivi con AI",
    icon: "Image",
    intent: "GENERATE_IMAGE" as CommandIntent,
    category: "ai",
  },
  {
    id: "plan-campaign",
    title: "Pianifica campagna per [cliente]...",
    description: "Crea una nuova campagna marketing",
    icon: "Briefcase",
    intent: "PLAN_CAMPAIGN" as CommandIntent,
    category: "campaign",
  },
]

export const useCommandBarStore = create<CommandBarState>((set, get) => ({
  isOpen: false,
  inputValue: "",
  status: "idle",
  intent: null,
  nlpResponse: null,
  suggestions: defaultSuggestions,
  missingParams: [],
  error: null,
  context: null,
  searchResults: [],

  open: () => {
    set({ isOpen: true, inputValue: "", status: "idle", error: null })
  },

  close: () => {
    set({
      isOpen: false,
      inputValue: "",
      status: "idle",
      intent: null,
      nlpResponse: null,
      missingParams: [],
      error: null,
      searchResults: [],
    })
  },

  setInput: (value: string) => {
    set({ inputValue: value })
    if (!value) {
      set({ suggestions: defaultSuggestions, searchResults: [] })
    }
  },

  setStatus: (status) => set({ status }),

  setIntent: (intent) => set({ intent }),

  setNLPResponse: (response) => set({ nlpResponse: response }),

  setSuggestions: (suggestions) => set({ suggestions }),

  setMissingParams: (params) => set({ missingParams: params }),

  setError: (error) => set({ error }),

  setContext: (context) => set({ context }),

  setSearchResults: (results) => set({ searchResults: results }),

  executeCommand: async (message: string, context: CommandContext) => {
    const state = get()
    set({ status: "processing", error: null })

    try {
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
      })

      if (!response.ok) {
        throw new Error("Failed to process command")
      }

      const nlpResponse: NLPResponse = await response.json()
      set({ nlpResponse, intent: nlpResponse.intent })

      if (nlpResponse.missingParams && nlpResponse.missingParams.length > 0) {
        set({
          status: "gathering",
          missingParams: nlpResponse.missingParams,
        })
      } else {
        set({ status: "executing" })
        const { executeIntent } = await import("@/lib/command-bar/handlers")
        const result = await executeIntent(nlpResponse.intent, nlpResponse.entities, context)

        const searchIntents = ["SEARCH_TASK", "SEARCH_GLOBAL"]
        const isSearchIntent = searchIntents.includes(nlpResponse.intent)

        if (result.success && result.data && isSearchIntent) {
          set({ 
            status: "idle",
            searchResults: Array.isArray(result.data) ? result.data : [result.data]
          })
        } else if (result.success) {
          set({ status: "idle" })
          setTimeout(() => {
            get().close()
          }, 1000)
        } else {
          set({ status: "idle", error: result.error || "Command execution failed" })
        }
      }
    } catch (error: any) {
      console.error("Command execution error:", error)
      set({
        status: "idle",
        error: error.message || "Failed to execute command",
      })
    }
  },

  reset: () => {
    set({
      inputValue: "",
      status: "idle",
      intent: null,
      nlpResponse: null,
      suggestions: defaultSuggestions,
      missingParams: [],
      error: null,
      searchResults: [],
    })
  },
}))
