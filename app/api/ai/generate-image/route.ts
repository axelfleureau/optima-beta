import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getOrganizationAdminId, logTokenUsage } from '@/lib/token-service'
import { generateImageWithDalle, getPlatformSize } from '@/lib/ai/dalle-service'
import { estimateImageCost } from '@/lib/ai/cost-calculator'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(request: NextRequest) {
  try {
    // 1. GET AUTH TOKEN FROM HEADERS
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ No Authorization header provided')
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Authentication required' 
        },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    
    // 2. VERIFY TOKEN WITH FIREBASE ADMIN SDK
    let decodedToken
    try {
      if (!adminAuth) {
        console.error('❌ Firebase Admin not initialized')
        return NextResponse.json(
          { 
            success: false,
            error: 'Server configuration error' 
          },
          { status: 500 }
        )
      }
      
      decodedToken = await adminAuth.verifyIdToken(token)
      console.log(`✅ Token verified for user: ${decodedToken.uid}`)
    } catch (error) {
      console.error('❌ Token verification failed:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired authentication token' 
        },
        { status: 401 }
      )
    }
    
    const authenticatedUserId = decodedToken.uid
    
    // 3. GET USER DATA FROM FIRESTORE (server-side query using Admin SDK)
    if (!adminDb) {
      console.error('❌ Firebase Admin DB not initialized')
      return NextResponse.json(
        { 
          success: false,
          error: 'Server configuration error' 
        },
        { status: 500 }
      )
    }
    
    const userDoc = await adminDb.collection('users').doc(authenticatedUserId).get()
    if (!userDoc.exists) {
      console.error(`❌ User ${authenticatedUserId} not found`)
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      )
    }
    
    const userData = userDoc.data()
    
    if (!userData) {
      console.error(`❌ User ${authenticatedUserId} has no data`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid user data' 
        },
        { status: 403 }
      )
    }
    
    // Check if user is suspended
    if (userData.isSuspended) {
      console.error(`❌ User ${authenticatedUserId} is suspended`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Account suspended' 
        },
        { status: 403 }
      )
    }
    
    if (!userData.tenantId) {
      console.error(`❌ User ${authenticatedUserId} has no tenantId`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid user configuration - no tenant' 
        },
        { status: 403 }
      )
    }
    
    // 4. DERIVE SERVER-SIDE IDs (NOT from client input)
    const serverTenantId = userData.tenantId
    
    // Use getOrganizationAdminId helper to derive adminId
    const { adminId: serverAdminId } = await getOrganizationAdminId(authenticatedUserId)
    
    console.log(`🔒 Server-derived credentials: userId=${authenticatedUserId}, tenantId=${serverTenantId}, adminId=${serverAdminId}`)
    
    // 5. PARSE REQUEST BODY
    const body = await request.json()
    const { prompt, platform, size, style, quality, userId: clientUserId, tenantId: clientTenantId, adminId: clientAdminId } = body
    
    // 6. SECURITY AUDIT: Validate client-sent IDs (optional but recommended)
    if (clientUserId && clientUserId !== authenticatedUserId) {
      console.warn(`⚠️ SECURITY: Client sent mismatched userId - potential spoof attempt`)
      console.warn(`   Authenticated: ${authenticatedUserId}, Client sent: ${clientUserId}`)
      await addDoc(collection(db, 'security_audit'), {
        event: 'user_id_spoof_attempt',
        authenticatedUserId,
        clientSentUserId: clientUserId,
        endpoint: '/api/ai/generate-image',
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Security violation detected' 
        },
        { status: 403 }
      )
    }
    
    if (clientTenantId && clientTenantId !== serverTenantId) {
      console.warn(`⚠️ SECURITY: Client sent mismatched tenantId - potential spoof attempt`)
      console.warn(`   Server: ${serverTenantId}, Client sent: ${clientTenantId}`)
      await addDoc(collection(db, 'security_audit'), {
        event: 'tenant_id_spoof_attempt',
        authenticatedUserId,
        serverTenantId,
        clientSentTenantId: clientTenantId,
        endpoint: '/api/ai/generate-image',
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Security violation detected' 
        },
        { status: 403 }
      )
    }
    
    if (clientAdminId && clientAdminId !== serverAdminId) {
      console.warn(`⚠️ SECURITY: Client sent mismatched adminId - potential spoof attempt`)
      console.warn(`   Server: ${serverAdminId}, Client sent: ${clientAdminId}`)
      await addDoc(collection(db, 'security_audit'), {
        event: 'admin_id_spoof_attempt',
        authenticatedUserId,
        serverAdminId,
        clientSentAdminId: clientAdminId,
        endpoint: '/api/ai/generate-image',
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Security violation detected' 
        },
        { status: 403 }
      )
    }

    // Validate prompt
    if (!prompt) {
      console.error('❌ Missing required field: prompt')
      return NextResponse.json(
        { 
          success: false,
          error: 'Prompt is required' 
        },
        { status: 400 }
      )
    }

    console.log('🎨 Image generation request:', {
      userId: authenticatedUserId,
      tenantId: serverTenantId,
      adminId: serverAdminId,
      platform,
      size,
      quality,
      promptLength: prompt.length,
    })

    // 7. VERIFY API CONFIGURATION
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ OPENAI_API_KEY not found or empty')
      return NextResponse.json(
        {
          success: false,
          error: 'Configurazione API mancante. Contatta l\'amministratore.',
        },
        { status: 500 }
      )
    }

    console.log(`🔒 Tenant isolation enforced: tenantId=${serverTenantId}, adminId=${serverAdminId}, userId=${authenticatedUserId}`)

    // 8. GENERATE IMAGE WITH DALL-E
    const imageSize = size || getPlatformSize(platform || 'instagram')
    const imageQuality = quality || 'standard'
    const imageStyle = style || 'vivid'

    const costEstimate = estimateImageCost(imageQuality)
    console.log(`💰 Estimated cost: ${costEstimate.tokens} tokens (€${costEstimate.cost.toFixed(2)})`)

    console.log('🎨 Generating image with DALL-E 3...')
    const result = await generateImageWithDalle({
      prompt,
      size: imageSize,
      quality: imageQuality,
      style: imageStyle,
    })

    if (!result.success || !result.imageUrl) {
      console.error('❌ Image generation failed:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Errore nella generazione immagine',
        },
        { status: 500 }
      )
    }

    console.log('✅ Image generated successfully')

    const tokensUsed = costEstimate.tokens

    // 9. SAVE METADATA TO FIRESTORE WITH SERVER-DERIVED IDs
    try {
      console.log(`💾 Saving image generation metadata to Firestore with server-derived IDs...`)
      await addDoc(collection(db, 'ai_usage'), {
        tenantId: serverTenantId, // ✅ Server-derived
        adminId: serverAdminId, // ✅ Server-derived
        userId: authenticatedUserId, // ✅ From verified token
        tokensUsed,
        feature: 'image_generation',
        model: 'dall-e-3',
        prompt,
        revisedPrompt: result.revisedPrompt,
        platform: platform || 'custom',
        size: imageSize,
        quality: imageQuality,
        style: imageStyle,
        imageUrl: result.imageUrl,
        createdAt: new Date(),
      })
      console.log('✅ Metadata saved to Firestore with tenant isolation')
    } catch (error) {
      console.error('❌ Error saving metadata:', error)
    }

    // 10. LOG TOKEN USAGE WITH SERVER-DERIVED adminId
    try {
      console.log(`💰 Logging ${tokensUsed} tokens for admin ${serverAdminId}`)
      await logTokenUsage(serverAdminId, authenticatedUserId, tokensUsed, 'other')
      console.log('✅ Token usage logged successfully')
    } catch (error) {
      console.error('❌ Error logging token usage:', error)
    }

    return NextResponse.json(
      {
        success: true,
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        tokensUsed,
        cost: costEstimate.cost,
        platform: platform || 'custom',
        size: imageSize,
        quality: imageQuality,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Image generation API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore interno del server',
      },
      { status: 500 }
    )
  }
}
