export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { getAgentRunnerControlState } from "@/lib/agent-runner-control"
import { listAgentRunnerHeartbeats } from "@/lib/agent-jobs"

async function tableExists(db: any, table: string) {
  const row = await db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`).bind(table).first()
  return Boolean(row?.name)
}

async function configuredRouteCount(db: any, organizationId = "org_demo_righello") {
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM agentic_model_routes
         WHERE organization_id = ?
           AND COALESCE(status, 'configured') IN ('configured', 'ready', 'active')
           AND lane IN ('operations', 'research')
           AND provider_id IN ('gemma-hosted', 'gemma', 'qwen')`,
      )
      .bind(organizationId)
      .first()
    return Number(row?.count || 0)
  } catch {
    return 0
  }
}

export async function GET() {
  const tokenConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN)
  const webhookSecretConfigured = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET)
  const envAllowedChats = String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length

  let dbStatus: "ok" | "missing" | "error" = "missing"
  let tables = {
    authorizedChats: false,
    memory: false,
    documentProposals: false,
    agentJobs: false,
  }
  let authorizedChats = envAllowedChats
  let runnerSeen = false
  let localModelRoutes = 0

  try {
    const db = await getCloudflareDb()
    if (db) {
      dbStatus = "ok"
      tables = {
        authorizedChats: await tableExists(db, "telegram_authorized_chats"),
        memory: await tableExists(db, "telegram_conversation_memory"),
        documentProposals: await tableExists(db, "telegram_document_proposals"),
        agentJobs: await tableExists(db, "agent_jobs"),
      }

      if (tables.authorizedChats) {
        const row = await db
          .prepare(`SELECT COUNT(*) AS count FROM telegram_authorized_chats WHERE COALESCE(status, 'active') = 'active'`)
          .first()
        authorizedChats += Number(row?.count || 0)
      }

      localModelRoutes = await configuredRouteCount(db)

      try {
        const heartbeats = await listAgentRunnerHeartbeats(db, 5)
        runnerSeen = heartbeats.some((runner) => Date.now() - new Date(runner.lastSeenAt).getTime() < 15 * 60 * 1000)
      } catch {
        runnerSeen = false
      }
    }
  } catch {
    dbStatus = "error"
  }

  const runnerControl = getAgentRunnerControlState()
  const checks = {
    tokenConfigured,
    webhookSecretConfigured,
    dbStatus,
    tables,
    authorizedChats,
    runnerClaimEnabled: runnerControl.enabled,
    runnerStatus: runnerControl.status,
    runnerSeen,
    localModelRoutes,
    localModelPolicy: "Gemma/Qwen first per operations/research; Codex ChatGPT wrapper solo fallback controllato",
    codexPathConfigured: Boolean(process.env.CODEX_BIN || process.env.CODEX_TELEGRAM_BIN),
  }

  const ok =
    tokenConfigured &&
    webhookSecretConfigured &&
    dbStatus === "ok" &&
    tables.authorizedChats &&
    tables.memory &&
    tables.documentProposals &&
    tables.agentJobs &&
    authorizedChats > 0 &&
    localModelRoutes > 0

  return Response.json({
    ok,
    service: "telegram-agentic-bot",
    mode: "agentic-job-backed",
    checks,
    nextActions: [
      !tokenConfigured ? "Configura TELEGRAM_BOT_TOKEN" : "",
      !webhookSecretConfigured ? "Configura TELEGRAM_WEBHOOK_SECRET e webhook Telegram con secret header" : "",
      authorizedChats < 1 ? "Autorizza almeno una chat con /chatid e tabella telegram_authorized_chats o env TELEGRAM_ALLOWED_CHAT_IDS" : "",
      localModelRoutes < 1 ? "Esegui il seed route Qwen/Gemma o configura agentic_model_routes per operations/research" : "",
      !runnerControl.enabled ? "Abilita runner solo quando vuoi che i job Telegram siano processati dal VPS" : "",
    ].filter(Boolean),
  })
}
