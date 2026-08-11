export const dynamic = "force-dynamic";

/**
 * Riceve il POSTER (frame a metà video) estratto dal browser e lo salva in R2,
 * poi collega poster_key al video. Serve da anteprima social (og:image) e da
 * copertina nell'app, anche per i video che stanno su R2 (che non passano dal
 * nodo e quindi non hanno una thumbnail).
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) {
    return Response.json(
      { error: "D1 database binding missing" },
      { status: 500 },
    );
  }
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);
  const org = principal.organizationId;

  const video: any = await db
    .prepare(
      `SELECT id FROM vr_videos WHERE id = ? AND organization_id = ? LIMIT 1`,
    )
    .bind(id, org)
    .first();
  if (!video) {
    return Response.json({ error: "Video non trovato" }, { status: 404 });
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 3 * 1024 * 1024) {
    return Response.json({ error: "Poster non valido" }, { status: 400 });
  }

  const bucket = await getTaskMediaBucket();
  if (!bucket) {
    return Response.json({ error: "Storage non configurato" }, { status: 503 });
  }

  const objectKey = `video-review/posters/${org}/${id}.jpg`;
  await bucket.put(objectKey, bytes, {
    httpMetadata: { contentType: "image/jpeg" },
    customMetadata: { organizationId: org, videoId: id },
  });

  await db
    .prepare(
      `UPDATE vr_videos SET poster_key = ?, updated_at = ? WHERE id = ? AND organization_id = ?`,
    )
    .bind(`r2://${objectKey}`, new Date().toISOString(), id, org)
    .run();

  return Response.json({ ok: true, posterKey: `r2://${objectKey}` });
}
