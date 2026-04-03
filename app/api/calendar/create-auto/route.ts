export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

// Helper: Get user from token
async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  
  const token = authHeader.split("Bearer ")[1]
  try {
    if (!adminAuth || !adminDb) return null
    
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
    
    if (!userDoc.exists) return null
    
    return {
      uid: decodedToken.uid,
      data: userDoc.data()
    }
  } catch (error) {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. VERIFY AUTHENTICATION
    const user = await getUserFromToken(req)
    if (!user) {
      console.error('❌ Unauthorized - No valid user from token')
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // 2. DERIVE tenantId FROM TOKEN (DON'T TRUST CLIENT)
    const tenantId = user.data?.tenantId || user.uid
    
    const body = await req.json()
    const { date, platform, type, clientId, linkedTaskId, status, content } = body
    
    console.log('📅 Creating calendar entry:', { date, platform, type, clientId, linkedTaskId })
    
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      )
    }
    
    // 3. VERIFY client belongs to tenant
    const clientDoc = await adminDb.collection("clients").doc(clientId).get()
    if (!clientDoc.exists || clientDoc.data()?.tenantId !== tenantId) {
      console.error('❌ Client not found or unauthorized')
      return NextResponse.json(
        { success: false, error: "Client not found or unauthorized" },
        { status: 403 }
      )
    }
    
    // 4. CREATE CALENDAR ENTRY with SERVER-DERIVED tenantId
    const entryRef = await adminDb.collection('editorial_calendar').add({
      date: new Date(date),
      platform,
      type,
      clientId,
      linkedTaskId,
      tenantId, // ✅ Server-derived, not from body
      status,
      content: {
        topic: content.topic,
        caption: content.caption || '',
        mediaUrl: content.mediaUrl || null
      },
      createdAt: new Date(),
      createdBy: user.uid
    })
    
    const entry = await entryRef.get()
    
    console.log('✅ Calendar entry created successfully:', entryRef.id)
    
    return NextResponse.json({
      success: true,
      entry: { id: entryRef.id, ...entry.data() }
    })
  } catch (error) {
    console.error('❌ Calendar auto-insert error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
