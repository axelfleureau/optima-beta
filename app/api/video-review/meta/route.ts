export const dynamic = "force-dynamic";

/**
 * Dati di supporto per il modulo Video Review: clienti (nativi, deduplicati per
 * nome) e membri del team per i selettori Videomaker / SMM.
 * NB: l'assegnazione è per NOMINATIVO — qualunque membro può essere videomaker
 * o SMM su una singola tranche. Nessun ruolo permanente, nessun gating.
 */

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { seesEverything } from "@/lib/video-review-acl";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

function memberName(row: any) {
  const name = [row?.first_name, row?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || String(row?.email || "").split("@")[0] || "Membro";
}

export async function GET() {
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getCloudflareDb();
  if (!db)
    return Response.json(
      { error: "D1 database binding missing" },
      { status: 500 },
    );

  const principal = await ensureWorkspacePrincipal(db, user);
  const org = principal.organizationId;

  const clientsRes = await db
    .prepare(
      `SELECT id, name, company FROM clients
        WHERE organization_id = ?
        ORDER BY name COLLATE NOCASE`,
    )
    .bind(org)
    .all();

  // In Optima esistono clienti duplicati per nome: teniamo la prima occorrenza.
  const seen = new Set<string>();
  const clients = (clientsRes?.results || [])
    .filter((c: any) => {
      const key = String(c.name || "")
        .trim()
        .toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c: any) => ({
      id: String(c.id),
      name: c.name,
      company: c.company || null,
    }));

  const membersRes = await db
    .prepare(
      `SELECT id, first_name, last_name, email FROM members
        WHERE organization_id = ?
          AND COALESCE(status,'active') NOT IN ('removed','deleted','archived','disabled','suspended')
        ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE`,
    )
    .bind(org)
    .all();

  const members = (membersRes?.results || []).map((m: any) => ({
    id: String(m.id),
    name: memberName(m),
    email: m.email || null,
  }));

  return Response.json({
    ok: true,
    clients,
    members,
    me: principal.memberId,
    canSeeAll: seesEverything(principal),
  });
}
