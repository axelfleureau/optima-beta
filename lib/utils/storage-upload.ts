import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

export interface UploadImageOptions {
  imageSource: Buffer | string
  tenantId: string
  assetType: 'dalle' | 'profile' | 'logo' | 'content'
  assetFormat?: 'png' | 'jpg'
  metadata?: {
    prompt?: string
    dalleModel?: string
    platform?: string
    clientId?: string
    taskId?: string
    calendarId?: string
  }
}

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Uploads an image to Firebase Storage with tenant isolation.
 * 
 * @param options.imageSource - Buffer or URL to fetch image from
 * @param options.assetFormat - Optional format override. If not provided:
 *   - URL sources: auto-detected from Content-Type header (supports jpg/jpeg variants, case-insensitive)
 *   - Buffer sources: defaults to 'png' (caller should specify for JPEG buffers)
 * 
 * @returns UploadResult with public download URL or error
 */
export async function uploadImageToStorage(
  options: UploadImageOptions
): Promise<UploadResult> {
  try {
    if (!options.tenantId || options.tenantId.trim() === '') {
      return {
        success: false,
        error: 'tenantId is required'
      }
    }

    if (!options.assetType) {
      return {
        success: false,
        error: 'assetType is required'
      }
    }

    let buffer: Buffer
    let imageFormat: 'png' | 'jpg'

    if (typeof options.imageSource === 'string') {
      const response = await fetch(options.imageSource)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      
      // Auto-detect format from response headers (case-insensitive, supports jpg/jpeg)
      const contentType = response.headers.get('content-type') || 'image/png'
      const contentTypeStr = contentType.toLowerCase()
      
      // Check for both 'jpeg' and 'jpg' variants
      const isJpeg = contentTypeStr.includes('jpeg') || contentTypeStr.includes('jpg')
      const detectedFormat = isJpeg ? 'jpg' : 'png'
      
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      
      // Use provided format or detected format
      imageFormat = options.assetFormat || detectedFormat
    } else {
      buffer = options.imageSource
      imageFormat = options.assetFormat || 'png'
    }

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const filename = `${timestamp}_${randomId}.${imageFormat}`
    
    const storagePath = `tenants/${options.tenantId}/assets/${options.assetType}/${filename}`

    const storageRef = ref(storage, storagePath)

    const metadata = {
      contentType: `image/${imageFormat === 'jpg' ? 'jpeg' : imageFormat}`,
      customMetadata: {
        prompt: options.metadata?.prompt || '',
        dalleModel: options.metadata?.dalleModel || 'dall-e-3',
        platform: options.metadata?.platform || '',
        clientId: options.metadata?.clientId || '',
        taskId: options.metadata?.taskId || '',
        calendarId: options.metadata?.calendarId || '',
        uploadedAt: new Date().toISOString(),
      }
    }

    await uploadBytes(storageRef, buffer, metadata)

    const downloadUrl = await getDownloadURL(storageRef)

    return {
      success: true,
      url: downloadUrl,
      path: storagePath,
    }
  } catch (error) {
    console.error('❌ Firebase Storage upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    }
  }
}

export async function deleteImageFromStorage(path: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
    return true
  } catch (error) {
    console.error('❌ Firebase Storage delete error:', error)
    return false
  }
}
