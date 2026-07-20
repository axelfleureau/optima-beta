export const dynamic = "force-dynamic";

/**
 * Prepara una NUOVA VERSIONE di un video (il montato corretto dopo le note).
 *
 * Flusso: qui creiamo PRIMA la riga (status 'uploading') con la destinazione,
 * poi il browser carica i byte diretti al nodo con l'URL firmato, infine
 * conferma con PATCH. Pre-creare la riga evita la corsa col watcher del nodo,
 * che vedendo il file nuovo creerebbe un video separato invece della versione.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { signedUploadUrl } from "@/lib/video-node";

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
  const root: any = await db
    .prepare(`SELECT storage_key FROM vr_videos WHERE id = ? LIMIT 1`)
    .bind(rootId)
    .first();

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
  const rootKey = String(root?.storage_key || parent.storage_key);
  const useMultipart =
    fileSize >= 90 * 1024 * 1024 || rootKey.startsWith("r2://");
  const dir = rootKey.startsWith("r2://")
    ? rootKey.split("/").slice(0, -1).join("/")
    : rootKey
        .split("/")
        .slice(0, -1)
        .join("/")
        .replace(/\/v\d+$/, "");
  const storageKey = useMultipart
    ? `r2://video-review/${org}/versions/${newId}/${filename}`
    : `${dir}/v${nextVersion}/${filename}`;

  let uploadUrl: string | null = null;
  let uploadId: string | null = null;
  if (useMultipart) {
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
          videoId: newId,
          parentVideoId: rootId,
          uploadedBy: principal.memberId,
          originalName: filename,
        },
      },
    );
    uploadId = multipart.uploadId;
  } else {
    uploadUrl = await signedUploadUrl(storageKey);
    if (!uploadUrl)
      return Response.json(
        { error: "Nodo video non configurato" },
        { status: 503 },
      );
  }

  await db
    .prepare(
      `INSERT INTO vr_videos
         (id, organization_id, tranche_id, client_id, title, filename, storage_key,
          source, status, version, parent_video_id, project_id, planned_publish_date,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'upload', 'uploading', ?, ?, ?, ?, ?, ?)`,
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
      now,
      now,
    )
    .run();

  return Response.json({
    ok: true,
    videoId: newId,
    version: nextVersion,
    storageKey,
    uploadMode: useMultipart ? "r2_multipart" : "node_put",
    uploadUrl,
    uploadId,
    partSize: 8 * 1024 * 1024,
  });
}
