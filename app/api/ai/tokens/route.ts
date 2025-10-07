import type { NextRequest } from "next/server"
import { getAvailableTokens } from "@/lib/token-service"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      console.error("Missing userId parameter")
      return new Response(JSON.stringify({ error: "Missing userId parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Token API: Getting tokens for user:", userId)

    // Get fresh token data from database
    const tokenInfo = await getAvailableTokens(userId)

    console.log("Token API: Returning token info:", tokenInfo)

    return new Response(JSON.stringify(tokenInfo), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Token API Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to fetch token information",
        tokensUsed: 0,
        tokensTotal: 1000000,
        tokensAvailable: 1000000,
        organizationName: "Organizzazione",
        adminId: "",
        userRole: "error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
