import { create } from 'zustand'
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'

interface AutoGenState {
  isGenerating: boolean
  generationType: 'copy' | 'visual' | null
  taskId: string | null
  taskDescription: string | null
  clientName: string | null
  generatedContent: {
    copy?: string
    imageUrl?: string
  }
  originalParams: {
    taskDescription?: string
    clientName?: string
    prompt?: string
  }
  error: string | null
  
  generateCopy: (taskId: string, taskDescription: string, clientName?: string, userId?: string) => Promise<void>
  generateVisual: (taskId: string, prompt: string, userId?: string, token?: string) => Promise<void>
  saveToTask: () => Promise<void>
  regenerate: (userId?: string, token?: string) => Promise<void>
  discard: () => void
  reset: () => void
}

export const useAutoGenStore = create<AutoGenState>((set, get) => ({
  isGenerating: false,
  generationType: null,
  taskId: null,
  taskDescription: null,
  clientName: null,
  generatedContent: {},
  originalParams: {},
  error: null,

  generateCopy: async (taskId, taskDescription, clientName, userId) => {
    set({ 
      isGenerating: true, 
      generationType: 'copy', 
      taskId, 
      taskDescription,
      clientName,
      originalParams: { taskDescription, clientName },
      error: null 
    })
    
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }

      const response = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Genera una caption coinvolgente per un post social con il seguente brief: ${taskDescription}${clientName ? ` per il cliente ${clientName}` : ''}`,
          systemPrompt: 'Sei un esperto copywriter di social media. Crea caption coinvolgenti, professionali e ottimizzate per i social media. Includi emoji appropriati e hashtag rilevanti.',
          userId,
          maxTokens: 500,
          temperature: 0.8,
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate copy')
      }
      
      const data = await response.json()
      set({ generatedContent: { copy: data.text }, isGenerating: false })
    } catch (error: any) {
      set({ error: error.message, isGenerating: false })
    }
  },

  generateVisual: async (taskId, prompt, userId, token) => {
    set({ 
      isGenerating: true, 
      generationType: 'visual', 
      taskId, 
      taskDescription: prompt,
      originalParams: { prompt },
      error: null 
    })
    
    try {
      if (!token) {
        throw new Error('Authentication token is required')
      }

      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          platform: 'instagram',
          quality: 'standard',
          style: 'vivid'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate image')
      }
      
      const data = await response.json()
      if (data.success && data.imageUrl) {
        set({ generatedContent: { imageUrl: data.imageUrl }, isGenerating: false })
      } else {
        throw new Error(data.error || 'Image generation failed')
      }
    } catch (error: any) {
      set({ error: error.message, isGenerating: false })
    }
  },

  saveToTask: async () => {
    const { taskId, generatedContent, generationType } = get()
    if (!taskId) {
      toast.error('Task ID mancante')
      return
    }
    
    try {
      const updateData: any = {
        updatedAt: serverTimestamp()
      }
      
      if (generationType === 'copy' && generatedContent.copy) {
        updateData.aiGeneratedCopy = generatedContent.copy
        updateData.description = generatedContent.copy
      }
      
      if (generationType === 'visual' && generatedContent.imageUrl) {
        updateData.aiGeneratedImage = generatedContent.imageUrl
        updateData.assets = arrayUnion({
          type: 'image',
          url: generatedContent.imageUrl,
          generatedAt: new Date().toISOString(),
          source: 'ai_generated'
        })
      }
      
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, updateData)
      
      toast.success(
        generationType === 'copy' 
          ? 'Copy salvata nella task!' 
          : 'Visual salvata nella task!'
      )
      
      get().reset()
    } catch (error: any) {
      console.error('Error saving to task:', error)
      toast.error('Errore nel salvare: ' + error.message)
      set({ error: error.message })
    }
  },

  regenerate: async (userId, token) => {
    const { generationType, taskId, originalParams } = get()
    
    if (generationType === 'copy' && taskId && originalParams.taskDescription) {
      await get().generateCopy(taskId, originalParams.taskDescription, originalParams.clientName, userId)
    } else if (generationType === 'visual' && taskId && originalParams.prompt) {
      await get().generateVisual(taskId, originalParams.prompt, userId, token)
    }
  },

  discard: () => set({ generatedContent: {}, generationType: null, taskId: null, taskDescription: null, clientName: null }),
  
  reset: () => set({ 
    isGenerating: false, 
    generationType: null, 
    taskId: null, 
    taskDescription: null,
    clientName: null,
    generatedContent: {},
    originalParams: {},
    error: null 
  })
}))
