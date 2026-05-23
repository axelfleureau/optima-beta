export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    const usage = db
      ? await db
          .prepare(
            `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokensUsed
             FROM ai_usage
             WHERE organization_id = ?`,
          )
          .bind(user.organizationId)
          .first()
      : null

    const tokensUsed = Number(usage?.tokensUsed || 0)
    const tokensTotal = 1000000

    return Response.json(
      {
        tokensUsed,
        tokensTotal,
        tokensAvailable: Math.max(0, tokensTotal - tokensUsed),
        organizationName: "Organizzazione",
        adminId: user.organizationId,
        userRole: user.role,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("Token API Error:", error)
    return Response.json(
      {
        error: "Failed to fetch token information",
        tokensUsed: 0,
        tokensTotal: 1000000,
        tokensAvailable: 1000000,
        organizationName: "Organizzazione",
        adminId: "",
        userRole: "error",
      },
      { status: 500 },
    )
  }
}
