export const dynamic = "force-dynamic";

/**
 * PATCH del legame gerarchico di un cliente: parent_client_id (azienda madre).
 * Su D1 (dove il video-review legge la gerarchia per la struttura NAS).
 * Guardia anti-ciclo: il padre non può essere se stesso né un discendente.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  const org = principal.organizationId;

  const body = await request.json().catch(() => ({}) as any);
  // "parentClientId" può essere una stringa (imposta) o null/"" (scollega).
  const rawParent = body?.parentClientId;
  const parentId =
    typeof rawParent === "string" && rawParent.trim() ? rawParent.trim() : null;

  const self: any = await db
    .prepare(
      `SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`,
    )
    .bind(id, org)
    .first();
  if (!self) {
    return Response.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  if (parentId) {
    if (parentId === id) {
      return Response.json(
        { error: "Un cliente non può essere madre di se stesso." },
        { status: 400 },
      );
    }
    const parent: any = await db
      .prepare(
        `SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`,
      )
      .bind(parentId, org)
      .first();
    if (!parent) {
      return Response.json(
        { error: "Azienda madre non valida" },
        { status: 400 },
      );
    }
    // Anti-ciclo: risalgo la catena del CANDIDATO padre; se incontro `id`,
    // impostarlo creerebbe un anello.
    let cursor: string | null = parentId;
    for (let hops = 0; cursor && hops < 50; hops += 1) {
      if (cursor === id) {
        return Response.json(
          { error: "Legame non valido: creerebbe un ciclo tra le aziende." },
          { status: 400 },
        );
      }
      const row: any = await db
        .prepare(`SELECT parent_client_id FROM clients WHERE id = ? LIMIT 1`)
        .bind(cursor)
        .first();
      cursor = row?.parent_client_id ? String(row.parent_client_id) : null;
    }
  }

  await db
    .prepare(
      `UPDATE clients SET parent_client_id = ?, updated_at = ?
        WHERE id = ? AND organization_id = ?`,
    )
    .bind(parentId, new Date().toISOString(), id, org)
    .run();

  return Response.json({ ok: true, parentClientId: parentId });
}
