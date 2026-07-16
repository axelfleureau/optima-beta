export const dynamic = "force-dynamic";

/**
 * Editing leggero (taglia / ritaglia 9:16) dentro Optima, eseguito dal NODO con
 * ffmpeg. Come per l'upload: creiamo PRIMA la riga (una nuova versione), poi il
 * browser lancia il job firmato sul nodo, infine conferma.
 * Una modifica = una nuova versione → rientra nel normale flusso di review.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { signedEditUrl } from "@/lib/video-node";
import { canAccessVideo } from "@/lib/video-review-acl";

const OPS = new Set(["trim", "reframe"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);
  const org = principal.organizationId;

  if (!(await canAccessVideo(db, principal, id))) {
    return Response.json({ error: "Non accessibile" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const op = String(body?.op || "");
  if (!OPS.has(op)) return Response.json({ error: "Operazione non valida" }, { status: 400 });

  const parent: any = await db
    .prepare(`SELECT * FROM vr_videos WHERE id = ? AND organization_id = ? LIMIT 1`)
    .bind(id, org)
    .first();
  if (!parent) return Response.json({ error: "Video non trovato" }, { status: 404 });

  const rootId = parent.parent_video_id ? String(parent.parent_video_id) : String(parent.id);
  const maxRow: any = await db
    .prepare(
      `SELECT MAX(version) AS v FROM vr_videos
        WHERE organization_id = ? AND (id = ? OR parent_video_id = ?)`,
    )
    .bind(org, rootId, rootId)
    .first();
  const nextVersion = Number(maxRow?.v || 1) + 1;

  const src = String(parent.storage_key);
  const baseDir = src.split("/").slice(0, -1).join("/").replace(/\/v\d+$/, "");
  const base = (parent.filename || "video.mp4").replace(/\.[^.]+$/, "");
  const suffix = op === "reframe" ? "9x16" : "taglio";
  const dst = `${baseDir}/v${nextVersion}/${base}_${suffix}.mp4`;

  // Parametri validati per operazione.
  let editParams: Record<string, unknown> = {};
  if (op === "trim") {
    const start = Math.max(0, Number(body?.params?.start) || 0);
    const end = Number(body?.params?.end);
    if (!Number.isFinite(end) || end <= start) {
      return Response.json({ error: "Intervallo non valido" }, { status: 400 });
    }
    editParams = { start, end };
  } else if (op === "reframe") {
    const aspect = String(body?.params?.aspect || "9:16");
    if (!/^\d+:\d+$/.test(aspect)) return Response.json({ error: "Formato non valido" }, { status: 400 });
    editParams = { aspect };
  }

  const editUrl = await signedEditUrl({ src, dst, op, params: editParams });
  if (!editUrl) return Response.json({ error: "Nodo video non configurato" }, { status: 503 });

  const newId = createId("vrvd");
  const now = new Date().toISOString();
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
      `${base}_${suffix}.mp4`,
      dst,
      nextVersion,
      rootId,
      parent.project_id ? String(parent.project_id) : null,
      parent.planned_publish_date || null,
      now,
      now,
    )
    .run();

  return Response.json({ ok: true, videoId: newId, version: nextVersion, editUrl });
}
