import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { cookies } from 'next/headers'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    // Verify authentication via cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('firebase-auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { messageId, feedback, sessionId } = await req.json()

    // Validate input (userId comes from auth token, not client)
    if (!messageId || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, feedback' },
        { status: 400 }
      )
    }

    if (!['positive', 'negative'].includes(feedback)) {
      return NextResponse.json(
        { error: 'Feedback must be either "positive" or "negative"' },
        { status: 400 }
      )
    }

    // Verify token to get authentic user ID 
    const verifyResponse = await fetch(`${req.nextUrl.origin}/api/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const { user } = await verifyResponse.json()
    const authenticatedUserId = user.uid

    // Store feedback in Firestore for analytics with authenticated user ID
    const feedbackData = {
      messageId,
      feedback,
      userId: authenticatedUserId, // Use verified user ID
      sessionId: sessionId || null,
      timestamp: serverTimestamp(),
      userAgent: req.headers.get('user-agent') || 'unknown',
    }

    await addDoc(collection(db, 'ai_feedback'), feedbackData)

    console.log('📝 AI Feedback received:', {
      messageId: messageId.substring(0, 8) + '...',
      feedback,
      userId: authenticatedUserId.substring(0, 8) + '...',
      sessionId: sessionId?.substring(0, 8) + '...' || 'none'
    })

    return NextResponse.json({
      success: true,
      message: 'Feedback received successfully'
    })
  } catch (error) {
    console.error('❌ Error storing AI feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}