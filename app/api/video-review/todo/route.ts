export const dynamic = "force-dynamic";

/**
 * "Da fare" personale: cosa richiede l'attenzione dell'utente CORRENTE.
 *  - revisioni: video da revisionare dove sei videomaker (consegna o singolo video)
 *  - daPubblicare: approvati non pubblicati dove sei SMM
 *  - inRitardo: tra i tuoi video, data prevista passata e non pubblicato
 * È personale (in base al coinvolgimento), non "tutto ciò che vedi".
 */

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

// Solo l'ultima versione (una v2 sostituisce la v1) e mai le righe in caricamento.
const LATEST = `v.status != 'uploading' AND NOT EXISTS (
  SELECT 1 FROM vr_videos nv WHERE nv.organization_id = v.organization_id
    AND nv.parent_video_id = COALESCE(v.parent_video_id, v.id)
    AND nv.version > v.version AND nv.status != 'uploading')`;

const SELECT = `SELECT v.id, v.title, v.tranche_id, v.status, v.planned_publish_date,
                       v.width, v.height, t.title AS tranche_title, c.name AS client_name
                  FROM vr_videos v
                  JOIN vr_tranches t ON t.id = v.tranche_id
                  LEFT JOIN clients c ON c.id = v.client_id`;

function map(rows: any[]) {
  return rows.map((v) => ({
    id: v.id,
    title: v.title,
    trancheId: v.tranche_id,
    status: v.status,
    plannedPublishDate: v.planned_publish_date,
    trancheTitle: v.tranche_title,
    clientName: v.client_name || null,
  }));
}

export async function GET() {
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);
  const org = principal.organizationId;
  const me = principal.memberId;

  // Sei collaboratore (in un certo ruolo) su questo video o sulla sua consegna?
  const involved = (role?: string) => `EXISTS (
    SELECT 1 FROM vr_collaborators col
     WHERE col.member_id = ? ${role ? "AND col.role = ?" : ""}
       AND ((col.scope = 'video' AND col.scope_id = v.id)
         OR (col.scope = 'tranche' AND col.scope_id = v.tranche_id)))`;

  const revisions = await db
    .prepare(`${SELECT} WHERE v.organization_id = ? AND v.status = 'revision' AND ${LATEST} AND ${involved("videomaker")} ORDER BY v.updated_at DESC`)
    .bind(org, me, "videomaker")
    .all();

  const toPublish = await db
    .prepare(`${SELECT} WHERE v.organization_id = ? AND v.status = 'approved' AND v.published = 0 AND ${LATEST} AND ${involved("smm")} ORDER BY COALESCE(v.planned_publish_date,'9999-12-31') ASC`)
    .bind(org, me, "smm")
    .all();

  const overdue = await db
    .prepare(`${SELECT} WHERE v.organization_id = ? AND v.published = 0 AND v.planned_publish_date IS NOT NULL AND v.planned_publish_date < date('now') AND ${LATEST} AND ${involved()} ORDER BY v.planned_publish_date ASC`)
    .bind(org, me)
    .all();

  return Response.json({
    ok: true,
    revisions: map((revisions?.results || []) as any[]),
    toPublish: map((toPublish?.results || []) as any[]),
    overdue: map((overdue?.results || []) as any[]),
  });
}
