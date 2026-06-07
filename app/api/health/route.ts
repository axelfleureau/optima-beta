export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { getTaskMediaBucket } from "@/lib/cloudflare-r2"
import { getAgentRunnerControlState } from "@/lib/agent-runner-control"

function getClerkMode(publishableKey: string) {
  if (publishableKey.startsWith("pk_live_")) return "live"
  if (publishableKey.startsWith("pk_test_")) return "test"
  if (publishableKey) return "unknown"
  return "missing"
}

const requiredTables = [
  "organizations",
  "members",
  "clients",
  "projects",
  "tasks",
  "time_entries",
  "chat_sessions",
  "chat_messages",
  "agent_jobs",
  "agent_job_events",
  "agent_runner_heartbeats",
  "repository_links",
  "agentic_provider_installations",
  "mcp_connector_installations",
  "agent_subagents",
  "agentic_graph_nodes",
  "agentic_graph_edges",
  "agentic_graph_sessions",
]

async function checkRequiredTables(db: any) {
  if (!db) return { ok: false, present: 0, expected: requiredTables.length, missing: requiredTables }

  const placeholders = requiredTables.map(() => "?").join(",")
  const rows = await db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`)
    .bind(...requiredTables)
    .all()

  const presentNames = new Set((rows.results ?? []).map((row: any) => String(row.name)))
  const missing = requiredTables.filter((table) => !presentNames.has(table))

  return {
    ok: missing.length === 0,
    present: presentNames.size,
    expected: requiredTables.length,
    missing,
  }
}

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""
  const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || "unknown"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  const runnerControl = getAgentRunnerControlState()

  let dbStatus: "ok" | "missing" | "error" = "missing"
  let tableStatus = { ok: false, present: 0, expected: requiredTables.length, missing: requiredTables }
  try {
    const db = await getCloudflareDb()
    if (db) {
      await db.prepare("SELECT 1 AS ok").first()
      tableStatus = await checkRequiredTables(db)
      dbStatus = "ok"
    }
  } catch {
    dbStatus = "error"
  }

  let taskMediaBucketConfigured = false
  try {
    taskMediaBucketConfigured = Boolean(await getTaskMediaBucket())
  } catch {
    taskMediaBucketConfigured = false
  }

  const clerkMode = getClerkMode(publishableKey)
  const checks = {
    appEnv,
    siteUrlConfigured: Boolean(siteUrl),
    clerkMode,
    dbStatus,
    requiredTables: tableStatus,
    taskMediaBucketConfigured,
    agentRunnerApiKeyConfigured: Boolean(process.env.AGENT_RUNNER_API_KEY),
    agentRunnerClaimEnabled: runnerControl.enabled,
    agentRunnerStatus: runnerControl.status,
  }

  const coreReady =
    appEnv === "production" &&
    checks.siteUrlConfigured &&
    clerkMode === "live" &&
    dbStatus === "ok"
  const agenticReady =
    coreReady &&
    tableStatus.ok &&
    taskMediaBucketConfigured &&
    checks.agentRunnerApiKeyConfigured &&
    runnerControl.enabled

  return Response.json(
    {
      ok: coreReady,
      service: "optima",
      timestamp: new Date().toISOString(),
      checks,
      readiness: {
        coreReady,
        agenticReady,
      },
    },
    {
      status: coreReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
