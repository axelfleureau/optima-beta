export const dynamic = "force-dynamic";

/**
 * Il cliente APPROVA un video (rotta pubblica, solo token).
 * Effetto nativo in Optima: stato -> approved + notifica all'SMM assegnato
 * sulla tranche (per nominativo, non per ruolo).
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { createNotification } from "@/lib/notifications-db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "Database non disponibile" }, { status: 500 });

  const body = await request.json().catch(() => ({}) as any);
  const videoId = String(body?.videoId || "");
  if (!videoId) return Response.json({ error: "videoId mancante" }, { status: 400 });

  const t: any = await db
    .prepare(
      `SELECT t.id, t.organization_id, t.smm_member_id, t.title, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!t) return Response.json({ error: "Link non valido" }, { status: 404 });

  const v: any = await db
    .prepare(`SELECT id, title FROM vr_videos WHERE id = ? AND tranche_id = ? LIMIT 1`)
    .bind(videoId, String(t.id))
    .first();
  if (!v) return Response.json({ error: "Video non valido" }, { status: 404 });

  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE vr_videos SET status='approved', decided_at=?, updated_at=? WHERE id=?`)
    .bind(now, now, videoId)
    .run();

  // Notifica nativa all'SMM assegnato (se c'è).
  if (t.smm_member_id) {
    await createNotification(db, {
      organizationId: String(t.organization_id),
      memberId: String(t.smm_member_id),
      actorMemberId: null,
      type: "general",
      title: "Video approvato dal cliente",
      message: `"${v.title}"${t.client_name ? ` — ${t.client_name}` : ""} è approvato: pronto per descrizione e pubblicazione.`,
      taskId: null,
      metadata: { source: "video-review", trancheId: String(t.id), videoId },
    });
  }

  return Response.json({ ok: true, status: "approved" });
}
