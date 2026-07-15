export const dynamic = "force-dynamic";

/**
 * Tranche del modulo Video Review (consegne di video a un cliente).
 * Ogni tranche ha un link di review pubblico (token) e l'assegnazione
 * PER NOMINATIVO di videomaker e SMM (qualsiasi membro, nessun ruolo fisso).
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { trancheVisibilityClause } from "@/lib/video-review-acl";

function reviewToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function principalFor(db: any) {
  const user = await requireClerkUser();
  if (!user) return null;
  return ensureWorkspacePrincipal(db, user);
}

export async function GET() {
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const principal = await principalFor(db);
  if (!principal) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Vedi solo le tranche in cui sei coinvolto (i manager vedono tutto).
  const vis = trancheVisibilityClause(principal);

  const res = await db
    .prepare(
      `SELECT t.id, t.title, t.token, t.status, t.client_id, t.project_id,
              t.videomaker_member_id, t.smm_member_id, t.created_at,
              c.name AS client_name,
              vm.first_name AS vm_first, vm.last_name AS vm_last, vm.email AS vm_email,
              sm.first_name AS sm_first, sm.last_name AS sm_last, sm.email AS sm_email,
              (SELECT COUNT(*) FROM vr_videos v WHERE v.tranche_id = t.id) AS video_count,
              (SELECT COUNT(*) FROM vr_videos v WHERE v.tranche_id = t.id AND v.status='pending')  AS pending_count,
              (SELECT COUNT(*) FROM vr_videos v WHERE v.tranche_id = t.id AND v.status='revision') AS revision_count,
              (SELECT COUNT(*) FROM vr_videos v WHERE v.tranche_id = t.id AND v.status='approved') AS approved_count
         FROM vr_tranches t
         LEFT JOIN clients c  ON c.id  = t.client_id
         LEFT JOIN members vm ON vm.id = t.videomaker_member_id
         LEFT JOIN members sm ON sm.id = t.smm_member_id
        WHERE t.organization_id = ? AND ${vis.sql}
        ORDER BY t.created_at DESC`,
    )
    .bind(principal.organizationId, ...vis.binds)
    .all();

  const name = (f: any, l: any, e: any) =>
    [f, l].filter(Boolean).join(" ").trim() || String(e || "").split("@")[0] || null;

  const tranches = (res?.results || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    token: t.token,
    status: t.status,
    clientId: t.client_id,
    clientName: t.client_name || null,
    projectId: t.project_id,
    videomaker: t.videomaker_member_id
      ? { id: t.videomaker_member_id, name: name(t.vm_first, t.vm_last, t.vm_email) }
      : null,
    smm: t.smm_member_id ? { id: t.smm_member_id, name: name(t.sm_first, t.sm_last, t.sm_email) } : null,
    counts: {
      total: Number(t.video_count || 0),
      pending: Number(t.pending_count || 0),
      revision: Number(t.revision_count || 0),
      approved: Number(t.approved_count || 0),
    },
    createdAt: t.created_at,
  }));

  return Response.json({ ok: true, tranches });
}

export async function POST(request: NextRequest) {
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const principal = await principalFor(db);
  if (!principal) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  if (!title) return Response.json({ error: "Titolo mancante" }, { status: 400 });

  const org = principal.organizationId;

  // Valida cliente / membri contro l'organizzazione.
  let clientId: string | null = null;
  if (body?.clientId) {
    const c = await db
      .prepare(`SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(String(body.clientId), org)
      .first();
    clientId = c ? String(c.id) : null;
  }
  const memberOrNull = async (id: unknown) => {
    if (!id) return null;
    const m = await db
      .prepare(`SELECT id FROM members WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(String(id), org)
      .first();
    return m ? String(m.id) : null;
  };
  const videomakerId = await memberOrNull(body?.videomakerMemberId);
  const smmId = await memberOrNull(body?.smmMemberId);

  const id = createId("vrtr");
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO vr_tranches
         (id, organization_id, client_id, project_id, title, token,
          videomaker_member_id, smm_member_id, status, created_by_member_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    )
    .bind(
      id,
      org,
      clientId,
      body?.projectId ? String(body.projectId) : null,
      title,
      reviewToken(),
      videomakerId,
      smmId,
      principal.memberId,
      now,
      now,
    )
    .run();

  // Le assegnazioni vivono nei collaboratori (N referenti, non ruoli fissi).
  // Le colonne videomaker_member_id/smm_member_id restano solo per compatibilità.
  const addCollab = (memberId: string, role: string) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO vr_collaborators
           (id, organization_id, scope, scope_id, member_id, role, added_by_member_id)
         VALUES (?, ?, 'tranche', ?, ?, ?, ?)`,
      )
      .bind(createId("vrcol"), org, id, memberId, role, principal.memberId)
      .run();

  if (videomakerId) await addCollab(videomakerId, "videomaker");
  if (smmId) await addCollab(smmId, "smm");

  return Response.json({ ok: true, id });
}
