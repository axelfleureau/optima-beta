export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal, mapTaskRow, stringifyJson } from "@/lib/workspace-db"
import { buildMemberDisplayName, requiresAssignmentAcceptance } from "@/lib/task-assignment-policy"
import { notifyTaskChange } from "@/lib/task-email-notifications"
import { createNotification, notifyMembers } from "@/lib/notifications-db"

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

function parseJsonArray(value: unknown) {
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function actorDisplayName(user: { firstName?: string; lastName?: string; email?: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "Un membro del team"
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

      const requesterMemberId = existingTask.assignment_requested_by_member_id
        ? String(existingTask.assignment_requested_by_member_id)
        : null

      if (requesterMemberId && requesterMemberId !== principal.memberId) {
        await createNotification(db, {
          organizationId: principal.organizationId,
          memberId: requesterMemberId,
          actorMemberId: principal.memberId,
          type: "task_updated",
          title: body.assignmentAction === "accept" ? "Assegnazione accettata" : "Assegnazione rifiutata",
          message:
            body.assignmentAction === "accept"
              ? `${actorDisplayName(user)} ha accettato la task "${existingTask.title}".`
              : `${actorDisplayName(user)} ha rifiutato la task "${existingTask.title}"${
                  rejectionReason ? `: ${rejectionReason}` : "."
                }`,
          taskId: id,
          metadata: {
            taskTitle: existingTask.title,
            assignmentAction: body.assignmentAction,
            rejectionReason,
          },
        }).catch((notificationError) => {
          console.error("Task assignment response notification error:", notificationError)
        })
      }

      return Response.json({ task: mapTaskRow(row) })
    }

    const assignments: string[] = []
    const values: unknown[] = []
    const requestedAssignedUserId =
      "assignedUserId" in body && typeof body.assignedUserId === "string" && body.assignedUserId.trim()
        ? body.assignedUserId.trim()
        : null

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

    const previousComments = parseJsonArray(existingTask.comments_json)
    const currentComments = parseJsonArray(row?.comments_json)
    const commentAdded = "comments" in body && currentComments.length > previousComments.length

    if (requestedAssignedUserId && requestedAssignedUserId !== principal.memberId) {
      await createNotification(db, {
        organizationId: principal.organizationId,
        memberId: requestedAssignedUserId,
        actorMemberId: principal.memberId,
        type: "task_assigned",
        title: row?.assignment_status === "pending" ? "Nuova proposta task" : "Nuova task assegnata",
        message:
          row?.assignment_status === "pending"
            ? `${actorDisplayName(user)} ti ha proposto la task "${row?.title || existingTask.title}".`
            : `${actorDisplayName(user)} ti ha assegnato la task "${row?.title || existingTask.title}".`,
        taskId: id,
        metadata: {
          taskTitle: row?.title || existingTask.title,
          assignmentStatus: row?.assignment_status || "accepted",
        },
      }).catch((notificationError) => {
        console.error("Task reassignment notification error:", notificationError)
      })
    } else {
      await notifyMembers(db, {
        organizationId: principal.organizationId,
        actorMemberId: principal.memberId,
        memberIds: [row?.assignee_member_id, row?.created_by_member_id],
        type: commentAdded ? "comment_added" : "task_updated",
        title: commentAdded ? "Nuovo commento sulla task" : "Task aggiornata",
        message: commentAdded
          ? `${actorDisplayName(user)} ha aggiunto un commento a "${row?.title || existingTask.title}".`
          : `${actorDisplayName(user)} ha aggiornato "${row?.title || existingTask.title}".`,
        taskId: id,
        metadata: {
          taskTitle: row?.title || existingTask.title,
          changedFields: Object.keys(body),
        },
      }).catch((notificationError) => {
        console.error("Task update notification error:", notificationError)
      })
    }

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
