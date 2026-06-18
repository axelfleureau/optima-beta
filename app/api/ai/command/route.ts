export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { recognizeIntent } from "@/lib/ai/intent-recognition"
import type { CommandContext } from "@/lib/types"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { buildOperationalContextSnapshot } from "@/lib/operational-context"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { hasOpenAIApiKey } from "@/lib/ai/openai-runtime"
import { resolveAgenticModelRuntime } from "@/lib/ai/agentic-model-runtime"

const COMMAND_TIMEOUT_MS = 18000

function withTimeout<T>(promise: Promise<T>, timeoutMs = COMMAND_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout interpretazione comando")), timeoutMs)
    }),
  ])
}

export async function GET() {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) return NextResponse.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const [openaiConfigured, chatRuntime, researchRuntime, codeRuntime] = await Promise.all([
      hasOpenAIApiKey().catch(() => false),
      resolveAgenticModelRuntime(db, principal, "chat").catch(() => null),
      resolveAgenticModelRuntime(db, principal, "research").catch(() => null),
      resolveAgenticModelRuntime(db, principal, "code").catch(() => null),
    ])

    return NextResponse.json(
      {
        deterministicReady: true,
        commandBarReady: true,
        chat: {
          providerId: chatRuntime?.providerId ?? "openai",
          model: chatRuntime?.model ?? "gpt-5.2",
          runtimeStatus: openaiConfigured ? "ready" : chatRuntime?.runtimeStatus ?? "needs_secret",
          runtimeDetail: openaiConfigured
            ? "OPENAI_API_KEY configurata per interpretazione AI."
            : chatRuntime?.runtimeDetail ?? "Interpretazione AI non configurata; resta attivo il fallback locale.",
        },
        research: researchRuntime
          ? {
              providerId: researchRuntime.providerId,
              model: researchRuntime.model,
              runtimeStatus: researchRuntime.runtimeStatus,
              runtimeDetail: researchRuntime.runtimeDetail,
            }
          : {
              providerId: "qwen",
              model: "qwen-long-context",
              runtimeStatus: "needs_secret",
              runtimeDetail: "Route research/Qwen non pronta: command bar usa fallback locale e chat provider.",
            },
        code: codeRuntime
          ? {
              providerId: codeRuntime.providerId,
              model: codeRuntime.model,
              runtimeStatus: codeRuntime.runtimeStatus,
              runtimeDetail: codeRuntime.runtimeDetail,
            }
          : {
              providerId: "codex",
              model: "codex-cli",
              runtimeStatus: "reference_only",
              runtimeDetail: "Codex CLI resta un runner/job review, non un backend sincrono della command bar.",
            },
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (error: any) {
    console.error("❌ Command readiness error:", error)
    return NextResponse.json(
      { error: error.message || "Errore nel caricamento readiness command bar." },
      { status: 500 },
    )
  }
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
