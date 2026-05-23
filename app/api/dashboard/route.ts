export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

type Activity = {
  id: string
  type: "ai_usage" | "task" | "campaign" | "quote" | "client"
  title: string
  details?: string
  timestamp: string
  tokensUsed?: number
  user?: string
  client?: string
  status?: string
}

function toNumber(value: unknown) {
  return Number(value || 0)
}

function iso(value: unknown) {
  return typeof value === "string" && value ? value : new Date().toISOString()
}

export async function GET() {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const organizationId = principal.organizationId

    const [
      clientsCount,
      campaignsCount,
      sentQuotesCount,
      revenueResult,
      completedTasksCount,
      pendingTasksCount,
      tokenResult,
      recentTasks,
      recentCampaigns,
      recentQuotes,
      recentAiUsage,
    ] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS count FROM clients WHERE organization_id = ?`).bind(organizationId).first(),
      db
        .prepare(`SELECT COUNT(*) AS count FROM campaigns WHERE organization_id = ? AND status IN ('active', 'running')`)
        .bind(organizationId)
        .first(),
      db
        .prepare(`SELECT COUNT(*) AS count FROM quotes WHERE organization_id = ?`)
        .bind(organizationId)
        .first(),
      db
        .prepare(`SELECT COALESCE(SUM(total_cents), 0) AS total FROM quotes WHERE organization_id = ? AND status IN ('accepted', 'approved')`)
        .bind(organizationId)
        .first(),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM tasks
           WHERE organization_id = ?
             AND COALESCE(column_id, status) IN ('done', 'completed', 'validation')
             AND datetime(updated_at) >= datetime('now', '-1 month')`,
        )
        .bind(organizationId)
        .first(),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM tasks
           WHERE organization_id = ?
             AND COALESCE(column_id, status) NOT IN ('done', 'completed', 'validation', 'suspended', 'sospeso', 'recurring', 'ricorrente', 'archived', 'archiviato')`,
        )
        .bind(organizationId)
        .first(),
      db
        .prepare(
          `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS used
           FROM ai_usage
           WHERE organization_id = ?`,
        )
        .bind(organizationId)
        .first(),
      db
        .prepare(
          `SELECT id, title, status, column_id, client_name, updated_at, created_at
           FROM tasks
           WHERE organization_id = ?
           ORDER BY datetime(updated_at) DESC
           LIMIT 3`,
        )
        .bind(organizationId)
        .all(),
      db
        .prepare(
          `SELECT id, title, status, created_at
           FROM campaigns
           WHERE organization_id = ?
           ORDER BY datetime(created_at) DESC
           LIMIT 2`,
        )
        .bind(organizationId)
        .all(),
      db
        .prepare(
          `SELECT id, title, client_name, status, created_at
           FROM quotes
           WHERE organization_id = ?
           ORDER BY datetime(created_at) DESC
           LIMIT 2`,
        )
        .bind(organizationId)
        .all(),
      db
        .prepare(
          `SELECT id, feature, input_tokens, output_tokens, created_at
           FROM ai_usage
           WHERE organization_id = ?
           ORDER BY datetime(created_at) DESC
           LIMIT 3`,
        )
        .bind(organizationId)
        .all(),
    ])

    const activities: Activity[] = []

    for (const usage of recentAiUsage.results || []) {
      const tokensUsed = toNumber(usage.input_tokens) + toNumber(usage.output_tokens)
      activities.push({
        id: String(usage.id),
        type: "ai_usage",
        title: "Utilizzo AI Assistant",
        details: String(usage.feature || "Generazione contenuto"),
        timestamp: iso(usage.created_at),
        tokensUsed,
        user: user.firstName || user.email,
      })
    }

    for (const task of recentTasks.results || []) {
      const status = String(task.column_id || task.status || "")
      const isCompleted = ["done", "completed", "validation"].includes(status)
      activities.push({
        id: String(task.id),
        type: "task",
        title: isCompleted ? "Task Completato" : "Task Aggiornato",
        details: String(task.title || "Task senza titolo"),
        timestamp: iso(task.updated_at || task.created_at),
        client: task.client_name ? String(task.client_name) : undefined,
        status,
      })
    }

    for (const campaign of recentCampaigns.results || []) {
      activities.push({
        id: String(campaign.id),
        type: "campaign",
        title: "Campagna",
        details: String(campaign.title || "Campagna senza nome"),
        timestamp: iso(campaign.created_at),
        status: String(campaign.status || "draft"),
      })
    }

    for (const quote of recentQuotes.results || []) {
      activities.push({
        id: String(quote.id),
        type: "quote",
        title: String(quote.status) === "sent" ? "Preventivo Inviato" : "Preventivo Creato",
        details: String(quote.title || "Preventivo"),
        timestamp: iso(quote.created_at),
        client: quote.client_name ? String(quote.client_name) : undefined,
        status: String(quote.status || "draft"),
      })
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const aiTokensUsed = toNumber(tokenResult?.used)
    const aiTokensLimit = 1_000_000

    return Response.json({
      stats: {
        totalClients: toNumber(clientsCount?.count),
        activeCampaigns: toNumber(campaignsCount?.count),
        sentQuotes: toNumber(sentQuotesCount?.count),
        completedTasks: toNumber(completedTasksCount?.count),
        pendingTasks: toNumber(pendingTasksCount?.count),
        totalRevenue: toNumber(revenueResult?.total) / 100,
        aiTokensUsed,
        aiTokensLimit,
      },
      recentActivities: activities.slice(0, 5),
    })
  } catch (error) {
    console.error("Dashboard GET error:", error)
    return Response.json({ error: "Errore nel caricamento della dashboard" }, { status: 500 })
  }
}
