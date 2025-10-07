import sharp from 'sharp'

export interface ResizeConfig {
  targetWidth: number
  targetHeight: number
  strategy: 'crop' | 'cover' | 'contain'
}

/**
 * Resize/crop image to target dimensions
 */
export async function resizeImage(
  imageBuffer: Buffer | string,
  config: ResizeConfig
): Promise<Buffer> {
  try {
    let inputBuffer: Buffer

    if (typeof imageBuffer === 'string') {
      const response = await fetch(imageBuffer)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      inputBuffer = Buffer.from(arrayBuffer)
    } else {
      inputBuffer = imageBuffer
    }

    const processed = await sharp(inputBuffer)
      .resize(config.targetWidth, config.targetHeight, {
        fit: config.strategy === 'crop' ? 'cover' : config.strategy,
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toBuffer()

    return processed

  } catch (error) {
    console.error('❌ Image resize error:', error)
    throw error
  }
}

/**
 * Get resize config for Instagram formats
 */
export function getInstagramResizeConfig(
  platform: string
): ResizeConfig | null {
  const configs: Record<string, ResizeConfig> = {
    'instagram-feed-grid': {
      targetWidth: 1080,
      targetHeight: 1440,
      strategy: 'crop',
    },
    'instagram-feed-portrait': {
      targetWidth: 1080,
      targetHeight: 1350,
      strategy: 'crop',
    },
  }

  return configs[platform] || null
}
