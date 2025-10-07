import { NextResponse } from "next/server"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "AUTH")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const response = NextResponse.json({ success: true })
    
    // Rimuovi la cookie sicura impostandola con una data di scadenza passata
    response.cookies.set("firebase-auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
      expires: new Date(0)
    })

    return response

  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}