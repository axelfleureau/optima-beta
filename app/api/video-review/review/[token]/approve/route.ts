export const dynamic = "force-dynamic";

/**
 * Il cliente APPROVA un post o un singolo media (rotta pubblica, solo token).
 * Effetto nativo in Optima: stato -> approved + notifica all'SMM assegnato
 * sulla tranche (per nominativo, non per ruolo).
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { createNotification } from "@/lib/notifications-db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db)
    return Response.json(
      { error: "Database non disponibile" },
      { status: 500 },
    );

  const body = await request.json().catch(() => ({}) as any);
  const videoId = String(body?.videoId || body?.mediaId || "");

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

  const videosResult = videoId
    ? await db
        .prepare(
          `SELECT id, title FROM vr_videos WHERE id = ? AND tranche_id = ? LIMIT 1`,
        )
        .bind(videoId, String(t.id))
        .all()
    : await db
        .prepare(
          `SELECT v.id, v.title FROM vr_videos v
            WHERE v.tranche_id = ? AND v.status != 'uploading'
              AND NOT EXISTS (
                SELECT 1 FROM vr_videos nv
                 WHERE nv.organization_id = v.organization_id
                   AND nv.parent_video_id = COALESCE(v.parent_video_id, v.id)
                   AND nv.version > v.version
                   AND nv.status != 'uploading'
              )
            ORDER BY COALESCE(v.slide_index, 9999), v.created_at ASC`,
        )
        .bind(String(t.id))
        .all();
  const videos = (videosResult?.results || []) as any[];
  if (!videos.length) {
    return Response.json({ error: "Media non valido" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const ids = videos.map((v) => String(v.id));
  const placeholders = ids.map(() => "?").join(",");
  await db
    .prepare(
      `UPDATE vr_videos
          SET status='approved', decided_at=?, updated_at=?
        WHERE id IN (${placeholders}) AND tranche_id=?`,
    )
    .bind(now, now, ...ids, String(t.id))
    .run();

  // Notifica nativa all'SMM assegnato (se c'è).
  if (t.smm_member_id) {
    await createNotification(db, {
      organizationId: String(t.organization_id),
      memberId: String(t.smm_member_id),
      actorMemberId: null,
      type: "general",
      title: videoId
        ? "Media approvato dal cliente"
        : "Post approvato dal cliente",
      message: videoId
        ? `"${videos[0].title}"${t.client_name ? ` — ${t.client_name}` : ""} è approvato: pronto per descrizione e pubblicazione.`
        : `"${t.title}"${t.client_name ? ` — ${t.client_name}` : ""} è approvato (${videos.length} media): pronto per descrizione e pubblicazione.`,
      taskId: null,
      metadata: {
        source: "post-review",
        trancheId: String(t.id),
        videoId: videoId || null,
        mediaIds: ids,
      },
    });
  }

  return Response.json({ ok: true, status: "approved", approved: ids.length });
}
