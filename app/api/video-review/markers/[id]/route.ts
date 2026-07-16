export const dynamic = "force-dynamic";

/**
 * Spunta / de-spunta una nota di modifica ("fatto").
 * (La sincronizzazione con i sub-item del task nel Workspace arriva in F3.)
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canAccessVideo } from "@/lib/video-review-acl";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);

  const m: any = await db
    .prepare(`SELECT id, video_id FROM vr_markers WHERE id = ? LIMIT 1`)
    .bind(id)
    .first();
  if (!m) return Response.json({ error: "Nota non trovata" }, { status: 404 });
  if (!(await canAccessVideo(db, principal, String(m.video_id)))) {
    return Response.json({ error: "Non accessibile" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const done = !!body?.done;
  await db
    .prepare(`UPDATE vr_markers SET done = ?, done_at = ?, done_by_member_id = ? WHERE id = ?`)
    .bind(done ? 1 : 0, done ? new Date().toISOString() : null, done ? principal.memberId : null, id)
    .run();

  return Response.json({ ok: true, done });
}
