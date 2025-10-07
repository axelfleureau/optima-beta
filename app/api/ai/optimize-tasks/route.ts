import { type NextRequest, NextResponse } from "next/server"
import { optimizeTasksWithAI } from "@/lib/ai-task-optimizer"
import type { TaskOptimizationRequest } from "@/lib/types"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const body = await request.json()
    const { tasks, columnId, optimizationType, userId } = body as TaskOptimizationRequest & { userId: string }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "Tasks array is required and cannot be empty" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (!optimizationType) {
      return NextResponse.json({ error: "Optimization type is required" }, { status: 400 })
    }

    // Optimize tasks using AI
    const optimizationResult = await optimizeTasksWithAI({ tasks, columnId, optimizationType }, userId)

    return NextResponse.json(optimizationResult)
  } catch (error) {
    console.error("Error in optimize-tasks API:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
