export const dynamic = "force-dynamic";

/**
 * Ingest dal NODO video (Mac Studio) verso Optima.
 * Il nodo possiede i byte (NAS/T5) e qui registra solo i METADATI:
 * `storage_key` è il percorso relativo del file sul nodo (opaco per Optima).
 * Autenticato con il service token (stesso schema dell'integrazione MCP).
 * Idempotente su (organization_id, storage_key).
 */

import type { NextRequest } from "next/server";
import { requireMcpPrincipal } from "@/lib/mcp-auth";
import { createId } from "@/lib/cloudflare-db";

function reviewToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(request: NextRequest) {
  const auth = await requireMcpPrincipal(request);
  if (auth.error) return auth.error;
  const { db, principal } = auth;
  if (!principal) return Response.json({ error: "Principal non risolto" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as any);
  const storageKey = String(body?.storageKey || "").trim();
  const filename = String(body?.filename || "").trim();
  if (!storageKey || !filename) {
    return Response.json({ error: "storageKey e filename obbligatori" }, { status: 400 });
  }

  const org = principal.organizationId;
  const now = new Date().toISOString();

  // Già registrato? (idempotenza)
  const existing = await db
    .prepare(`SELECT id, tranche_id FROM vr_videos WHERE organization_id = ? AND storage_key = ? LIMIT 1`)
    .bind(org, storageKey)
    .first();
  if (existing) {
    return Response.json({ ok: true, videoId: existing.id, trancheId: existing.tranche_id, existing: true });
  }

  // Risolvi la tranche: esplicita, oppure dalle cartelle <Cliente>/<Tranche>/.
  let tranche: any = null;
  if (body?.trancheId) {
    tranche = await db
      .prepare(`SELECT id, client_id FROM vr_tranches WHERE id = ? AND organization_id = ? LIMIT 1`)
      .bind(String(body.trancheId), org)
      .first();
  }

  if (!tranche) {
    const clientName = String(body?.clientName || "").trim();
    const trancheTitle = String(body?.trancheTitle || "").trim() || "Senza tranche";

    let clientId: string | null = null;
    if (clientName) {
      const c = await db
        .prepare(
          `SELECT id FROM clients
            WHERE organization_id = ? AND lower(name) = lower(?)
            ORDER BY created_at ASC LIMIT 1`,
        )
        .bind(org, clientName)
        .first();
      clientId = c ? String(c.id) : null;
    }

    // Trova la tranche per (cliente, titolo) oppure creala.
    tranche = await db
      .prepare(
        `SELECT id, client_id FROM vr_tranches
          WHERE organization_id = ?
            AND COALESCE(client_id,'') = COALESCE(?,'')
            AND lower(title) = lower(?)
          LIMIT 1`,
      )
      .bind(org, clientId, trancheTitle)
      .first();

    if (!tranche) {
      const tid = createId("vrtr");
      await db
        .prepare(
          `INSERT INTO vr_tranches
             (id, organization_id, client_id, title, token, status, created_by_member_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
        )
        .bind(tid, org, clientId, trancheTitle, reviewToken(), principal.memberId, now, now)
        .run();
      tranche = { id: tid, client_id: clientId };
    }
  }

  const videoId = createId("vrvd");
  const title = String(body?.title || filename.replace(/\.[^.]+$/, "")).trim();
  await db
    .prepare(
      `INSERT INTO vr_videos
         (id, organization_id, tranche_id, client_id, title, filename, storage_key,
          source, status, fps, duration_seconds, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    )
    .bind(
      videoId,
      org,
      String(tranche.id),
      tranche.client_id ? String(tranche.client_id) : null,
      title,
      filename,
      storageKey,
      String(body?.source || "watch"),
      body?.fps ? Number(body.fps) : null,
      body?.durationSeconds ? Number(body.durationSeconds) : null,
      now,
      now,
    )
    .run();

  return Response.json({ ok: true, videoId, trancheId: String(tranche.id) });
}
