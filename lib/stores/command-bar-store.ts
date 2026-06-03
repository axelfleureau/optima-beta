import { create } from "zustand"
import type { CommandIntent, CommandSuggestion, NLPResponse, CommandContext } from "@/lib/types"
import { looksLikeOperationalTaskReport } from "@/lib/task-report-import"

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
    id: "import-task-report",
    title: "Importa report operativo...",
    description: "Incolla un report GitHub e crea task per data e progetto",
    icon: "Upload",
    intent: "CREATE_TASK" as CommandIntent,
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
  {
    id: "create-content-post",
    title: "Crea post Instagram per [cliente]...",
    description: "Genera post social con AI",
    icon: "FileText",
    intent: "CREATE_CONTENT_POST" as CommandIntent,
    category: "ai",
  },
  {
    id: "create-content-reel",
    title: "Genera reel TikTok su [topic]...",
    description: "Crea reel/short video per social",
    icon: "Video",
    intent: "CREATE_CONTENT_REEL" as CommandIntent,
    category: "ai",
  },
  {
    id: "create-content-video",
    title: "Crea video YouTube per [cliente]...",
    description: "Genera video lungo per piattaforma",
    icon: "Film",
    intent: "CREATE_CONTENT_VIDEO" as CommandIntent,
    category: "ai",
  },
  {
    id: "create-content-batch",
    title: "Pianifica 3 post social per questa settimana...",
    description: "Crea batch di contenuti multipli",
    icon: "Layers",
    intent: "CREATE_CONTENT_BATCH" as CommandIntent,
    category: "ai",
  },
]

const COMMAND_TIMEOUT_MS = 20000

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = COMMAND_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Il comando sta impiegando troppo. Riprova con una richiesta più breve.")
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

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
    set({
      isOpen: true,
      inputValue: "",
      status: "idle",
      intent: null,
      nlpResponse: null,
      missingParams: [],
      error: null,
      searchResults: [],
    })
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
    set({ inputValue: value, error: null })
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

  setContext: (context) => {
    set({ context })
  },

  setSearchResults: (results) => set({ searchResults: results }),

  executeCommand: async (message: string, context: CommandContext) => {
    const cleanMessage = message.trim()
    const wantsTaskImport = /^importa\s+(task|report)|^carica\s+(task|report)/i.test(cleanMessage)

    if (looksLikeOperationalTaskReport(cleanMessage) || wantsTaskImport) {
      if (typeof window !== "undefined") {
        if (looksLikeOperationalTaskReport(cleanMessage)) {
          window.localStorage.setItem("optima:task-import:draft", cleanMessage)
        }
        window.location.href = "/importa-task"
      }

      set({
        isOpen: false,
        inputValue: "",
        status: "idle",
        error: null,
        missingParams: [],
        nlpResponse: null,
        searchResults: [],
      })
      return
    }

    set({
      status: "processing",
      error: null,
      missingParams: [],
      nlpResponse: null,
      searchResults: [],
    })

    const { useOrchestrationStore } = await import("@/lib/stores/orchestration-store")

    try {
      useOrchestrationStore.getState().setStage('analyzing')
      useOrchestrationStore.getState().setStreamingReasoning("Sto leggendo il comando e recuperando il contesto operativo.")

      const response = await fetchWithTimeout("/api/ai/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ message: cleanMessage, context }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Non riesco a interpretare il comando")
      }

      const nlpResponse = payload as NLPResponse

      useOrchestrationStore.getState().setStage('parsing')

      const entityArray = Object.entries(nlpResponse.entities || {}).map(([key, value]) => {
        const icons: Record<string, string> = {
          contentType: '📄',
          platform: '🌐',
          clientName: '👤',
          topic: '💡',
          tone: '🎭',
          targetAudience: '🎯',
          callToAction: '🔗',
          hashtags: '#️⃣',
          visualStyle: '🎨',
          length: '⏱️',
          publishDate: '📅',
          priority: '⚡',
          assignee: '👥',
        }
        
        let displayValue = value
        if (Array.isArray(value)) {
          displayValue = value.join(', ')
        }
        
        return {
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          value: displayValue,
          icon: icons[key] || '•'
        }
      })

      useOrchestrationStore.getState().setExtractedEntities(entityArray)
      await new Promise(resolve => setTimeout(resolve, 350))

      set({ nlpResponse, intent: nlpResponse.intent })

      if (nlpResponse.missingParams && nlpResponse.missingParams.length > 0) {
        useOrchestrationStore.getState().setStage('idle')
        set({
          status: "gathering",
          missingParams: nlpResponse.missingParams,
        })
      } else {
        useOrchestrationStore.getState().setStage('executing')
        useOrchestrationStore.getState().setActionStream('Esecuzione comando in corso...')

        set({ status: "executing" })
        const { executeIntent } = await import("@/lib/command-bar/handlers")
        const result = await executeIntent(nlpResponse.intent, nlpResponse.entities, context)

        const searchIntents = ["SEARCH_TASK", "SEARCH_GLOBAL"]
        const isSearchIntent = searchIntents.includes(nlpResponse.intent)

        if (result.success && result.data && isSearchIntent) {
          useOrchestrationStore.getState().setStage('completed')
          useOrchestrationStore.getState().setActionStream(result.message || 'Ricerca completata')

          set({
            status: "idle",
            searchResults: Array.isArray(result.data) ? result.data : [result.data]
          })

          setTimeout(() => {
            useOrchestrationStore.getState().reset()
          }, 2000)
        } else if (result.success) {
          useOrchestrationStore.getState().setStage('completed')
          useOrchestrationStore.getState().setActionStream(result.message || 'Comando eseguito con successo')

          set({ status: "idle" })
          setTimeout(() => {
            get().close()
            useOrchestrationStore.getState().reset()
          }, 1500)
        } else {
          useOrchestrationStore.getState().setError(result.error || "Esecuzione fallita")
          set({ status: "idle", error: result.error || "Command execution failed" })
        }
      }
    } catch (error: any) {
      useOrchestrationStore.getState().setError(error.message || "Errore durante l'esecuzione")
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
