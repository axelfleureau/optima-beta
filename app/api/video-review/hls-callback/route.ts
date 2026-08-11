export const dynamic = "force-dynamic";

/**
 * Il nodo (Mac Studio) comunica l'esito di una conversione HLS.
 *
 * La transcodifica dura minuti: il nodo risponde subito 202 a chi la richiede
 * e chiama qui a lavoro finito. Autenticato con il service token, come l'ingest.
 */

import type { NextRequest } from "next/server";
import { requireMcpPrincipal } from "@/lib/mcp-auth";

export async function POST(request: NextRequest) {
  const auth = await requireMcpPrincipal(request);
  if (auth.error) return auth.error;
  const { db, principal } = auth;

  const body = await request.json().catch(() => ({}) as any);
  const videoId = String(body?.videoId || "");
  if (!videoId) {
    return Response.json({ error: "videoId mancante" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const ok = Boolean(body?.ok);

  if (ok) {
    const hlsKey = String(body?.hlsKey || "");
    if (!hlsKey) {
      return Response.json({ error: "hlsKey mancante" }, { status: 400 });
    }
    await db
      .prepare(
        `UPDATE vr_videos
            SET hls_key = ?, hls_status = 'ready', hls_error = NULL, updated_at = ?
          WHERE id = ? AND organization_id = ?`,
      )
      .bind(hlsKey, now, videoId, principal.organizationId)
      .run();
    console.log(
      `[hls] pronto ${videoId}: ${(body?.renditions || []).join("/")} in ${body?.seconds}s`,
    );
  } else {
    // Non è un errore bloccante: senza HLS il player usa l'MP4 di sempre.
    // Salviamo il motivo per il presidio, non per far fallire il flusso.
    await db
      .prepare(
        `UPDATE vr_videos
            SET hls_status = 'failed', hls_error = ?, updated_at = ?
          WHERE id = ? AND organization_id = ?`,
      )
      .bind(String(body?.error || "errore sconosciuto").slice(0, 500), now, videoId, principal.organizationId)
      .run();
    console.error(`[hls] fallita ${videoId}: ${body?.error}`);
  }

  return Response.json({ ok: true });
}
