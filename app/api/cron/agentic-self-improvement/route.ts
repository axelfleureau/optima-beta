import { NextRequest } from "next/server"

import {
  bootstrapAgenticTenant,
  seedHostedModelRoutes,
} from "@/lib/agentic-capabilities"
import { createSelfImprovementJob, getSelfImprovementSnapshot } from "@/lib/agentic-self-improvement"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return { ok: false, error: "CRON_SECRET not configured", status: 500 as const }

  const authHeader = request.headers.get("authorization") || ""
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, error: "Unauthorized", status: 401 as const }
  }

  return { ok: true as const }
}

async function listOrganizations(db: any) {
  const result = await db
    .prepare(
      `SELECT DISTINCT o.id
       FROM organizations o
       JOIN members m ON m.organization_id = o.id
       WHERE COALESCE(o.status, 'active') = 'active'
       ORDER BY CASE WHEN o.id = 'org_demo_righello' THEN 0 ELSE 1 END, o.id
       LIMIT 10`,
    )
    .all()

  return (result.results || []).map((row: any) => String(row.id)).filter(Boolean)
}

async function getAutomationPrincipal(db: any, organizationId: string): Promise<WorkspacePrincipal | null> {
  const row = await db
    .prepare(
      `SELECT id, role, email
       FROM members
       WHERE organization_id = ?
         AND COALESCE(status, 'active') = 'active'
       ORDER BY
         CASE lower(email)
           WHEN 'axel@wearerighello.com' THEN 0
           WHEN 'fleureau.axel@gmail.com' THEN 1
           ELSE 2
         END,
         CASE role
           WHEN 'super-admin' THEN 0
           WHEN 'admin' THEN 1
           WHEN 'direzione' THEN 2
           ELSE 3
         END,
         created_at ASC
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()

  if (!row?.id) return null

  return {
    organizationId,
    memberId: String(row.id),
    role: String(row.role || "admin"),
    email: String(row.email || ""),
  }
}

async function hasOpenSelfImprovementJob(db: any, organizationId: string) {
  const row = await db
    .prepare(
      `SELECT id
       FROM agent_jobs
       WHERE organization_id = ?
         AND status IN ('queued', 'running', 'needs_review')
         AND (
           json_extract(input_json, '$.source') = 'optima-self-improvement-loop'
           OR title LIKE 'Auto-miglioramento Optima%'
           OR title LIKE 'Recovery agentico Optima%'
         )
       ORDER BY datetime(created_at) DESC
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()

  return row?.id ? String(row.id) : null
}

async function runOrganization(db: any, organizationId: string, force: boolean) {
  const principal = await getAutomationPrincipal(db, organizationId)
  if (!principal) {
    return { organizationId, status: "skipped", reason: "no_active_principal" }
  }

  await bootstrapAgenticTenant(db, principal)
  await seedHostedModelRoutes(db, principal)

  const snapshot = await getSelfImprovementSnapshot(db, organizationId, 7)
  const openJobId = await hasOpenSelfImprovementJob(db, organizationId)
  if (openJobId && !force) {
    return {
      organizationId,
      status: "reused",
      jobId: openJobId,
      score: snapshot.score,
      signals: snapshot.signals.length,
    }
  }

  const shouldCreate =
    force ||
    snapshot.signals.length > 0 ||
    snapshot.score < 95 ||
    snapshot.metrics.failedJobs > 0 ||
    snapshot.metrics.staleQueuedJobs > 0

  if (!shouldCreate) {
    return {
      organizationId,
      status: "healthy",
      score: snapshot.score,
      signals: snapshot.signals.length,
    }
  }

  const result = await createSelfImprovementJob(db, principal, snapshot)
  return {
    organizationId,
    status: result.reused ? "reused" : "created",
    jobId: result.job.id,
    score: snapshot.score,
    signals: snapshot.signals.length,
  }
}

export async function GET(request: NextRequest) {
  const auth = isAuthorizedCron(request)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })

    const force = request.nextUrl.searchParams.get("force") === "1"
    const organizations = await listOrganizations(db)
    const results = []
    for (const organizationId of organizations) {
      results.push(await runOrganization(db, organizationId, force))
    }

    return Response.json(
      { generatedAt: new Date().toISOString(), force, organizations: results },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error: any) {
    console.error("Agentic self-improvement cron failed:", error)
    return Response.json(
      { error: error?.message ?? "Errore cron auto-miglioramento agentico." },
      { status: 500 },
    )
  }
}

export const POST = GET
