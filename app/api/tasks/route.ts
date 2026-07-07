export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createId, getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import {
  ensureWorkspacePrincipal,
  mapTaskRow,
  stringifyJson,
} from "@/lib/workspace-db";
import {
  buildMemberDisplayName,
  requiresAssignmentAcceptance,
} from "@/lib/task-assignment-policy";
import { createNotification } from "@/lib/notifications-db";
import {
  canViewAllWorkspaceData,
  isExternalWorkspaceMember,
  isWorkspaceClient,
} from "@/lib/workspace-permissions";

function normalizePriority(value: unknown) {
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
    ? value
    : "medium";
}

function normalizeColumnId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "to-do";
}

function normalizeWorkMode(value: unknown) {
  return value === "remote" || value === true ? "remote" : "office";
}

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

export async function GET() {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    const canViewAllTasks = canViewAllWorkspaceData(principal.role);
    const query = !canViewAllTasks
      ? db
          .prepare(
            `SELECT t.*, p.name AS project_name
               FROM tasks t
               LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
               WHERE t.organization_id = ?
                 AND (
                   t.assignee_member_id = ?
                   OR t.created_by_member_id = ?
                   OR EXISTS (
                     SELECT 1
                     FROM project_members pm
                     WHERE pm.organization_id = t.organization_id
                       AND pm.project_id = t.project_id
                       AND pm.member_id = ?
                   )
                 )
               ORDER BY t.updated_at DESC`,
          )
          .bind(
            principal.organizationId,
            principal.memberId,
            principal.memberId,
            principal.memberId,
          )
      : db
          .prepare(
            `SELECT t.*, p.name AS project_name
               FROM tasks t
               LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
               WHERE t.organization_id = ?
               ORDER BY t.updated_at DESC`,
          )
          .bind(principal.organizationId);

    const result = await query.all();
    return Response.json({ tasks: (result.results || []).map(mapTaskRow) });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return Response.json(
      { error: "Errore nel caricamento delle task" },
      { status: 500 },
    );
  }
}

async function canAccessProject(
  db: any,
  organizationId: string,
  memberId: string,
  projectId: string | null,
) {
  if (!projectId) return false;
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

async function canAccessClient(
  db: any,
  organizationId: string,
  memberId: string,
  clientId: string | null,
) {
  if (!clientId) return false;
  const row = await db
    .prepare(
      `SELECT 1
       FROM clients c
       WHERE c.organization_id = ?
         AND c.id = ?
         AND (
           EXISTS (
             SELECT 1
             FROM member_client_assignments mca
             WHERE mca.organization_id = c.organization_id
               AND mca.client_id = c.id
               AND mca.member_id = ?
           )
           OR
           EXISTS (
             SELECT 1
             FROM projects p
             JOIN project_members pm
               ON pm.project_id = p.id
              AND pm.organization_id = p.organization_id
             WHERE p.organization_id = c.organization_id
               AND p.client_id = c.id
               AND pm.member_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM tasks t
             LEFT JOIN projects tp
               ON tp.id = t.project_id
              AND tp.organization_id = t.organization_id
             WHERE t.organization_id = c.organization_id
               AND (t.client_id = c.id OR tp.client_id = c.id)
               AND (t.assignee_member_id = ? OR t.created_by_member_id = ?)
           )
         )
       LIMIT 1`,
    )
    .bind(organizationId, clientId, memberId, memberId, memberId, memberId)
    .first();
  return Boolean(row);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (isWorkspaceClient(principal.role)) {
      return Response.json(
        {
          error:
            "I clienti possono commentare task esistenti, non crearne di operative",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return Response.json(
        { error: "Il titolo della task è obbligatorio" },
        { status: 400 },
      );
    }

    const taskId = createId("task");
    const now = new Date().toISOString();
    const columnId = normalizeColumnId(body.columnId);
    const workMode = normalizeWorkMode(body.workMode);
    const dueAt = body.dueDate ? new Date(body.dueDate).toISOString() : null;
    const projectId = normalizeNullableId(body.projectId);
    const project = projectId
      ? await db
          .prepare(
            `SELECT p.id, p.name, p.client_id, c.name AS client_name
             FROM projects p
             LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
             WHERE p.organization_id = ? AND p.id = ?
             LIMIT 1`,
          )
          .bind(principal.organizationId, projectId)
          .first()
      : null;

    if (projectId && !project?.id) {
      return Response.json({ error: "Progetto non trovato" }, { status: 404 });
    }

    const canCreateUnscopedTask = canViewAllWorkspaceData(principal.role);
    if (!canCreateUnscopedTask) {
      const projectAllowed = projectId
        ? await canAccessProject(
            db,
            principal.organizationId,
            principal.memberId,
            projectId,
          )
        : false;

      if (projectId && !projectAllowed) {
        return Response.json(
          { error: "Non puoi creare task su un progetto non assegnato" },
          { status: 403 },
        );
      }

      const candidateClientId =
        project?.client_id || normalizeNullableId(body.clientId);
      const clientAllowed =
        !projectId && candidateClientId
          ? await canAccessClient(
              db,
              principal.organizationId,
              principal.memberId,
              String(candidateClientId),
            )
          : false;

      if (!projectAllowed && candidateClientId && !clientAllowed) {
        return Response.json(
          { error: "Non puoi creare task su un cliente non assegnato" },
          { status: 403 },
        );
      }

      if (
        isExternalWorkspaceMember(principal.role) &&
        !projectAllowed &&
        !clientAllowed
      ) {
        return Response.json(
          {
            error:
              "I freelance devono collegare le task a un progetto o cliente assegnato",
          },
          { status: 403 },
        );
      }
    }

    let clientId = project?.client_id || normalizeNullableId(body.clientId);
    let clientName =
      project?.client_name ||
      (typeof body.clientName === "string" ? body.clientName.trim() : "");

    if (clientId) {
      const client = await db
        .prepare(
          `SELECT id, name
           FROM clients
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, clientId)
        .first();

      if (!client?.id) {
        clientId = null;
        clientName = "";
      } else {
        clientId = String(client.id);
        clientName = String(client.name || clientName || "");
      }
    }

    clientId = clientId || null;
    const assignedUserId =
      typeof body.assignedUserId === "string" && body.assignedUserId.trim()
        ? body.assignedUserId.trim()
        : null;
    const assignedMember = assignedUserId
      ? await db
          .prepare(
            `SELECT id, role, first_name, last_name, email
             FROM members
             WHERE organization_id = ? AND id = ?
             LIMIT 1`,
          )
          .bind(principal.organizationId, assignedUserId)
          .first()
      : null;

    if (assignedUserId && !assignedMember?.id) {
      return Response.json(
        { error: "Assegnatario non trovato" },
        { status: 404 },
      );
    }

    const needsAcceptance = requiresAssignmentAcceptance({
      assignerRole: principal.role,
      assigneeRole: assignedMember?.role,
      assignerMemberId: principal.memberId,
      assigneeMemberId: assignedUserId,
    });
    const assignmentStatus = assignedUserId
      ? needsAcceptance
        ? "pending"
        : "accepted"
      : "accepted";
    const assigneeName = assignedMember
      ? buildMemberDisplayName(assignedMember)
      : body.assignee || "";
    const assignmentRespondedAt =
      assignedUserId && !needsAcceptance ? now : null;

    await db
      .prepare(
        `INSERT INTO tasks
         (
           id, organization_id, project_id, assignee_member_id, title, description, status, priority,
          due_at, created_at, updated_at, column_id, client_id, client_name, work_mode, type,
           score, rich_description, assignee_name, tags_json, attachments_json,
           comments_json, sub_items_json, parent_item_id, created_by_member_id,
           assignment_status, assignment_requested_by_member_id, assignment_requested_at,
           assignment_responded_at, assignment_rejection_reason
         )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        taskId,
        principal.organizationId,
        projectId,
        assignedUserId,
        title,
        body.description || "",
        columnId,
        normalizePriority(body.priority),
        dueAt,
        now,
        now,
        columnId,
        clientId,
        clientName,
        workMode,
        body.type || "",
        Number(body.score || 0),
        body.richDescription || "",
        assigneeName,
        stringifyJson(body.tags),
        stringifyJson(body.attachments),
        stringifyJson([]),
        stringifyJson([]),
        null,
        principal.memberId,
        assignmentStatus,
        assignedUserId ? principal.memberId : null,
        assignedUserId ? now : null,
        assignmentRespondedAt,
        null,
      )
      .run();

    const row = await db
      .prepare(
        `SELECT t.*, p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         WHERE t.id = ?`,
      )
      .bind(taskId)
      .first();

    if (assignedUserId && assignedUserId !== principal.memberId) {
      await createNotification(db, {
        organizationId: principal.organizationId,
        memberId: assignedUserId,
        actorMemberId: principal.memberId,
        type: "task_assigned",
        title:
          assignmentStatus === "pending"
            ? "Nuova proposta task"
            : "Nuova task assegnata",
        message:
          assignmentStatus === "pending"
            ? `Ti è stata proposta la task "${title}". Devi accettarla prima che diventi ufficiale.`
            : `Ti è stata assegnata la task "${title}".`,
        taskId,
        metadata: {
          taskTitle: title,
          priority: normalizePriority(body.priority),
          dueAt,
          clientName,
          projectName: row?.project_name || "",
        },
      }).catch((notificationError) => {
        console.error("Task assignment notification error:", notificationError);
      });
    }

    return Response.json({ task: mapTaskRow(row) }, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return Response.json(
      { error: "Errore durante la creazione della task" },
      { status: 500 },
    );
  }
}
