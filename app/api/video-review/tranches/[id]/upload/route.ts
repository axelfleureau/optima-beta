export const dynamic = "force-dynamic";

/**
 * Prepara l'upload di uno o più media NUOVI dentro una consegna, dal browser.
 *
 * Stessa logica del /new-version: creiamo PRIMA la riga (status 'uploading')
 * con la destinazione, poi il browser manda i byte al nodo (Mac Studio) con
 * l'URL firmato, infine conferma con PATCH { finalize: true }. Pre-creare la
 * riga evita la corsa col watcher, che vedendo comparire il file creerebbe un
 * secondo video duplicato.
 *
 * La destinazione è la stessa cartella che il watcher sorveglia, quindi un
 * video caricato da qui finisce esattamente dove finirebbe esportandolo a mano:
 *   da-revisionare/<Cliente>/<Consegna>/<file>
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canAccessTranche } from "@/lib/video-review-acl";
import { signedUploadUrl } from "@/lib/video-node";

/** Nome file sicuro: niente separatori, niente `..`. */
function safeName(name: string, fallback = "media.bin") {
  const clean = String(name || fallback)
    .split(/[\\/]/)
    .pop()!
    .replace(/[^\w .()\-\[\]]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return clean || fallback;
}

/** Segmento di cartella sicuro (cliente/consegna). */
function safeSegment(name: string) {
  return (
    String(name || "")
      .replace(/[\\/]/g, "_")
      .replace(/\.\.+/g, "_")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 80) || "Senza nome"
  );
}

const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|avi|mxf|webm)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

type UploadFile = {
  filename: string;
  fileSize: number;
  contentType: string;
};
type TypedUploadFile = UploadFile & { mediaType: "image" | "video" | null };

function inferMediaType(file: { filename: string; contentType: string }) {
  const contentType = String(file.contentType || "").toLowerCase();
  if (contentType.startsWith("image/") || IMAGE_EXT.test(file.filename)) {
    return "image";
  }
  if (contentType.startsWith("video/") || VIDEO_EXT.test(file.filename)) {
    return "video";
  }
  return null;
}

function normalizeFiles(body: any): UploadFile[] {
  const files = Array.isArray(body?.files)
    ? body.files
    : [
        {
          filename: body?.filename,
          fileSize: body?.fileSize,
          contentType: body?.contentType,
        },
      ];
  return files.map((file: any) => ({
    filename: safeName(file?.filename),
    fileSize: Math.max(0, Number(file?.fileSize || 0)),
    contentType: String(file?.contentType || "application/octet-stream"),
  }));
}

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

  if (!(await canAccessTranche(db, principal, id))) {
    return Response.json({ error: "Consegna non trovata" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const files = normalizeFiles(body);
  if (!files.length || files.length > 20) {
    return Response.json(
      { error: "Selezione file non valida" },
      { status: 400 },
    );
  }
  const typedFiles: TypedUploadFile[] = files.map((file) => ({
    ...file,
    mediaType: inferMediaType(file),
  }));
  if (typedFiles.some((file) => !file.mediaType)) {
    return Response.json({ error: "Formato non supportato" }, { status: 400 });
  }
  const mediaTypes = new Set(typedFiles.map((file) => file.mediaType));
  if (mediaTypes.size > 1) {
    return Response.json(
      {
        error:
          "Caricamento misto non supportato: usa solo immagini oppure un solo video.",
      },
      { status: 400 },
    );
  }
  const mediaType = typedFiles[0].mediaType as "image" | "video";
  if (mediaType === "video" && typedFiles.length !== 1) {
    return Response.json(
      { error: "Carica un solo video alla volta." },
      { status: 400 },
    );
  }

  const tranche: any = await db
    .prepare(
      `SELECT t.*, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.id = ? AND t.organization_id = ? LIMIT 1`,
    )
    .bind(id, org)
    .first();
  if (!tranche) {
    return Response.json({ error: "Consegna non trovata" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const postType =
    mediaType === "video"
      ? "video"
      : typedFiles.length > 1
        ? "carousel"
        : "image";
  const clientDir = safeSegment(tranche.client_name || "Senza cliente");
  const trancheDir = safeSegment(tranche.title);

  const bucket =
    mediaType === "image" ||
    typedFiles.some((file) => file.fileSize >= 90 * 1024 * 1024)
      ? await getTaskMediaBucket()
      : null;
  if (
    (mediaType === "image" ||
      typedFiles.some((file) => file.fileSize >= 90 * 1024 * 1024)) &&
    !bucket
  ) {
    return Response.json(
      { error: "Storage media non configurato" },
      { status: 503 },
    );
  }

  const uploads: Array<{
    ok: true;
    videoId: string;
    mediaId: string;
    mediaType: "image" | "video";
    storageKey: string;
    uploadMode: "r2_multipart" | "node_put";
    uploadUrl: string | null;
    uploadId: string | null;
    partSize: number;
    slideIndex: number | null;
  }> = [];
  for (let index = 0; index < typedFiles.length; index += 1) {
    const file = typedFiles[index];
    const videoId = createId("vrvd");
    const title = file.filename.replace(/\.[^.]+$/, "");
    const useMultipart =
      mediaType === "image" || file.fileSize >= 90 * 1024 * 1024;
    const storageKey = useMultipart
      ? `r2://post-review/${org}/${id}/${videoId}/${file.filename}`
      : `da-revisionare/${clientDir}/${trancheDir}/${file.filename}`;

    let uploadUrl: string | null = null;
    let uploadId: string | null = null;
    if (useMultipart) {
      const multipart = await bucket.createMultipartUpload(
        storageKey.replace(/^r2:\/\//, ""),
        {
          httpMetadata: { contentType: file.contentType },
          customMetadata: {
            organizationId: org,
            trancheId: id,
            videoId,
            uploadedBy: principal.memberId,
            originalName: file.filename,
            mediaType,
          },
        },
      );
      uploadId = multipart.uploadId;
    } else {
      uploadUrl = await signedUploadUrl(storageKey);
      if (!uploadUrl) {
        return Response.json(
          { error: "Nodo video non configurato" },
          { status: 503 },
        );
      }
    }

    await db
      .prepare(
        `INSERT INTO vr_videos
           (id, organization_id, tranche_id, client_id, title, filename, storage_key,
            source, status, version, project_id, media_type, mime_type, file_size, slide_index,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'upload', 'uploading', 1, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        videoId,
        org,
        id,
        tranche.client_id ? String(tranche.client_id) : null,
        title,
        file.filename,
        storageKey,
        tranche.project_id ? String(tranche.project_id) : null,
        mediaType,
        file.contentType,
        file.fileSize,
        mediaType === "image" ? index + 1 : null,
        now,
        now,
      )
      .run();

    uploads.push({
      ok: true,
      videoId,
      mediaId: videoId,
      mediaType,
      storageKey,
      uploadMode: useMultipart ? "r2_multipart" : "node_put",
      uploadUrl,
      uploadId,
      partSize: 8 * 1024 * 1024,
      slideIndex: mediaType === "image" ? index + 1 : null,
    });
  }

  await db
    .prepare(
      `UPDATE vr_tranches
          SET post_type = ?, updated_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(postType, now, id, org)
    .run();

  const first = uploads[0];

  return Response.json({
    ...first,
    ok: true,
    postType,
    uploads,
  });
}
