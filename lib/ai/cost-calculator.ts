export interface ImageCostEstimate {
  tokens: number
  cost: number
}

export interface ImageGenerationParams {
  quality: 'standard' | 'hd'
  size: '1024x1024' | '1792x1024' | '1024x1792'
}

export function estimateImageCost(quality: 'standard' | 'hd' = 'standard'): ImageCostEstimate {
  const baseTokens = quality === 'hd' ? 30 : 15
  const costPerToken = 0.01
  const markup = 3
  
  return {
    tokens: baseTokens,
    cost: baseTokens * costPerToken * markup,
  }
}

export function getImageGenerationCost(params: ImageGenerationParams): ImageCostEstimate {
  return estimateImageCost(params.quality)
}

export const IMAGE_GENERATION_COSTS = {
  standard: {
    tokens: 15,
    description: 'Standard quality (1024x1024)',
  },
  hd: {
    tokens: 30,
    description: 'HD quality (1792x1024 or 1024x1792)',
  },
} as const
