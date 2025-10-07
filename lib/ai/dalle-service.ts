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

export function getPlatformSize(
  platform: 
    | 'instagram-feed-grid'
    | 'instagram-feed-portrait'
    | 'instagram-reels'
    | 'instagram-stories'
    | 'instagram'
    | 'facebook'
    | 'linkedin'
    | 'custom'
): '1024x1024' | '1792x1024' | '1024x1792' {
  const sizeMap: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
    // Instagram formats → Closest DALL-E sizes
    'instagram-feed-grid': '1024x1024',     // 3:4 → 1:1 (closest, user crops)
    'instagram-feed-portrait': '1024x1792', // 4:5 → 9:16 (crop slightly)
    'instagram-reels': '1024x1792',         // 9:16 perfect match
    'instagram-stories': '1024x1792',       // 9:16 perfect match
    
    // Legacy/Other platforms
    'instagram': '1024x1024',               // legacy square
    'facebook': '1792x1024',
    'linkedin': '1024x1024',
    'custom': '1024x1024',
  }
  
  return sizeMap[platform] || '1024x1024'
}

export function getPlatformAspectRatio(
  platform: 
    | 'instagram-feed-grid'
    | 'instagram-feed-portrait'
    | 'instagram-reels'
    | 'instagram-stories'
    | 'instagram'
    | 'facebook'
    | 'linkedin'
    | 'custom'
): string {
  const aspectRatioMap: Record<string, string> = {
    'instagram-feed-grid': '3:4',
    'instagram-feed-portrait': '4:5',
    'instagram-reels': '9:16',
    'instagram-stories': '9:16',
    'instagram': '1:1',
    'facebook': '16:9',
    'linkedin': '1.91:1',
    'custom': '1:1',
  }
  
  return aspectRatioMap[platform] || '1:1'
}

export function getPlatformMetadata(
  platform: 
    | 'instagram-feed-grid'
    | 'instagram-feed-portrait'
    | 'instagram-reels'
    | 'instagram-stories'
    | 'instagram'
    | 'facebook'
    | 'linkedin'
    | 'custom'
) {
  const metadataMap: Record<string, {
    targetSize: string
    dalleSize: string
    safeZone?: string
    safeArea?: string
    notes?: string
  }> = {
    'instagram-feed-grid': {
      targetSize: '1080×1440 (3:4)',
      dalleSize: '1024×1024 (1:1)',
      notes: 'DALL-E genera 1:1, il sistema ridimensiona automaticamente a 3:4. Pronto per Instagram!',
    },
    'instagram-feed-portrait': {
      targetSize: '1080×1350 (4:5)',
      dalleSize: '1024×1792 (9:16)',
      notes: 'DALL-E genera 9:16, il sistema ritaglia automaticamente a 4:5. Pronto per Instagram!',
    },
    'instagram-reels': {
      targetSize: '1080×1920 (9:16)',
      dalleSize: '1024×1792 (9:16)',
      safeZone: '1080×1440 (center)',
      notes: 'Perfect match! Testo/elementi nella safe zone centrale.',
    },
    'instagram-stories': {
      targetSize: '1080×1920 (9:16)',
      dalleSize: '1024×1792 (9:16)',
      safeArea: '1080×1610 (center)',
      notes: 'Perfect match! Lascia 250px spazio top/bottom per UI Instagram.',
    },
    'instagram': {
      targetSize: '1024×1024',
      dalleSize: '1024×1024 (1:1)',
      notes: 'Formato quadrato legacy',
    },
    'facebook': {
      targetSize: '1792×1024',
      dalleSize: '1792×1024 (16:9)',
      notes: 'Formato landscape Facebook',
    },
    'linkedin': {
      targetSize: '1024×1024',
      dalleSize: '1024×1024 (1:1)',
      notes: 'Formato LinkedIn',
    },
    'custom': {
      targetSize: '1024×1024',
      dalleSize: '1024×1024 (1:1)',
      notes: 'Formato personalizzato',
    },
  }
  
  return metadataMap[platform] || { 
    targetSize: '1024×1024',
    dalleSize: '1024×1024 (1:1)',
  }
}
