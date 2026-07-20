export const dynamic = "force-dynamic";

/** Aggiorna un video: descrizione SMM, stato pubblicato, data prevista. */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canAccessVideo } from "@/lib/video-review-acl";

export async function PATCH(
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

  const body = await request.json().catch(() => ({}) as any);
  const now = new Date().toISOString();
  const sets: string[] = [];
  const vals: any[] = [];

  if ("description" in body) {
    sets.push("description = ?");
    vals.push(String(body.description || ""));
  }
  if ("plannedPublishDate" in body) {
    sets.push("planned_publish_date = ?");
    vals.push(body.plannedPublishDate || null);
  }
  // Override del progetto sul singolo video (null = eredita dalla consegna).
  if ("projectId" in body) {
    let pid: string | null = null;
    if (body.projectId) {
      const p = await db
        .prepare(
          `SELECT id FROM projects WHERE id = ? AND organization_id = ? LIMIT 1`,
        )
        .bind(String(body.projectId), principal.organizationId)
        .first();
      pid = p ? String(p.id) : null;
    }
    sets.push("project_id = ?");
    vals.push(pid);
  }
  if ("published" in body) {
    sets.push("published = ?", "published_at = ?");
    vals.push(body.published ? 1 : 0, body.published ? now : null);
  }

  // Conferma di una nuova versione: i byte sono sul nodo, il video entra in
  // attesa di review e salviamo i metadati letti da ffprobe dal nodo stesso.
  if (body?.finalize) {
    sets.push(
      "status = ?",
      "fps = ?",
      "duration_seconds = ?",
      "width = ?",
      "height = ?",
    );
    vals.push(
      "pending",
      body.fps ? Number(body.fps) : null,
      body.durationSeconds ? Number(body.durationSeconds) : null,
      body.width ? Number(body.width) : null,
      body.height ? Number(body.height) : null,
    );
  }

  if (!sets.length) return Response.json({ ok: true });

  sets.push("updated_at = ?");
  vals.push(now, id, principal.organizationId);

  await db
    .prepare(
      `UPDATE vr_videos SET ${sets.join(", ")} WHERE id = ? AND organization_id = ?`,
    )
    .bind(...vals)
    .run();

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
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

  if (!(await canAccessVideo(db, principal, id))) {
    return Response.json({ error: "Video non trovato" }, { status: 404 });
  }

  await db
    .prepare(
      `DELETE FROM vr_videos WHERE id = ? AND organization_id = ? AND status = 'uploading'`,
    )
    .bind(id, principal.organizationId)
    .run();

  return Response.json({ ok: true });
}
