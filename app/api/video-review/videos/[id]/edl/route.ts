export const dynamic = "force-dynamic";

/**
 * EDL (CMX3600) con i marker delle note, per DaVinci Resolve:
 *   Media Pool → tasto destro sulla Timeline → Import → Timeline Markers from EDL
 * I marker si posizionano su timeline che parte da 01:00:00:00 (convenzione Resolve).
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const BASE_TC_SECONDS = 3600;

function tcFromFrames(totalFrames: number, fps: number) {
  const rf = Math.round(fps) || 25;
  const f = Math.max(0, Math.round(totalFrames));
  const frames = f % rf;
  const totalSeconds = Math.floor(f / rf);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(totalSeconds / 3600))}:${p(Math.floor(totalSeconds / 60) % 60)}:${p(
    totalSeconds % 60,
  )}:${p(frames)}`;
}

const clean = (s: unknown) =>
  String(s || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slug = (s: unknown) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "video";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) return new Response("D1 non disponibile", { status: 500 });
  const user = await requireClerkUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);

  const v: any = await db
    .prepare(
      `SELECT v.*, c.name AS client_name FROM vr_videos v
         LEFT JOIN clients c ON c.id = v.client_id
        WHERE v.id = ? AND v.organization_id = ? LIMIT 1`,
    )
    .bind(id, principal.organizationId)
    .first();
  if (!v) return new Response("Video non trovato", { status: 404 });

  const marks = await db
    .prepare(`SELECT t_seconds, note, color FROM vr_markers WHERE video_id = ? ORDER BY t_seconds ASC`)
    .bind(id)
    .all();

  const fps = Number(v.fps) > 0 ? Number(v.fps) : 25;
  const lines: string[] = [];
  lines.push(`TITLE: ${clean(v.title)} - NOTE REVIEW`);
  lines.push("FCM: NON-DROP FRAME");
  lines.push("");

  ((marks?.results || []) as any[]).forEach((m, i) => {
    const startFrames = Math.round((BASE_TC_SECONDS + Number(m.t_seconds)) * fps);
    const inTc = tcFromFrames(startFrames, fps);
    const outTc = tcFromFrames(startFrames + 1, fps);
    lines.push(`${String(i + 1).padStart(3, "0")}  AX       V     C        ${inTc} ${outTc} ${inTc} ${outTc}`);
    lines.push(`  |C:ResolveColor${m.color === "Red" ? "Red" : "Blue"} |M:${clean(m.note)} |D:1`);
    lines.push("");
  });

  const filename = `${slug(v.client_name)}_${slug(v.title)}_note.edl`;
  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
