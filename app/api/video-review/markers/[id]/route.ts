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
  const now = new Date().toISOString();

  await db
    .prepare(`UPDATE vr_markers SET done = ?, done_at = ?, done_by_member_id = ? WHERE id = ?`)
    .bind(done ? 1 : 0, done ? now : null, done ? principal.memberId : null, id)
    .run();

  // Sincronizza il sub-item corrispondente nel TASK del Workspace (stesso id).
  const v: any = await db
    .prepare(`SELECT task_id FROM vr_videos WHERE id = ? LIMIT 1`)
    .bind(String(m.video_id))
    .first();
  if (v?.task_id) {
    const task: any = await db
      .prepare(`SELECT id, sub_items_json FROM tasks WHERE id = ? LIMIT 1`)
      .bind(String(v.task_id))
      .first();
    if (task) {
      let items: any[] = [];
      try {
        items = JSON.parse(task.sub_items_json || "[]");
      } catch {
        items = [];
      }
      let changed = false;
      items = items.map((it) => {
        if (String(it.id) === id && it.completed !== done) {
          changed = true;
          return { ...it, completed: done };
        }
        return it;
      });
      if (changed) {
        await db
          .prepare(`UPDATE tasks SET sub_items_json = ?, updated_at = ? WHERE id = ?`)
          .bind(JSON.stringify(items), now, String(task.id))
          .run();
      }
    }
  }

  return Response.json({ ok: true, done });
}
