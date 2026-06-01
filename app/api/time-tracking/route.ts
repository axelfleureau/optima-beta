export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { canManageTime, currentPresenceMinutes, netPresenceMinutes, normalizeDate, workScheduleForMember } from "@/lib/time-tracking"

function rowToMember(row: any) {
  return {
    id: String(row.id),
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email,
    email: row.email,
    role: row.role,
  }
}

function rowToEntry(row: any) {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    projectId: row.project_id || null,
    taskId: row.task_id || null,
    date: row.entry_date,
    minutes: Number(row.minutes || 0),
    note: row.note || "",
    taskTitle: row.task_title || "",
    projectName: row.project_name || row.client_name || "Attività non collegata",
    createdAt: row.created_at,
  }
}

function parseSubItems(value: unknown) {
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          id: String(item.id || ""),
          title: String(item.title || ""),
          completed: Boolean(item.completed),
          createdAt: item.createdAt || null,
        })).filter((item) => item.id && item.title)
      : []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const isManager = canManageTime(principal)
    const { searchParams } = new URL(request.url)
    const date = normalizeDate(searchParams.get("date"))
    const requestedMemberId = searchParams.get("memberId")
    const selectedMemberId = isManager && requestedMemberId ? requestedMemberId : principal.memberId

    const selectedMember = await db
      .prepare(
        `SELECT id, email, first_name, last_name, role
                , weekly_capacity_minutes
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, selectedMemberId)
      .first()

    if (!selectedMember) {
      return Response.json({ error: "Dipendente non trovato" }, { status: 404 })
    }

    const membersResult = isManager
      ? await db
          .prepare(
            `SELECT id, email, first_name, last_name, role
             FROM members
             WHERE organization_id = ?
               AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
               AND role IN ('super-admin', 'admin', 'direzione', 'capo-reparto', 'junior', 'member', 'dipendente', 'employee')
             ORDER BY first_name, last_name, email`,
          )
          .bind(principal.organizationId)
          .all()
      : { results: [selectedMember] }

    const day =
      (await db
        .prepare(
          `SELECT *
           FROM work_days
           WHERE organization_id = ? AND member_id = ? AND entry_date = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, selectedMemberId, date)
        .first()) || null

    const entries = await db
      .prepare(
        `SELECT te.*,
                t.title AS task_title,
                t.client_name AS client_name,
                COALESCE(p.name, t.client_name) AS project_name
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id AND t.organization_id = te.organization_id
         LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
         WHERE te.organization_id = ?
           AND te.member_id = ?
           AND te.entry_date = ?
         ORDER BY te.created_at DESC`,
      )
      .bind(principal.organizationId, selectedMemberId, date)
      .all()

    const taskOptions = await db
      .prepare(
        `SELECT t.id,
                t.title,
                t.client_name,
                t.project_id,
                t.status,
                t.column_id,
                t.priority,
                t.due_at,
                t.sub_items_json,
                p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         WHERE t.organization_id = ?
           AND (? = 1 OR t.assignee_member_id = ?)
         ORDER BY t.updated_at DESC
         LIMIT 200`,
      )
      .bind(principal.organizationId, isManager ? 1 : 0, selectedMemberId)
      .all()

    const projectOptions = await db
      .prepare(
        `SELECT p.id, p.name, c.name AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
         WHERE p.organization_id = ?
         ORDER BY p.updated_at DESC
         LIMIT 100`,
      )
      .bind(principal.organizationId)
      .all()

    const mappedEntries: ReturnType<typeof rowToEntry>[] = (entries.results || []).map(rowToEntry)
    const activityMinutes = mappedEntries.reduce((sum: number, entry: ReturnType<typeof rowToEntry>) => sum + entry.minutes, 0)
    const schedule = workScheduleForMember((selectedMember as any).weekly_capacity_minutes)
    const grossPresenceMinutes = currentPresenceMinutes(day?.check_in_at, day?.check_out_at)
    const presenceMinutes = netPresenceMinutes(grossPresenceMinutes, schedule.lunchBreakMinutes)

    return Response.json({
      role: principal.role,
      isManager,
      selectedMember: rowToMember(selectedMember),
      members: (membersResult.results || []).map(rowToMember),
      day: day
        ? {
            id: day.id,
            date: day.entry_date,
            checkInAt: day.check_in_at,
            checkOutAt: day.check_out_at,
            status: day.status,
            absenceReason: day.absence_reason,
            notes: day.notes || "",
          }
        : null,
      entries: mappedEntries,
      totals: {
        activityMinutes,
        presenceMinutes,
        grossPresenceMinutes,
        expectedOfficeMinutes: schedule.expectedOfficeMinutes,
        lunchBreakMinutes: schedule.lunchBreakMinutes,
      },
      options: {
        tasks: (taskOptions.results || []).map((task: any) => ({
          id: task.id,
          label: `${task.client_name ? `${task.client_name}: ` : ""}${task.title}`,
          projectId: task.project_id || null,
          title: task.title || "",
          clientName: task.client_name || "",
          projectName: task.project_name || "",
          status: task.column_id || task.status || "to-do",
          priority: task.priority || "medium",
          dueAt: task.due_at || null,
          subItems: parseSubItems(task.sub_items_json),
        })),
        projects: (projectOptions.results || []).map((project: any) => ({
          id: project.id,
          label: `${project.client_name ? `${project.client_name}: ` : ""}${project.name}`,
          name: project.name || "",
          clientName: project.client_name || "",
        })),
      },
    })
  } catch (error) {
    console.error("Time tracking GET error:", error)
    return Response.json({ error: "Errore nel caricamento rapportino" }, { status: 500 })
  }
}
