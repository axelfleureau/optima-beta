export const dynamic = "force-dynamic";

/**
 * Il cliente CHIEDE UNA REVISIONE (rotta pubblica, solo token).
 * Funziona a livello post e, per compatibilita, anche a livello singolo media.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb, createId } from "@/lib/cloudflare-db";
import { createNotification } from "@/lib/notifications-db";

function timecode(sec: number, fps: number) {
  const rf = Math.round(fps) || 25;
  const frames = Math.round((sec - Math.floor(sec)) * rf) % rf;
  const total = Math.floor(Math.max(0, sec));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor(total / 60) % 60)}:${p(total % 60)}:${p(frames)}`;
}

function markerTitle(media: any, note: { tSeconds: number; note: string }) {
  if (String(media.media_type || "video") === "image") {
    const slide = Number(media.slide_index || 0);
    return `[Slide ${slide || 1}] ${note.note}`;
  }
  return `[${timecode(note.tSeconds, Number(media.fps) || 25)}] ${note.note}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db)
    return Response.json(
      { error: "Database non disponibile" },
      { status: 500 },
    );

  const body = await request.json().catch(() => ({}) as any);
  const requestedMediaId = String(body?.videoId || body?.mediaId || "");
  // Un post carosello sono N media: la revisione colpisce il gruppo, non la tranche.
  const mediaIds: string[] = Array.isArray(body?.mediaIds)
    ? body.mediaIds.map((value: any) => String(value)).filter(Boolean)
    : [];
  const rawMarkers: Array<{
    mediaId?: string;
    videoId?: string;
    slideIndex?: number;
    tSeconds?: number;
    note: string;
  }> = Array.isArray(body?.markers) ? body.markers : [];
  if (!rawMarkers.length) {
    return Response.json(
      { error: "Aggiungi almeno una nota" },
      { status: 400 },
    );
  }

  const t: any = await db
    .prepare(
      `SELECT t.id, t.organization_id, t.title, t.client_id, t.project_id, t.videomaker_member_id,
              c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!t) return Response.json({ error: "Link non valido" }, { status: 404 });

  const mediaResult = await db
    .prepare(
      `SELECT v.* FROM vr_videos v
        WHERE v.tranche_id = ? AND v.status != 'uploading'
          AND NOT EXISTS (
            SELECT 1 FROM vr_videos nv
             WHERE nv.organization_id = v.organization_id
               AND nv.parent_video_id = COALESCE(v.parent_video_id, v.id)
               AND nv.version > v.version
               AND nv.status != 'uploading'
          )
        ORDER BY COALESCE(v.slide_index, 9999), v.created_at ASC`,
    )
    .bind(String(t.id))
    .all();
  const media = (mediaResult?.results || []) as any[];
  if (!media.length) {
    return Response.json({ error: "Media non valido" }, { status: 404 });
  }

  const byId = new Map(media.map((item) => [String(item.id), item]));
  const bySlide = new Map(
    media
      .filter((item) => item.slide_index)
      .map((item) => [Number(item.slide_index), item]),
  );
  const firstInGroup = mediaIds.find((mid) => byId.has(mid));
  const defaultMedia =
    (requestedMediaId && byId.get(requestedMediaId)) ||
    (firstInGroup ? byId.get(firstInGroup) : null) ||
    media[0];

  const valid = rawMarkers
    .map((marker) => {
      const mediaId = String(marker.mediaId || marker.videoId || "") || null;
      const target =
        (mediaId ? byId.get(mediaId) : null) ||
        (marker.slideIndex ? bySlide.get(Number(marker.slideIndex)) : null) ||
        defaultMedia;
      if (!target) return null;
      const isImage = String(target.media_type || "video") === "image";
      const tSeconds = isImage ? 0 : Math.max(0, Number(marker.tSeconds || 0));
      const note = String(marker.note || "").trim();
      return note ? { media: target, tSeconds, note } : null;
    })
    .filter(Boolean) as Array<{ media: any; tSeconds: number; note: string }>;
  if (!valid.length) {
    return Response.json(
      { error: "Aggiungi almeno una nota valida" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const groupIds = mediaIds.filter((mid) => byId.has(mid));
  const affectedIds = groupIds.length
    ? [...new Set(groupIds)]
    : requestedMediaId && byId.has(requestedMediaId)
      ? [requestedMediaId]
      : [...new Set(media.map((item) => String(item.id)))];
  const affectedPlaceholders = affectedIds.map(() => "?").join(",");

  await db
    .prepare(
      `DELETE FROM vr_markers
        WHERE author = 'client' AND video_id IN (${affectedPlaceholders})`,
    )
    .bind(...affectedIds)
    .run();

  const subItems = valid.map((item) => {
    const markerId = createId("vrmk");
    return {
      markerId,
      mediaId: String(item.media.id),
      title: markerTitle(item.media, item),
      item: {
        id: markerId,
        title: markerTitle(item.media, item),
        completed: false,
        createdAt: now,
      },
    };
  });

  for (let i = 0; i < valid.length; i += 1) {
    await db
      .prepare(
        `INSERT INTO vr_markers (id, video_id, t_seconds, note, color, author, created_at)
         VALUES (?, ?, ?, ?, 'Blue', 'client', ?)`,
      )
      .bind(
        subItems[i].markerId,
        String(valid[i].media.id),
        valid[i].tSeconds,
        valid[i].note,
        now,
      )
      .run();
  }

  const primaryMedia = valid[0].media;
  const vmRow: any =
    (await db
      .prepare(
        `SELECT member_id FROM vr_collaborators
          WHERE organization_id = ? AND scope = 'video' AND scope_id = ? AND role = 'videomaker'
          ORDER BY created_at ASC LIMIT 1`,
      )
      .bind(String(t.organization_id), String(primaryMedia.id))
      .first()) ||
    (await db
      .prepare(
        `SELECT member_id FROM vr_collaborators
          WHERE organization_id = ? AND scope = 'tranche' AND scope_id = ? AND role = 'videomaker'
          ORDER BY created_at ASC LIMIT 1`,
      )
      .bind(String(t.organization_id), String(t.id))
      .first());
  const videomakerId = vmRow
    ? String(vmRow.member_id)
    : t.videomaker_member_id
      ? String(t.videomaker_member_id)
      : null;

  let taskId: string | null = null;
  if (videomakerId) {
    const vm: any = await db
      .prepare(
        `SELECT id, first_name, last_name, email FROM members WHERE id = ? LIMIT 1`,
      )
      .bind(videomakerId)
      .first();
    const assigneeName =
      [vm?.first_name, vm?.last_name].filter(Boolean).join(" ").trim() ||
      String(vm?.email || "").split("@")[0] ||
      null;

    const lines = [
      `Revisione richiesta dal cliente${t.client_name ? ` (${t.client_name})` : ""} - post "${t.title}".`,
      "",
      `Note di modifica (${valid.length}):`,
      ...subItems.map((item, i) => `${i + 1}. ${item.title}`),
      "",
      "Apri Post Review in Optima per controllare il media o la slide indicata.",
    ];
    const description = lines.join("\n");

    taskId = createId("task");
    await db
      .prepare(
        `INSERT INTO tasks
           (id, organization_id, project_id, assignee_member_id, title, description,
            status, priority, column_id, client_id, client_name, work_mode, type,
            rich_description, assignee_name, created_by_member_id, sub_items_json,
            assignment_status, assignment_requested_at, assignment_responded_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'to-do', 'high', 'to-do', ?, ?, 'office', 'revision',
                 ?, ?, ?, ?, 'accepted', ?, ?, ?, ?)`,
      )
      .bind(
        taskId,
        String(t.organization_id),
        t.project_id ? String(t.project_id) : null,
        videomakerId,
        `Revisione post: ${t.title}`,
        description,
        t.client_id ? String(t.client_id) : null,
        t.client_name || null,
        description,
        assigneeName,
        videomakerId,
        JSON.stringify(subItems.map((s) => s.item)),
        now,
        now,
        now,
        now,
      )
      .run();

    await createNotification(db, {
      organizationId: String(t.organization_id),
      memberId: videomakerId,
      actorMemberId: null,
      type: "task_assigned",
      title: "Nuova revisione post",
      message: `Il cliente ha chiesto modifiche su "${t.title}" (${valid.length} note).`,
      taskId,
      metadata: {
        source: "post-review",
        trancheId: String(t.id),
        mediaIds: affectedIds,
        markers: valid.length,
      },
    });
  }

  await db
    .prepare(
      `UPDATE vr_videos
          SET status='revision', decided_at=?, task_id=?, updated_at=?
        WHERE id IN (${affectedPlaceholders}) AND tranche_id=?`,
    )
    .bind(now, taskId, now, ...affectedIds, String(t.id))
    .run();

  return Response.json({
    ok: true,
    status: "revision",
    taskId,
    markers: valid.length,
  });
}
