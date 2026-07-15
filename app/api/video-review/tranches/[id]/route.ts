export const dynamic = "force-dynamic";

/**
 * Dettaglio tranche: video con URL BYTE FIRMATI verso il nodo (Mac Studio),
 * marker e assegnazioni. PATCH per aggiornare cliente/videomaker/SMM.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { signedByteUrl } from "@/lib/video-node";

async function principalFor(db: any) {
  const user = await requireClerkUser();
  if (!user) return null;
  return ensureWorkspacePrincipal(db, user);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const principal = await principalFor(db);
  if (!principal) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const t: any = await db
    .prepare(
      `SELECT t.*, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.id = ? AND t.organization_id = ? LIMIT 1`,
    )
    .bind(id, principal.organizationId)
    .first();
  if (!t) return Response.json({ error: "Tranche non trovata" }, { status: 404 });

  const vids = await db
    .prepare(
      `SELECT * FROM vr_videos WHERE tranche_id = ? AND organization_id = ? ORDER BY created_at ASC`,
    )
    .bind(id, principal.organizationId)
    .all();

  const marks = await db
    .prepare(
      `SELECT m.* FROM vr_markers m
         JOIN vr_videos v ON v.id = m.video_id
        WHERE v.tranche_id = ? ORDER BY m.t_seconds ASC`,
    )
    .bind(id)
    .all();

  const markersByVideo: Record<string, any[]> = {};
  for (const m of (marks?.results || []) as any[]) {
    (markersByVideo[String(m.video_id)] ||= []).push({
      id: m.id,
      tSeconds: Number(m.t_seconds),
      note: m.note,
    });
  }

  const videos = await Promise.all(
    ((vids?.results || []) as any[]).map(async (v) => ({
      id: v.id,
      title: v.title,
      filename: v.filename,
      status: v.status,
      fps: v.fps,
      durationSeconds: v.duration_seconds,
      plannedPublishDate: v.planned_publish_date,
      description: v.description,
      published: !!v.published,
      streamUrl: await signedByteUrl(v.approved_key || v.storage_key),
      downloadUrl: await signedByteUrl(v.approved_key || v.storage_key, { download: true }),
      markers: markersByVideo[String(v.id)] || [],
    })),
  );

  return Response.json({
    ok: true,
    tranche: {
      id: t.id,
      title: t.title,
      token: t.token,
      clientId: t.client_id,
      clientName: t.client_name || null,
      videomakerMemberId: t.videomaker_member_id,
      smmMemberId: t.smm_member_id,
    },
    videos,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const principal = await principalFor(db);
  if (!principal) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as any);
  const org = principal.organizationId;

  const sets: string[] = [];
  const vals: any[] = [];
  const memberOrNull = async (v: unknown) => {
    if (!v) return null;
    const m = await db
      .prepare(`SELECT id FROM members WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(String(v), org)
      .first();
    return m ? String(m.id) : null;
  };

  if ("videomakerMemberId" in body) {
    sets.push("videomaker_member_id = ?");
    vals.push(await memberOrNull(body.videomakerMemberId));
  }
  if ("smmMemberId" in body) {
    sets.push("smm_member_id = ?");
    vals.push(await memberOrNull(body.smmMemberId));
  }
  if (!sets.length) return Response.json({ ok: true });

  sets.push("updated_at = ?");
  vals.push(new Date().toISOString(), id, org);
  await db
    .prepare(`UPDATE vr_tranches SET ${sets.join(", ")} WHERE id = ? AND organization_id = ?`)
    .bind(...vals)
    .run();

  return Response.json({ ok: true });
}
