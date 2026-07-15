export const dynamic = "force-dynamic";

/**
 * Collaboratori (referenti) su una TRANCHE o su un SINGOLO VIDEO.
 * - N persone per scope, ognuna con un cappello (videomaker/smm/revisore/osservatore).
 * - Non sono ruoli permanenti: valgono solo per quella tranche/video.
 * - Chi è già coinvolto può aggiungerne altri (superiore→subordinato e tra pari).
 * - Delega del singolo video: aggiungere qualcuno con scope 'video' gli fa
 *   vedere SOLO quel video, non il resto della consegna.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canAccessTranche, canAccessVideo, isCollabRole } from "@/lib/video-review-acl";

async function ctx(request: NextRequest) {
  const db = await getCloudflareDb();
  if (!db) return { err: Response.json({ error: "D1 database binding missing" }, { status: 500 }) };
  const user = await requireClerkUser();
  if (!user) return { err: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const principal = await ensureWorkspacePrincipal(db, user);
  return { db, principal };
}

/** Lo scope esiste ed è accessibile a chi chiede? */
async function canTouch(db: any, principal: any, scope: string, scopeId: string) {
  if (scope === "tranche") return canAccessTranche(db, principal, scopeId);
  if (scope === "video") return canAccessVideo(db, principal, scopeId);
  return false;
}

function memberName(row: any) {
  return (
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    String(row?.email || "").split("@")[0] ||
    "Membro"
  );
}

export async function GET(request: NextRequest) {
  const c = await ctx(request);
  if (c.err) return c.err;
  const { db, principal } = c as any;

  const scope = request.nextUrl.searchParams.get("scope") || "";
  const scopeId = request.nextUrl.searchParams.get("scopeId") || "";
  if (!["tranche", "video"].includes(scope) || !scopeId) {
    return Response.json({ error: "scope/scopeId mancanti" }, { status: 400 });
  }
  if (!(await canTouch(db, principal, scope, scopeId))) {
    return Response.json({ error: "Non accessibile" }, { status: 404 });
  }

  const res = await db
    .prepare(
      `SELECT c.id, c.role, c.member_id, m.first_name, m.last_name, m.email
         FROM vr_collaborators c
         JOIN members m ON m.id = c.member_id
        WHERE c.organization_id = ? AND c.scope = ? AND c.scope_id = ?
        ORDER BY c.created_at ASC`,
    )
    .bind(principal.organizationId, scope, scopeId)
    .all();

  return Response.json({
    ok: true,
    collaborators: ((res?.results || []) as any[]).map((r) => ({
      id: r.id,
      memberId: r.member_id,
      role: r.role,
      name: memberName(r),
      email: r.email || null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const c = await ctx(request);
  if (c.err) return c.err;
  const { db, principal } = c as any;

  const body = await request.json().catch(() => ({}) as any);
  const { scope, scopeId, memberId, role } = body || {};
  if (!["tranche", "video"].includes(scope) || !scopeId || !memberId) {
    return Response.json({ error: "Dati mancanti" }, { status: 400 });
  }
  if (!isCollabRole(role)) return Response.json({ error: "Ruolo non valido" }, { status: 400 });
  if (!(await canTouch(db, principal, scope, scopeId))) {
    return Response.json({ error: "Non accessibile" }, { status: 404 });
  }

  const m = await db
    .prepare(`SELECT id FROM members WHERE id = ? AND organization_id = ? LIMIT 1`)
    .bind(String(memberId), principal.organizationId)
    .first();
  if (!m) return Response.json({ error: "Membro non valido" }, { status: 400 });

  await db
    .prepare(
      `INSERT OR IGNORE INTO vr_collaborators
         (id, organization_id, scope, scope_id, member_id, role, added_by_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(createId("vrcol"), principal.organizationId, scope, String(scopeId), String(memberId), role, principal.memberId)
    .run();

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const c = await ctx(request);
  if (c.err) return c.err;
  const { db, principal } = c as any;

  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id mancante" }, { status: 400 });

  const row: any = await db
    .prepare(`SELECT scope, scope_id FROM vr_collaborators WHERE id = ? AND organization_id = ? LIMIT 1`)
    .bind(id, principal.organizationId)
    .first();
  if (!row) return Response.json({ ok: true });

  if (!(await canTouch(db, principal, String(row.scope), String(row.scope_id)))) {
    return Response.json({ error: "Non accessibile" }, { status: 404 });
  }

  await db.prepare(`DELETE FROM vr_collaborators WHERE id = ?`).bind(id).run();
  return Response.json({ ok: true });
}
