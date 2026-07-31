export const dynamic = "force-dynamic";

/**
 * Attività (time_entries) di un membro raggruppate per GIORNO su un intervallo.
 * Serve la vista "cosa ho fatto" a calendario (settimana/mese): un solo giro,
 * niente una fetch per ogni giorno. Self di default; i manager possono passare
 * ?memberId= per vedere un altro dipendente.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canManageTime, normalizeDate } from "@/lib/time-tracking";

type DayEntry = {
  id: string;
  minutes: number;
  note: string;
  clientName: string | null;
  projectName: string | null;
  taskTitle: string | null;
};

export async function GET(request: NextRequest) {
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getCloudflareDb();
  if (!db) {
    return Response.json(
      { error: "D1 database binding missing" },
      { status: 500 },
    );
  }
  const principal = await ensureWorkspacePrincipal(db, user);
  const isManager = canManageTime(principal);

  const { searchParams } = new URL(request.url);
  const from = normalizeDate(searchParams.get("from"));
  const to = normalizeDate(searchParams.get("to"));
  const requestedMemberId = searchParams.get("memberId");
  const memberId =
    isManager && requestedMemberId ? requestedMemberId : principal.memberId;

  // Guardia: intervallo ragionevole (max ~100 giorni).
  if (from > to) {
    return Response.json({ error: "Intervallo non valido" }, { status: 400 });
  }

  const rows = await db
    .prepare(
      `SELECT te.id, te.entry_date, te.minutes, te.note,
              COALESCE(c.name, tc.name, pc.name, t.client_name) AS client_name,
              p.name AS project_name,
              t.title AS task_title
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id AND t.organization_id = te.organization_id
         LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
         LEFT JOIN clients c ON c.id = te.client_id AND c.organization_id = te.organization_id
         LEFT JOIN clients tc ON tc.id = t.client_id AND tc.organization_id = te.organization_id
         LEFT JOIN clients pc ON pc.id = p.client_id AND pc.organization_id = te.organization_id
        WHERE te.organization_id = ?
          AND te.member_id = ?
          AND date(te.entry_date) BETWEEN date(?) AND date(?)
        ORDER BY te.entry_date ASC, te.created_at ASC`,
    )
    .bind(principal.organizationId, memberId, from, to)
    .all();

  const days: Record<string, { minutes: number; count: number; entries: DayEntry[] }> = {};
  let totalMinutes = 0;
  for (const raw of (rows?.results || []) as any[]) {
    const date = String(raw.entry_date);
    const minutes = Number(raw.minutes || 0);
    totalMinutes += minutes;
    const bucket = days[date] || (days[date] = { minutes: 0, count: 0, entries: [] });
    bucket.minutes += minutes;
    bucket.count += 1;
    bucket.entries.push({
      id: String(raw.id),
      minutes,
      note: String(raw.note || ""),
      clientName: raw.client_name ? String(raw.client_name) : null,
      projectName: raw.project_name ? String(raw.project_name) : null,
      taskTitle: raw.task_title ? String(raw.task_title) : null,
    });
  }

  return Response.json({ ok: true, from, to, memberId, days, totalMinutes });
}
