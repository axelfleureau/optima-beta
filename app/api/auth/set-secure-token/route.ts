import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AUTH")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const contentType = request.headers.get('content-type')
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error("Invalid content type:", contentType)
      return NextResponse.json({ error: "Invalid content type. Expected application/json" }, { status: 400 })
    }

    const text = await request.text()
    
    if (!text || text.trim() === '') {
      console.error("Empty request body received")
      return NextResponse.json({ error: "Empty request body" }, { status: 400 })
    }

    let body
    try {
      body = JSON.parse(text)
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Body:", text)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { token } = body

    if (!token) {
      console.error("No token in request body")
      return NextResponse.json({ error: "No token provided" }, { status: 400 })
    }

    // Verifica che il token sia valido prima di impostarlo
    const decodedToken = await verifyFirebaseToken(token)
    
    // Imposta cookie HttpOnly e Secure usando NextResponse
    const response = NextResponse.json({ 
      success: true,
      uid: decodedToken.uid
    })

    response.cookies.set("firebase-auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 ora
      path: "/"
    })

    return response

  } catch (error) {
    console.error("Token setting error:", error)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
}