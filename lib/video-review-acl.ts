/**
 * Chi vede cosa nel modulo Video Review.
 *
 * REGOLE (decise con Axel):
 * - Il MENU è visibile a tutti: la funzione non è un privilegio.
 * - I CONTENUTI si vedono solo se si è coinvolti.
 * - I ruoli manageriali vedono tutto (coerente con la policy di Optima).
 * - Coinvolgimento = essere collaboratore sulla TRANCHE (→ vedi tutti i suoi
 *   video) oppure su un SINGOLO VIDEO (→ vedi solo quello: è la delega, es.
 *   Paolo affida la revisione di un video a Daniele), oppure averla creata.
 * - Chiunque sia coinvolto può aggiungere altri: superiore→subordinato e
 *   anche tra pari.
 */

import type { WorkspacePrincipal } from "@/lib/workspace-db";

/** Ruoli che vedono tutte le tranche/video dell'organizzazione. */
const MANAGER_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"]);

export function seesEverything(principal: WorkspacePrincipal) {
  return MANAGER_ROLES.has(String(principal.role || "").toLowerCase());
}

export const COLLAB_ROLES = ["videomaker", "smm", "revisore", "osservatore"] as const;
export type CollabRole = (typeof COLLAB_ROLES)[number];

export function isCollabRole(v: unknown): v is CollabRole {
  return typeof v === "string" && (COLLAB_ROLES as readonly string[]).includes(v);
}

/**
 * Condizione SQL per filtrare le TRANCHE visibili.
 * Da usare come: `WHERE t.organization_id = ? AND ${clause}` con i bind
 * restituiti, nell'ordine.
 */
export function trancheVisibilityClause(principal: WorkspacePrincipal): {
  sql: string;
  binds: string[];
} {
  if (seesEverything(principal)) return { sql: "1=1", binds: [] };
  return {
    sql: `(
      t.created_by_member_id = ?
      OR EXISTS (SELECT 1 FROM vr_collaborators c
                  WHERE c.scope = 'tranche' AND c.scope_id = t.id AND c.member_id = ?)
      OR EXISTS (SELECT 1 FROM vr_collaborators c
                   JOIN vr_videos v ON v.id = c.scope_id
                  WHERE c.scope = 'video' AND v.tranche_id = t.id AND c.member_id = ?)
    )`,
    binds: [principal.memberId, principal.memberId, principal.memberId],
  };
}

/**
 * Condizione SQL per filtrare i VIDEO visibili dentro una tranche.
 * Se sei sulla tranche (o l'hai creata, o sei manager) li vedi tutti; se ti
 * hanno delegato solo un video, vedi solo quello.
 */
export function videoVisibilityClause(principal: WorkspacePrincipal): {
  sql: string;
  binds: string[];
} {
  if (seesEverything(principal)) return { sql: "1=1", binds: [] };
  return {
    sql: `(
      EXISTS (SELECT 1 FROM vr_tranches t2
               WHERE t2.id = v.tranche_id
                 AND (t2.created_by_member_id = ?
                      OR EXISTS (SELECT 1 FROM vr_collaborators c
                                  WHERE c.scope = 'tranche' AND c.scope_id = t2.id AND c.member_id = ?)))
      OR EXISTS (SELECT 1 FROM vr_collaborators c
                  WHERE c.scope = 'video' AND c.scope_id = v.id AND c.member_id = ?)
    )`,
    binds: [principal.memberId, principal.memberId, principal.memberId],
  };
}

/** Può vedere (e quindi agire su) questa tranche? */
export async function canAccessTranche(db: any, principal: WorkspacePrincipal, trancheId: string) {
  if (seesEverything(principal)) return true;
  const { sql, binds } = trancheVisibilityClause(principal);
  const row = await db
    .prepare(`SELECT 1 AS ok FROM vr_tranches t WHERE t.id = ? AND t.organization_id = ? AND ${sql} LIMIT 1`)
    .bind(trancheId, principal.organizationId, ...binds)
    .first();
  return Boolean(row);
}

/** Può vedere (e quindi agire su) questo video? */
export async function canAccessVideo(db: any, principal: WorkspacePrincipal, videoId: string) {
  if (seesEverything(principal)) return true;
  const { sql, binds } = videoVisibilityClause(principal);
  const row = await db
    .prepare(`SELECT 1 AS ok FROM vr_videos v WHERE v.id = ? AND v.organization_id = ? AND ${sql} LIMIT 1`)
    .bind(videoId, principal.organizationId, ...binds)
    .first();
  return Boolean(row);
}
