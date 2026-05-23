export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { createNotification, parseNotificationMetadata, type NotificationType } from "@/lib/notifications-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const notificationTypes = new Set(["task_assigned", "task_updated", "comment_added", "due_date", "general"])

function normalizeType(value: unknown): NotificationType {
  return typeof value === "string" && notificationTypes.has(value) ? (value as NotificationType) : "general"
}

function mapNotificationRow(row: any) {
  return {
    id: String(row.id),
    userId: String(row.member_id),
    title: String(row.title || ""),
    message: String(row.message || ""),
    type: normalizeType(row.type),
    read: Boolean(row.read_at),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    taskId: row.task_id || undefined,
    metadata: parseNotificationMetadata(row.metadata_json),
  }
}

async function resolveMemberId(db: any, organizationId: string, requestedUserId: unknown, fallbackMemberId: string) {
  if (typeof requestedUserId !== "string" || !requestedUserId.trim()) return fallbackMemberId

  const value = requestedUserId.trim()
  const member = await db
    .prepare(
      `SELECT id
       FROM members
       WHERE organization_id = ?
         AND (id = ? OR clerk_user_id = ? OR lower(email) = lower(?))
       LIMIT 1`,
    )
    .bind(organizationId, value, value, value)
    .first()

  return String(member?.id || fallbackMemberId)
}

export async function GET() {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const result = await db
      .prepare(
        `SELECT id, member_id, title, message, type, read_at, created_at, task_id, metadata_json
         FROM notifications
         WHERE organization_id = ? AND member_id = ?
         ORDER BY created_at DESC
         LIMIT 80`,
      )
      .bind(principal.organizationId, principal.memberId)
      .all()

    return Response.json({ notifications: (result.results || []).map(mapNotificationRow) })
  } catch (error) {
    console.error("Notifications GET error:", error)
    return Response.json({ error: "Errore nel caricamento notifiche" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!title || !message) {
      return Response.json({ error: "Titolo e messaggio sono obbligatori" }, { status: 400 })
    }

    const memberId = await resolveMemberId(db, principal.organizationId, body.userId, principal.memberId)
    const id = await createNotification(db, {
      organizationId: principal.organizationId,
      memberId,
      actorMemberId: principal.memberId,
      title,
      message,
      type: normalizeType(body.type),
      taskId: typeof body.taskId === "string" && body.taskId.trim() ? body.taskId.trim() : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : null,
    })

    return Response.json({ id }, { status: 201 })
  } catch (error) {
    console.error("Notifications POST error:", error)
    return Response.json({ error: "Errore nella creazione della notifica" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json()

    if (body.all) {
      await db
        .prepare(
          `UPDATE notifications
           SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND member_id = ? AND read_at IS NULL`,
        )
        .bind(principal.organizationId, principal.memberId)
        .run()

      return Response.json({ ok: true })
    }

    if (typeof body.id !== "string" || !body.id.trim()) {
      return Response.json({ error: "ID notifica mancante" }, { status: 400 })
    }

    await db
      .prepare(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND organization_id = ? AND member_id = ?`,
      )
      .bind(body.id.trim(), principal.organizationId, principal.memberId)
      .run()

    return Response.json({ ok: true })
  } catch (error) {
    console.error("Notifications PATCH error:", error)
    return Response.json({ error: "Errore nell'aggiornamento notifica" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const id = request.nextUrl.searchParams.get("id")?.trim()
    if (!id) {
      return Response.json({ error: "ID notifica mancante" }, { status: 400 })
    }

    await db
      .prepare(
        `DELETE FROM notifications
         WHERE id = ? AND organization_id = ? AND member_id = ?`,
      )
      .bind(id, principal.organizationId, principal.memberId)
      .run()

    return Response.json({ ok: true })
  } catch (error) {
    console.error("Notifications DELETE error:", error)
    return Response.json({ error: "Errore nell'eliminazione notifica" }, { status: 500 })
  }
}
