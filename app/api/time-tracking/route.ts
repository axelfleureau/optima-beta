export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { canManageTime, currentPresenceMinutes, netPresenceMinutes, normalizeDate, workScheduleForMember } from "@/lib/time-tracking"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
}

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
    clientId: row.client_id || null,
    date: row.entry_date,
    minutes: Number(row.minutes || 0),
    note: row.note || "",
    taskTitle: row.task_title || "",
    clientName: row.client_name || "",
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
                COALESCE(c.name, tc.name, pc.name, t.client_name) AS client_name,
                COALESCE(p.name, t.client_name, c.name, tc.name, pc.name) AS project_name
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id AND t.organization_id = te.organization_id
         LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
         LEFT JOIN clients c ON c.id = te.client_id AND c.organization_id = te.organization_id
         LEFT JOIN clients tc ON tc.id = t.client_id AND tc.organization_id = te.organization_id
         LEFT JOIN clients pc ON pc.id = p.client_id AND pc.organization_id = te.organization_id
         WHERE te.organization_id = ?
           AND te.member_id = ?
           AND te.entry_date = ?
         ORDER BY te.created_at DESC`,
      )
      .bind(principal.organizationId, selectedMemberId, date)
      .all()

    const submittedReports = isManager
      ? await db
          .prepare(
            `SELECT wd.id,
                    wd.entry_date,
                    wd.review_status,
                    wd.submitted_at,
                    wd.review_notes,
                    m.id AS member_id,
                    m.email,
                    m.first_name,
                    m.last_name,
                    m.role,
                    COALESCE(te.activity_minutes, 0) AS activity_minutes,
                    COALESCE(te.entry_count, 0) AS entry_count
             FROM work_days wd
             JOIN members m ON m.id = wd.member_id AND m.organization_id = wd.organization_id
             LEFT JOIN (
               SELECT organization_id, member_id, entry_date, SUM(minutes) AS activity_minutes, COUNT(*) AS entry_count
               FROM time_entries
               WHERE organization_id = ? AND entry_date = ?
               GROUP BY organization_id, member_id, entry_date
             ) te
               ON te.organization_id = wd.organization_id
              AND te.member_id = wd.member_id
              AND te.entry_date = wd.entry_date
             WHERE wd.organization_id = ?
               AND wd.entry_date = ?
               AND wd.review_status = 'submitted'
             ORDER BY wd.submitted_at ASC`,
          )
          .bind(principal.organizationId, date, principal.organizationId, date)
          .all()
      : { results: [] }

    const taskOptions = await db
      .prepare(
        `SELECT t.id,
                t.title,
                t.client_id,
                COALESCE(c.name, t.client_name) AS client_name,
                t.project_id,
                t.status,
                t.column_id,
                t.priority,
                t.due_at,
                t.sub_items_json,
                p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         LEFT JOIN clients c ON c.id = t.client_id AND c.organization_id = t.organization_id
         WHERE t.organization_id = ?
           AND (? = 1 OR t.assignee_member_id = ? OR t.created_by_member_id = ?)
         ORDER BY t.updated_at DESC
         LIMIT 200`,
      )
      .bind(principal.organizationId, isManager ? 1 : 0, selectedMemberId, selectedMemberId)
      .all()

    const projectOptions = await db
      .prepare(
        `SELECT p.id, p.name, p.client_id, c.name AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
         WHERE p.organization_id = ?
         ORDER BY p.updated_at DESC
         LIMIT 100`,
      )
      .bind(principal.organizationId)
      .all()

    const clientOptions = await db
      .prepare(
        `SELECT id, name, company
         FROM clients
         WHERE organization_id = ?
           AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         ORDER BY name ASC
         LIMIT 200`,
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
            reviewStatus: day.review_status || "draft",
            submittedAt: day.submitted_at || null,
            reviewedAt: day.reviewed_at || null,
            reviewNotes: day.review_notes || "",
          }
        : null,
      entries: mappedEntries,
      submittedReports: (submittedReports.results || []).map((report: any) => ({
        id: String(report.id),
        date: report.entry_date,
        reviewStatus: report.review_status || "submitted",
        submittedAt: report.submitted_at || null,
        memberId: String(report.member_id),
        memberName: `${report.first_name || ""} ${report.last_name || ""}`.trim() || report.email,
        memberEmail: report.email || "",
        role: report.role || "",
        activityMinutes: Number(report.activity_minutes || 0),
        entryCount: Number(report.entry_count || 0),
        reviewNotes: report.review_notes || "",
      })),
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
          clientId: task.client_id || null,
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
          clientId: project.client_id || null,
          name: project.name || "",
          clientName: project.client_name || "",
        })),
        clients: (clientOptions.results || []).map((client: any) => ({
          id: client.id,
          label: client.company ? `${client.name} · ${client.company}` : client.name,
          name: client.name || "",
          company: client.company || "",
        })),
      },
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error("Time tracking GET error:", error)
    return Response.json({ error: "Errore nel caricamento rapportino" }, { status: 500, headers: NO_STORE_HEADERS })
  }
}
