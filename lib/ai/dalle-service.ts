export interface DalleGenerationParams {
  prompt: string
  size: '1024x1024' | '1792x1024' | '1024x1792'
  quality: 'standard' | 'hd'
  style: 'natural' | 'vivid'
}

export interface DalleGenerationResponse {
  success: boolean
  imageUrl: string | null
  revisedPrompt: string | null
  error?: string
}

export async function generateImageWithDalle(
  params: DalleGenerationParams
): Promise<DalleGenerationResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ OPENAI_API_KEY not found or empty')
      return {
        success: false,
        imageUrl: null,
        revisedPrompt: null,
        error: 'Configurazione API mancante',
      }
    }

    console.log('🎨 Generating image with DALL-E 3:', {
      prompt: params.prompt.substring(0, 50) + '...',
      size: params.size,
      quality: params.quality,
      style: params.style,
    })

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: params.prompt,
        n: 1,
        size: params.size,
        quality: params.quality,
        style: params.style,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ DALL-E API error:', errorData)
      
      return {
        success: false,
        imageUrl: null,
        revisedPrompt: null,
        error: errorData.error?.message || 'Errore nella generazione immagine',
      }
    }

    const data = await response.json()
    
    if (!data.data || data.data.length === 0) {
      console.error('❌ No image data returned from DALL-E')
      return {
        success: false,
        imageUrl: null,
        revisedPrompt: null,
        error: 'Nessuna immagine generata',
      }
    }

    const imageData = data.data[0]
    
    console.log('✅ Image generated successfully:', {
      url: imageData.url ? 'URL present' : 'No URL',
      revisedPrompt: imageData.revised_prompt?.substring(0, 50) + '...',
    })

    return {
      success: true,
      imageUrl: imageData.url,
      revisedPrompt: imageData.revised_prompt || null,
    }
  } catch (error) {
    console.error('❌ Error generating image with DALL-E:', error)
    return {
      success: false,
      imageUrl: null,
      revisedPrompt: null,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    }
  }
}

export function getPlatformSize(platform: 'instagram' | 'facebook' | 'linkedin' | 'custom'): '1024x1024' | '1792x1024' | '1024x1792' {
  const sizeMap = {
    instagram: '1024x1024' as const,
    facebook: '1792x1024' as const,
    linkedin: '1024x1024' as const,
    custom: '1024x1024' as const,
  }
  
  return sizeMap[platform]
}

export function getPlatformAspectRatio(platform: 'instagram' | 'facebook' | 'linkedin' | 'custom'): string {
  const aspectRatioMap = {
    instagram: '1:1',
    facebook: '16:9',
    linkedin: '1.91:1',
    custom: '1:1',
  }
  
  return aspectRatioMap[platform]
}
