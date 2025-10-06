import { auth } from '@/lib/firebase'

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
    
    const token = await auth.currentUser?.getIdToken()
    if (!token) {
      throw new Error('User not authenticated')
    }

    const task = await this.createTask(req, token)
    console.log('✅ Task created:', task.id)
    
    const calendarEntry = await this.insertCalendarEntry(req, task.task.id, token)
    console.log('✅ Calendar entry created:', calendarEntry.id)
    
    const tokenCost = this.calculateTokenCost(req.contentType)
    console.log('💰 Token cost:', tokenCost)
    
    return {
      task: task.task,
      calendarEntry: calendarEntry.entry,
      tokenCost,
      canGenerate: true
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
    
    const token = await auth.currentUser?.getIdToken()
    if (!token) {
      throw new Error('User not authenticated')
    }

    const copy = await this.generateCopy(req, token)
    
    let mediaUrl: string | null = null
    if (req.contentType === 'post') {
      mediaUrl = await this.generateImage(req, token)
    } else {
      mediaUrl = await this.generateVideo(req, token)
    }
    
    await this.updateCalendarWithMedia(calendarEntryId, taskId, copy, mediaUrl, token)
    
    return { copy, mediaUrl }
  }
  
  private static async generateCopy(req: ContentCreationRequest, token: string): Promise<string> {
    console.log('✍️ Generating copy with GPT-4...')
    
    const response = await fetch('/api/ai/caption', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        topic: req.topic,
        platform: req.platform,
        contentType: req.contentType,
        clientName: req.clientName
      })
    })
    
    if (!response.ok) {
      console.error('Failed to generate copy')
      return `Caption per ${req.topic} su ${req.platform}`
    }
    
    const data = await response.json()
    return data.caption || `Caption per ${req.topic}`
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
