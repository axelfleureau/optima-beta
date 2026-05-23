export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function toLimit(value: string | null) {
  const limit = Number(value || 12)
  if (!Number.isFinite(limit)) return 12
  return Math.max(1, Math.min(50, Math.floor(limit)))
}

function toOffset(value: string | null) {
  const offset = Number(value || 0)
  if (!Number.isFinite(offset)) return 0
  return Math.max(0, Math.floor(offset))
}

export async function GET(request: NextRequest) {
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

    if (principal.memberId !== user.id) {
      try {
        await db.batch([
          db
            .prepare(`UPDATE chat_sessions SET member_id = ?, organization_id = ? WHERE member_id = ?`)
            .bind(principal.memberId, principal.organizationId, user.id),
          db
            .prepare(`UPDATE chat_messages SET member_id = ?, organization_id = ? WHERE member_id = ?`)
            .bind(principal.memberId, principal.organizationId, user.id),
        ])
      } catch (error) {
        console.warn("Legacy chat ownership migration skipped:", error)
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = toLimit(searchParams.get("limit"))
    const offset = toOffset(searchParams.get("offset"))

    const result = await db
      .prepare(
        `SELECT
           s.id,
           s.title,
           s.member_id,
           s.last_message,
           s.created_at,
           s.updated_at,
           COUNT(m.id) AS message_count
         FROM chat_sessions s
         LEFT JOIN chat_messages m ON m.session_id = s.id
         WHERE s.organization_id = ? AND s.member_id = ?
         GROUP BY s.id
         ORDER BY s.updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(principal.organizationId, principal.memberId, limit + 1, offset)
      .all()

    const rows = result.results || []
    const visibleRows = rows.slice(0, limit)

    return Response.json({
      sessions: visibleRows.map((row: any) => ({
        id: row.id,
        title: row.title || "Nuova conversazione",
        userId: row.member_id,
        lastMessage: row.last_message || "",
        lastMessageAt: row.updated_at || row.created_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        messageCount: Number(row.message_count || 0),
      })),
      nextOffset: rows.length > limit ? offset + limit : null,
      hasMore: rows.length > limit,
    })
  } catch (error) {
    console.error("Chat sessions GET error:", error)
    return Response.json({ error: "Errore durante il caricamento della cronologia chat" }, { status: 500 })
  }
}
