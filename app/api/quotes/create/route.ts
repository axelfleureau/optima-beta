import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    // Get Firebase auth token from cookies
    const authToken = request.cookies.get("firebase-auth-token")?.value

    if (!authToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Verify Firebase token and get authenticated user
    const decodedToken = await verifyFirebaseToken(authToken)
    const userData = await getUserData(decodedToken.uid)

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (userData.isSuspended) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      )
    }

    const userId = decodedToken.uid
    const tenantId = userData.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { error: "User tenant not found" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title, description, clientId, clientName, status, currency, items, total, validUntil } = body

    if (!title || !items || !total) {
      return NextResponse.json(
        { error: "Missing required fields: title, items, total" },
        { status: 400 }
      )
    }

    // SECURITY: Use only server-verified tenantId and userId, ignore any client-sent identifiers
    const now = Timestamp.now()
    const newQuote = {
      title,
      description: description || "",
      clientId: clientId || "",
      clientName: clientName || "",
      status: status || "draft",
      currency: currency || "EUR",
      items,
      total,
      validUntil: validUntil ? Timestamp.fromDate(new Date(validUntil)) : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days default
      tenantId, // Server-verified only
      createdBy: userId, // Server-verified only
      createdAt: now,
      updatedAt: now,
    }

    console.log("🔒 Creating quote with server-verified tenant:", tenantId)

    const docRef = await addDoc(collection(db, "quotes"), newQuote)

    return NextResponse.json({
      success: true,
      id: docRef.id
    })

  } catch (error) {
    console.error("❌ Quote creation API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to create quote",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}