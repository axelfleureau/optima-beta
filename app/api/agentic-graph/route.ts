import { NextRequest } from "next/server"

import {
  createAgenticGraphSession,
  getAgenticGraphNodeDetail,
  getAgenticGraphSnapshot,
  listAgenticGraphNodes,
  seedAgenticReferenceGraph,
  upsertAgenticGraphEdge,
  upsertAgenticGraphNode,
} from "@/lib/agentic-graph"
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
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
    return { error: "Solo direzione e admin possono usare il grafo agentico.", status: 403 as const }
  }

  return { db, principal }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const nodeType = searchParams.get("nodeType") || ""
    const sourceType = searchParams.get("sourceType") || ""
    const nodeId = searchParams.get("nodeId") || ""

    if (nodeId) {
      const detail = await getAgenticGraphNodeDetail(auth.db, auth.principal, nodeId, Number(searchParams.get("limit") || 100))
      if (!detail) return Response.json({ error: "Nodo non trovato." }, { status: 404 })
      return Response.json(detail)
    }

    if (query || nodeType || sourceType) {
      const nodes = await listAgenticGraphNodes(auth.db, auth.principal, {
        query,
        nodeType,
        sourceType,
        limit: Number(searchParams.get("limit") || 50),
      })
      return Response.json({ nodes })
    }

    const snapshot = await getAgenticGraphSnapshot(auth.db, auth.principal)
    return Response.json(snapshot)
  } catch (error) {
    console.error("Error loading agentic graph:", error)
    return Response.json({ error: "Errore nel caricamento del grafo agentico." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "")

    if (action === "seed_references") {
      const snapshot = await seedAgenticReferenceGraph(auth.db, auth.principal)
      return Response.json(snapshot)
    }

    if (action === "upsert_node") {
      const node = await upsertAgenticGraphNode(auth.db, auth.principal, {
        nodeType: String(body.nodeType || ""),
        title: String(body.title || ""),
        summary: body.summary ? String(body.summary) : "",
        sourceType: body.sourceType ? String(body.sourceType) : "manual",
        sourceId: body.sourceId ? String(body.sourceId) : undefined,
        sourceUrl: body.sourceUrl ? String(body.sourceUrl) : null,
        confidence: body.confidence,
        tags: Array.isArray(body.tags) ? body.tags.map((item: unknown) => String(item)) : [],
        properties: body.properties,
      })
      return Response.json({ node })
    }

    if (action === "upsert_edge") {
      const edge = await upsertAgenticGraphEdge(auth.db, auth.principal, {
        fromNodeId: String(body.fromNodeId || ""),
        toNodeId: String(body.toNodeId || ""),
        edgeType: String(body.edgeType || ""),
        confidence: body.confidence,
        weight: Number(body.weight || 1),
        properties: body.properties,
      })
      return Response.json({ edge })
    }

    if (action === "create_session") {
      const session = await createAgenticGraphSession(auth.db, auth.principal, {
        title: String(body.title || ""),
        objective: body.objective ? String(body.objective) : "",
        activeSubagentId: body.activeSubagentId ? String(body.activeSubagentId) : null,
        conversationId: body.conversationId ? String(body.conversationId) : null,
        taskId: body.taskId ? String(body.taskId) : null,
        toolPlan: Array.isArray(body.toolPlan) ? body.toolPlan : [],
        trace: Array.isArray(body.trace) ? body.trace : [],
      })
      return Response.json({ session })
    }

    return Response.json({ error: "Azione grafo non supportata." }, { status: 400 })
  } catch (error: any) {
    console.error("Error updating agentic graph:", error)
    return Response.json(
      { error: error?.message ?? "Errore aggiornamento grafo agentico." },
      { status: 400 },
    )
  }
}
