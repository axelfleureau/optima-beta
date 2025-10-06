import { auth } from '@/lib/firebase'
import { useOrchestrationStore } from '@/lib/stores/orchestration-store'
import { ORCHESTRATION_MESSAGES, ORCHESTRATION_PROGRESS } from '@/lib/utils/orchestration-messages'

export interface ContentCreationRequest {
  intent: string
  contentType: "post" | "reel" | "video"
  platform: string
  clientId: string
  clientName: string
  topic: string
  publishDate: Date
  userId: string
  tenantId: string
}

export interface TokenCost {
  gpt4?: number
  dalle?: number
  sora?: number
  total: number
}

export interface OrchestrationResult {
  task: any
  calendarEntry: any
  tokenCost: TokenCost
  canGenerate: boolean
}

export class ContentAgentOrchestrator {
  static async orchestrateContentCreation(req: ContentCreationRequest): Promise<OrchestrationResult> {
    console.log('🤖 Content Agent Orchestrator START:', req)
    
    const store = useOrchestrationStore.getState()
    
    try {
      store.setStep('analyzing', ORCHESTRATION_MESSAGES.analyzing, ORCHESTRATION_PROGRESS.analyzing)
      
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('User not authenticated')
      }

      store.setStep('creating_task', ORCHESTRATION_MESSAGES.creating_task, ORCHESTRATION_PROGRESS.creating_task)
      const task = await this.createTask(req, token)
      console.log('✅ Task created:', task.id)
      
      store.setStep('creating_calendar', ORCHESTRATION_MESSAGES.creating_calendar, ORCHESTRATION_PROGRESS.creating_calendar)
      const calendarEntry = await this.insertCalendarEntry(req, task.task.id, token)
      console.log('✅ Calendar entry created:', calendarEntry.id)
      
      const tokenCost = this.calculateTokenCost(req.contentType)
      console.log('💰 Token cost:', tokenCost)
      
      store.setTokenCost(tokenCost.total)
      store.setStep('completed', `Completato! (${tokenCost.total} token)`, 100)
      
      return {
        task: task.task,
        calendarEntry: calendarEntry.entry,
        tokenCost,
        canGenerate: true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore'
      store.setError(errorMessage)
      throw error
    }
  }
  
  private static async createTask(req: ContentCreationRequest, token: string) {
    const response = await fetch('/api/tasks/create-auto', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: `${req.contentType} ${req.platform} - ${req.topic}`,
        description: `Creazione ${req.contentType} per ${req.clientName}`,
        clientId: req.clientId,
        tenantId: req.tenantId,
        status: 'to-do',
        dueDate: req.publishDate.toISOString(),
        metadata: {
          contentType: req.contentType,
          platform: req.platform,
          topic: req.topic
        }
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to create task')
    }
    
    return response.json()
  }
  
  private static async insertCalendarEntry(req: ContentCreationRequest, taskId: string, token: string) {
    const response = await fetch('/api/calendar/create-auto', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        date: req.publishDate.toISOString(),
        platform: req.platform,
        type: req.contentType,
        clientId: req.clientId,
        linkedTaskId: taskId,
        status: 'draft',
        content: {
          topic: req.topic,
          caption: '',
          mediaUrl: null
        }
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to create calendar entry')
    }
    
    return response.json()
  }
  
  private static calculateTokenCost(contentType: string): TokenCost {
    const costs: Record<string, TokenCost> = {
      post: { gpt4: 10, dalle: 15, total: 25 },
      reel: { gpt4: 10, sora: 100, total: 110 },
      video: { gpt4: 15, sora: 150, total: 165 }
    }
    return costs[contentType] || costs.post
  }
  
  static async executeGeneration(req: ContentCreationRequest, calendarEntryId: string, taskId: string) {
    console.log('🎨 Starting content generation...', { contentType: req.contentType })
    
    const store = useOrchestrationStore.getState()
    
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('User not authenticated')
      }

      store.setStep('generating_copy', ORCHESTRATION_MESSAGES.generating_copy, ORCHESTRATION_PROGRESS.generating_copy)
      const copy = await this.generateCopy(req, token)
      
      let mediaUrl: string | null = null
      if (req.contentType === 'post') {
        store.setStep('generating_image', ORCHESTRATION_MESSAGES.generating_image, ORCHESTRATION_PROGRESS.generating_image)
        mediaUrl = await this.generateImage(req, token)
      } else {
        store.setStep('generating_video', ORCHESTRATION_MESSAGES.generating_video, ORCHESTRATION_PROGRESS.generating_video)
        mediaUrl = await this.generateVideo(req, token)
      }
      
      store.setStep('updating_content', ORCHESTRATION_MESSAGES.updating_content, ORCHESTRATION_PROGRESS.updating_content)
      await this.updateCalendarWithMedia(calendarEntryId, taskId, copy, mediaUrl, token)
      
      store.setStep('completed', ORCHESTRATION_MESSAGES.completed, ORCHESTRATION_PROGRESS.completed)
      
      return { copy, mediaUrl }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore durante la generazione'
      store.setError(errorMessage)
      throw error
    }
  }
  
  private static async generateCopy(req: ContentCreationRequest, token: string): Promise<string> {
    console.log('✍️ Generating copy with GPT-4...')
    
    const prompt = `Crea una caption ${req.contentType} per ${req.platform} sul tema: "${req.topic}". Cliente: ${req.clientName}. La caption deve essere coinvolgente, professionale e ottimizzata per ${req.platform}.`
    
    const response = await fetch('/api/ai/caption', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: prompt,
        userId: req.userId,
        maxTokens: 500,
        temperature: 0.8
      })
    })
    
    if (!response.ok) {
      console.error('Failed to generate copy')
      return `Caption per ${req.topic} su ${req.platform}`
    }
    
    const data = await response.json()
    return data.text || `Caption per ${req.topic}`
  }
  
  private static async generateImage(req: ContentCreationRequest, token: string): Promise<string> {
    console.log('🎨 Generating image with DALL-E 3...')
    
    const response = await fetch('/api/ai/generate-image', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: `Crea un'immagine per ${req.topic} per ${req.clientName}`,
        platform: req.platform,
        size: '1024x1024',
        quality: 'standard'
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate image')
    }
    
    const data = await response.json()
    return data.imageUrl
  }
  
  private static async generateVideo(req: ContentCreationRequest, token: string): Promise<string> {
    console.log('🎥 Generating video with Sora 2...')
    
    return `https://placeholder-video.com/${req.contentType}-${Date.now()}.mp4`
  }
  
  private static async updateCalendarWithMedia(
    calendarEntryId: string, 
    taskId: string,
    copy: string, 
    mediaUrl: string | null,
    token: string
  ) {
    console.log('💾 Updating calendar entry and task with generated content...')
    
    const updateCalendarResponse = await fetch(`/api/calendar/${calendarEntryId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: {
          caption: copy,
          mediaUrl: mediaUrl
        },
        status: 'scheduled'
      })
    })
    
    if (!updateCalendarResponse.ok) {
      console.error('Failed to update calendar entry')
    }
    
    const updateTaskResponse = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        metadata: {
          mediaUrl: mediaUrl,
          caption: copy,
          generatedAt: new Date().toISOString()
        }
      })
    })
    
    if (!updateTaskResponse.ok) {
      console.error('Failed to update task')
    }
  }
}
