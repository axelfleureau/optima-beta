import { create } from 'zustand'

interface ImageGeneratorState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useImageGeneratorStore = create<ImageGeneratorState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
