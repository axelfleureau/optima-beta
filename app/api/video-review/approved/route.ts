export const dynamic = "force-dynamic";

/**
 * Board SMM: media approvati dal cliente, da descrivere e pubblicare.
 * Visibile a tutti gli utenti (nessun gating per ruolo); `mine` filtra per
 * comodità sui video la cui tranche assegna l'utente corrente come SMM.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { signedByteUrl } from "@/lib/video-node";
import { videoVisibilityClause } from "@/lib/video-review-acl";

export async function GET(_request: NextRequest) {
  const db = await getCloudflareDb();
  if (!db)
    return Response.json(
      { error: "D1 database binding missing" },
      { status: 500 },
    );
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);

  // Anche qui: vedi solo i video in cui sei coinvolto (manager: tutto).
  const vvis = videoVisibilityClause(principal);

  const res = await db
    .prepare(
      `SELECT v.*, t.title AS tranche_title, t.smm_member_id, c.name AS client_name
         FROM vr_videos v
         JOIN vr_tranches t ON t.id = v.tranche_id
         LEFT JOIN clients c ON c.id = v.client_id
        WHERE v.organization_id = ? AND v.status = 'approved' AND ${vvis.sql}
        ORDER BY v.published ASC,
                 COALESCE(v.planned_publish_date, '9999-12-31') ASC,
                 v.decided_at ASC`,
    )
    .bind(principal.organizationId, ...vvis.binds)
    .all();

  const videos = await Promise.all(
    ((res?.results || []) as any[]).map(async (v) => ({
      id: v.id,
      title: v.title,
      filename: v.filename,
      mediaType: v.media_type || "video",
      mimeType: v.mime_type || null,
      slideIndex: v.slide_index ? Number(v.slide_index) : null,
      clientName: v.client_name || null,
      trancheTitle: v.tranche_title,
      plannedPublishDate: v.planned_publish_date,
      durationSeconds: v.duration_seconds,
      width: v.width,
      height: v.height,
      description: v.description || "",
      published: !!v.published,
      isMine: String(v.smm_member_id || "") === String(principal.memberId),
      streamUrl:
        String(v.media_type || "video") === "video"
          ? await signedByteUrl(v.approved_key || v.storage_key)
          : null,
      imageUrl:
        String(v.media_type || "video") === "image"
          ? await signedByteUrl(v.approved_key || v.storage_key)
          : null,
      downloadUrl: await signedByteUrl(v.approved_key || v.storage_key, {
        download: true,
      }),
    })),
  );

  return Response.json({ ok: true, videos });
}
