export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"

import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { sendOperationalReportSummaryEmail } from "@/lib/email"
import { requireClerkUser } from "@/lib/server-clerk"
import {
  canManageTime,
  currentPresenceMinutes,
  netPresenceMinutes,
  normalizeDate,
  workScheduleForMember,
} from "@/lib/time-tracking"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const DIRECTION_ROLES = new Set(["super-admin", "admin", "direzione"])

function formatName(row: any) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "Utente"
}

function formatMinutesLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatTime(value?: string | null) {
  if (!value) return "--:--"
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json().catch(() => ({}))
    const isManager = canManageTime(principal)
    const memberId = isManager && body.memberId ? String(body.memberId) : principal.memberId
    const date = normalizeDate(body.date)
    const submittedNotes = typeof body.notes === "string" ? body.notes.trim() : null

    if (!isManager && memberId !== principal.memberId) {
      return Response.json({ error: "Dipendente non autorizzato" }, { status: 403 })
    }

    const member = await db
      .prepare(
        `SELECT id, email, first_name, last_name, role, weekly_capacity_minutes
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId)
      .first()

    if (!member) return Response.json({ error: "Dipendente non trovato" }, { status: 404 })

    const existing = await db
      .prepare(
        `SELECT *
         FROM work_days
         WHERE organization_id = ? AND member_id = ? AND entry_date = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId, date)
      .first()

    const workDayId = existing?.id || createId("day")
    if (existing?.id) {
      await db
        .prepare(
          `UPDATE work_days
           SET review_status = 'submitted',
               submitted_at = CURRENT_TIMESTAMP,
               submitted_by_member_id = ?,
               notes = COALESCE(?, notes),
               reviewed_at = NULL,
               reviewed_by_member_id = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
        )
        .bind(principal.memberId, submittedNotes, principal.organizationId, memberId, date)
        .run()
    } else {
      await db
        .prepare(
          `INSERT INTO work_days (
             id, organization_id, member_id, entry_date, status,
             review_status, submitted_at, submitted_by_member_id, notes
           )
           VALUES (?, ?, ?, ?, 'open', 'submitted', CURRENT_TIMESTAMP, ?, ?)`,
        )
        .bind(workDayId, principal.organizationId, memberId, date, principal.memberId, submittedNotes)
        .run()
    }

    const day = existing || {
      check_in_at: null,
      check_out_at: null,
      notes: "",
    }
    const emailNotes = submittedNotes ?? String(day.notes || "")

    const entriesResult = await db
      .prepare(
        `SELECT te.minutes,
                te.note,
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
         ORDER BY te.created_at ASC`,
      )
      .bind(principal.organizationId, memberId, date)
      .all()

    const entries = (entriesResult.results || []) as any[]
    const activityMinutes = entries.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0)
    const schedule = workScheduleForMember((member as any).weekly_capacity_minutes)
    const presenceMinutes = netPresenceMinutes(
      currentPresenceMinutes(day.check_in_at, day.check_out_at),
      schedule.lunchBreakMinutes,
    )
    const shouldEmail = !DIRECTION_ROLES.has(String(principal.role || "").toLowerCase())
    let emailSent = false

    if (shouldEmail) {
      emailSent = await sendOperationalReportSummaryEmail({
        memberName: formatName(member),
        memberEmail: String((member as any).email || ""),
        dateLabel: formatDateLabel(date),
        checkInLabel: formatTime(day.check_in_at),
        checkOutLabel: formatTime(day.check_out_at),
        presenceLabel: formatMinutesLabel(presenceMinutes),
        activityLabel: formatMinutesLabel(activityMinutes),
        notes: emailNotes,
        entries: entries.map((entry) => ({
          projectName: entry.project_name || "",
          clientName: entry.client_name || "",
          taskTitle: entry.task_title || "",
          note: entry.note || "",
          minutesLabel: formatMinutesLabel(Number(entry.minutes || 0)),
        })),
      })
    }

    return Response.json({ success: true, reviewStatus: "submitted", emailSent })
  } catch (error) {
    console.error("Time tracking submit error:", error)
    return Response.json({ error: "Errore durante l'invio del rapportino" }, { status: 500 })
  }
}
