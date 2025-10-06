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
    const { title, description, clientId, status, dueDate, metadata } = body
    
    console.log('📝 Creating task:', { title, clientId, tenantId, status })
    
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
    
    // 4. CREATE TASK with SERVER-DERIVED tenantId
    const taskRef = await adminDb.collection('tasks').add({
      title,
      description,
      clientId,
      tenantId, // ✅ Server-derived, not from body
      userId: user.uid,
      status,
      dueDate: new Date(dueDate),
      createdAt: new Date(),
      createdBy: user.uid,
      metadata,
      columnId: status === 'to-do' ? 'to-do' : 'active',
      assignedTo: null,
      priority: 'medium'
    })
    
    const task = await taskRef.get()
    
    console.log('✅ Task created successfully:', taskRef.id)
    
    return NextResponse.json({
      success: true,
      task: { id: taskRef.id, ...task.data() }
    })
  } catch (error) {
    console.error('❌ Task auto-creation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
