export const dynamic = "force-dynamic";

/**
 * Migra un video da R2 (cloud) al NAS (Mac Studio), spostandolo nella struttura
 * corretta Cliente/Progetto/{da-revisionare|approvati}/Consegna. Il NODO scarica
 * dal media-proxy e scrive sul NAS (faststart + probe); poi Optima aggiorna
 * storage_key e cancella l'oggetto R2. Solo manager.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { seesEverything } from "@/lib/video-review-acl";
import {
  signedByteUrl,
  signedMigrateUrl,
  r2VideoObjectKey,
} from "@/lib/video-node";

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
  _request: NextRequest,
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
  if (!seesEverything(principal)) {
    return Response.json({ error: "Permessi insufficienti" }, { status: 403 });
  }
  const org = principal.organizationId;

  const v: any = await db
    .prepare(
      `SELECT v.id, v.filename, v.storage_key, v.status, v.tranche_id,
              t.title AS tranche_title, t.project_id,
              c.name AS client_name, pc.name AS parent_name, pr.name AS project_name
         FROM vr_videos v
         JOIN vr_tranches t ON t.id = v.tranche_id
         LEFT JOIN clients c ON c.id = v.client_id
         LEFT JOIN clients pc ON pc.id = c.parent_client_id
         LEFT JOIN projects pr ON pr.id = t.project_id
        WHERE v.id = ? AND v.organization_id = ? LIMIT 1`,
    )
    .bind(id, org)
    .first();
  if (!v) return Response.json({ error: "Video non trovato" }, { status: 404 });

  const key = String(v.storage_key || "");
  if (!key.startsWith("r2://")) {
    return Response.json(
      { error: "Il video non è su R2 (già migrato?)." },
      { status: 400 },
    );
  }
  if (!v.project_id || !v.project_name) {
    return Response.json(
      {
        error:
          "La consegna non ha un progetto: assegnalo prima di migrare (le cartelle sono per Cliente/Progetto).",
        needsProject: true,
      },
      { status: 400 },
    );
  }

  const stateDir = v.status === "approved" ? "approvati" : "da-revisionare";
  const dst = [
    v.parent_name ? safeSegment(v.parent_name) : null,
    safeSegment(v.client_name || "Senza cliente"),
    safeSegment(v.project_name),
    stateDir,
    safeSegment(v.tranche_title),
    safeSegment(v.filename),
  ]
    .filter(Boolean)
    .join("/");

  const srcUrl = await signedByteUrl(key, { ttlSeconds: 1800 });
  if (!srcUrl) {
    return Response.json({ error: "Sorgente non firmabile" }, { status: 500 });
  }
  const migrateUrl = await signedMigrateUrl({ srcUrl, dst });
  if (!migrateUrl) {
    return Response.json(
      { error: "Nodo video non configurato" },
      { status: 503 },
    );
  }

  const result = await fetch(migrateUrl, { method: "POST" })
    .then((r) => r.json())
    .catch(() => null);
  if (!result?.ok) {
    return Response.json(
      { error: result?.error || "Migrazione al nodo non riuscita" },
      { status: 502 },
    );
  }

  await db
    .prepare(
      `UPDATE vr_videos
          SET storage_key = ?, fps = COALESCE(?, fps),
              duration_seconds = COALESCE(?, duration_seconds),
              width = COALESCE(?, width), height = COALESCE(?, height),
              updated_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(
      dst,
      result.fps ?? null,
      result.durationSeconds ?? null,
      result.width ?? null,
      result.height ?? null,
      new Date().toISOString(),
      id,
      org,
    )
    .run();

  // Ora che il NAS serve i byte, libera R2 (best-effort).
  try {
    const bucket = await getTaskMediaBucket();
    if (bucket) await bucket.delete(r2VideoObjectKey(key));
  } catch {
    /* non blocca: il video vive già sul NAS */
  }

  return Response.json({ ok: true, storageKey: dst });
}
