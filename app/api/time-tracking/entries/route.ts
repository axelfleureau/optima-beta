export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createId, getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { refreshWorkDayReviewStatus } from "@/lib/time-entry-review";
import { syncTaskActualMinutesFromEntries } from "@/lib/time-entry-sync";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import {
  canManageTime,
  isPastBusinessDate,
  normalizeDate,
  normalizeMinutes,
  usesTaskOnlyWorkLog,
} from "@/lib/time-tracking";
import { isExternalWorkspaceMember } from "@/lib/workspace-permissions";

function normalizeNullableId(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (
    !normalized ||
    ["tenant", "all", "none", "null", "undefined"].includes(lower) ||
    lower.includes("nessun cliente")
  ) {
    return null;
  }
  return normalized;
}

function normalizeWorkMode(value: unknown) {
  return value === "remote" || value === true ? "remote" : "office";
}

const ACTIVITY_CATEGORIES = [
  "Strategia e pianificazione",
  "Creatività e produzione",
  "Account e project management",
  "Digital e media",
  "PR e relazioni esterne",
  "Attività interna non fatturabile",
];

function normalizeBillable(value: unknown, category: string) {
  if (category === "Attività interna non fatturabile") return 0;
  return value === false || value === "false" || value === 0 ? 0 : 1;
}

function normalizeActivityCategory(value: unknown) {
  const category = String(value || "").trim();
  return ACTIVITY_CATEGORIES.includes(category) ? category : "";
}

function normalizeRequestId(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
  return normalized.length >= 12 ? normalized : "";
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getCloudflareDb();
    if (!db)
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );

    const principal = await ensureWorkspacePrincipal(db, user);
    const body = await request.json();
    const requestId = normalizeRequestId(body.requestId);
    const isManager = canManageTime(principal);
    let memberId =
      isManager && body.memberId ? String(body.memberId) : principal.memberId;
    const date = normalizeDate(body.date);
    const minutes = normalizeMinutes(body.minutes);
    const note = String(body.note || "").trim();
    let projectId = normalizeNullableId(body.projectId);
    const taskId = normalizeNullableId(body.taskId);
    let clientId = normalizeNullableId(body.clientId);
    const workMode = normalizeWorkMode(body.workMode ?? body.isRemote);
    const activityCategory = normalizeActivityCategory(body.activityCategory);
    const billable = normalizeBillable(body.billable, activityCategory);
    const entryNote = activityCategory ? `[${activityCategory}] ${note}` : note;

    if (!isManager && isPastBusinessDate(date)) {
      return Response.json(
        {
          error:
            "La giornata precedente è chiusa: chiedi a un responsabile di correggerla",
        },
        { status: 403 },
      );
    }

    if (!note) {
      return Response.json(
        { error: "Descrivi l'attività svolta" },
        { status: 400 },
      );
    }

    const member = await db
      .prepare(
        `SELECT id, first_name, last_name, email, role
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId)
      .first();

    if (!member || (!isManager && memberId !== principal.memberId)) {
      return Response.json(
        { error: "Dipendente non autorizzato" },
        { status: 403 },
      );
    }

    const isExternalSelf =
      !isManager && isExternalWorkspaceMember((member as any).role);
    const memberUsesTaskOnlyWorkLog = usesTaskOnlyWorkLog((member as any).role);

    if (taskId) {
      const task = await db
        .prepare(
          `SELECT id, project_id, client_id, assignee_member_id
           FROM tasks
           WHERE organization_id = ?
             AND id = ?
             AND (? = 1 OR assignee_member_id = ? OR created_by_member_id = ?)
           LIMIT 1`,
        )
        .bind(
          principal.organizationId,
          taskId,
          isManager ? 1 : 0,
          memberId,
          memberId,
        )
        .first();

      if (!task) {
        return Response.json(
          { error: "Task non disponibile per questo dipendente" },
          { status: 400 },
        );
      }

      const taskAssigneeMemberId = String(
        (task as any).assignee_member_id || "",
      );
      if (taskAssigneeMemberId && memberId !== taskAssigneeMemberId) {
        if (!isManager) {
          return Response.json(
            { error: "Task non assegnata a questo dipendente" },
            { status: 403 },
          );
        }
        memberId = taskAssigneeMemberId;
      }

      projectId = projectId || normalizeNullableId((task as any).project_id);
      clientId = clientId || normalizeNullableId((task as any).client_id);
    }

    if (projectId) {
      const project = await db
        .prepare(
          `SELECT p.id, p.client_id
           FROM projects p
           WHERE p.organization_id = ?
             AND p.id = ?
             AND (
               ? = 0
               OR EXISTS (
                 SELECT 1
                 FROM project_members pm
                 WHERE pm.organization_id = p.organization_id
                   AND pm.project_id = p.id
                   AND pm.member_id = ?
               )
             )
           LIMIT 1`,
        )
        .bind(
          principal.organizationId,
          projectId,
          isExternalSelf && !taskId ? 1 : 0,
          memberId,
        )
        .first();

      if (!project) {
        return Response.json(
          { error: "Progetto non disponibile" },
          { status: 400 },
        );
      }

      clientId = clientId || normalizeNullableId((project as any).client_id);
    }

    let clientName = "";
    if (clientId) {
      const client = await db
        .prepare(
          `SELECT id, name
           FROM clients
           WHERE organization_id = ?
             AND id = ?
             AND (
               ? = 0
               OR EXISTS (
                 SELECT 1
                 FROM member_client_assignments mca
                 WHERE mca.organization_id = clients.organization_id
                   AND mca.client_id = clients.id
                   AND mca.member_id = ?
               )
             )
           LIMIT 1`,
        )
        .bind(
          principal.organizationId,
          clientId,
          isExternalSelf && !projectId && !taskId ? 1 : 0,
          memberId,
        )
        .first();

      if (!client) {
        return Response.json(
          { error: "Cliente non disponibile per questo dipendente" },
          { status: 403 },
        );
      } else {
        clientName = String((client as any).name || "");
      }
    }

    const linkedTaskId =
      taskId || (requestId ? `task_req_${requestId}` : createId("task"));
    if (!taskId) {
      const now = new Date().toISOString();
      const taskWorkDateTime = `${date}T12:00:00+02:00`;
      const assigneeName =
        `${(member as any).first_name || ""} ${(member as any).last_name || ""}`.trim() ||
        String((member as any).email || "");

      await db
        .prepare(
          `INSERT OR IGNORE INTO tasks
           (
             id, organization_id, project_id, assignee_member_id, title,
             description, status, priority, estimated_minutes, actual_minutes,
             due_at, created_at, updated_at, column_id, client_id, client_name,
             work_mode, type, score, rich_description, assignee_name,
             tags_json, attachments_json, comments_json, sub_items_json,
             parent_item_id, created_by_member_id, assignment_status,
             assignment_requested_by_member_id, assignment_requested_at,
             assignment_responded_at, assignment_rejection_reason
           )
             VALUES (?, ?, ?, ?, ?, ?, 'done', 'medium', ?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, 0, ?, ?, '[]', '[]', '[]', '[]', NULL, ?, 'accepted', ?, ?, ?, NULL)`,
        )
        .bind(
          linkedTaskId,
          principal.organizationId,
          projectId,
          memberId,
          note,
          "Auto-creata da attività inserita nel rapportino.",
          minutes,
          minutes,
          taskWorkDateTime,
          taskWorkDateTime,
          now,
          clientId,
          clientName,
          workMode,
          activityCategory || "rapportino",
          note,
          assigneeName,
          principal.memberId,
          principal.memberId,
          now,
          now,
        )
        .run();
    }

    const entryId = requestId ? `time_req_${requestId}` : createId("time");
    const entryInsert = await db
      .prepare(
        `INSERT OR IGNORE INTO time_entries
         (
           id, organization_id, member_id, task_id, project_id, client_id,
           entry_date, minutes, billable, note, work_mode, review_status,
           submitted_at, submitted_by_member_id
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, ?)`,
      )
      .bind(
        entryId,
        principal.organizationId,
        memberId,
        linkedTaskId,
        projectId,
        clientId,
        date,
        minutes,
        billable,
        entryNote,
        workMode,
        principal.memberId,
      )
      .run();

    await db
      .prepare(
        `INSERT INTO work_days (
           id, organization_id, member_id, entry_date, status,
           review_status, submitted_at, submitted_by_member_id
         )
         VALUES (?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, ?)
         ON CONFLICT(organization_id, member_id, entry_date) DO UPDATE SET
           status = CASE
             WHEN ? = 1 THEN 'closed'
             WHEN work_days.status = 'absent' THEN 'open'
             ELSE work_days.status
           END,
           submitted_at = CURRENT_TIMESTAMP,
           submitted_by_member_id = ?,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        createId("day"),
        principal.organizationId,
        memberId,
        date,
        memberUsesTaskOnlyWorkLog ? "closed" : "open",
        principal.memberId,
        memberUsesTaskOnlyWorkLog ? 1 : 0,
        principal.memberId,
      )
      .run();

    if (linkedTaskId) {
      await syncTaskActualMinutesFromEntries(
        db,
        principal.organizationId,
        linkedTaskId,
      );
    }

    await refreshWorkDayReviewStatus(
      db,
      principal.organizationId,
      memberId,
      date,
    );

    return Response.json(
      {
        success: true,
        id: entryId,
        duplicate: (entryInsert.meta?.changes ?? 0) === 0,
      },
      { status: (entryInsert.meta?.changes ?? 0) === 0 ? 200 : 201 },
    );
  } catch (error) {
    console.error("Time tracking entry POST error:", error);
    return Response.json(
      { error: "Errore durante il salvataggio attività" },
      { status: 500 },
    );
  }
}
