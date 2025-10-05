import { NextResponse } from "next/server"
import { recognizeIntent } from "@/lib/ai/intent-recognition"
import type { CommandContext } from "@/lib/types"

export async function POST(request: Request) {
  try {
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

    console.log("🎤 Processing command:", message)
    console.log("📍 Context:", context)

    const nlpResponse = await recognizeIntent(message, context)

    console.log("✅ NLP Response:", nlpResponse)

    return NextResponse.json(nlpResponse)
  } catch (error: any) {
    console.error("❌ Command API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process command" },
      { status: 500 }
    )
  }
}
