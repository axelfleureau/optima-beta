export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import {
  PRESENCE_GRACE_MINUTES,
  canManageTime,
  currentPresenceMinutes,
  minutesSinceMidnightFromDate,
  netPresenceMinutes,
  normalizeDate,
  timeToMinutes,
  workScheduleForMember,
} from "@/lib/time-tracking"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function formatName(row: any) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "Utente"
}

function getPresenceStatus(row: any) {
  if (row.day_status === "absent") return "absent"
  if (row.day_status === "open" && row.check_in_at) return "present"
  if (row.check_in_at && !row.check_out_at) return "present"
  if (row.check_in_at && row.check_out_at) return "closed"
  return "missing"
}

const CLOSED_TASK_STATES = new Set(["done", "completed", "validation", "archived", "archiviato", "suspended", "sospeso"])

function estimatedTaskMinutes(row: any) {
  const explicit = Number(row.estimated_minutes || 0)
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit)

  switch (String(row.priority || "medium").toLowerCase()) {
    case "urgent":
      return 240
    case "high":
      return 180
    case "low":
      return 45
    default:
      return 90
  }
}

function sortOperationalTasks(a: any, b: any) {
  const priorityWeight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY
  const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY
  if (aDue !== bDue) return aDue - bDue
  return (priorityWeight[String(a.priority || "medium").toLowerCase()] ?? 2) - (priorityWeight[String(b.priority || "medium").toLowerCase()] ?? 2)
}

function monthBounds(date: string) {
  const [yearRaw, monthRaw] = date.split("-").map(Number)
  const year = Number.isInteger(yearRaw) ? yearRaw : new Date().getUTCFullYear()
  const month = Number.isInteger(monthRaw) ? monthRaw : new Date().getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    monthStart: `${year}-${String(month).padStart(2, "0")}-01`,
    monthEnd: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    days: Array.from({ length: lastDay }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`),
  }
}

function calendarKey(memberId: string, date: string) {
  return `${memberId}:${date}`
}

function mapCalendarStatus(day?: any) {
  if (!day) return "missing"
  return getPresenceStatus({
    day_status: day.status,
    check_in_at: day.check_in_at,
    check_out_at: day.check_out_at,
  })
}

function mapCalendarDay({
  date,
  member,
  workDay,
  activity,
  tasks,
}: {
  date: string
  member: any
  workDay?: any
  activity?: any
  tasks?: any
}) {
  const schedule = workScheduleForMember(Number(member.weekly_capacity_minutes || 2400))
  const status = mapCalendarStatus(workDay)
  const activityMinutes = Number(activity?.activity_minutes || 0)
  const entryCount = Number(activity?.entry_count || 0)
  const taskMinutes = Number(tasks?.task_minutes || 0)
  const taskCount = Number(tasks?.task_count || 0)
  const loadMinutes = Math.max(activityMinutes, taskMinutes)
  const checkInMinute = minutesSinceMidnightFromDate(workDay?.check_in_at)
  const checkOutMinute = minutesSinceMidnightFromDate(workDay?.check_out_at)
  const expectedStartMinute = timeToMinutes(schedule.workStartTime)
  const expectedEndMinute = timeToMinutes(schedule.expectedCheckOutTime)
  const minutesLate =
    status !== "absent" && checkInMinute !== null ? Math.max(0, checkInMinute - expectedStartMinute - PRESENCE_GRACE_MINUTES) : 0
  const minutesEarly =
    status === "closed" && checkOutMinute !== null ? Math.max(0, expectedEndMinute - checkOutMinute - PRESENCE_GRACE_MINUTES) : 0
  const loadRatio = schedule.expectedOfficeMinutes > 0 ? loadMinutes / schedule.expectedOfficeMinutes : 0
  const hasWorkSignal = status === "present" || status === "closed" || activityMinutes > 0 || taskCount > 0
  const intensity =
    status === "absent"
      ? 0
      : hasWorkSignal
        ? Math.max(1, Math.min(4, Math.ceil(loadRatio * 4)))
        : 0

  return {
    date,
    status,
    checkInAt: workDay?.check_in_at || null,
    checkOutAt: workDay?.check_out_at || null,
    absenceReason: workDay?.absence_reason || "",
    activityMinutes,
    entryCount,
    taskMinutes,
    taskCount,
    loadMinutes,
    intensity,
    minutesLate,
    minutesEarly,
    signal: minutesLate > 0 ? "late" : minutesEarly > 0 ? "early-exit" : null,
  }
}

function operationalAvailability({
  status,
  plannedSoonMinutes,
  urgentCount,
  dailyCapacityMinutes,
}: {
  status: string
  plannedSoonMinutes: number
  urgentCount: number
  dailyCapacityMinutes: number
}) {
  if (status === "absent") {
    return {
      status: "not-available",
      label: "Non disponibile oggi",
      detail: "Assenza segnata",
    }
  }

  if (status === "missing") {
    return {
      status: "unknown",
      label: "Da verificare",
      detail: "Presenza non ancora segnata",
    }
  }

  if (urgentCount > 0) {
    return {
      status: "protected",
      label: "Presidia urgenze",
      detail: "Carico critico a breve",
    }
  }

  if (plannedSoonMinutes <= 120) {
    return {
      status: "asap",
      label: "Inseribile al più presto",
      detail: "Finestra libera nelle prossime ore",
    }
  }

  if (plannedSoonMinutes <= Math.max(120, dailyCapacityMinutes * 0.65)) {
    return {
      status: "today",
      label: "Inseribile oggi",
      detail: "Carico sostenibile",
    }
  }

  return {
    status: "later",
    label: "Meglio al più tardi",
    detail: "Giornata già carica",
  }
}

function mapOperationalTask(row: any) {
  return {
    id: String(row.id),
    title: String(row.title || "Task senza titolo"),
    clientName: String(row.client_name || ""),
    projectName: String(row.project_name || ""),
    status: String(row.column_id || row.status || "todo"),
    priority: String(row.priority || "medium"),
    dueAt: row.due_at || null,
    estimatedMinutes: estimatedTaskMinutes(row),
  }
}

function mapPresenceRow(row: any, upcomingRows: any[] = []) {
  const weeklyCapacityMinutes = Number(row.weekly_capacity_minutes || 2400)
  const schedule = workScheduleForMember(weeklyCapacityMinutes)
  const activityMinutes = Number(row.activity_minutes || 0)
  const status = getPresenceStatus(row)
  const visibleCheckOutAt = status === "present" ? null : row.check_out_at || null
  const grossPresenceMinutes = currentPresenceMinutes(row.check_in_at, visibleCheckOutAt)
  const presenceMinutes = netPresenceMinutes(grossPresenceMinutes, schedule.lunchBreakMinutes)
  const checkInMinute = minutesSinceMidnightFromDate(row.check_in_at)
  const checkOutMinute = minutesSinceMidnightFromDate(visibleCheckOutAt)
  const expectedStartMinute = timeToMinutes(schedule.workStartTime)
  const expectedEndMinute = timeToMinutes(schedule.expectedCheckOutTime)
  const minutesLate =
    status !== "absent" && checkInMinute !== null ? Math.max(0, checkInMinute - expectedStartMinute - PRESENCE_GRACE_MINUTES) : 0
  const minutesEarly =
    status === "closed" && checkOutMinute !== null ? Math.max(0, expectedEndMinute - checkOutMinute - PRESENCE_GRACE_MINUTES) : 0
  const presenceSignal = minutesLate > 0 ? "late" : minutesEarly > 0 ? "early-exit" : null
  const sortedUpcomingRows = upcomingRows.sort(sortOperationalTasks).slice(0, 3)
  const upcomingTasks = sortedUpcomingRows.map(mapOperationalTask)
  const plannedSoonMinutes = sortedUpcomingRows.reduce((sum, task) => sum + estimatedTaskMinutes(task), 0)
  const urgentCount = sortedUpcomingRows.filter((task) => {
    const priority = String(task.priority || "").toLowerCase()
    const workflowState = String(task.column_id || task.status || "").toLowerCase()
    return priority === "urgent" || workflowState === "urgent"
  }).length

  return {
    id: String(row.id),
    name: formatName(row),
    email: String(row.email || ""),
    role: String(row.role || "junior"),
    status,
    checkInAt: row.check_in_at || null,
    checkOutAt: visibleCheckOutAt,
    absenceReason: row.absence_reason || "",
    notes: row.notes || "",
    grossPresenceMinutes,
    presenceMinutes,
    activityMinutes,
    dailyCapacityMinutes: schedule.dailyCapacityMinutes,
    expectedOfficeMinutes: schedule.expectedOfficeMinutes,
    lunchBreakMinutes: schedule.lunchBreakMinutes,
    workStartTime: schedule.workStartTime,
    expectedCheckOutTime: schedule.expectedCheckOutTime,
    minutesLate,
    minutesEarly,
    presenceSignal,
    coverageRatio: schedule.expectedOfficeMinutes > 0 ? Math.min(1, presenceMinutes / schedule.expectedOfficeMinutes) : 0,
    activityRatio: presenceMinutes > 0 ? Math.min(1, activityMinutes / presenceMinutes) : 0,
    upcomingTasks,
    nextTask: upcomingTasks[0] || null,
    plannedSoonMinutes,
    urgentSoonCount: urgentCount,
    availability: operationalAvailability({
      status,
      plannedSoonMinutes,
      urgentCount,
      dailyCapacityMinutes: schedule.expectedOfficeMinutes,
    }),
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
    const month = monthBounds(date)

    const rows = await db
      .prepare(
        `SELECT m.id,
                m.email,
                m.first_name,
                m.last_name,
                m.role,
                m.weekly_capacity_minutes,
                wd.check_in_at,
                wd.check_out_at,
                wd.status AS day_status,
                wd.absence_reason,
                wd.notes,
                COALESCE(te.activity_minutes, 0) AS activity_minutes
         FROM members m
         LEFT JOIN work_days wd
           ON wd.organization_id = m.organization_id
          AND wd.member_id = m.id
          AND wd.entry_date = ?
         LEFT JOIN (
           SELECT organization_id, member_id, entry_date, SUM(minutes) AS activity_minutes
           FROM time_entries
           WHERE organization_id = ? AND entry_date = ?
           GROUP BY organization_id, member_id, entry_date
         ) te
           ON te.organization_id = m.organization_id
          AND te.member_id = m.id
          AND te.entry_date = ?
         WHERE m.organization_id = ?
           AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
           AND m.role IN ('super-admin', 'admin', 'direzione', 'capo-reparto', 'junior', 'member', 'dipendente', 'employee')
           AND (? = 1 OR m.id = ?)
         ORDER BY
           CASE
             WHEN wd.status = 'absent' THEN 3
             WHEN wd.check_in_at IS NOT NULL AND wd.check_out_at IS NULL THEN 0
             WHEN wd.check_in_at IS NOT NULL AND wd.check_out_at IS NOT NULL THEN 1
             ELSE 2
           END,
           m.first_name,
           m.last_name,
           m.email`,
      )
      .bind(date, principal.organizationId, date, date, principal.organizationId, isManager ? 1 : 0, principal.memberId)
      .all()

    const memberRows = (rows.results || []) as any[]
    const upcomingTasks = await db
      .prepare(
        `SELECT t.id,
                t.assignee_member_id,
                t.title,
                t.client_name,
                t.status,
                t.column_id,
                t.priority,
                t.estimated_minutes,
                t.due_at,
                p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         WHERE t.organization_id = ?
           AND t.assignee_member_id IS NOT NULL
           AND COALESCE(t.assignment_status, 'accepted') = 'accepted'
           AND COALESCE(t.column_id, t.status) NOT IN ('done', 'completed', 'validation', 'archived', 'archiviato', 'suspended', 'sospeso')
           AND (? = 1 OR t.assignee_member_id = ?)
         ORDER BY
           CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,
           date(t.due_at) ASC,
           CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           t.updated_at DESC
         LIMIT 500`,
      )
      .bind(principal.organizationId, isManager ? 1 : 0, principal.memberId)
      .all()

    const tasksByMember = new Map<string, any[]>()
    for (const task of (upcomingTasks.results || []) as any[]) {
      const workflowState = String(task.column_id || task.status || "").toLowerCase()
      if (CLOSED_TASK_STATES.has(workflowState)) continue

      const memberId = String(task.assignee_member_id || "")
      if (!memberId) continue

      tasksByMember.set(memberId, [...(tasksByMember.get(memberId) || []), task])
    }

    const people: ReturnType<typeof mapPresenceRow>[] = memberRows.map((row) => mapPresenceRow(row, tasksByMember.get(String(row.id)) || []))
    const self = people.find((person) => person.id === principal.memberId) || null

    const [workDaysResult, activityDaysResult, taskDaysResult] = await Promise.all([
      db
        .prepare(
          `SELECT member_id,
                  entry_date,
                  status,
                  check_in_at,
                  check_out_at,
                  absence_reason,
                  notes
           FROM work_days
           WHERE organization_id = ?
             AND entry_date >= ?
             AND entry_date <= ?
             AND (? = 1 OR member_id = ?)`,
        )
        .bind(principal.organizationId, month.monthStart, month.monthEnd, isManager ? 1 : 0, principal.memberId)
        .all(),
      db
        .prepare(
          `SELECT member_id,
                  entry_date,
                  SUM(minutes) AS activity_minutes,
                  COUNT(*) AS entry_count
           FROM time_entries
           WHERE organization_id = ?
             AND entry_date >= ?
             AND entry_date <= ?
             AND (? = 1 OR member_id = ?)
           GROUP BY member_id, entry_date`,
        )
        .bind(principal.organizationId, month.monthStart, month.monthEnd, isManager ? 1 : 0, principal.memberId)
        .all(),
      db
        .prepare(
          `SELECT assignee_member_id AS member_id,
                  substr(due_at, 1, 10) AS entry_date,
                  COUNT(*) AS task_count,
                  SUM(CASE
                    WHEN estimated_minutes IS NOT NULL AND estimated_minutes > 0 THEN estimated_minutes
                    WHEN priority = 'urgent' THEN 240
                    WHEN priority = 'high' THEN 180
                    WHEN priority = 'low' THEN 45
                    ELSE 90
                  END) AS task_minutes
           FROM tasks
           WHERE organization_id = ?
             AND assignee_member_id IS NOT NULL
             AND due_at IS NOT NULL
             AND date(due_at) >= date(?)
             AND date(due_at) <= date(?)
             AND COALESCE(assignment_status, 'accepted') = 'accepted'
             AND COALESCE(column_id, status) NOT IN ('done', 'completed', 'validation', 'archived', 'archiviato', 'suspended', 'sospeso')
             AND (? = 1 OR assignee_member_id = ?)
           GROUP BY assignee_member_id, substr(due_at, 1, 10)`,
        )
        .bind(principal.organizationId, month.monthStart, month.monthEnd, isManager ? 1 : 0, principal.memberId)
        .all(),
    ])

    const workDaysByMemberDate = new Map<string, any>()
    for (const day of (workDaysResult.results || []) as any[]) {
      workDaysByMemberDate.set(calendarKey(String(day.member_id), String(day.entry_date)), day)
    }

    const activityByMemberDate = new Map<string, any>()
    for (const day of (activityDaysResult.results || []) as any[]) {
      activityByMemberDate.set(calendarKey(String(day.member_id), String(day.entry_date)), day)
    }

    const tasksByMemberDate = new Map<string, any>()
    for (const day of (taskDaysResult.results || []) as any[]) {
      tasksByMemberDate.set(calendarKey(String(day.member_id), String(day.entry_date)), day)
    }

    const calendarPeople = memberRows.map((member) => ({
      id: String(member.id),
      name: formatName(member),
      email: String(member.email || ""),
      role: String(member.role || "junior"),
      days: month.days.map((day) =>
        mapCalendarDay({
          date: day,
          member,
          workDay: workDaysByMemberDate.get(calendarKey(String(member.id), day)),
          activity: activityByMemberDate.get(calendarKey(String(member.id), day)),
          tasks: tasksByMemberDate.get(calendarKey(String(member.id), day)),
        }),
      ),
    }))

    const summary = people.reduce(
      (acc, person) => {
        acc.total += 1
        acc[person.status as "present" | "closed" | "absent" | "missing"] += 1
        acc.presenceMinutes += person.presenceMinutes
        acc.activityMinutes += person.activityMinutes
        return acc
      },
      {
        total: 0,
        present: 0,
        closed: 0,
        absent: 0,
        missing: 0,
        presenceMinutes: 0,
        activityMinutes: 0,
      },
    )

    return Response.json({
      role: principal.role,
      isManager,
      date,
      generatedAt: new Date().toISOString(),
      self,
      people,
      calendar: {
        monthStart: month.monthStart,
        monthEnd: month.monthEnd,
        days: month.days,
        people: calendarPeople,
      },
      summary,
    })
  } catch (error) {
    console.error("Presence GET error:", error)
    return Response.json({ error: "Errore nel caricamento presenze" }, { status: 500 })
  }
}
