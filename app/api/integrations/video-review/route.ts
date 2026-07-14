export const dynamic = "force-dynamic";

/**
 * Integrazione con l'app "Video Review" (locale, Mac Studio + NAS).
 *
 * Autenticazione: service token condiviso (Authorization: Bearer <OPTIMA_MCP_SERVICE_TOKEN>)
 * tramite `requireMcpPrincipal`. Il principal deriva dal membro configurato in
 * OPTIMA_MCP_SERVICE_MEMBER_EMAIL (default axel@wearerighello.com) e ne eredita
 * organization_id e ruolo. Non tocca le route interne protette da Clerk.
 *
 * GET  -> elenca clienti + progetti dell'organizzazione (per agganciare le tranche).
 * POST -> azioni: "ping" | "revision-task" | "approved-notify".
 */

import type { NextRequest } from "next/server";
import { requireMcpPrincipal } from "@/lib/mcp-auth";
import { createId } from "@/lib/cloudflare-db";
import { createNotification } from "@/lib/notifications-db";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/** Risolve un membro attivo dell'organizzazione a partire dall'email. */
async function findMemberByEmail(db: any, organizationId: string, email?: string | null) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;
  const row = await db
    .prepare(
      `SELECT id, organization_id, email, first_name, last_name, role, status
         FROM members
        WHERE lower(email) = ?
          AND COALESCE(status,'active') NOT IN ('removed','deleted','archived','disabled','suspended')
        ORDER BY CASE WHEN organization_id = ? THEN 0 ELSE 1 END, created_at ASC
        LIMIT 1`,
    )
    .bind(clean, organizationId)
    .first();
  return row && String(row.organization_id) === String(organizationId) ? row : null;
}

function memberDisplayName(row: any) {
  const name = [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim();
  return name || String(row?.email || "").split("@")[0] || "Membro";
}

/* ------------------------------------------------------------------ */
/* GET: clienti + progetti dell'organizzazione                         */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  const auth = await requireMcpPrincipal(request);
  if (auth.error) return auth.error;
  const { db, principal } = auth;
  if (!principal) return json({ error: "Principal non risolto" }, 401);

  const org = principal.organizationId;

  const clients = await db
    .prepare(
      `SELECT id, name, company, status
         FROM clients
        WHERE organization_id = ?
        ORDER BY name COLLATE NOCASE`,
    )
    .bind(org)
    .all();

  const projects = await db
    .prepare(
      `SELECT id, name, client_id, status
         FROM projects
        WHERE organization_id = ?
        ORDER BY updated_at DESC`,
    )
    .bind(org)
    .all();

  return json({
    ok: true,
    organizationId: org,
    clients: (clients?.results || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      company: c.company || null,
      status: c.status || "active",
    })),
    projects: (projects?.results || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      clientId: p.client_id || null,
      status: p.status || "planned",
    })),
  });
}

/* ------------------------------------------------------------------ */
/* POST: azioni                                                        */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  const auth = await requireMcpPrincipal(request);
  if (auth.error) return auth.error;
  const { db, principal } = auth;
  if (!principal) return json({ error: "Principal non risolto" }, 401);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON non valido" }, 400);
  }

  const action = String(body.action || "");
  const org = principal.organizationId;

  if (action === "ping") {
    return json({ ok: true, organizationId: org, member: principal.email, role: principal.role });
  }

  if (action === "revision-task") {
    const videoTitle = String(body.videoTitle || "video").trim();
    const clientNameRaw = String(body.clientName || "").trim();
    const markers: Array<{ timecode?: string; note?: string }> = Array.isArray(body.markers)
      ? body.markers
      : [];

    // Progetto / cliente Optima (validati contro l'org; null se non trovati).
    let projectId: string | null = null;
    if (body.optimaProjectId) {
      const p = await db
        .prepare(`SELECT id FROM projects WHERE id = ? AND organization_id = ? LIMIT 1`)
        .bind(String(body.optimaProjectId), org)
        .first();
      projectId = p ? String(p.id) : null;
    }
    let clientId: string | null = null;
    let clientName = clientNameRaw;
    if (body.optimaClientId) {
      const c = await db
        .prepare(`SELECT id, name FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`)
        .bind(String(body.optimaClientId), org)
        .first();
      if (c) {
        clientId = String(c.id);
        clientName = String(c.name || clientNameRaw);
      }
    }

    // Assegnatario (editor) via email.
    const assignee = await findMemberByEmail(db, org, body.editorEmail);
    const assigneeId = assignee ? String(assignee.id) : null;
    const assigneeName = assignee ? memberDisplayName(assignee) : null;

    // Descrizione: note/marker con timecode + link di review.
    const lines: string[] = [];
    lines.push(`Revisione richiesta dal cliente${clientName ? ` (${clientName})` : ""}.`);
    if (body.plannedDate) lines.push(`Pubblicazione prevista: ${body.plannedDate}`);
    lines.push("");
    lines.push(`Note di modifica (${markers.length}):`);
    markers.forEach((m, i) => {
      lines.push(`${i + 1}. [${m.timecode || "--"}] ${String(m.note || "").trim()}`);
    });
    if (body.reviewUrl) {
      lines.push("");
      lines.push(`Link review: ${body.reviewUrl}`);
    }
    lines.push("");
    lines.push("Marker importabili in DaVinci via EDL dall'app Video Review.");
    const description = lines.join("\n");

    const taskId = createId("task");
    const now = new Date().toISOString();
    const title = `Revisione video: ${videoTitle}`;

    await db
      .prepare(
        `INSERT INTO tasks
           (id, organization_id, project_id, assignee_member_id, title, description,
            status, priority, column_id, client_id, client_name, work_mode, type,
            rich_description, assignee_name, created_by_member_id,
            assignment_status, assignment_requested_by_member_id, assignment_requested_at,
            assignment_responded_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'to-do', 'high', 'to-do', ?, ?, 'office', 'revision',
                 ?, ?, ?, 'accepted', ?, ?, ?, ?, ?)`,
      )
      .bind(
        taskId,
        org,
        projectId,
        assigneeId,
        title,
        description,
        clientId,
        clientName || null,
        description,
        assigneeName,
        principal.memberId,
        assigneeId ? principal.memberId : null,
        assigneeId ? now : null,
        assigneeId ? now : null,
        now,
        now,
      )
      .run();

    // Notifica all'editor assegnato (se diverso dal creatore).
    if (assigneeId && assigneeId !== principal.memberId) {
      await createNotification(db, {
        organizationId: org,
        memberId: assigneeId,
        actorMemberId: principal.memberId,
        type: "task_assigned",
        title: "Nuova revisione video",
        message: `Il cliente ha chiesto modifiche su "${videoTitle}" (${markers.length} note).`,
        taskId,
        metadata: { source: "video-review", clientName, markers: markers.length, reviewUrl: body.reviewUrl || null },
      });
    }

    return json({ ok: true, taskId, assigned: assigneeId ? assigneeName : null, clientId, projectId });
  }

  if (action === "approved-notify") {
    const videoTitle = String(body.videoTitle || "video").trim();
    const clientName = String(body.clientName || "").trim();

    // Destinatario (SMM); fallback sul membro di servizio.
    const recipient = (await findMemberByEmail(db, org, body.recipientEmail)) || null;
    const recipientId = recipient ? String(recipient.id) : principal.memberId;

    const notifId = await createNotification(db, {
      organizationId: org,
      memberId: recipientId,
      actorMemberId: principal.memberId,
      type: "general",
      title: "Video approvato dal cliente",
      message: `"${videoTitle}"${clientName ? ` — ${clientName}` : ""} è approvato: pronto per descrizione e pubblicazione.`,
      taskId: null,
      metadata: { source: "video-review", clientName, reviewUrl: body.reviewUrl || null, plannedDate: body.plannedDate || null },
    });

    return json({ ok: true, notificationId: notifId, notified: recipient ? recipient.email : principal.email });
  }

  if (action === "create-project") {
    const name = String(body.name || "").trim();
    if (!name) return json({ error: "nome progetto mancante" }, 400);

    // Cliente Optima (opzionale, validato contro l'org).
    let clientId: string | null = null;
    if (body.clientId) {
      const c = await db
        .prepare(`SELECT id FROM clients WHERE id = ? AND organization_id = ? LIMIT 1`)
        .bind(String(body.clientId), org)
        .first();
      clientId = c ? String(c.id) : null;
    }

    const id = createId("project");
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'planned', 0, ?, ?)`,
      )
      .bind(id, org, clientId, name, now, now)
      .run();

    return json({ ok: true, project: { id, name, clientId, status: "planned" } });
  }

  return json({ error: `Azione sconosciuta: ${action}` }, 400);
}
