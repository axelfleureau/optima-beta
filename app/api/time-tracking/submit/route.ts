export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { createId, getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { refreshWorkDayReviewStatus } from "@/lib/time-entry-review";
import {
  canManageTime,
  isPastBusinessDate,
  normalizeDate,
  usesTaskOnlyWorkLog,
} from "@/lib/time-tracking";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getCloudflareDb();
    if (!db)
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );

    const principal = await ensureWorkspacePrincipal(db, user);
    const body = await request.json().catch(() => ({}));
    const isManager = canManageTime(principal);
    const memberId =
      isManager && body.memberId ? String(body.memberId) : principal.memberId;
    const date = normalizeDate(body.date);
    const submittedNotes =
      typeof body.notes === "string" ? body.notes.trim() : null;

    if (!isManager && isPastBusinessDate(date)) {
      return Response.json(
        {
          error:
            "La giornata precedente è chiusa: chiedi a un responsabile di correggerla",
        },
        { status: 403 },
      );
    }

    if (!isManager && memberId !== principal.memberId) {
      return Response.json(
        { error: "Dipendente non autorizzato" },
        { status: 403 },
      );
    }

    const member = await db
      .prepare(
        `SELECT id, role
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId)
      .first();

    if (!member)
      return Response.json(
        { error: "Dipendente non trovato" },
        { status: 404 },
      );

    const taskOnlyWorkLog = usesTaskOnlyWorkLog((member as any).role);
    const existing = await db
      .prepare(
        `SELECT id
         FROM work_days
         WHERE organization_id = ? AND member_id = ? AND entry_date = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId, date)
      .first();

    const workDayId = existing?.id || createId("day");
    if (existing?.id) {
      await db
        .prepare(
          `UPDATE work_days
           SET submitted_at = CURRENT_TIMESTAMP,
               submitted_by_member_id = ?,
               status = CASE WHEN ? = 1 THEN 'closed' ELSE status END,
               check_in_at = CASE WHEN ? = 1 THEN NULL ELSE check_in_at END,
               check_out_at = CASE WHEN ? = 1 THEN NULL ELSE check_out_at END,
               notes = COALESCE(?, notes),
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND member_id = ? AND entry_date = ?`,
        )
        .bind(
          principal.memberId,
          taskOnlyWorkLog ? 1 : 0,
          taskOnlyWorkLog ? 1 : 0,
          taskOnlyWorkLog ? 1 : 0,
          submittedNotes,
          principal.organizationId,
          memberId,
          date,
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO work_days (
             id, organization_id, member_id, entry_date, status,
             review_status, submitted_at, submitted_by_member_id, notes
           )
           VALUES (?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, ?, ?)`,
        )
        .bind(
          workDayId,
          principal.organizationId,
          memberId,
          date,
          taskOnlyWorkLog ? "closed" : "open",
          principal.memberId,
          submittedNotes,
        )
        .run();
    }

    await db
      .prepare(
        `UPDATE time_entries
         SET review_status = 'submitted',
             submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
             submitted_by_member_id = COALESCE(submitted_by_member_id, ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ?
           AND member_id = ?
           AND entry_date = ?
           AND review_status = 'draft'`,
      )
      .bind(principal.memberId, principal.organizationId, memberId, date)
      .run();

    const rollup = await refreshWorkDayReviewStatus(
      db,
      principal.organizationId,
      memberId,
      date,
    );

    return Response.json({
      success: true,
      reviewStatus: rollup.reviewStatus,
      emailSent: false,
    });
  } catch (error) {
    console.error("Time tracking submit error:", error);
    return Response.json(
      { error: "Errore durante il salvataggio del rapportino" },
      { status: 500 },
    );
  }
}
