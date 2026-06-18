export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { canManageTime, normalizeDate, normalizeMinutes } from "@/lib/time-tracking"

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json()
    const isManager = canManageTime(principal)
    const memberId = isManager && body.memberId ? String(body.memberId) : principal.memberId
    const date = normalizeDate(body.date)
    const minutes = normalizeMinutes(body.minutes)
    const note = String(body.note || "").trim()
    let projectId = body.projectId ? String(body.projectId) : null
    const taskId = body.taskId ? String(body.taskId) : null
    let clientId = body.clientId ? String(body.clientId) : null

    if (!note) {
      return Response.json({ error: "Descrivi l'attività svolta" }, { status: 400 })
    }

    const member = await db
      .prepare(`SELECT id FROM members WHERE organization_id = ? AND id = ? LIMIT 1`)
      .bind(principal.organizationId, memberId)
      .first()

    if (!member || (!isManager && memberId !== principal.memberId)) {
      return Response.json({ error: "Dipendente non autorizzato" }, { status: 403 })
    }

    if (taskId) {
      const task = await db
        .prepare(
          `SELECT id, project_id, client_id
           FROM tasks
           WHERE organization_id = ?
             AND id = ?
             AND (? = 1 OR assignee_member_id = ? OR created_by_member_id = ?)
           LIMIT 1`,
        )
        .bind(principal.organizationId, taskId, isManager ? 1 : 0, memberId, memberId)
        .first()

      if (!task) {
        return Response.json({ error: "Task non disponibile per questo dipendente" }, { status: 400 })
      }

      projectId = projectId || String((task as any).project_id || "") || null
      clientId = clientId || String((task as any).client_id || "") || null
    }

    if (projectId) {
      const project = await db
        .prepare(
          `SELECT id, client_id
           FROM projects
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, projectId)
        .first()

      if (!project) {
        return Response.json({ error: "Progetto non disponibile" }, { status: 400 })
      }

      clientId = clientId || String((project as any).client_id || "") || null
    }

    if (clientId) {
      const client = await db
        .prepare(
          `SELECT id
           FROM clients
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, clientId)
        .first()

      if (!client) {
        return Response.json({ error: "Cliente non disponibile" }, { status: 400 })
      }
    }

    const entryId = createId("time")
    await db
      .prepare(
        `INSERT INTO time_entries
         (id, organization_id, member_id, task_id, project_id, client_id, entry_date, minutes, billable, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      )
      .bind(entryId, principal.organizationId, memberId, taskId, projectId, clientId, date, minutes, note)
      .run()

    return Response.json({ success: true, id: entryId }, { status: 201 })
  } catch (error) {
    console.error("Time tracking entry POST error:", error)
    return Response.json({ error: "Errore durante il salvataggio attività" }, { status: 500 })
  }
}
