export const dynamic = "force-dynamic";

/**
 * API PUBBLICA della review room cliente: accesso col solo token della tranche.
 * NON richiede Clerk (il middleware è disabilitato: basta non chiamare
 * requireClerkUser). Espone solo i dati di quella tranche.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { signedByteUrl } from "@/lib/video-node";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "Database non disponibile" }, { status: 500 });

  const t: any = await db
    .prepare(
      `SELECT t.id, t.title, t.organization_id, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!t) return Response.json({ error: "Link non valido" }, { status: 404 });

  const vids = await db
    .prepare(`SELECT * FROM vr_videos WHERE tranche_id = ? ORDER BY created_at ASC`)
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
    ((vids?.results || []) as any[]).map(async (v) => ({
      id: v.id,
      title: v.title,
      status: v.status,
      fps: v.fps || 25,
      durationSeconds: v.duration_seconds,
      plannedPublishDate: v.planned_publish_date,
      streamUrl: await signedByteUrl(v.storage_key),
      markers: byVideo[String(v.id)] || [],
    })),
  );

  return Response.json({
    ok: true,
    tranche: { title: t.title, clientName: t.client_name || null },
    videos,
  });
}
