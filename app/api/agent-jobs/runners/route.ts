import { AGENT_ADMIN_ROLES, listAgentRunnerHeartbeats } from "@/lib/agent-jobs"
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
    return { error: "Solo direzione e admin possono vedere i runner.", status: 403 as const }
  }

  return { db }
}

export async function GET() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    try {
      const runners = await listAgentRunnerHeartbeats(auth.db)
      return Response.json({ runners })
    } catch (error) {
      console.warn("Runner heartbeat table unavailable:", error)
      return Response.json({ runners: [], warning: "runner-heartbeats-not-ready" })
    }
  } catch (error) {
    console.error("Error loading agent runners:", error)
    return Response.json({ error: "Errore nel caricamento dei runner." }, { status: 500 })
  }
}
