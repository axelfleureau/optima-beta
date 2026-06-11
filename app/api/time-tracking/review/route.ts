export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { canManageTime } from "@/lib/time-tracking"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const REVIEW_ACTIONS = new Set(["approved", "changes_requested"])

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    if (!canManageTime(principal)) {
      return Response.json({ error: "Solo responsabili e direzione possono revisionare rapportini" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const workDayId = String(body.workDayId || "")
    const action = String(body.action || "")
    const notes = String(body.notes || "").trim()

    if (!workDayId || !REVIEW_ACTIONS.has(action)) {
      return Response.json({ error: "Richiesta revisione non valida" }, { status: 400 })
    }

    const result = await db
      .prepare(
        `UPDATE work_days
         SET review_status = ?,
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by_member_id = ?,
             review_notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ?
           AND id = ?
           AND review_status = 'submitted'`,
      )
      .bind(action, principal.memberId, notes || null, principal.organizationId, workDayId)
      .run()

    if ((result.meta?.changes ?? 0) < 1) {
      return Response.json({ error: "Rapportino non trovato o gia revisionato" }, { status: 404 })
    }

    return Response.json({ success: true, reviewStatus: action })
  } catch (error) {
    console.error("Time tracking review error:", error)
    return Response.json({ error: "Errore durante la revisione del rapportino" }, { status: 500 })
  }
}
