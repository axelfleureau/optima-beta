export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"
import { canManageTime, isoForBusinessDateTime, minutesBetween, normalizeDate, workScheduleForMember } from "@/lib/time-tracking"

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}

function isoForDateTime(date: string, time?: unknown, fallback = currentTime()) {
  return isoForBusinessDateTime(date, time, fallback)
}

function noStoreJson(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      ...(init.headers || {}),
    },
  })
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

    if (!["check-in", "check-out", "undo-check-out", "absence", "notes"].includes(action)) {
      return noStoreJson({ error: "Azione non valida" }, { status: 400 })
    }

    const member = await db
      .prepare(`SELECT id, weekly_capacity_minutes FROM members WHERE organization_id = ? AND id = ? LIMIT 1`)
      .bind(principal.organizationId, memberId)
      .first()

    if (!member || (!isManager && memberId !== principal.memberId)) {
      return noStoreJson({ error: "Dipendente non autorizzato" }, { status: 403 })
    }

    const existing = await db
      .prepare(
        `SELECT id, check_in_at, check_out_at, status
         FROM work_days
         WHERE organization_id = ? AND member_id = ? AND entry_date = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId, date)
      .first()

    const id = existing?.id || createId("day")

    if (existing?.id) {
      if (action === "check-in") {
        await db
          .prepare(
            `UPDATE work_days
             SET check_in_at = ?,
                 check_out_at = NULL,
                 status = 'open',
                 absence_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
          )
          .bind(isoForDateTime(date, body.time), principal.organizationId, memberId, date)
          .run()
      } else if (action === "check-out") {
        if (!existing.check_in_at) {
          return noStoreJson({ error: "Registra prima l'entrata: l'uscita non può creare una presenza finta" }, { status: 400 })
        }
        const checkOutAt = isoForDateTime(date, body.time)
        if (existing.check_in_at && minutesBetween(String(existing.check_in_at), checkOutAt) <= 0) {
          return noStoreJson({ error: "L'uscita deve essere successiva all'entrata" }, { status: 400 })
        }
        await db
          .prepare(
            `UPDATE work_days
             SET check_out_at = ?,
                 status = 'closed',
                 absence_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
          )
          .bind(checkOutAt, principal.organizationId, memberId, date)
          .run()
      } else if (action === "undo-check-out") {
        if (!existing.check_out_at) {
          return noStoreJson({ error: "Nessun checkout da annullare" }, { status: 400 })
        }
        await db
          .prepare(
            `UPDATE work_days
             SET check_out_at = NULL,
                 status = 'open',
                 absence_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
          )
          .bind(principal.organizationId, memberId, date)
          .run()
      } else if (action === "absence") {
        await db
          .prepare(
            `UPDATE work_days
             SET check_in_at = NULL,
                 check_out_at = NULL,
                 status = 'absent',
                 absence_reason = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
          )
          .bind(String(body.reason || "Assenza").trim(), principal.organizationId, memberId, date)
          .run()
      } else {
        await db
          .prepare(
            `UPDATE work_days
             SET notes = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
          )
          .bind(String(body.notes || "").trim(), principal.organizationId, memberId, date)
          .run()
      }
    } else {
      const schedule = workScheduleForMember((member as any).weekly_capacity_minutes)
      if (action === "undo-check-out") {
        return noStoreJson({ error: "Nessun checkout da annullare" }, { status: 400 })
      }

      if (action === "check-out") {
        return noStoreJson({ error: "Registra prima l'entrata: l'uscita non può creare una presenza finta" }, { status: 400 })
      }

      const checkInAt = action === "check-in" ? isoForDateTime(date, body.time, schedule.workStartTime) : null
      const checkOutAt = null
      const status = action === "absence" ? "absent" : "open"
      const absenceReason = action === "absence" ? String(body.reason || "Assenza").trim() : null
      const notes = action === "notes" ? String(body.notes || "").trim() : null

      if (checkInAt && checkOutAt && minutesBetween(checkInAt, checkOutAt) <= 0) {
        return noStoreJson({ error: "L'uscita deve essere successiva all'entrata" }, { status: 400 })
      }

      await db
        .prepare(
          `INSERT INTO work_days
           (id, organization_id, member_id, entry_date, check_in_at, check_out_at, status, absence_reason, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, principal.organizationId, memberId, date, checkInAt, checkOutAt, status, absenceReason, notes)
        .run()
    }

    return noStoreJson({ success: true })
  } catch (error) {
    console.error("Time tracking check error:", error)
    return noStoreJson({ error: "Errore durante l'aggiornamento giornata" }, { status: 500 })
  }
}
