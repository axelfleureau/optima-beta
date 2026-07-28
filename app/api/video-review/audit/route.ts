export const dynamic = "force-dynamic";

/**
 * Diagnosi della struttura Post Review: trova ciò che rende il sistema disordinato
 * e proponibile-da-sistemare. Deterministica (query D1); è la base su cui poi si
 * innesta l'analisi AI. Solo per chi vede tutto (manager/direzione).
 */

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { seesEverything } from "@/lib/video-review-acl";

export async function GET() {
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

  // 1) Consegne senza progetto: bloccano i nuovi upload (progetto obbligatorio).
  const noProject = await db
    .prepare(
      `SELECT t.id, t.title, c.name AS client_name,
              (SELECT COUNT(*) FROM vr_videos v WHERE v.tranche_id = t.id AND v.status != 'uploading') AS media
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.organization_id = ? AND t.project_id IS NULL
        ORDER BY t.created_at DESC`,
    )
    .bind(org)
    .all();

  // 2) Video ancora su R2 (cloud): candidati alla migrazione sul NAS.
  const onR2 = await db
    .prepare(
      `SELECT v.id, v.title, t.title AS tranche_title, c.name AS client_name,
              ROUND(v.file_size / 1048576.0, 1) AS mb
         FROM vr_videos v
         JOIN vr_tranches t ON t.id = v.tranche_id
         LEFT JOIN clients c ON c.id = v.client_id
        WHERE v.organization_id = ? AND v.media_type = 'video'
          AND v.status != 'uploading' AND v.storage_key LIKE 'r2://%'
        ORDER BY v.created_at DESC`,
    )
    .bind(org)
    .all();

  // 3) Consegne vuote (nessun media): rumore da ripulire.
  const empty = await db
    .prepare(
      `SELECT t.id, t.title, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.organization_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM vr_videos v WHERE v.tranche_id = t.id AND v.status != 'uploading'
          )
        ORDER BY t.created_at DESC`,
    )
    .bind(org)
    .all();

  // 4) Possibili holding non collegate: due clienti dove il nome dell'uno compare
  //    nel nome/azienda dell'altro (euristica leggera; l'AI affinerà).
  const holding = await db
    .prepare(
      `SELECT a.id AS child_id, a.name AS child_name, b.id AS parent_id, b.name AS parent_name
         FROM clients a
         JOIN clients b
           ON b.organization_id = a.organization_id
          AND b.id != a.id
          AND a.parent_client_id IS NULL
          AND (
            lower(a.company) = lower(b.name)
            OR (length(b.name) >= 4 AND instr(lower(a.name), lower(b.name)) > 0)
          )
        WHERE a.organization_id = ?
          AND COALESCE(a.status,'active') NOT IN ('removed','deleted','archived')
        LIMIT 30`,
    )
    .bind(org)
    .all();

  const map = (rows: any) => (rows?.results || []) as any[];
  const noProjectRows = map(noProject);
  const onR2Rows = map(onR2);
  const emptyRows = map(empty);
  const holdingRows = map(holding);

  return Response.json({
    ok: true,
    summary: {
      tranchesNoProject: noProjectRows.length,
      videosOnR2: onR2Rows.length,
      emptyTranches: emptyRows.length,
      holdingCandidates: holdingRows.length,
    },
    tranchesNoProject: noProjectRows.map((r) => ({
      id: String(r.id),
      title: r.title,
      clientName: r.client_name || null,
      media: Number(r.media || 0),
    })),
    videosOnR2: onR2Rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      trancheTitle: r.tranche_title,
      clientName: r.client_name || null,
      sizeMb: r.mb ? Number(r.mb) : null,
    })),
    emptyTranches: emptyRows.map((r) => ({
      id: String(r.id),
      title: r.title,
      clientName: r.client_name || null,
    })),
    holdingCandidates: holdingRows.map((r) => ({
      childId: String(r.child_id),
      childName: r.child_name,
      parentId: String(r.parent_id),
      parentName: r.parent_name,
    })),
  });
}
