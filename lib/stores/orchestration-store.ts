import { create } from 'zustand'

export type OrchestrationStep = 
  | 'idle'
  | 'analyzing' 
  | 'parsing'
  | 'executing'
  | 'creating_task' 
  | 'creating_calendar'
  | 'generating_copy'
  | 'generating_image' 
  | 'generating_video'
  | 'updating_content'
  | 'completed'
  | 'error'

export type CommandStage = 'analyzing' | 'parsing' | 'executing' | 'completed' | 'idle'

export interface ExtractedEntity {
  key: string
  label: string
  value: any
  icon?: string
}

export interface OrchestrationState {
  step: OrchestrationStep
  stage: CommandStage
  message: string
  progress: number
  tokenCost: number
  isProcessing: boolean
  streamingReasoning: string
  extractedEntities: ExtractedEntity[]
  actionStream: string
  
  setStep: (step: OrchestrationStep, message: string, progress: number) => void
  setStage: (stage: CommandStage) => void
  setTokenCost: (cost: number) => void
  setStreamingReasoning: (reasoning: string) => void
  appendStreamingReasoning: (chunk: string) => void
  setExtractedEntities: (entities: ExtractedEntity[]) => void
  setActionStream: (action: string) => void
  appendActionStream: (chunk: string) => void
  reset: () => void
  setError: (message: string) => void
}

export const useOrchestrationStore = create<OrchestrationState>((set) => ({
  step: 'idle',
  stage: 'idle',
  message: '',
  progress: 0,
  tokenCost: 0,
  isProcessing: false,
  streamingReasoning: '',
  extractedEntities: [],
  actionStream: '',
  
  setStep: (step, message, progress) => set({ 
    step, 
    message, 
    progress,
    isProcessing: step !== 'idle' && step !== 'completed' && step !== 'error'
  }),
  
  setStage: (stage) => {
    const progressMap: Record<CommandStage, number> = {
      idle: 0,
      analyzing: 33,
      parsing: 66,
      executing: 85,
      completed: 100
    }
    set({ 
      stage, 
      progress: progressMap[stage],
      isProcessing: stage !== 'idle' && stage !== 'completed'
    })
  },
  
  setTokenCost: (cost) => set({ tokenCost: cost }),
  
  setStreamingReasoning: (reasoning) => set({ streamingReasoning: reasoning }),
  
  appendStreamingReasoning: (chunk) => set((state) => ({ 
    streamingReasoning: state.streamingReasoning + chunk 
  })),
  
  setExtractedEntities: (entities) => set({ extractedEntities: entities }),
  
  setActionStream: (action) => set({ actionStream: action }),
  
  appendActionStream: (chunk) => set((state) => ({ 
    actionStream: state.actionStream + chunk 
  })),
  
  reset: () => set({ 
    step: 'idle',
    stage: 'idle',
    message: '', 
    progress: 0, 
    tokenCost: 0,
    isProcessing: false,
    streamingReasoning: '',
    extractedEntities: [],
    actionStream: ''
  }),
  
  setError: (message) => set({ 
    step: 'error',
    stage: 'idle',
    message, 
    isProcessing: false 
  })
}))
