export const dynamic = "force-dynamic";

/**
 * API PUBBLICA della review room cliente: accesso col solo token della tranche.
 * NON richiede Clerk (il middleware è disabilitato: basta non chiamare
 * requireClerkUser). Espone solo i dati di quella tranche.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { signedByteUrl, signedThumbUrl } from "@/lib/video-node";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db)
    return Response.json(
      { error: "Database non disponibile" },
      { status: 500 },
    );

  const t: any = await db
    .prepare(
      `SELECT t.id, t.title, t.post_type, t.organization_id, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!t) return Response.json({ error: "Link non valido" }, { status: 404 });

  // Il cliente vede solo l'ULTIMA versione di ogni video (mai le v precedenti
  // ne quelle in caricamento).
  const vids = await db
    .prepare(
      `SELECT v.* FROM vr_videos v
        WHERE v.tranche_id = ? AND v.status != 'uploading'
          AND NOT EXISTS (
            SELECT 1 FROM vr_videos nv
             WHERE nv.organization_id = v.organization_id
               AND nv.parent_video_id = COALESCE(v.parent_video_id, v.id)
               AND nv.version > v.version
               AND nv.status != 'uploading'
          )
        ORDER BY v.created_at ASC`,
    )
    .bind(String(t.id))
    .all();

  const marks = await db
    .prepare(
      `SELECT m.id, m.video_id, m.t_seconds, m.note FROM vr_markers m
         JOIN vr_videos v ON v.id = m.video_id
        WHERE v.tranche_id = ? ORDER BY m.t_seconds ASC`,
    )
    .bind(String(t.id))
    .all();

  const byVideo: Record<string, any[]> = {};
  for (const m of (marks?.results || []) as any[]) {
    (byVideo[String(m.video_id)] ||= []).push({
      id: m.id,
      tSeconds: Number(m.t_seconds),
      note: m.note,
    });
  }

  const videos = await Promise.all(
    ((vids?.results || []) as any[]).map(async (v) => {
      const mediaType = String(v.media_type || "video");
      const mediaUrl = await signedByteUrl(v.approved_key || v.storage_key);
      return {
        id: v.id,
        title: v.title,
        status: v.status,
        mediaType,
        mimeType: v.mime_type || null,
        fileSize: v.file_size ? Number(v.file_size) : null,
        slideIndex: v.slide_index ? Number(v.slide_index) : null,
        fps: v.fps || 25,
        durationSeconds: v.duration_seconds,
        width: v.width,
        height: v.height,
        plannedPublishDate: v.planned_publish_date,
        streamUrl: mediaType === "video" ? mediaUrl : null,
        imageUrl: mediaType === "image" ? mediaUrl : null,
        thumbUrl:
          mediaType === "image"
            ? mediaUrl
            : await signedThumbUrl(v.approved_key || v.storage_key),
        markers: byVideo[String(v.id)] || [],
      };
    }),
  );

  return Response.json({
    ok: true,
    tranche: {
      title: t.title,
      clientName: t.client_name || null,
      postType: t.post_type || "video",
    },
    videos,
  });
}
