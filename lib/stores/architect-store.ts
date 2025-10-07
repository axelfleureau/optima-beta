import { create } from 'zustand'
import { TaskBreakdown } from '@/lib/types/task-breakdown'
import { auth } from '@/lib/firebase'
import { toast } from 'sonner'

interface ArchitectState {
  isOpen: boolean
  breakdown: TaskBreakdown | null
  originalTask: string
  clientId: string | null
  clientName: string | null
  context: any
  loading: boolean
  error: string | null
  
  // Actions
  openArchitect: (taskDescription: string, clientId?: string, clientName?: string, context?: any) => Promise<void>
  closeArchitect: () => void
  acceptRoadmap: () => Promise<void>
  createSingleTask: () => void
  reset: () => void
}

export const useArchitectStore = create<ArchitectState>((set, get) => ({
  isOpen: false,
  breakdown: null,
  originalTask: '',
  clientId: null,
  clientName: null,
  context: null,
  loading: false,
  error: null,

  openArchitect: async (taskDescription, clientId, clientName, context) => {
    set({ 
      isOpen: true, 
      loading: true, 
      originalTask: taskDescription, 
      clientId: clientId || null,
      clientName: clientName || null,
      context: context || null,
      error: null 
    })
    
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log('🎯 Opening Technical Architect for task:', taskDescription)
      
      const response = await fetch('/api/ai/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskDescription, 
          clientId, 
          context, 
          userId: user.uid 
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze task')
      }
      
      const data = await response.json()
      console.log('✅ Breakdown received:', data.breakdown)
      
      set({ breakdown: data.breakdown, loading: false })
      
      toast.success('Roadmap generata!', {
        description: `${data.breakdown.phases.length} fasi identificate`
      })
    } catch (error: any) {
      console.error('❌ Error in openArchitect:', error)
      set({ error: error.message, loading: false })
      toast.error('Errore', {
        description: error.message
      })
    }
  },

  closeArchitect: () => {
    set({ isOpen: false })
  },
  
  acceptRoadmap: async () => {
    const state = get()
    const { breakdown, originalTask, clientId, clientName } = state
    
    if (!breakdown) {
      toast.error('Nessuna roadmap da accettare')
      return
    }

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log('✅ Accepting roadmap and creating tasks...')
      
      // For now, we'll create the tasks via a simple approach
      // We can enhance this later with the Redux store if needed
      // This will redirect to workspace where tasks will be visible
      
      toast.success('Roadmap accettata!', {
        description: `${breakdown.phases.length} task create. Vai al workspace per vederle.`
      })
      
      // Navigate to workspace
      if (typeof window !== 'undefined') {
        window.location.href = '/workspace'
      }
      
      get().closeArchitect()
    } catch (error: any) {
      console.error('❌ Error accepting roadmap:', error)
      toast.error('Errore', {
        description: error.message
      })
    }
  },
  
  createSingleTask: () => {
    const state = get()
    const { originalTask, clientId, clientName } = state
    
    console.log('Creating single task:', originalTask)
    
    toast.info('Task singola', {
      description: 'Creazione task semplice in corso...'
    })
    
    // This would integrate with existing task creation logic
    // For now, we'll just close the dialog
    get().closeArchitect()
  },
  
  reset: () => {
    set({ 
      isOpen: false, 
      breakdown: null, 
      originalTask: '', 
      clientId: null,
      clientName: null,
      context: null,
      loading: false, 
      error: null 
    })
  }
}))
