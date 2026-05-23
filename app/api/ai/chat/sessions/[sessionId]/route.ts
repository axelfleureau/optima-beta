export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

type RouteContext = {
  params: Promise<{ sessionId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
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
    const { sessionId } = await context.params
    const session = await db
      .prepare(
        `SELECT id
         FROM chat_sessions
         WHERE id = ? AND organization_id = ? AND member_id = ?`,
      )
      .bind(sessionId, principal.organizationId, principal.memberId)
      .first()

    if (!session) {
      return Response.json({ error: "Conversazione non trovata" }, { status: 404 })
    }

    const result = await db
      .prepare(
        `SELECT id, session_id, member_id, role, content, created_at
         FROM chat_messages
         WHERE session_id = ? AND organization_id = ?
         ORDER BY created_at ASC`,
      )
      .bind(sessionId, principal.organizationId)
      .all()

    return Response.json({
      messages: (result.results || []).map((row: any) => ({
        id: row.id,
        content: row.content || "",
        role: row.role,
        timestamp: row.created_at,
        sessionId: row.session_id,
        userId: row.member_id,
      })),
    })
  } catch (error) {
    console.error("Chat session messages GET error:", error)
    return Response.json({ error: "Errore durante il caricamento dei messaggi chat" }, { status: 500 })
  }
}
