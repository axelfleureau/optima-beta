export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { recognizeIntent } from "@/lib/ai/intent-recognition"
import type { CommandContext } from "@/lib/types"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { buildOperationalContextSnapshot } from "@/lib/operational-context"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const COMMAND_TIMEOUT_MS = 18000

function withTimeout<T>(promise: Promise<T>, timeoutMs = COMMAND_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout interpretazione comando")), timeoutMs)
    }),
  ])
}

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

    if (!message) {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      )
    }

    const db = await getCloudflareDb()
    if (!db) return NextResponse.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const operationalContext = await buildOperationalContextSnapshot(db, principal)
    const serverContext: CommandContext = {
      ...(context || {}),
      tenantId: principal.organizationId,
      userId: principal.memberId,
      userRole: principal.role,
      availableClients: (operationalContext.commandContext.availableClients as CommandContext["availableClients"]) || context?.availableClients || [],
      availableUsers: (operationalContext.commandContext.availableUsers as CommandContext["availableUsers"]) || context?.availableUsers || [],
    }

    const nlpResponse = await withTimeout(recognizeIntent(message, serverContext))

    return NextResponse.json({
      ...nlpResponse,
      contextSources: operationalContext.sources,
    })
  } catch (error: any) {
    console.error("❌ Command API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process command" },
      { status: 500 }
    )
  }
}
