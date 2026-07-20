export const dynamic = "force-dynamic";

/**
 * Prepara l'upload di un video NUOVO dentro una consegna, dal browser.
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
function safeName(name: string) {
  const clean = String(name || "video.mp4")
    .split(/[\\/]/)
    .pop()!
    .replace(/[^\w .()\-\[\]]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return clean || "video.mp4";
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
  const filename = safeName(body?.filename);
  const fileSize = Number(body?.fileSize || 0);
  const contentType = String(body?.contentType || "video/mp4");
  if (!/\.(mp4|mov|m4v|mkv|avi|mxf|webm)$/i.test(filename)) {
    return Response.json({ error: "Formato non supportato" }, { status: 400 });
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

  const videoId = createId("vrvd");
  const now = new Date().toISOString();
  const title = filename.replace(/\.[^.]+$/, "");
  const useMultipart = fileSize >= 90 * 1024 * 1024;
  const clientDir = safeSegment(tranche.client_name || "Senza cliente");
  const trancheDir = safeSegment(tranche.title);
  const storageKey = useMultipart
    ? `r2://video-review/${org}/da-revisionare/${videoId}/${filename}`
    : `da-revisionare/${clientDir}/${trancheDir}/${filename}`;

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
          trancheId: id,
          videoId,
          uploadedBy: principal.memberId,
          originalName: filename,
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
          source, status, version, project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'upload', 'uploading', 1, ?, ?, ?)`,
    )
    .bind(
      videoId,
      org,
      id,
      tranche.client_id ? String(tranche.client_id) : null,
      title,
      filename,
      storageKey,
      tranche.project_id ? String(tranche.project_id) : null,
      now,
      now,
    )
    .run();

  return Response.json({
    ok: true,
    videoId,
    storageKey,
    uploadMode: useMultipart ? "r2_multipart" : "node_put",
    uploadUrl,
    uploadId,
    partSize: 8 * 1024 * 1024,
  });
}
