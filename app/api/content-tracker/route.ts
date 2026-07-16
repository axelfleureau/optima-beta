export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createId, getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import {
  canBrowseClientDirectory,
  isExternalWorkspaceMember,
  isOperativeWorkspaceMember,
  isWorkspaceManager,
} from "@/lib/workspace-permissions";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const CONTENT_MANAGER_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
  "capo-reparto",
]);

function canManageContentTracker(role: string) {
  return CONTENT_MANAGER_ROLES.has(String(role || "").toLowerCase());
}

function canUseContentTracker(role: string) {
  return (
    canManageContentTracker(role) ||
    isOperativeWorkspaceMember(role) ||
    isExternalWorkspaceMember(role)
  );
}

function currentRomeMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "2026";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  return `${year}-${month}`;
}

function normalizeMonth(value: unknown) {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : currentRomeMonth();
}

function previousMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toInt(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function rowToPlan(row: any) {
  const targetVideoReel = Number(row.target_video_reel || 0);
  const targetPhotoPost = Number(row.target_photo_post || 0);
  const targetGeneric = Number(row.target_generic || 0);
  const createdVideoReel = Number(row.created_video_reel || 0);
  const createdPhotoPost = Number(row.created_photo_post || 0);
  const createdGeneric = Number(row.created_generic || 0);
  const targetTotal = targetVideoReel + targetPhotoPost + targetGeneric;
  const createdTotal = createdVideoReel + createdPhotoPost + createdGeneric;
  const missingVideoReel = Math.max(targetVideoReel - createdVideoReel, 0);
  const missingPhotoPost = Math.max(targetPhotoPost - createdPhotoPost, 0);
  const missingTotal = Math.max(targetTotal - createdTotal, 0);

  return {
    id: String(row.id),
    clientId: row.client_id ? String(row.client_id) : null,
    clientName: String(row.client_name || row.client_name_snapshot || ""),
    clientCompany: row.client_company || null,
    month: String(row.month),
    targetVideoReel,
    targetPhotoPost,
    targetGeneric,
    targetTotal,
    createdVideoReel,
    createdPhotoPost,
    createdGeneric,
    createdTotal,
    missingVideoReel,
    missingPhotoPost,
    missingTotal,
    plannedMissingReel: Number(row.planned_missing_reel || 0),
    plannedMissingPost: Number(row.planned_missing_post || 0),
    status: missingTotal <= 0 ? "complete" : "to_schedule",
    notes: row.notes || "",
    updatedAt: row.updated_at || null,
  };
}

async function ensureContentTrackerSchema(db: any) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS content_monthly_plans (
        id                         TEXT PRIMARY KEY,
        organization_id            TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id                  TEXT REFERENCES clients(id) ON DELETE SET NULL,
        client_name_snapshot       TEXT NOT NULL,
        month                      TEXT NOT NULL,
        target_video_reel          INTEGER NOT NULL DEFAULT 0,
        target_photo_post          INTEGER NOT NULL DEFAULT 0,
        target_generic             INTEGER NOT NULL DEFAULT 0,
        created_video_reel         INTEGER NOT NULL DEFAULT 0,
        created_photo_post         INTEGER NOT NULL DEFAULT 0,
        created_generic            INTEGER NOT NULL DEFAULT 0,
        planned_missing_reel       INTEGER NOT NULL DEFAULT 0,
        planned_missing_post       INTEGER NOT NULL DEFAULT 0,
        notes                      TEXT,
        created_by_member_id       TEXT REFERENCES members(id) ON DELETE SET NULL,
        updated_by_member_id       TEXT REFERENCES members(id) ON DELETE SET NULL,
        created_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();

  await db
    .prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_content_monthly_plans_client_month
        ON content_monthly_plans(organization_id, month, client_id)
        WHERE client_id IS NOT NULL`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_content_monthly_plans_org_month
        ON content_monthly_plans(organization_id, month)`,
    )
    .run();
}

async function canAccessContentClient(
  db: any,
  principal: { organizationId: string; memberId: string; role: string },
  clientId: string,
) {
  if (
    isWorkspaceManager(principal.role) ||
    canBrowseClientDirectory(principal.role)
  ) {
    return true;
  }

  const row = await db
    .prepare(
      `SELECT 1
         FROM clients
        WHERE organization_id = ?
          AND id = ?
          AND (
            EXISTS (
              SELECT 1
                FROM member_client_assignments mca
               WHERE mca.organization_id = clients.organization_id
                 AND mca.client_id = clients.id
                 AND mca.member_id = ?
            )
            OR EXISTS (
              SELECT 1
                FROM tasks t
                LEFT JOIN projects tp
                  ON tp.id = t.project_id
                 AND tp.organization_id = t.organization_id
               WHERE t.organization_id = clients.organization_id
                 AND t.assignee_member_id = ?
                 AND (t.client_id = clients.id OR tp.client_id = clients.id)
            )
            OR EXISTS (
              SELECT 1
                FROM projects vp
                JOIN project_members vpm
                  ON vpm.project_id = vp.id
                 AND vpm.organization_id = vp.organization_id
               WHERE vp.organization_id = clients.organization_id
                 AND vp.client_id = clients.id
                 AND vpm.member_id = ?
            )
          )
        LIMIT 1`,
    )
    .bind(
      principal.organizationId,
      clientId,
      principal.memberId,
      principal.memberId,
      principal.memberId,
    )
    .first();
  return Boolean(row);
}

async function requestContext() {
  const user = await requireClerkUser();
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = await getCloudflareDb();
  if (!db) {
    return {
      error: Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      ),
    };
  }

  const principal = await ensureWorkspacePrincipal(db, user);
  if (!canUseContentTracker(principal.role)) {
    return {
      error: Response.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      ),
    };
  }

  await ensureContentTrackerSchema(db);
  return { db, principal };
}

export async function GET(request: NextRequest) {
  const ctx = await requestContext();
  if ("error" in ctx) return ctx.error;

  const { db, principal } = ctx;
  const month = normalizeMonth(new URL(request.url).searchParams.get("month"));
  const canViewAllClients =
    isWorkspaceManager(principal.role) ||
    canBrowseClientDirectory(principal.role);
  const clientVisibilitySql = canViewAllClients
    ? "1 = 1"
    : `(
        EXISTS (
          SELECT 1
            FROM member_client_assignments mca
           WHERE mca.organization_id = p.organization_id
             AND mca.client_id = p.client_id
             AND mca.member_id = ?
        )
        OR EXISTS (
          SELECT 1
            FROM tasks t
            LEFT JOIN projects tp
              ON tp.id = t.project_id
             AND tp.organization_id = t.organization_id
           WHERE t.organization_id = p.organization_id
             AND t.assignee_member_id = ?
             AND (t.client_id = p.client_id OR tp.client_id = p.client_id)
        )
        OR EXISTS (
          SELECT 1
            FROM projects vp
            JOIN project_members vpm
              ON vpm.project_id = vp.id
             AND vpm.organization_id = vp.organization_id
           WHERE vp.organization_id = p.organization_id
             AND vp.client_id = p.client_id
             AND vpm.member_id = ?
        )
      )`;
  const clientVisibilityBinds = canViewAllClients
    ? []
    : [principal.memberId, principal.memberId, principal.memberId];
  const clientDirectorySql = canViewAllClients
    ? "1 = 1"
    : `(
        EXISTS (
          SELECT 1
            FROM member_client_assignments mca
           WHERE mca.organization_id = clients.organization_id
             AND mca.client_id = clients.id
             AND mca.member_id = ?
        )
        OR EXISTS (
          SELECT 1
            FROM tasks t
            LEFT JOIN projects tp
              ON tp.id = t.project_id
             AND tp.organization_id = t.organization_id
           WHERE t.organization_id = clients.organization_id
             AND t.assignee_member_id = ?
             AND (t.client_id = clients.id OR tp.client_id = clients.id)
        )
        OR EXISTS (
          SELECT 1
            FROM projects vp
            JOIN project_members vpm
              ON vpm.project_id = vp.id
             AND vpm.organization_id = vp.organization_id
           WHERE vp.organization_id = clients.organization_id
             AND vp.client_id = clients.id
             AND vpm.member_id = ?
        )
      )`;
  const clientDirectoryBinds = canViewAllClients
    ? []
    : [principal.memberId, principal.memberId, principal.memberId];

  const [plansResult, clientsResult] = await Promise.all([
    db
      .prepare(
        `SELECT p.*,
                c.name AS client_name,
                c.company AS client_company
           FROM content_monthly_plans p
           LEFT JOIN clients c
             ON c.id = p.client_id
            AND c.organization_id = p.organization_id
          WHERE p.organization_id = ?
            AND p.month = ?
            AND ${clientVisibilitySql}
          ORDER BY COALESCE(c.name, p.client_name_snapshot) COLLATE NOCASE`,
      )
      .bind(principal.organizationId, month, ...clientVisibilityBinds)
      .all(),
    db
      .prepare(
        `SELECT id, name, company
           FROM clients
          WHERE organization_id = ?
            AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
            AND ${clientDirectorySql}
          ORDER BY name COLLATE NOCASE`,
      )
      .bind(principal.organizationId, ...clientDirectoryBinds)
      .all(),
  ]);

  const rows = (plansResult.results || []).map(rowToPlan);
  const summary = rows.reduce(
    (acc: any, row: any) => ({
      clients: acc.clients + 1,
      targetTotal: acc.targetTotal + row.targetTotal,
      createdTotal: acc.createdTotal + row.createdTotal,
      missingTotal: acc.missingTotal + row.missingTotal,
      missingVideoReel: acc.missingVideoReel + row.missingVideoReel,
      missingPhotoPost: acc.missingPhotoPost + row.missingPhotoPost,
      complete: acc.complete + (row.status === "complete" ? 1 : 0),
      toSchedule: acc.toSchedule + (row.status === "to_schedule" ? 1 : 0),
    }),
    {
      clients: 0,
      targetTotal: 0,
      createdTotal: 0,
      missingTotal: 0,
      missingVideoReel: 0,
      missingPhotoPost: 0,
      complete: 0,
      toSchedule: 0,
    },
  );

  return Response.json({
    ok: true,
    month,
    rows,
    summary,
    clients: (clientsResult.results || []).map((client: any) => ({
      id: String(client.id),
      name: String(client.name || ""),
      company: client.company || null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const ctx = await requestContext();
  if ("error" in ctx) return ctx.error;

  const { db, principal } = ctx;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "upsert");

  if (action === "delete") {
    const id = String(body?.id || "");
    if (!id) return Response.json({ error: "id mancante" }, { status: 400 });
    await db
      .prepare(
        `DELETE FROM content_monthly_plans
          WHERE id = ?
            AND organization_id = ?`,
      )
      .bind(id, principal.organizationId)
      .run();
    return Response.json({ ok: true });
  }

  // Duplica il piano del mese precedente: come "duplicare il foglio" nell'Excel.
  // Porta avanti target, note e programmazione; azzera i contenuti creati.
  if (action === "carry_forward") {
    if (!canManageContentTracker(principal.role)) {
      return Response.json(
        { error: "Solo chi gestisce il tracker può duplicare il mese" },
        { status: 403 },
      );
    }
    const month = normalizeMonth(body?.month);
    const source = normalizeMonth(body?.sourceMonth) || previousMonth(month);
    if (source === month) {
      return Response.json(
        { error: "Il mese di origine coincide con quello di destinazione" },
        { status: 400 },
      );
    }

    const [prev, current] = await Promise.all([
      db
        .prepare(
          `SELECT * FROM content_monthly_plans
            WHERE organization_id = ? AND month = ?`,
        )
        .bind(principal.organizationId, source)
        .all(),
      db
        .prepare(
          `SELECT client_id, client_name_snapshot FROM content_monthly_plans
            WHERE organization_id = ? AND month = ?`,
        )
        .bind(principal.organizationId, month)
        .all(),
    ]);

    const existingClientIds = new Set(
      (current.results || [])
        .map((r: any) => (r.client_id ? String(r.client_id) : null))
        .filter(Boolean),
    );
    const existingNames = new Set(
      (current.results || [])
        .filter((r: any) => !r.client_id)
        .map((r: any) => String(r.client_name_snapshot || "").toLowerCase()),
    );

    const now = new Date().toISOString();
    const inserts = (prev.results || [])
      .filter((r: any) => {
        if (r.client_id) return !existingClientIds.has(String(r.client_id));
        return !existingNames.has(
          String(r.client_name_snapshot || "").toLowerCase(),
        );
      })
      .map((r: any) =>
        db
          .prepare(
            `INSERT INTO content_monthly_plans
              (id, organization_id, client_id, client_name_snapshot, month,
               target_video_reel, target_photo_post, target_generic,
               created_video_reel, created_photo_post, created_generic,
               planned_missing_reel, planned_missing_post, notes,
               created_by_member_id, updated_by_member_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            createId("cmp"),
            principal.organizationId,
            r.client_id ? String(r.client_id) : null,
            String(r.client_name_snapshot || "Cliente"),
            month,
            Number(r.target_video_reel || 0),
            Number(r.target_photo_post || 0),
            Number(r.target_generic || 0),
            Number(r.planned_missing_reel || 0),
            Number(r.planned_missing_post || 0),
            r.notes || null,
            principal.memberId,
            principal.memberId,
            now,
            now,
          ),
      );

    if (inserts.length > 0) await db.batch(inserts);
    return Response.json({
      ok: true,
      copied: inserts.length,
      skipped: (prev.results || []).length - inserts.length,
      sourceMonth: source,
    });
  }

  const month = normalizeMonth(body?.month);
  const id = String(body?.id || "");
  const clientId = body?.clientId ? String(body.clientId) : null;
  let clientName = String(body?.clientName || "").trim();

  if (clientId) {
    if (!(await canAccessContentClient(db, principal, clientId))) {
      return Response.json(
        { error: "Cliente non accessibile" },
        { status: 403 },
      );
    }

    const client = await db
      .prepare(
        `SELECT id, name
           FROM clients
          WHERE id = ?
            AND organization_id = ?
          LIMIT 1`,
      )
      .bind(clientId, principal.organizationId)
      .first();
    if (!client) {
      return Response.json({ error: "Cliente non valido" }, { status: 400 });
    }
    clientName = String(client.name || clientName || "Cliente");
  }

  if (!clientName) {
    return Response.json({ error: "Cliente mancante" }, { status: 400 });
  }

  if (
    !clientId &&
    !isWorkspaceManager(principal.role) &&
    !canBrowseClientDirectory(principal.role)
  ) {
    return Response.json(
      { error: "Collega un cliente assegnato per aggiornare il tracker" },
      { status: 403 },
    );
  }

  const values = {
    targetVideoReel: toInt(body?.targetVideoReel),
    targetPhotoPost: toInt(body?.targetPhotoPost),
    targetGeneric: toInt(body?.targetGeneric),
    createdVideoReel: toInt(body?.createdVideoReel),
    createdPhotoPost: toInt(body?.createdPhotoPost),
    createdGeneric: toInt(body?.createdGeneric),
    plannedMissingReel: toInt(body?.plannedMissingReel),
    plannedMissingPost: toInt(body?.plannedMissingPost),
    notes: String(body?.notes || "").trim(),
  };

  const existing = id
    ? await db
        .prepare(
          `SELECT id
             FROM content_monthly_plans
            WHERE id = ?
              AND organization_id = ?
            LIMIT 1`,
        )
        .bind(id, principal.organizationId)
        .first()
    : clientId
      ? await db
          .prepare(
            `SELECT id
               FROM content_monthly_plans
              WHERE organization_id = ?
                AND month = ?
                AND client_id = ?
              LIMIT 1`,
          )
          .bind(principal.organizationId, month, clientId)
          .first()
      : null;

  const rowId = existing?.id ? String(existing.id) : id || createId("cmp");
  const now = new Date().toISOString();

  if (existing?.id) {
    await db
      .prepare(
        `UPDATE content_monthly_plans
            SET client_id = ?,
                client_name_snapshot = ?,
                month = ?,
                target_video_reel = ?,
                target_photo_post = ?,
                target_generic = ?,
                created_video_reel = ?,
                created_photo_post = ?,
                created_generic = ?,
                planned_missing_reel = ?,
                planned_missing_post = ?,
                notes = ?,
                updated_by_member_id = ?,
                updated_at = ?
          WHERE id = ?
            AND organization_id = ?`,
      )
      .bind(
        clientId,
        clientName,
        month,
        values.targetVideoReel,
        values.targetPhotoPost,
        values.targetGeneric,
        values.createdVideoReel,
        values.createdPhotoPost,
        values.createdGeneric,
        values.plannedMissingReel,
        values.plannedMissingPost,
        values.notes,
        principal.memberId,
        now,
        rowId,
        principal.organizationId,
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO content_monthly_plans
          (id, organization_id, client_id, client_name_snapshot, month,
           target_video_reel, target_photo_post, target_generic,
           created_video_reel, created_photo_post, created_generic,
           planned_missing_reel, planned_missing_post, notes,
           created_by_member_id, updated_by_member_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        rowId,
        principal.organizationId,
        clientId,
        clientName,
        month,
        values.targetVideoReel,
        values.targetPhotoPost,
        values.targetGeneric,
        values.createdVideoReel,
        values.createdPhotoPost,
        values.createdGeneric,
        values.plannedMissingReel,
        values.plannedMissingPost,
        values.notes,
        principal.memberId,
        principal.memberId,
        now,
        now,
      )
      .run();
  }

  return Response.json({ ok: true, id: rowId });
}
