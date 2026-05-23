export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { canManageTime, normalizeDate } from "@/lib/time-tracking"

function isoForDateTime(date: string, time?: unknown) {
  if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) {
    return new Date(`${date}T${time}:00`).toISOString()
  }
  return new Date().toISOString()
}

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
    const action = String(body.action || "")

    if (!["check-in", "check-out", "absence", "notes"].includes(action)) {
      return Response.json({ error: "Azione non valida" }, { status: 400 })
    }

    const member = await db
      .prepare(`SELECT id FROM members WHERE organization_id = ? AND id = ? LIMIT 1`)
      .bind(principal.organizationId, memberId)
      .first()

    if (!member || (!isManager && memberId !== principal.memberId)) {
      return Response.json({ error: "Dipendente non autorizzato" }, { status: 403 })
    }

    const existing = await db
      .prepare(
        `SELECT id
         FROM work_days
         WHERE organization_id = ? AND member_id = ? AND entry_date = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId, date)
      .first()

    const id = existing?.id || createId("day")
    const checkInAt = action === "check-in" ? isoForDateTime(date, body.time) : null
    const checkOutAt = action === "check-out" ? isoForDateTime(date, body.time) : null
    const status = action === "absence" ? "absent" : action === "check-out" ? "closed" : "open"
    const absenceReason = action === "absence" ? String(body.reason || "Assenza").trim() : null
    const notes = action === "notes" ? String(body.notes || "").trim() : null

    await db
      .prepare(
        `INSERT INTO work_days
         (id, organization_id, member_id, entry_date, check_in_at, check_out_at, status, absence_reason, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(organization_id, member_id, entry_date)
         DO UPDATE SET
           check_in_at = COALESCE(excluded.check_in_at, check_in_at),
           check_out_at = COALESCE(excluded.check_out_at, check_out_at),
           status = excluded.status,
           absence_reason = COALESCE(excluded.absence_reason, absence_reason),
           notes = COALESCE(excluded.notes, notes),
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(id, principal.organizationId, memberId, date, checkInAt, checkOutAt, status, absenceReason, notes)
      .run()

    return Response.json({ success: true })
  } catch (error) {
    console.error("Time tracking check error:", error)
    return Response.json({ error: "Errore durante l'aggiornamento giornata" }, { status: 500 })
  }
}
