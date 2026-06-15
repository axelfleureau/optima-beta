export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import {
  DEFAULT_LUNCH_BREAK_MINUTES,
  DEFAULT_WORK_DAYS_PER_WEEK,
  hasAutomaticPresence,
  weeklyNetCapacityMinutes,
} from "@/lib/time-tracking"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const DONE_STATUSES = new Set(["done", "completed", "validation"])
const OPERATIVE_ROLES = new Set(["member", "junior", "dipendente", "employee"])
const CLOSED_STATUS_SQL =
  "'done', 'completed', 'validation', 'suspended', 'sospeso', 'recurring', 'ricorrente', 'archived', 'archiviato'"
const DEFAULT_RATE_ADMIN_CENTS = 4500
const DEFAULT_RATE_LEAD_CENTS = 3200
const DEFAULT_RATE_OPERATIVE_CENTS = 2200
const REPORTING_TIME_ZONE = "Europe/Rome"

function openStatusSql(alias = "") {
  const prefix = alias ? `${alias}.` : ""
  return `COALESCE(${prefix}column_id, ${prefix}status) NOT IN (${CLOSED_STATUS_SQL})`
}

function toNumber(value: unknown) {
  return Number(value || 0)
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback
}

function memberName(row: any) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || String(row.email || "Utente")
}

function displayMemberEmail(value: unknown) {
  const email = toText(value)
  if (email.endsWith("@no-email.optima.local")) return ""
  return email
}

function daysUntil(value: unknown) {
  if (typeof value !== "string" || !value) return null
  const due = new Date(`${value.slice(0, 10)}T23:59:59.999Z`).getTime()
  if (!Number.isFinite(due)) return null
  return Math.ceil((due - Date.now()) / 86400000)
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function romeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
  }
}

function currentRomeWeekRange() {
  const parts = romeDateParts()
  const todayUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const weekday = todayUtc.getUTCDay()
  const daysSinceMonday = (weekday + 6) % 7
  const weekStart = new Date(todayUtc)
  weekStart.setUTCDate(todayUtc.getUTCDate() - daysSinceMonday)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)

  return {
    weekStart: formatDateKey(weekStart),
    weekEnd: formatDateKey(weekEnd),
    today: formatDateKey(todayUtc),
  }
}

function estimatedTaskMinutesSql(alias = "t") {
  return `CASE
    WHEN COALESCE(${alias}.estimated_minutes, 0) > 0 THEN ${alias}.estimated_minutes
    WHEN ${alias}.priority = 'high' THEN 180
    WHEN ${alias}.priority = 'low' THEN 45
    ELSE 90
  END`
}

function internalCostRateSql(alias = "m") {
  return `CASE
    WHEN COALESCE(${alias}.hourly_rate_cents, 0) > 0 THEN ${alias}.hourly_rate_cents
    WHEN ${alias}.role IN ('super-admin', 'admin', 'direzione') THEN ${DEFAULT_RATE_ADMIN_CENTS}
    WHEN ${alias}.role IN ('capo-reparto', 'lead', 'manager') THEN ${DEFAULT_RATE_LEAD_CENTS}
    ELSE ${DEFAULT_RATE_OPERATIVE_CENTS}
  END`
}

function utilizationStatus(utilization: number, overdueTasks: number, role: string, hasOperationalData: boolean) {
  if (overdueTasks > 0 && utilization >= 90) return "overload"
  if (utilization > 110) return "overload"
  if (!OPERATIVE_ROLES.has(role)) return "balanced"
  if (!hasOperationalData) return "balanced"
  if (utilization < 35) return "underload"
  return "balanced"
}

function projectHealth(row: any) {
  const overdueTasks = toNumber(row.overdue_tasks)
  const urgentTasks = toNumber(row.urgent_tasks)
  const due = daysUntil(row.due_at)
  const status = String(row.status || "")

  if (DONE_STATUSES.has(status)) return "green"
  if (overdueTasks > 0 || (due !== null && due < 0)) return "red"
  if (urgentTasks > 0 || (due !== null && due <= 7)) return "yellow"
  return "green"
}

export async function GET() {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const organizationId = principal.organizationId
    const { weekStart, weekEnd } = currentRomeWeekRange()

    const [
      summaryRow,
      projectRows,
      memberRows,
      overdueTasks,
      stalledTasks,
      recentActivity,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM projects WHERE organization_id = ?) AS total_projects,
             (SELECT COUNT(*) FROM projects WHERE organization_id = ? AND status IN ('active', 'planned', 'in-progress')) AS active_projects,
             (SELECT COUNT(*) FROM tasks WHERE organization_id = ? AND ${openStatusSql()}) AS open_tasks,
             (SELECT COUNT(*) FROM tasks WHERE organization_id = ? AND ${openStatusSql()} AND due_at IS NOT NULL AND date(due_at) < date('now')) AS overdue_tasks,
             (SELECT COUNT(*) FROM tasks WHERE organization_id = ? AND ${openStatusSql()} AND assignee_member_id IS NULL) AS unassigned_tasks,
             (SELECT COALESCE(SUM(minutes), 0)
                FROM time_entries
               WHERE organization_id = ?
                 AND date(entry_date) BETWEEN date(?) AND date(?)) AS tracked_week_minutes`,
        )
        .bind(organizationId, organizationId, organizationId, organizationId, organizationId, organizationId, weekStart, weekEnd)
        .first(),
      db
        .prepare(
          `SELECT
             p.id,
             p.name,
             p.status,
             p.budget_cents,
             p.starts_at,
             p.due_at,
             p.updated_at,
             c.name AS client_name,
             (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.project_id = p.id) AS tasks_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.project_id = p.id AND COALESCE(t.column_id, t.status) IN ('done', 'completed', 'validation')) AS completed_tasks,
             (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.project_id = p.id AND ${openStatusSql("t")} AND t.due_at IS NOT NULL AND date(t.due_at) < date('now')) AS overdue_tasks,
             (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.project_id = p.id AND ${openStatusSql("t")} AND t.due_at IS NOT NULL AND date(t.due_at) BETWEEN date('now') AND date('now', '+7 days')) AS urgent_tasks,
             (SELECT COALESCE(SUM(te.minutes), 0) FROM time_entries te WHERE te.organization_id = p.organization_id AND te.project_id = p.id) AS tracked_minutes,
             (SELECT COALESCE(SUM(te.minutes * ${internalCostRateSql("m")} / 60), 0)
                FROM time_entries te
                LEFT JOIN members m ON m.id = te.member_id AND m.organization_id = te.organization_id
               WHERE te.organization_id = p.organization_id AND te.project_id = p.id) AS labor_cost_cents,
             (SELECT COALESCE(ROUND(AVG(${internalCostRateSql("m")})), 0)
                FROM time_entries te
                LEFT JOIN members m ON m.id = te.member_id AND m.organization_id = te.organization_id
               WHERE te.organization_id = p.organization_id AND te.project_id = p.id) AS average_hourly_cost_cents,
             (SELECT MAX(t.updated_at) FROM tasks t WHERE t.organization_id = p.organization_id AND t.project_id = p.id) AS last_task_update
           FROM projects p
           LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
           WHERE p.organization_id = ?
           ORDER BY datetime(COALESCE(p.updated_at, p.created_at)) DESC
           LIMIT 12`,
        )
        .bind(organizationId)
        .all(),
      db
        .prepare(
          `SELECT
             m.id,
             m.email,
             m.first_name,
             m.last_name,
             m.role,
             m.hourly_rate_cents,
             m.weekly_capacity_minutes,
             (SELECT COALESCE(SUM(te.minutes), 0)
                FROM time_entries te
               WHERE te.organization_id = m.organization_id
                 AND te.member_id = m.id
                 AND date(te.entry_date) BETWEEN date(?) AND date(?)) AS tracked_week_minutes,
             (SELECT COALESCE(ROUND(SUM(
                       CASE
                         WHEN wd.check_in_at IS NOT NULL AND wd.status != 'absent'
                         THEN CASE
                           WHEN ((julianday(COALESCE(wd.check_out_at, CURRENT_TIMESTAMP)) - julianday(wd.check_in_at)) * 1440) >= 360
                           THEN ((julianday(COALESCE(wd.check_out_at, CURRENT_TIMESTAMP)) - julianday(wd.check_in_at)) * 1440) - ${DEFAULT_LUNCH_BREAK_MINUTES}
                           ELSE (julianday(COALESCE(wd.check_out_at, CURRENT_TIMESTAMP)) - julianday(wd.check_in_at)) * 1440
                         END
                         ELSE 0
                       END
                     )), 0)
                FROM work_days wd
               WHERE wd.organization_id = m.organization_id
                 AND wd.member_id = m.id
                 AND date(wd.entry_date) BETWEEN date(?) AND date(?)) AS presence_week_minutes,
             (SELECT COUNT(*)
                FROM work_days wd
               WHERE wd.organization_id = m.organization_id
                 AND wd.member_id = m.id
                 AND wd.status = 'absent'
                 AND date(wd.entry_date) BETWEEN date(?) AND date(?)) AS absence_week_days,
             (SELECT COALESCE(SUM(${estimatedTaskMinutesSql("t")}), 0)
                FROM tasks t
               WHERE t.organization_id = m.organization_id
                 AND t.assignee_member_id = m.id
                 AND ${openStatusSql("t")}
                 AND t.due_at IS NOT NULL
                 AND date(t.due_at) BETWEEN date(?) AND date(?)) AS planned_week_minutes,
             (SELECT COUNT(*)
                FROM tasks t
               WHERE t.organization_id = m.organization_id
                 AND t.assignee_member_id = m.id
                 AND ${openStatusSql("t")}) AS open_tasks,
             (SELECT COUNT(*)
                FROM tasks t
               WHERE t.organization_id = m.organization_id
                 AND t.assignee_member_id = m.id
                 AND ${openStatusSql("t")}
                 AND t.due_at IS NOT NULL
                 AND date(t.due_at) < date('now')) AS overdue_tasks,
             (SELECT COUNT(*)
                FROM tasks t
               WHERE t.organization_id = m.organization_id
                 AND t.assignee_member_id = m.id
                 AND ${openStatusSql("t")}
                 AND t.due_at IS NOT NULL
                 AND date(t.due_at) BETWEEN date('now') AND date('now', '+3 days')) AS urgent_tasks,
             (SELECT MAX(te.created_at)
                FROM time_entries te
               WHERE te.organization_id = m.organization_id
                 AND te.member_id = m.id) AS last_entry_at
           FROM members m
           WHERE m.organization_id = ?
             AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
             AND NOT (
               COALESCE(m.status, 'active') != 'active'
               AND EXISTS (
                 SELECT 1
                   FROM members active_member
                  WHERE active_member.organization_id = m.organization_id
                    AND active_member.status = 'active'
                    AND lower(COALESCE(active_member.first_name, '')) = lower(COALESCE(m.first_name, ''))
                    AND lower(COALESCE(active_member.last_name, '')) = lower(COALESCE(m.last_name, ''))
                    AND active_member.id != m.id
               )
             )
             AND m.role IN ('super-admin', 'admin', 'direzione', 'capo-reparto', 'junior', 'member', 'dipendente', 'employee')
           ORDER BY
             CASE COALESCE(m.status, 'active')
               WHEN 'active' THEN 0
               WHEN 'invited' THEN 1
               ELSE 2
             END,
             tracked_week_minutes DESC,
             open_tasks DESC,
             m.first_name ASC
           LIMIT 24`,
        )
        .bind(weekStart, weekEnd, weekStart, weekEnd, weekStart, weekEnd, weekStart, weekEnd, organizationId)
        .all(),
      db
        .prepare(
          `SELECT t.id, t.title, t.due_at, t.client_name, t.priority, m.first_name, m.last_name, m.email
           FROM tasks t
           LEFT JOIN members m ON m.id = t.assignee_member_id AND m.organization_id = t.organization_id
           WHERE t.organization_id = ?
             AND ${openStatusSql("t")}
             AND t.due_at IS NOT NULL
             AND date(t.due_at) < date('now')
           ORDER BY date(t.due_at) ASC
           LIMIT 8`,
        )
        .bind(organizationId)
        .all(),
      db
        .prepare(
          `SELECT id, title, client_name, updated_at, due_at
           FROM tasks
           WHERE organization_id = ?
             AND ${openStatusSql()}
             AND datetime(updated_at) < datetime('now', '-14 days')
           ORDER BY datetime(updated_at) ASC
           LIMIT 6`,
        )
        .bind(organizationId)
        .all(),
      db
        .prepare(
          `SELECT te.id, te.entry_date, te.minutes, te.note, p.name AS project_name, t.title AS task_title,
                  m.first_name, m.last_name, m.email
           FROM time_entries te
           LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
           LEFT JOIN tasks t ON t.id = te.task_id AND t.organization_id = te.organization_id
           LEFT JOIN members m ON m.id = te.member_id AND m.organization_id = te.organization_id
           WHERE te.organization_id = ?
           ORDER BY date(te.entry_date) DESC, datetime(te.created_at) DESC
           LIMIT 8`,
        )
        .bind(organizationId)
        .all(),
    ])

    const projects = (projectRows.results || []).map((row: any) => {
      const tasksCount = toNumber(row.tasks_count)
      const completedTasks = toNumber(row.completed_tasks)
      const progress = tasksCount > 0 ? Math.round((completedTasks / tasksCount) * 100) : 0
      const budgetCents = toNumber(row.budget_cents)
      const laborCostCents = toNumber(row.labor_cost_cents)

      return {
        id: String(row.id),
        name: toText(row.name, "Progetto"),
        clientName: row.client_name || null,
        status: toText(row.status, "planned"),
        health: projectHealth(row),
        budget: budgetCents / 100,
        laborCost: laborCostCents / 100,
        averageHourlyCost: toNumber(row.average_hourly_cost_cents) / 100,
        budgetUsage: budgetCents > 0 ? Math.round((laborCostCents / budgetCents) * 100) : 0,
        dueAt: row.due_at || null,
        daysUntilDue: daysUntil(row.due_at),
        tasksCount,
        completedTasks,
        overdueTasks: toNumber(row.overdue_tasks),
        urgentTasks: toNumber(row.urgent_tasks),
        trackedHours: Math.round((toNumber(row.tracked_minutes) / 60) * 10) / 10,
        progress,
        lastActivityAt: row.last_task_update || row.updated_at || null,
      }
    })

    const people = (memberRows.results || []).map((row: any) => {
      const capacity = toNumber(row.weekly_capacity_minutes) || 2400
      const netCapacity = weeklyNetCapacityMinutes(capacity)
      const role = toText(row.role, "member")
      const dailyNetCapacity = netCapacity / DEFAULT_WORK_DAYS_PER_WEEK
      const tracked = toNumber(row.tracked_week_minutes)
      const rawPresence = toNumber(row.presence_week_minutes)
      const assumedPresence = hasAutomaticPresence(role)
        ? Math.max(0, Math.round(netCapacity - Math.min(DEFAULT_WORK_DAYS_PER_WEEK, toNumber(row.absence_week_days)) * dailyNetCapacity))
        : 0
      const presence = hasAutomaticPresence(role) ? Math.max(rawPresence, assumedPresence) : rawPresence
      const planned = toNumber(row.planned_week_minutes)
      const committed = Math.max(tracked, planned)
      const utilization = netCapacity > 0 ? Math.round((committed / netCapacity) * 100) : 0
      const presenceCoverage = netCapacity > 0 ? Math.round((presence / netCapacity) * 100) : 0
      const overdue = toNumber(row.overdue_tasks)
      const hasOperationalData = tracked > 0 || planned > 0 || presence > 0
      return {
        id: String(row.id),
        name: memberName(row),
        email: displayMemberEmail(row.email),
        role,
        weeklyCapacityHours: Math.round((capacity / 60) * 10) / 10,
        netCapacityHours: Math.round((netCapacity / 60) * 10) / 10,
        lunchBreakHours: Math.round(((DEFAULT_LUNCH_BREAK_MINUTES * DEFAULT_WORK_DAYS_PER_WEEK) / 60) * 10) / 10,
        presenceWeekHours: Math.round((presence / 60) * 10) / 10,
        trackedWeekHours: Math.round((tracked / 60) * 10) / 10,
        plannedWeekHours: Math.round((planned / 60) * 10) / 10,
        committedWeekHours: Math.round((committed / 60) * 10) / 10,
        utilizationBasis: "net-capacity",
        presenceCoverage,
        utilization,
        status: utilizationStatus(utilization, overdue, role, hasOperationalData),
        openTasks: toNumber(row.open_tasks),
        urgentTasks: toNumber(row.urgent_tasks),
        overdueTasks: overdue,
        lastEntryAt: row.last_entry_at || null,
      }
    })

    const signals = [
      ...people
        .filter((person: any) => person.status !== "balanced" || person.overdueTasks > 0)
        .slice(0, 6)
        .map((person: any) => ({
          id: `person-${person.id}`,
          type: person.status === "overload" ? "overload" : person.status === "underload" ? "underload" : "delay",
          title:
            person.status === "overload"
              ? "Sovraccarico operativo"
              : person.status === "underload"
                ? "Carico sotto soglia"
                : "Ritardi da presidiare",
          subject: person.name,
          detail: `${person.utilization}% carico sulla capacita netta settimanale (${person.committedWeekHours}h/${person.netCapacityHours}h), ${person.trackedWeekHours}h registrate, ${person.plannedWeekHours}h pianificate, ${person.presenceWeekHours}h presenza netta, ${person.openTasks} task aperti, ${person.overdueTasks} in ritardo`,
          severity: person.status === "overload" || person.overdueTasks > 0 ? "high" : "medium",
        })),
      ...projects
        .filter((project: any) => project.health !== "green")
        .slice(0, 6)
        .map((project: any) => ({
          id: `project-${project.id}`,
          type: "project-risk",
          title: project.health === "red" ? "Progetto a rischio" : "Finestra temporale stretta",
          subject: project.name,
          detail: `${project.overdueTasks} task in ritardo, ${project.urgentTasks} entro 7 giorni, avanzamento ${project.progress}%`,
          severity: project.health === "red" ? "high" : "medium",
        })),
    ].slice(0, 10)

    return Response.json({
      summary: {
        totalProjects: toNumber(summaryRow?.total_projects),
        activeProjects: toNumber(summaryRow?.active_projects),
        openTasks: toNumber(summaryRow?.open_tasks),
        overdueTasks: toNumber(summaryRow?.overdue_tasks),
        unassignedTasks: toNumber(summaryRow?.unassigned_tasks),
        trackedWeekHours: Math.round((toNumber(summaryRow?.tracked_week_minutes) / 60) * 10) / 10,
        atRiskProjects: projects.filter((project: any) => project.health === "red").length,
      },
      projects,
      people,
      overdueTasks: (overdueTasks.results || []).map((task: any) => ({
        id: String(task.id),
        title: toText(task.title, "Task"),
        clientName: task.client_name || null,
        priority: toText(task.priority, "medium"),
        dueAt: task.due_at || null,
        assignee: task.email || task.first_name || task.last_name ? memberName(task) : "Non assegnato",
      })),
      stalledTasks: (stalledTasks.results || []).map((task: any) => ({
        id: String(task.id),
        title: toText(task.title, "Task"),
        clientName: task.client_name || null,
        dueAt: task.due_at || null,
        updatedAt: task.updated_at || null,
      })),
      recentActivity: (recentActivity.results || []).map((entry: any) => ({
        id: String(entry.id),
        date: entry.entry_date,
        minutes: toNumber(entry.minutes),
        note: toText(entry.note),
        projectName: entry.project_name || null,
        taskTitle: entry.task_title || null,
        memberName: memberName(entry),
      })),
      signals,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("Management GET error:", error)
    return Response.json({ error: "Errore nel caricamento del controllo aziendale" }, { status: 500 })
  }
}
