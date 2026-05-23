export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal, mapTaskRow, stringifyJson } from "@/lib/workspace-db"
import { buildMemberDisplayName, requiresAssignmentAcceptance } from "@/lib/task-assignment-policy"
import { notifyTaskChange } from "@/lib/task-email-notifications"

type RouteContext = {
  params: Promise<{ id: string }>
}

const FIELD_MAP: Record<string, string> = {
  title: "title",
  description: "description",
  richDescription: "rich_description",
  priority: "priority",
  type: "type",
  score: "score",
  columnId: "column_id",
  status: "status",
  assignee: "assignee_name",
  assignedUserId: "assignee_member_id",
  clientId: "client_id",
  clientName: "client_name",
  projectId: "project_id",
  parentItemId: "parent_item_id",
}

function serializeField(key: string, value: unknown) {
  if (key === "dueDate") {
    return value ? new Date(value as any).toISOString() : null
  }

  if (key === "tags" || key === "attachments" || key === "comments" || key === "subItems") {
    return stringifyJson(value)
  }

  return value ?? null
}

function dbFieldForKey(key: string) {
  if (key === "dueDate") return "due_at"
  if (key === "tags") return "tags_json"
  if (key === "attachments") return "attachments_json"
  if (key === "comments") return "comments_json"
  if (key === "subItems") return "sub_items_json"
  return FIELD_MAP[key]
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const { id } = await context.params
    const body = await request.json()
    const existingTask = await db
      .prepare(
        `SELECT *
         FROM tasks
         WHERE id = ? AND organization_id = ?
         LIMIT 1`,
      )
      .bind(id, principal.organizationId)
      .first()

    if (!existingTask?.id) {
      return Response.json({ error: "Task non trovata" }, { status: 404 })
    }

    if (body.assignmentAction === "accept" || body.assignmentAction === "reject") {
      if (existingTask.assignee_member_id !== principal.memberId) {
        return Response.json({ error: "Solo l'esecutore può rispondere alla proposta di assegnazione" }, { status: 403 })
      }

      if ((existingTask.assignment_status || "accepted") !== "pending") {
        return Response.json({ error: "Questa assegnazione non è in attesa di approvazione" }, { status: 400 })
      }

      const now = new Date().toISOString()
      const nextStatus = body.assignmentAction === "accept" ? "accepted" : "rejected"
      const rejectionReason =
        body.assignmentAction === "reject" && typeof body.assignmentRejectionReason === "string"
          ? body.assignmentRejectionReason.trim()
          : null

      await db
        .prepare(
          `UPDATE tasks
           SET assignment_status = ?,
               assignment_responded_at = ?,
               assignment_rejection_reason = ?,
               updated_at = ?
           WHERE id = ? AND organization_id = ?`,
        )
        .bind(nextStatus, now, rejectionReason || null, now, id, principal.organizationId)
        .run()

      const row = await db
        .prepare(
          `SELECT t.*, p.name AS project_name
           FROM tasks t
           LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
           WHERE t.id = ? AND t.organization_id = ?`,
        )
        .bind(id, principal.organizationId)
        .first()

      return Response.json({ task: mapTaskRow(row) })
    }

    const assignments: string[] = []
    const values: unknown[] = []

    if ("projectId" in body && body.projectId) {
      const project = await db
        .prepare(
          `SELECT p.id, p.client_id, c.name AS client_name
           FROM projects p
           LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
           WHERE p.organization_id = ? AND p.id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, body.projectId)
        .first()

      if (!project?.id) {
        return Response.json({ error: "Progetto non trovato" }, { status: 404 })
      }

      if (project.client_id) {
        body.clientId = project.client_id
        body.clientName = project.client_name || body.clientName || ""
      }
    }

    if ("assignedUserId" in body) {
      const assignedUserId =
        typeof body.assignedUserId === "string" && body.assignedUserId.trim()
          ? body.assignedUserId.trim()
          : null
      const now = new Date().toISOString()

      if (!assignedUserId) {
        body.assignee = ""
        assignments.push(
          "assignee_member_id = ?",
          "assignee_name = ?",
          "assignment_status = ?",
          "assignment_requested_by_member_id = ?",
          "assignment_requested_at = ?",
          "assignment_responded_at = ?",
          "assignment_rejection_reason = ?",
        )
        values.push(null, "", "accepted", null, null, null, null)
        delete body.assignedUserId
        delete body.assignee
      } else {
        const assignedMember = await db
          .prepare(
            `SELECT id, role, first_name, last_name, email
             FROM members
             WHERE organization_id = ? AND id = ?
             LIMIT 1`,
          )
          .bind(principal.organizationId, assignedUserId)
          .first()

        if (!assignedMember?.id) {
          return Response.json({ error: "Assegnatario non trovato" }, { status: 404 })
        }

        const needsAcceptance = requiresAssignmentAcceptance({
          assignerRole: principal.role,
          assigneeRole: assignedMember.role,
          assignerMemberId: principal.memberId,
          assigneeMemberId: assignedUserId,
        })
        const assigneeName = buildMemberDisplayName(assignedMember)

        assignments.push(
          "assignee_member_id = ?",
          "assignee_name = ?",
          "assignment_status = ?",
          "assignment_requested_by_member_id = ?",
          "assignment_requested_at = ?",
          "assignment_responded_at = ?",
          "assignment_rejection_reason = ?",
        )
        values.push(
          assignedUserId,
          assigneeName,
          needsAcceptance ? "pending" : "accepted",
          principal.memberId,
          now,
          needsAcceptance ? null : now,
          null,
        )
        delete body.assignedUserId
        delete body.assignee
      }
    }

    for (const [key, value] of Object.entries(body)) {
      const dbField = dbFieldForKey(key)
      if (!dbField) continue

      assignments.push(`${dbField} = ?`)
      values.push(serializeField(key, value))

      if (key === "columnId") {
        assignments.push("status = ?")
        values.push(value || "to-do")
      }
    }

    if (assignments.length === 0) {
      return Response.json({ error: "Nessun campo aggiornabile" }, { status: 400 })
    }

    assignments.push("updated_at = ?")
    values.push(new Date().toISOString(), id, principal.organizationId)

    const result = await db
      .prepare(
        `UPDATE tasks
         SET ${assignments.join(", ")}
         WHERE id = ? AND organization_id = ?`,
      )
      .bind(...values)
      .run()

    if (!result.meta?.changes) {
      return Response.json({ error: "Task non trovata" }, { status: 404 })
    }

    const row = await db
      .prepare(
        `SELECT t.*, p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         WHERE t.id = ? AND t.organization_id = ?`,
      )
      .bind(id, principal.organizationId)
      .first()

    await notifyTaskChange({
      db,
      principal,
      actor: user,
      previousTask: existingTask,
      updatedTask: row,
      changes: body,
    }).catch((emailError) => {
      console.error("Task email notification error:", emailError)
    })

    return Response.json({ task: mapTaskRow(row) })
  } catch (error) {
    console.error("Task PATCH error:", error)
    return Response.json({ error: "Errore durante l'aggiornamento della task" }, { status: 500 })
  }
}
