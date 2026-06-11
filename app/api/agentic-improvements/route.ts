import { NextRequest } from "next/server"

import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import { createSelfImprovementJob, getSelfImprovementSnapshot } from "@/lib/agentic-self-improvement"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono usare l'auto-miglioramento agentico.", status: 403 as const }
  }

  return { db, principal }
}

function parseWindowDays(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("days")
  const days = Number(raw || 7)
  return Number.isFinite(days) ? Math.min(Math.max(Math.round(days), 1), 30) : 7
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const snapshot = await getSelfImprovementSnapshot(
      auth.db,
      auth.principal.organizationId,
      parseWindowDays(request),
    )
    return Response.json(snapshot)
  } catch (error) {
    console.error("Error loading self-improvement snapshot:", error)
    return Response.json({ error: "Errore nel caricamento auto-miglioramento." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const days = Number.isFinite(Number(body.days)) ? Number(body.days) : parseWindowDays(request)
    const snapshot = await getSelfImprovementSnapshot(auth.db, auth.principal.organizationId, days)
    const result = await createSelfImprovementJob(auth.db, auth.principal, snapshot)
    return Response.json({ ...snapshot, job: result.job, reused: result.reused }, { status: result.reused ? 200 : 201 })
  } catch (error: any) {
    console.error("Error creating self-improvement job:", error)
    return Response.json(
      { error: error?.message ?? "Errore nella creazione del job di auto-miglioramento." },
      { status: 400 },
    )
  }
}
