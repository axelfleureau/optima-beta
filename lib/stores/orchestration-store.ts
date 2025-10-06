import { create } from 'zustand'

export type OrchestrationStep = 
  | 'idle'
  | 'analyzing' 
  | 'creating_task' 
  | 'creating_calendar'
  | 'generating_copy'
  | 'generating_image' 
  | 'generating_video'
  | 'updating_content'
  | 'completed'
  | 'error'

export interface OrchestrationState {
  step: OrchestrationStep
  message: string
  progress: number
  tokenCost: number
  isProcessing: boolean
  
  setStep: (step: OrchestrationStep, message: string, progress: number) => void
  setTokenCost: (cost: number) => void
  reset: () => void
  setError: (message: string) => void
}

export const useOrchestrationStore = create<OrchestrationState>((set) => ({
  step: 'idle',
  message: '',
  progress: 0,
  tokenCost: 0,
  isProcessing: false,
  
  setStep: (step, message, progress) => set({ 
    step, 
    message, 
    progress,
    isProcessing: step !== 'idle' && step !== 'completed' && step !== 'error'
  }),
  
  setTokenCost: (cost) => set({ tokenCost: cost }),
  
  reset: () => set({ 
    step: 'idle', 
    message: '', 
    progress: 0, 
    tokenCost: 0,
    isProcessing: false 
  }),
  
  setError: (message) => set({ 
    step: 'error', 
    message, 
    isProcessing: false 
  })
}))
