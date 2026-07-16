export const dynamic = "force-dynamic";

/**
 * Il cliente CHIEDE UNA REVISIONE (rotta pubblica, solo token).
 * Effetto nativo in Optima: salva i marker, stato -> revision e crea un TASK
 * assegnato al videomaker della tranche (per nominativo) con le note+timecode.
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db) return Response.json({ error: "Database non disponibile" }, { status: 500 });

  const body = await request.json().catch(() => ({}) as any);
  const videoId = String(body?.videoId || "");
  const markers: Array<{ tSeconds: number; note: string }> = Array.isArray(body?.markers)
    ? body.markers
    : [];
  if (!videoId) return Response.json({ error: "videoId mancante" }, { status: 400 });
  if (!markers.length) return Response.json({ error: "Aggiungi almeno una nota" }, { status: 400 });

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

  const v: any = await db
    .prepare(`SELECT id, title, fps FROM vr_videos WHERE id = ? AND tranche_id = ? LIMIT 1`)
    .bind(videoId, String(t.id))
    .first();
  if (!v) return Response.json({ error: "Video non valido" }, { status: 404 });

  const now = new Date().toISOString();
  const fps = Number(v.fps) > 0 ? Number(v.fps) : 25;

  // Sostituisci le note del cliente.
  await db.prepare(`DELETE FROM vr_markers WHERE video_id = ? AND author = 'client'`).bind(videoId).run();
  const valid = markers
    .map((m) => ({ t: Number(m.tSeconds), note: String(m.note || "").trim() }))
    .filter((m) => Number.isFinite(m.t) && m.t >= 0 && m.note);

  // Ogni marker è anche un sub-item della checklist del task: STESSO id, così
  // spuntare la nota nel video ↔ spuntare il sub-item nel Workspace.
  const subItems = valid.map((m) => {
    const mid = createId("vrmk");
    return { markerId: mid, item: { id: mid, title: `[${timecode(m.t, fps)}] ${m.note}`, completed: false, createdAt: now } };
  });
  for (let i = 0; i < valid.length; i++) {
    await db
      .prepare(
        `INSERT INTO vr_markers (id, video_id, t_seconds, note, color, author, created_at)
         VALUES (?, ?, ?, ?, 'Blue', 'client', ?)`,
      )
      .bind(subItems[i].markerId, videoId, valid[i].t, valid[i].note, now)
      .run();
  }

  // Videomaker = collaboratore del VIDEO (delega), poi della TRANCHE, poi legacy.
  const vmRow: any =
    (await db
      .prepare(
        `SELECT member_id FROM vr_collaborators
          WHERE organization_id = ? AND scope = 'video' AND scope_id = ? AND role = 'videomaker'
          ORDER BY created_at ASC LIMIT 1`,
      )
      .bind(String(t.organization_id), videoId)
      .first()) ||
    (await db
      .prepare(
        `SELECT member_id FROM vr_collaborators
          WHERE organization_id = ? AND scope = 'tranche' AND scope_id = ? AND role = 'videomaker'
          ORDER BY created_at ASC LIMIT 1`,
      )
      .bind(String(t.organization_id), String(t.id))
      .first());
  const videomakerId = vmRow ? String(vmRow.member_id) : t.videomaker_member_id ? String(t.videomaker_member_id) : null;

  // Task NATIVO per il videomaker.
  let taskId: string | null = null;
  if (videomakerId) {
    const vm: any = await db
      .prepare(`SELECT id, first_name, last_name, email FROM members WHERE id = ? LIMIT 1`)
      .bind(videomakerId)
      .first();
    const assigneeName =
      [vm?.first_name, vm?.last_name].filter(Boolean).join(" ").trim() ||
      String(vm?.email || "").split("@")[0] ||
      null;

    const lines = [
      `Revisione richiesta dal cliente${t.client_name ? ` (${t.client_name})` : ""} — tranche "${t.title}".`,
      "",
      `Note di modifica (${valid.length}):`,
      ...valid.map((m, i) => `${i + 1}. [${timecode(m.t, fps)}] ${m.note}`),
      "",
      "Marker importabili in DaVinci: scarica l'EDL dalla scheda video in Optima.",
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
        `Revisione video: ${v.title}`,
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
      title: "Nuova revisione video",
      message: `Il cliente ha chiesto modifiche su "${v.title}" (${valid.length} note).`,
      taskId,
      metadata: { source: "video-review", videoId, markers: valid.length },
    });
  }

  await db
    .prepare(`UPDATE vr_videos SET status='revision', decided_at=?, task_id=?, updated_at=? WHERE id=?`)
    .bind(now, taskId, now, videoId)
    .run();

  return Response.json({ ok: true, status: "revision", taskId, markers: valid.length });
}
