export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { refreshWorkDayReviewStatus } from "@/lib/time-entry-review";
import { syncTaskActualMinutesFromEntries } from "@/lib/time-entry-sync";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import {
  canManageTime,
  isPastBusinessDate,
  normalizeMinutes,
} from "@/lib/time-tracking";
import {
  canBrowseClientDirectory,
  isExternalWorkspaceMember,
} from "@/lib/workspace-permissions";

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

function normalizeActivityCategory(value: unknown) {
  const category = String(value || "").trim();
  return ACTIVITY_CATEGORIES.includes(category) ? category : "";
}

function normalizeBillable(value: unknown, category: string) {
  if (category === "Attività interna non fatturabile") return 0;
  return value === false || value === "false" || value === 0 ? 0 : 1;
}

async function isProjectVisibleForMember(
  db: any,
  organizationId: string,
  memberId: string,
  projectId: string,
) {
  const row = await db
    .prepare(
      `SELECT 1
       FROM project_members
       WHERE organization_id = ?
         AND project_id = ?
         AND member_id = ?
       LIMIT 1`,
    )
    .bind(organizationId, projectId, memberId)
    .first();
  return Boolean(row);
}

async function syncTaskIfPresent(
  db: any,
  organizationId: string,
  taskId: unknown,
) {
  if (!taskId) return;
  await syncTaskActualMinutesFromEntries(db, organizationId, String(taskId));
}

function entryReviewStatusAfterEdit(entry: any, isManager: boolean) {
  if (isManager) return String(entry.review_status || "submitted");
  return "submitted";
}

function shouldSyncAutoTask(task: any) {
  return (
    String(task?.id || "").startsWith("task_req_") ||
    String(task?.description || "") ===
      "Auto-creata da attività inserita nel rapportino."
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const body = await request.json();
    const entry = await db
      .prepare(
        `SELECT te.*, t.description AS task_description
         FROM time_entries te
         LEFT JOIN tasks t
           ON t.id = te.task_id
          AND t.organization_id = te.organization_id
         WHERE te.organization_id = ? AND te.id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, id)
      .first();

    if (!entry) {
      return Response.json({ error: "Attività non trovata" }, { status: 404 });
    }

    const isManager = canManageTime(principal);
    if (!isManager && entry.member_id !== principal.memberId) {
      return Response.json({ error: "Non autorizzato" }, { status: 403 });
    }

    if (!isManager && entry.review_status === "approved") {
      return Response.json(
        {
          error:
            "Attività già approvata: chiedi una correzione a un responsabile",
        },
        { status: 403 },
      );
    }

    if (!isManager && isPastBusinessDate(entry.entry_date)) {
      return Response.json(
        {
          error:
            "La giornata precedente è chiusa: chiedi a un responsabile di correggerla",
        },
        { status: 403 },
      );
    }

    const note = String(body.note || "").trim();
    if (!note) {
      return Response.json(
        { error: "Descrivi l'attività svolta" },
        { status: 400 },
      );
    }

    const minutes = normalizeMinutes(body.minutes);
    const activityCategory = normalizeActivityCategory(body.activityCategory);
    const entryNote = activityCategory ? `[${activityCategory}] ${note}` : note;
    const billable = normalizeBillable(body.billable, activityCategory);
    const workMode = normalizeWorkMode(body.workMode ?? body.isRemote);
    let taskId = normalizeNullableId(body.taskId);
    let projectId = normalizeNullableId(body.projectId);
    let clientId = normalizeNullableId(body.clientId);

    const member = await db
      .prepare(
        `SELECT id, role
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, entry.member_id)
      .first();

    if (!member?.id) {
      return Response.json(
        { error: "Dipendente non trovato" },
        { status: 404 },
      );
    }

    if (taskId) {
      const task = await db
        .prepare(
          `SELECT id, project_id, client_id, assignee_member_id, created_by_member_id
           FROM tasks
           WHERE organization_id = ?
             AND id = ?
             AND (
               ? = 1
               OR assignee_member_id = ?
               OR created_by_member_id = ?
             )
           LIMIT 1`,
        )
        .bind(
          principal.organizationId,
          taskId,
          isManager ? 1 : 0,
          entry.member_id,
          entry.member_id,
        )
        .first();

      if (!task) {
        return Response.json(
          { error: "Task non disponibile per questo dipendente" },
          { status: 400 },
        );
      }

      projectId = projectId || normalizeNullableId((task as any).project_id);
      clientId = clientId || normalizeNullableId((task as any).client_id);
    }

    const isExternalSelf =
      !isManager && isExternalWorkspaceMember((member as any).role);

    if (projectId) {
      const project = await db
        .prepare(
          `SELECT id, client_id
           FROM projects
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, projectId)
        .first();

      if (!project?.id) {
        return Response.json(
          { error: "Progetto non disponibile" },
          { status: 400 },
        );
      }

      if (
        isExternalSelf &&
        !taskId &&
        !(await isProjectVisibleForMember(
          db,
          principal.organizationId,
          String(entry.member_id),
          projectId,
        ))
      ) {
        return Response.json(
          { error: "Progetto non disponibile" },
          { status: 403 },
        );
      }

      clientId = clientId || normalizeNullableId((project as any).client_id);
    }

    if (clientId) {
      const client = await db
        .prepare(
          `SELECT id
           FROM clients
           WHERE organization_id = ?
             AND id = ?
             AND (
               ? = 1
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
          !isExternalSelf || canBrowseClientDirectory((member as any).role)
            ? 1
            : 0,
          entry.member_id,
        )
        .first();

      if (!client?.id) {
        return Response.json(
          { error: "Cliente non disponibile per questo dipendente" },
          { status: 403 },
        );
      }
    }

    const nextReviewStatus = entryReviewStatusAfterEdit(entry, isManager);
    const now = new Date().toISOString();

    await db
      .prepare(
        `UPDATE time_entries
         SET task_id = ?,
             project_id = ?,
             client_id = ?,
             minutes = ?,
             billable = ?,
             note = ?,
             work_mode = ?,
             review_status = ?,
             submitted_at = CURRENT_TIMESTAMP,
             submitted_by_member_id = ?,
             reviewed_at = CASE WHEN ? = 'submitted' THEN NULL ELSE reviewed_at END,
             reviewed_by_member_id = CASE WHEN ? = 'submitted' THEN NULL ELSE reviewed_by_member_id END,
             review_notes = CASE WHEN ? = 'submitted' THEN NULL ELSE review_notes END,
             updated_at = ?
         WHERE organization_id = ? AND id = ?`,
      )
      .bind(
        taskId,
        projectId,
        clientId,
        minutes,
        billable,
        entryNote,
        workMode,
        nextReviewStatus,
        principal.memberId,
        nextReviewStatus,
        nextReviewStatus,
        nextReviewStatus,
        now,
        principal.organizationId,
        id,
      )
      .run();

    if (
      shouldSyncAutoTask({
        id: entry.task_id,
        description: entry.task_description,
      })
    ) {
      await db
        .prepare(
          `UPDATE tasks
           SET title = ?,
               description = ?,
               rich_description = ?,
               actual_minutes = ?,
               estimated_minutes = ?,
               client_id = ?,
               project_id = ?,
               work_mode = ?,
               type = ?,
               updated_at = ?
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(
          note,
          "Auto-creata da attività inserita nel rapportino.",
          note,
          minutes,
          minutes,
          clientId,
          projectId,
          workMode,
          activityCategory || "rapportino",
          now,
          principal.organizationId,
          entry.task_id,
        )
        .run();
    }

    await syncTaskIfPresent(db, principal.organizationId, entry.task_id);
    await syncTaskIfPresent(db, principal.organizationId, taskId);
    await refreshWorkDayReviewStatus(
      db,
      principal.organizationId,
      String(entry.member_id),
      String(entry.entry_date),
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Time tracking entry PATCH error:", error);
    return Response.json(
      { error: "Errore durante la modifica attività" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const entry = await db
      .prepare(
        `SELECT id, member_id, task_id, entry_date, review_status FROM time_entries WHERE organization_id = ? AND id = ? LIMIT 1`,
      )
      .bind(principal.organizationId, id)
      .first();

    if (!entry) {
      return Response.json({ error: "Attività non trovata" }, { status: 404 });
    }

    const isManager = canManageTime(principal);
    if (!isManager && entry.member_id !== principal.memberId) {
      return Response.json({ error: "Non autorizzato" }, { status: 403 });
    }

    if (!isManager && entry.review_status === "approved") {
      return Response.json(
        {
          error:
            "Attività già approvata: chiedi una correzione a un responsabile",
        },
        { status: 403 },
      );
    }

    if (!isManager && isPastBusinessDate(entry.entry_date)) {
      return Response.json(
        {
          error:
            "La giornata precedente è chiusa: chiedi a un responsabile di correggerla",
        },
        { status: 403 },
      );
    }

    await db
      .prepare(`DELETE FROM time_entries WHERE organization_id = ? AND id = ?`)
      .bind(principal.organizationId, id)
      .run();
    if (entry.task_id) {
      await syncTaskActualMinutesFromEntries(
        db,
        principal.organizationId,
        String(entry.task_id),
      );
    }
    await refreshWorkDayReviewStatus(
      db,
      principal.organizationId,
      String(entry.member_id),
      String(entry.entry_date),
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Time tracking entry DELETE error:", error);
    return Response.json(
      { error: "Errore durante la rimozione attività" },
      { status: 500 },
    );
  }
}
