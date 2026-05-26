export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { canManageTime, minutesBetween, normalizeDate } from "@/lib/time-tracking"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function formatName(row: any) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "Utente"
}

function currentPresenceMinutes(checkInAt?: string | null, checkOutAt?: string | null) {
  if (!checkInAt) return 0
  if (checkOutAt) return minutesBetween(checkInAt, checkOutAt)

  const startMs = new Date(checkInAt).getTime()
  const nowMs = Date.now()
  if (!Number.isFinite(startMs) || nowMs <= startMs) return 0
  return Math.round((nowMs - startMs) / 60000)
}

function getPresenceStatus(row: any) {
  if (row.day_status === "absent") return "absent"
  if (row.day_status === "open" && row.check_in_at) return "present"
  if (row.check_in_at && !row.check_out_at) return "present"
  if (row.check_in_at && row.check_out_at) return "closed"
  return "missing"
}

function mapPresenceRow(row: any) {
  const weeklyCapacityMinutes = Number(row.weekly_capacity_minutes || 2400)
  const dailyCapacityMinutes = Math.round(weeklyCapacityMinutes / 5)
  const lunchBreakMinutes = 60
  const expectedOfficeMinutes = Math.max(0, dailyCapacityMinutes - lunchBreakMinutes)
  const activityMinutes = Number(row.activity_minutes || 0)
  const status = getPresenceStatus(row)
  const visibleCheckOutAt = status === "present" ? null : row.check_out_at || null
  const presenceMinutes = currentPresenceMinutes(row.check_in_at, visibleCheckOutAt)

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
    presenceMinutes,
    activityMinutes,
    expectedOfficeMinutes,
    lunchBreakMinutes,
    coverageRatio: expectedOfficeMinutes > 0 ? Math.min(1, presenceMinutes / expectedOfficeMinutes) : 0,
    activityRatio: presenceMinutes > 0 ? Math.min(1, activityMinutes / presenceMinutes) : 0,
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
           AND m.status = 'active'
           AND m.role IN ('super-admin', 'admin', 'direzione', 'capo-reparto', 'junior')
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

    const people: ReturnType<typeof mapPresenceRow>[] = ((rows.results || []) as any[]).map(mapPresenceRow)
    const self = people.find((person) => person.id === principal.memberId) || null

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
      summary,
    })
  } catch (error) {
    console.error("Presence GET error:", error)
    return Response.json({ error: "Errore nel caricamento presenze" }, { status: 500 })
  }
}
