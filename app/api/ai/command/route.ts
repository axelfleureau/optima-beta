export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { recognizeIntent } from "@/lib/ai/intent-recognition"
import type { CommandContext } from "@/lib/types"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { message, context } = body as { message: string; context: CommandContext }

    if (!message || !context) {
      return NextResponse.json(
        { error: "Missing required fields: message and context" },
        { status: 400 }
      )
    }

    if (!context.tenantId || !context.userId) {
      return NextResponse.json(
        { error: "Invalid context: tenantId and userId are required" },
        { status: 400 }
      )
    }

    const nlpResponse = await recognizeIntent(message, context)

    return NextResponse.json(nlpResponse)
  } catch (error: any) {
    console.error("❌ Command API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process command" },
      { status: 500 }
    )
  }
}
