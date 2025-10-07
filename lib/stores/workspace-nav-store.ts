import { create } from 'zustand'

export type WorkspaceAction = 'refine' | 'generate-copy' | 'generate-visual' | null

interface WorkspaceNavState {
  selectedTaskId: string | null
  pendingAction: WorkspaceAction
  highlightedTaskId: string | null
  
  navigateToTask: (taskId: string, action?: WorkspaceAction) => void
  clearNavigation: () => void
  setHighlight: (taskId: string | null) => void
}

export const useWorkspaceNav = create<WorkspaceNavState>((set) => ({
  selectedTaskId: null,
  pendingAction: null,
  highlightedTaskId: null,

  navigateToTask: (taskId, action = null) => {
    set({ selectedTaskId: taskId, pendingAction: action })
  },

  clearNavigation: () => {
    set({ selectedTaskId: null, pendingAction: null, highlightedTaskId: null })
  },

  setHighlight: (taskId) => {
    set({ highlightedTaskId: taskId })
  }
}))
