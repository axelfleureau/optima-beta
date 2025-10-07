import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AUTH")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
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