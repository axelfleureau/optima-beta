export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal, mapProjectRows } from "@/lib/workspace-db";
import {
  canViewAllWorkspaceData,
  canViewInternalEconomicData,
} from "@/lib/workspace-permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeProjectStatus(value: unknown) {
  const status = typeof value === "string" ? value : "";
  return [
    "planned",
    "active",
    "in-progress",
    "completed",
    "on-hold",
    "archived",
  ].includes(status)
    ? status
    : null;
}

function normalizeNullableId(value: unknown) {
  if (typeof value !== "string") return null;
  const nextValue = value.trim();
  if (!nextValue || nextValue === "tenant" || nextValue === "all") return null;
  return nextValue;
}

function normalizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  return [
    ...new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim()),
    ),
  ];
}

async function loadProject(db: any, organizationId: string, projectId: string) {
  const [projectResult, memberResult] = await Promise.all([
    db
      .prepare(
        `SELECT p.*, c.name AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
         WHERE p.organization_id = ? AND p.id = ?`,
      )
      .bind(organizationId, projectId)
      .all(),
    db
      .prepare(
        `SELECT pm.project_id, m.id AS member_id, m.email, m.first_name, m.last_name, m.role
         FROM project_members pm
         INNER JOIN members m ON m.id = pm.member_id AND m.organization_id = pm.organization_id
         WHERE pm.organization_id = ? AND pm.project_id = ?`,
      )
      .bind(organizationId, projectId)
      .all(),
  ]);

  return mapProjectRows(
    projectResult.results || [],
    memberResult.results || [],
  )[0];
}

function maskProjectEconomics(project: any, canViewEconomics: boolean) {
  if (!project || canViewEconomics) return project;
  return { ...project, budgetCents: 0 };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    if (!canViewAllWorkspaceData(principal.role)) {
      return Response.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }
    const canViewEconomics = canViewInternalEconomicData(principal.role);

    const { id } = await context.params;
    const body = await request.json();
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (typeof body.name === "string" && body.name.trim()) {
      assignments.push("name = ?");
      values.push(body.name.trim());
    }

    const status = normalizeProjectStatus(body.status);
    if (status) {
      assignments.push("status = ?");
      values.push(status);
    }

    if ("clientId" in body) {
      const clientId = normalizeNullableId(body.clientId);
      if (clientId) {
        const client = await db
          .prepare(
            `SELECT id FROM clients WHERE organization_id = ? AND id = ? LIMIT 1`,
          )
          .bind(principal.organizationId, clientId)
          .first();

        if (!client?.id) {
          return Response.json(
            { error: "Cliente non trovato" },
            { status: 404 },
          );
        }
      }

      assignments.push("client_id = ?");
      values.push(clientId);
    }

    if ("dueAt" in body) {
      assignments.push("due_at = ?");
      values.push(body.dueAt ? new Date(body.dueAt).toISOString() : null);
    }

    if ("startsAt" in body) {
      assignments.push("starts_at = ?");
      values.push(body.startsAt ? new Date(body.startsAt).toISOString() : null);
    }

    if ("budgetCents" in body) {
      assignments.push("budget_cents = ?");
      values.push(Number(body.budgetCents || 0));
    }

    const memberIds = normalizeMemberIds(body.memberIds);

    if (assignments.length > 0) {
      assignments.push("updated_at = ?");
      values.push(new Date().toISOString(), id, principal.organizationId);

      const result = await db
        .prepare(
          `UPDATE projects SET ${assignments.join(", ")} WHERE id = ? AND organization_id = ?`,
        )
        .bind(...values)
        .run();

      if (!result.meta?.changes) {
        return Response.json(
          { error: "Progetto non trovato" },
          { status: 404 },
        );
      }
    }

    if (memberIds) {
      await db
        .prepare(
          `DELETE FROM project_members WHERE organization_id = ? AND project_id = ?`,
        )
        .bind(principal.organizationId, id)
        .run();

      const safeMemberIds =
        memberIds.length > 0 ? memberIds : [principal.memberId];
      for (const memberId of safeMemberIds) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
             SELECT ?, id, organization_id, ?
             FROM members
             WHERE organization_id = ? AND id = ?`,
          )
          .bind(
            id,
            memberId === principal.memberId ? "owner" : "member",
            principal.organizationId,
            memberId,
          )
          .run();
      }
    }

    const project = await loadProject(db, principal.organizationId, id);
    if (!project) {
      return Response.json({ error: "Progetto non trovato" }, { status: 404 });
    }

    return Response.json({
      project: maskProjectEconomics(project, canViewEconomics),
    });
  } catch (error) {
    console.error("Project PATCH error:", error);
    return Response.json(
      { error: "Errore durante l'aggiornamento del progetto" },
      { status: 500 },
    );
  }
}
