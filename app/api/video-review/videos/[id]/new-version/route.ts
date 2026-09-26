export const dynamic = "force-dynamic";

/**
 * Prepara una NUOVA VERSIONE di un video (il montato corretto dopo le note).
 *
 * Flusso: qui creiamo PRIMA la riga (status 'uploading') con la destinazione,
 * poi il browser carica i byte su R2 in multipart, infine
 * conferma con PATCH. Pre-creare la riga evita la corsa col watcher del nodo,
 * che vedendo il file nuovo creerebbe un video separato invece della versione.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { VIDEO_MULTIPART_PART_SIZE_BYTES } from "@/lib/video-upload-policy";

/** Nome file sicuro: niente separatori, niente `..`. */
function safeName(name: string) {
  const clean = String(name || "video.mp4")
    .split(/[\\/]/)
    .pop()!
    .replace(/[^\w .()\-\[\]]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return clean || "video.mp4";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db)
    return Response.json(
      { error: "D1 database binding missing" },
      { status: 500 },
    );
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);
  const org = principal.organizationId;

  const body = await request.json().catch(() => ({}) as any);
  const filename = safeName(body?.filename);
  const fileSize = Number(body?.fileSize || 0);
  const contentType = String(body?.contentType || "video/mp4");
  if (!/\.(mp4|mov|m4v|mkv|avi|mxf|webm)$/i.test(filename)) {
    return Response.json({ error: "Formato non supportato" }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return Response.json(
      { error: "File vuoto o illeggibile" },
      { status: 400 },
    );
  }

  const parent: any = await db
    .prepare(
      `SELECT * FROM vr_videos WHERE id = ? AND organization_id = ? LIMIT 1`,
    )
    .bind(id, org)
    .first();
  if (!parent)
    return Response.json({ error: "Video non trovato" }, { status: 404 });

  // La catena delle versioni fa capo al video originale.
  const rootId = parent.parent_video_id
    ? String(parent.parent_video_id)
    : String(parent.id);
  const maxRow: any = await db
    .prepare(
      `SELECT MAX(version) AS v FROM vr_videos
        WHERE organization_id = ? AND (id = ? OR parent_video_id = ?)`,
    )
    .bind(org, rootId, rootId)
    .first();
  const nextVersion = Number(maxRow?.v || 1) + 1;

  // Destinazione: stessa cartella del video originale, sottocartella /vN/.
  const newId = createId("vrvd");
  const now = new Date().toISOString();
  // Ogni nuova versione resta su storage durevole. Il nodo video puo' essere
  // usato per lavorazioni derivate, ma non e' piu' la copia autorevole.
  const storageKey = `r2://post-review/${org}/${String(parent.tranche_id)}/${newId}/${filename}`;

  const bucket = await getTaskMediaBucket();
  if (!bucket)
    return Response.json(
      { error: "Storage video non configurato" },
      { status: 503 },
    );
  const multipart = await bucket.createMultipartUpload(
    storageKey.replace(/^r2:\/\//, ""),
    {
      httpMetadata: { contentType },
      customMetadata: {
        organizationId: org,
        trancheId: String(parent.tranche_id),
        videoId: newId,
        parentVideoId: rootId,
        uploadedBy: principal.memberId,
        originalName: filename,
      },
    },
  );
  const uploadId = multipart.uploadId;

  await db
    .prepare(
      `INSERT INTO vr_videos
         (id, organization_id, tranche_id, client_id, title, filename, storage_key,
          source, status, version, parent_video_id, project_id, planned_publish_date,
          media_type, mime_type, file_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'upload', 'uploading', ?, ?, ?, ?, 'video', ?, ?, ?, ?)`,
    )
    .bind(
      newId,
      org,
      String(parent.tranche_id),
      parent.client_id ? String(parent.client_id) : null,
      parent.title,
      filename,
      storageKey,
      nextVersion,
      rootId,
      parent.project_id ? String(parent.project_id) : null,
      parent.planned_publish_date || null,
      contentType,
      fileSize,
      now,
      now,
    )
    .run();

  return Response.json({
    ok: true,
    videoId: newId,
    version: nextVersion,
    storageKey,
    uploadMode: "r2_multipart",
    uploadUrl: null,
    uploadId,
    partSize: VIDEO_MULTIPART_PART_SIZE_BYTES,
  });
}
