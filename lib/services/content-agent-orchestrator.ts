import { useOrchestrationStore } from '@/lib/stores/orchestration-store'
import { ORCHESTRATION_MESSAGES, ORCHESTRATION_PROGRESS } from '@/lib/utils/orchestration-messages'
import { gatherExtendedContext } from '@/lib/services/context-gatherer'
import { getContextualPrompt } from '@/lib/prompt-templates'

const CONTENT_AGENT_BASE_PROMPT = `Sei un esperto content creator specializzato in social media marketing.
Crea contenuti coinvolgenti, professionali e ottimizzati per la piattaforma specifica.
Usa un tono appropriato al brand e al pubblico target.`

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
  calendarEntry: {
    id: string | null
    date: string
    status: string
    platform: string
    type: string
  }
  tokenCost: TokenCost
  canGenerate: boolean
}

const REQUEST_TIMEOUT_MS = 20000

async function fetchJson(input: RequestInfo | URL, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'Operazione non riuscita')
    }

    return payload
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error("L'operazione sta impiegando troppo. Riprova tra qualche secondo.")
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export class ContentAgentOrchestrator {
  static async orchestrateContentCreation(req: ContentCreationRequest): Promise<OrchestrationResult> {
    console.log('🤖 Content Agent Orchestrator START:', req)
    
    const store = useOrchestrationStore.getState()
    
    try {
      store.setStep('analyzing', ORCHESTRATION_MESSAGES.analyzing, ORCHESTRATION_PROGRESS.analyzing)

      store.setStep('creating_task', ORCHESTRATION_MESSAGES.creating_task, ORCHESTRATION_PROGRESS.creating_task)
      const task = await this.createTask(req)
      console.log('✅ Task created:', task.id)
      
      const calendarEntry = this.createCalendarPlaceholder(req)
      
      const tokenCost = this.calculateTokenCost(req.contentType)
      console.log('💰 Token cost:', tokenCost)
      
      store.setTokenCost(tokenCost.total)
      store.setStep('completed', `Completato! (${tokenCost.total} token)`, 100)
      
      return {
        task,
        calendarEntry,
        tokenCost,
        canGenerate: true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore'
      store.setError(errorMessage)
      throw error
    }
  }
  
  private static async createTask(req: ContentCreationRequest) {
    const payload = await fetchJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${this.labelContentType(req.contentType)} ${req.platform} - ${req.topic || req.clientName}`,
        description: `Creazione ${req.contentType} per ${req.clientName}${req.topic ? `\n\nTema: ${req.topic}` : ''}`,
        clientId: req.clientId,
        clientName: req.clientName,
        columnId: 'to-do',
        status: 'to-do',
        priority: 'medium',
        dueDate: req.publishDate.toISOString(),
        type: 'content',
        tags: [req.contentType, req.platform, 'command-bar'].filter(Boolean),
        attachments: [],
      })
    })

    return payload.task
  }

  private static createCalendarPlaceholder(req: ContentCreationRequest) {
    return {
      id: null,
      date: req.publishDate.toISOString(),
      status: 'draft',
      platform: req.platform,
      type: req.contentType,
    }
  }

  private static labelContentType(contentType: string) {
    if (contentType === 'reel') return 'Reel'
    if (contentType === 'video') return 'Video'
    return 'Post'
  }
  
  private static calculateTokenCost(contentType: string): TokenCost {
    const costs: Record<string, TokenCost> = {
      post: { gpt4: 10, dalle: 15, total: 25 },
      reel: { gpt4: 10, sora: 100, total: 110 },
      video: { gpt4: 15, sora: 150, total: 165 }
    }
    return costs[contentType] || costs.post
  }
  
  static async executeGeneration(req: ContentCreationRequest, calendarEntryId: string | null, taskId: string) {
    console.log('🎨 Starting content generation...', { contentType: req.contentType })
    
    const store = useOrchestrationStore.getState()
    
    try {
      store.setStep('generating_copy', ORCHESTRATION_MESSAGES.generating_copy, ORCHESTRATION_PROGRESS.generating_copy)
      const copy = await this.generateCopy(req)
      
      let mediaUrl: string | null = null
      if (req.contentType === 'post') {
        store.setStep('generating_image', ORCHESTRATION_MESSAGES.generating_image, ORCHESTRATION_PROGRESS.generating_image)
        mediaUrl = await this.generateImage(req)
      } else {
        store.setStep('generating_video', ORCHESTRATION_MESSAGES.generating_video, ORCHESTRATION_PROGRESS.generating_video)
        mediaUrl = await this.generateVideo(req)
      }
      
      store.setStep('updating_content', ORCHESTRATION_MESSAGES.updating_content, ORCHESTRATION_PROGRESS.updating_content)
      await this.updateCalendarWithMedia(calendarEntryId, taskId, copy, mediaUrl)
      
      store.setStep('completed', ORCHESTRATION_MESSAGES.completed, ORCHESTRATION_PROGRESS.completed)
      
      return { copy, mediaUrl }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore durante la generazione'
      store.setError(errorMessage)
      throw error
    }
  }
  
  private static async generateCopy(req: ContentCreationRequest): Promise<string> {
    console.log('✍️ Generating copy with GPT-4...')
    
    // 1. GATHER EXTENDED CONTEXT
    const extendedContext = await gatherExtendedContext(req.tenantId)
    console.log('📊 Extended context gathered:', {
      hasTenant: !!extendedContext.tenant,
      recentActivityCount: extendedContext.recentActivity?.length || 0,
      existingAssetsCount: extendedContext.existingAssets?.length || 0
    })
    
    // 2. BUILD CONTEXT OBJECT
    const fullContext = {
      ...extendedContext,
      client: {
        name: req.clientName
      },
      task: {
        description: req.topic
      }
    }
    
    // 3. GET CONTEXTUAL PROMPT with tenant context
    const taskPrompt = `Crea una caption ${req.contentType} per ${req.platform} sul tema: "${req.topic}". Cliente: ${req.clientName}. La caption deve essere coinvolgente, professionale e ottimizzata per ${req.platform}.`
    const contextualPrompt = getContextualPrompt(taskPrompt, fullContext)
    
    console.log('✅ Context-enriched prompt created with tenant info')
    
    // 4. BUILD FULL SYSTEM PROMPT
    const systemPrompt = `
${CONTENT_AGENT_BASE_PROMPT}

${contextualPrompt}

TASK CORRENTE:
${req.topic}

FORMATO: ${req.contentType === 'post' ? 'Post Instagram' : req.contentType === 'reel' ? 'Reel' : 'Video'}
PIATTAFORMA: ${req.platform}
CLIENTE: ${req.clientName}
`
    
    // 5. CALL AI with enriched prompt
    const data = await fetchJson('/api/ai/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: systemPrompt,
        userId: req.userId,
        maxTokens: 500,
        temperature: 0.8
      })
    })

    return data.text || `Caption per ${req.topic}`
  }
  
  private static async generateImage(req: ContentCreationRequest): Promise<string> {
    console.log('🎨 Generating image with DALL-E 3...')
    
    const data = await fetchJson('/api/ai/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Crea un'immagine per ${req.topic} per ${req.clientName}`,
        platform: req.platform,
        size: '1024x1024',
        quality: 'standard'
      })
    })

    return data.imageUrl
  }
  
  private static async generateVideo(req: ContentCreationRequest): Promise<string> {
    console.log('🎥 Generating video with Sora 2...')
    
    return `https://placeholder-video.com/${req.contentType}-${Date.now()}.mp4`
  }
  
  private static async updateCalendarWithMedia(
    calendarEntryId: string | null,
    taskId: string,
    copy: string, 
    mediaUrl: string | null,
  ) {
    console.log('💾 Updating calendar entry and task with generated content...')
    
    if (calendarEntryId) {
      await fetch(`/api/calendar/${calendarEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            caption: copy,
            mediaUrl: mediaUrl
          },
          status: 'scheduled'
        })
      }).catch(() => {
        console.error('Failed to update calendar entry')
      })
    }
    
    const payload = await fetchJson(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        richDescription: [copy, mediaUrl ? `\n\nMedia generato: ${mediaUrl}` : ""].join(""),
        attachments: mediaUrl
          ? [{ id: `generated-${Date.now()}`, name: "Media generato", url: mediaUrl, type: "generated", createdAt: new Date().toISOString() }]
          : [],
      })
    })

    return payload
  }
}
