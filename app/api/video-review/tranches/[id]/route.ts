export const dynamic = "force-dynamic";

/**
 * Dettaglio tranche: video con URL BYTE FIRMATI verso il nodo (Mac Studio),
 * marker e assegnazioni. PATCH per aggiornare metadati, cliente e default.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { signedByteUrl, signedThumbUrl } from "@/lib/video-node";
import {
  canAccessTranche,
  videoVisibilityClause,
} from "@/lib/video-review-acl";

async function principalFor(db: any) {
  const user = await requireClerkUser();
  if (!user) return null;
  return ensureWorkspacePrincipal(db, user);
}

export async function GET(
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
  const principal = await principalFor(db);
  if (!principal)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Non basta esistere: devi essere coinvolto (o essere un manager).
  if (!(await canAccessTranche(db, principal, id))) {
    return Response.json({ error: "Tranche non trovata" }, { status: 404 });
  }

  const t: any = await db
    .prepare(
      `SELECT t.*, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.id = ? AND t.organization_id = ? LIMIT 1`,
    )
    .bind(id, principal.organizationId)
    .first();
  if (!t)
    return Response.json({ error: "Tranche non trovata" }, { status: 404 });

  // Se ti hanno delegato un solo video, vedi solo quello.
  const vvis = videoVisibilityClause(principal);

  // Solo l'ULTIMA versione di ogni catena (v2 sostituisce v1), e mai le righe
  // ancora in caricamento.
  const vids = await db
    .prepare(
      `SELECT v.* FROM vr_videos v
        WHERE v.tranche_id = ? AND v.organization_id = ? AND v.status != 'uploading'
          AND ${vvis.sql}
          AND NOT EXISTS (
            SELECT 1 FROM vr_videos nv
             WHERE nv.organization_id = v.organization_id
               AND nv.parent_video_id = COALESCE(v.parent_video_id, v.id)
               AND nv.version > v.version
               AND nv.status != 'uploading'
          )
        ORDER BY v.created_at ASC`,
    )
    .bind(id, principal.organizationId, ...vvis.binds)
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
      done: !!m.done,
    });
  }

  const videoIds = ((vids?.results || []) as any[]).map((v) => String(v.id));

  // Progetto EFFETTIVO (video override, altrimenti quello della consegna) e
  // delegati per singolo video — servono a card compatte e drawer.
  const projNameById: Record<string, string> = {};
  const collabByVideo: Record<string, any[]> = {};
  if (videoIds.length) {
    const ph = videoIds.map(() => "?").join(",");
    const pr = await db
      .prepare(`SELECT id, name FROM projects WHERE organization_id = ?`)
      .bind(principal.organizationId)
      .all();
    for (const p of (pr?.results || []) as any[])
      projNameById[String(p.id)] = String(p.name);

    const cr = await db
      .prepare(
        `SELECT c.id, c.scope_id, c.role, c.member_id, m.first_name, m.last_name, m.email
           FROM vr_collaborators c JOIN members m ON m.id = c.member_id
          WHERE c.organization_id = ? AND c.scope = 'video' AND c.scope_id IN (${ph})`,
      )
      .bind(principal.organizationId, ...videoIds)
      .all();
    const name = (f: any, l: any, e: any) =>
      [f, l].filter(Boolean).join(" ").trim() ||
      String(e || "").split("@")[0] ||
      null;
    for (const r of (cr?.results || []) as any[]) {
      (collabByVideo[String(r.scope_id)] ||= []).push({
        id: r.id,
        memberId: r.member_id,
        role: r.role,
        name: name(r.first_name, r.last_name, r.email),
      });
    }
  }

  const videos = await Promise.all(
    ((vids?.results || []) as any[]).map(async (v) => {
      const effectiveProjectId = v.project_id || t.project_id || null;
      return {
        id: v.id,
        title: v.title,
        filename: v.filename,
        status: v.status,
        fps: v.fps,
        durationSeconds: v.duration_seconds,
        width: v.width,
        height: v.height,
        version: v.version || 1,
        plannedPublishDate: v.planned_publish_date,
        description: v.description,
        published: !!v.published,
        projectId: v.project_id || null,
        projectName: effectiveProjectId
          ? projNameById[String(effectiveProjectId)] || null
          : null,
        projectInherited: !v.project_id && !!t.project_id,
        streamUrl: await signedByteUrl(v.approved_key || v.storage_key),
        downloadUrl: await signedByteUrl(v.approved_key || v.storage_key, {
          download: true,
        }),
        thumbUrl: await signedThumbUrl(v.approved_key || v.storage_key),
        collaborators: collabByVideo[String(v.id)] || [],
        markers: markersByVideo[String(v.id)] || [],
      };
    }),
  );

  return Response.json({
    ok: true,
    tranche: {
      id: t.id,
      title: t.title,
      token: t.token,
      clientId: t.client_id,
      clientName: t.client_name || null,
      projectId: t.project_id || null,
    },
    videos,
  });
}

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
  const principal = await principalFor(db);
  if (!principal)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as any);
  const org = principal.organizationId;

  const sets: string[] = [];
  const vals: any[] = [];
  const memberOrNull = async (v: unknown) => {
    if (!v) return null;
    const m = await db
      .prepare(
        `SELECT id FROM members WHERE id = ? AND organization_id = ? LIMIT 1`,
      )
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
  if ("title" in body) {
    const title = String(body.title || "").trim();
    if (!title) {
      return Response.json(
        { error: "Nome consegna obbligatorio" },
        { status: 400 },
      );
    }
    sets.push("title = ?");
    vals.push(title.slice(0, 160));
  }
  let shouldSyncVideoClient = false;
  let nextClientId: string | null = null;
  if ("clientId" in body) {
    if (body.clientId) {
      const client = await db
        .prepare(
          `SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`,
        )
        .bind(String(body.clientId), org)
        .first();
      if (!client) {
        return Response.json({ error: "Cliente non trovato" }, { status: 404 });
      }
      nextClientId = String(client.id);
    }
    sets.push("client_id = ?");
    vals.push(nextClientId);
    shouldSyncVideoClient = true;

    const current: any = await db
      .prepare(
        `SELECT t.project_id, p.client_id AS project_client_id
           FROM vr_tranches t
           LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
          WHERE t.id = ? AND t.organization_id = ? LIMIT 1`,
      )
      .bind(id, org)
      .first();
    if (
      current?.project_id &&
      nextClientId &&
      current.project_client_id &&
      String(current.project_client_id) !== nextClientId
    ) {
      sets.push("project_id = ?");
      vals.push(null);
    }
  }
  // Progetto di DEFAULT della consegna: i video lo ereditano ma possono averne
  // uno proprio (nella stessa tranche possono convivere progetti diversi).
  if ("projectId" in body) {
    let pid: string | null = null;
    if (body.projectId) {
      const p = await db
        .prepare(
          `SELECT id FROM projects WHERE id = ? AND organization_id = ? LIMIT 1`,
        )
        .bind(String(body.projectId), org)
        .first();
      pid = p ? String(p.id) : null;
    }
    sets.push("project_id = ?");
    vals.push(pid);
  }
  if (!sets.length) return Response.json({ ok: true });

  sets.push("updated_at = ?");
  vals.push(new Date().toISOString(), id, org);
  await db
    .prepare(
      `UPDATE vr_tranches SET ${sets.join(", ")} WHERE id = ? AND organization_id = ?`,
    )
    .bind(...vals)
    .run();

  if (shouldSyncVideoClient) {
    await db
      .prepare(
        `UPDATE vr_videos
            SET client_id = ?, updated_at = ?
          WHERE tranche_id = ? AND organization_id = ?`,
      )
      .bind(nextClientId, new Date().toISOString(), id, org)
      .run();
  }

  return Response.json({ ok: true });
}
