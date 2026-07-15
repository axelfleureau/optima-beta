export const dynamic = "force-dynamic";

/**
 * Progetti (nativi Optima) per il modulo Video Review.
 * Il progetto è un attributo del VIDEO (ereditato dalla tranche come default,
 * sovrascrivibile per singolo video): nella stessa consegna il video A può
 * stare sul progetto X e il video B sul progetto Y dello stesso cliente.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

async function ctx() {
  const db = await getCloudflareDb();
  if (!db) return { err: Response.json({ error: "D1 database binding missing" }, { status: 500 }) };
  const user = await requireClerkUser();
  if (!user) return { err: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  return { db, principal: await ensureWorkspacePrincipal(db, user) };
}

/** GET /api/video-review/projects?clientId=... (clientId opzionale) */
export async function GET(request: NextRequest) {
  const c = await ctx();
  if (c.err) return c.err;
  const { db, principal } = c as any;

  const clientId = request.nextUrl.searchParams.get("clientId");
  const res = clientId
    ? await db
        .prepare(
          `SELECT id, name, client_id, status FROM projects
            WHERE organization_id = ? AND client_id = ?
            ORDER BY updated_at DESC`,
        )
        .bind(principal.organizationId, clientId)
        .all()
    : await db
        .prepare(
          `SELECT id, name, client_id, status FROM projects
            WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 200`,
        )
        .bind(principal.organizationId)
        .all();

  return Response.json({
    ok: true,
    projects: ((res?.results || []) as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      clientId: p.client_id || null,
      status: p.status || "planned",
    })),
  });
}

/** POST: crea un progetto al volo (senza uscire dal modulo). */
export async function POST(request: NextRequest) {
  const c = await ctx();
  if (c.err) return c.err;
  const { db, principal } = c as any;

  const body = await request.json().catch(() => ({}) as any);
  const name = String(body?.name || "").trim();
  if (!name) return Response.json({ error: "Nome progetto mancante" }, { status: 400 });

  let clientId: string | null = null;
  if (body?.clientId) {
    const cl = await db
      .prepare(`SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(String(body.clientId), principal.organizationId)
      .first();
    clientId = cl ? String(cl.id) : null;
  }

  const id = createId("project");
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'planned', 0, ?, ?)`,
    )
    .bind(id, principal.organizationId, clientId, name, now, now)
    .run();

  return Response.json({ ok: true, project: { id, name, clientId, status: "planned" } });
}
