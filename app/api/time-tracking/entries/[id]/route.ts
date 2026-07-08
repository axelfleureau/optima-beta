export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { refreshWorkDayReviewStatus } from "@/lib/time-entry-review";
import { syncTaskActualMinutesFromEntries } from "@/lib/time-entry-sync";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canManageTime, isPastBusinessDate } from "@/lib/time-tracking";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const entry = await db
      .prepare(
        `SELECT id, member_id, task_id, entry_date, review_status FROM time_entries WHERE organization_id = ? AND id = ? LIMIT 1`,
      )
      .bind(principal.organizationId, id)
      .first();

    if (!entry) {
      return Response.json({ error: "Attività non trovata" }, { status: 404 });
    }

    const isManager = canManageTime(principal);
    if (!isManager && entry.member_id !== principal.memberId) {
      return Response.json({ error: "Non autorizzato" }, { status: 403 });
    }

    if (!isManager && entry.review_status === "approved") {
      return Response.json(
        {
          error:
            "Attività già approvata: chiedi una correzione a un responsabile",
        },
        { status: 403 },
      );
    }

    if (!isManager && isPastBusinessDate(entry.entry_date)) {
      return Response.json(
        {
          error:
            "La giornata precedente è chiusa: chiedi a un responsabile di correggerla",
        },
        { status: 403 },
      );
    }

    await db
      .prepare(`DELETE FROM time_entries WHERE organization_id = ? AND id = ?`)
      .bind(principal.organizationId, id)
      .run();
    if (entry.task_id) {
      await syncTaskActualMinutesFromEntries(
        db,
        principal.organizationId,
        String(entry.task_id),
      );
    }
    await refreshWorkDayReviewStatus(
      db,
      principal.organizationId,
      String(entry.member_id),
      String(entry.entry_date),
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Time tracking entry DELETE error:", error);
    return Response.json(
      { error: "Errore durante la rimozione attività" },
      { status: 500 },
    );
  }
}
