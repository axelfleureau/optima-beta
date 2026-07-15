export const dynamic = "force-dynamic";

/** Aggiorna un video: descrizione SMM, stato pubblicato, data prevista. */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
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
  if ("published" in body) {
    sets.push("published = ?", "published_at = ?");
    vals.push(body.published ? 1 : 0, body.published ? now : null);
  }
  if (!sets.length) return Response.json({ ok: true });

  sets.push("updated_at = ?");
  vals.push(now, id, principal.organizationId);

  await db
    .prepare(`UPDATE vr_videos SET ${sets.join(", ")} WHERE id = ? AND organization_id = ?`)
    .bind(...vals)
    .run();

  return Response.json({ ok: true });
}
