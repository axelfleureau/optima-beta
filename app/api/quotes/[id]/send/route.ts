export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { createId, getCloudflareDb } from "@/lib/cloudflare-db";
import { generateShareToken } from "@/lib/quote-utils";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canViewInternalEconomicData } from "@/lib/workspace-permissions";

function getPublicOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.headers.get("origin") || new URL(request.url).origin;
}

function parseShareRecord(row: any) {
  if (!row?.raw_json) return "";
  try {
    const raw = JSON.parse(String(row.raw_json));
    return typeof raw.shareToken === "string" ? raw.shareToken : "";
  } catch {
    return "";
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json(
        { error: "Sessione non valida o scaduta" },
        { status: 401 },
      );
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "Database Cloudflare non disponibile" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (!canViewInternalEconomicData(principal.role)) {
      return Response.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    const { id: quoteId } = await params;
    if (!quoteId) {
      return Response.json({ error: "Quote ID mancante" }, { status: 400 });
    }

    const quote = await db
      .prepare(
        `SELECT id, title, client_id
         FROM quotes
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, quoteId)
      .first();

    if (!quote?.id) {
      return Response.json(
        { error: "Preventivo non trovato" },
        { status: 404 },
      );
    }

    const existingShare = await db
      .prepare(
        `SELECT id, raw_json
         FROM external_data_records
         WHERE organization_id = ?
           AND provider = 'optima'
           AND record_type = 'quote_share'
           AND quote_id = ?
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .bind(principal.organizationId, quoteId)
      .first();

    const shareToken = parseShareRecord(existingShare) || generateShareToken();
    const publicUrl = `${getPublicOrigin(request)}/quotes/public/${shareToken}`;
    const sharePayload = JSON.stringify({
      shareToken,
      publicUrl,
      quoteId,
      sentAt: new Date().toISOString(),
    });
    const sourceId = `source_quote_public_${principal.organizationId}`;

    await db
      .prepare(
        `UPDATE quotes
         SET status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ? AND id = ?`,
      )
      .bind(principal.organizationId, quoteId)
      .run();

    await db
      .prepare(
        `INSERT OR IGNORE INTO external_data_sources (
          id, organization_id, provider, source_type, external_id, title, domain, sync_mode, schema_json, allowed_fields_json, redacted_fields_json
        ) VALUES (?, ?, 'optima', 'system', 'quote_public_sharing', 'Optima public quote sharing', 'quotes', 'manual', '{}', '[]', '[]')`,
      )
      .bind(sourceId, principal.organizationId)
      .run();

    if (existingShare?.id) {
      await db
        .prepare(
          `UPDATE external_data_records
           SET external_id = ?,
               external_url = ?,
               title = ?,
               summary = ?,
               raw_json = ?,
               normalized_json = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(
          `quote-share-token:${shareToken}`,
          publicUrl,
          `Link pubblico preventivo: ${quote.title || quoteId}`,
          `Link pubblico generato per il preventivo ${quote.title || quoteId}.`,
          sharePayload,
          sharePayload,
          principal.organizationId,
          existingShare.id,
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO external_data_records (
            id, organization_id, source_id, provider, record_type, external_id, external_url,
            title, summary, client_id, quote_id, occurred_at, confidence, raw_json, normalized_json
          ) VALUES (?, ?, ?, 'optima', 'quote_share', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'manual', ?, ?)`,
        )
        .bind(
          createId("record"),
          principal.organizationId,
          sourceId,
          `quote-share-token:${shareToken}`,
          publicUrl,
          `Link pubblico preventivo: ${quote.title || quoteId}`,
          `Link pubblico generato per il preventivo ${quote.title || quoteId}.`,
          quote.client_id || null,
          quoteId,
          sharePayload,
          sharePayload,
        )
        .run();
    }

    return Response.json({
      success: true,
      publicUrl,
      shareToken,
    });
  } catch (error) {
    console.error("Error sending quote:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore nell'invio del preventivo",
      },
      { status: 500 },
    );
  }
}
