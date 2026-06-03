export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal, stringifyJson } from "@/lib/workspace-db"
import { getProjectImportTargets, parseTaskReport } from "@/lib/task-report-import"

const ADMIN_ROLES = new Set(["admin", "direzione", "capo-reparto", "super-admin"])

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
}

function taskImportId(title: string, createdAt: string) {
  return `task_import_${createdAt.slice(0, 10).replace(/-/g, "")}_${slug(title).slice(0, 72)}`
}

async function resolveAxelMemberId(db: any, organizationId: string, fallbackMemberId: string) {
  const row = await db
    .prepare(
      `SELECT id
       FROM members
       WHERE organization_id = ?
         AND lower(email) = 'axel@wearerighello.com'
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()

  return String(row?.id || fallbackMemberId)
}

async function ensureImportTargets(db: any, organizationId: string) {
  const targets = getProjectImportTargets()
  const clientMap = new Map(targets.map((target) => [target.clientId, target.clientName]))

  for (const [clientId, clientName] of clientMap) {
    await db
      .prepare(
        `INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           company = excluded.company,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(clientId, organizationId, clientName, clientName)
      .run()
  }

  for (const target of targets) {
    await db
      .prepare(
        `INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', 0, CURRENT_TIMESTAMP, '2026-06-30T18:00:00.000Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           client_id = excluded.client_id,
           name = excluded.name,
           status = 'active',
           due_at = excluded.due_at,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(target.projectId, organizationId, target.clientId, target.projectName)
      .run()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    if (!ADMIN_ROLES.has(principal.role)) {
      return Response.json({ error: "Solo direzione e admin possono importare report operativi" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const content = typeof body.content === "string" ? body.content.trim() : ""
    const dryRun = Boolean(body.dryRun)

    if (content.length < 120) {
      return Response.json({ error: "Incolla un report operativo completo da analizzare" }, { status: 400 })
    }

    const parsedItems = parseTaskReport(content)
    if (parsedItems.length === 0) {
      return Response.json({ error: "Non ho trovato blocchi con data, progetto e task svolti" }, { status: 400 })
    }

    const assigneeMemberId = await resolveAxelMemberId(db, principal.organizationId, principal.memberId)

    const items = []
    for (const item of parsedItems) {
      const duplicate = await db
        .prepare(
          `SELECT id
           FROM tasks
           WHERE organization_id = ?
             AND assignee_member_id = ?
             AND date(created_at) = date(?)
             AND lower(title) = lower(?)
           LIMIT 1`,
        )
        .bind(principal.organizationId, assigneeMemberId, item.createdAt, item.title)
        .first()

      items.push({ ...item, duplicate: Boolean(duplicate?.id), existingTaskId: duplicate?.id || null })
    }

    if (dryRun) {
      return Response.json({
        items,
        summary: {
          total: items.length,
          duplicates: items.filter((item) => item.duplicate).length,
          creatable: items.filter((item) => !item.duplicate).length,
        },
      })
    }

    await ensureImportTargets(db, principal.organizationId)
    await db
      .prepare(
        `INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
         SELECT id, ?, organization_id, 'owner'
         FROM projects
         WHERE organization_id = ?`,
      )
      .bind(assigneeMemberId, principal.organizationId)
      .run()

    let created = 0
    let skipped = 0

    for (const item of items) {
      if (item.duplicate) {
        skipped += 1
        continue
      }

      const taskId = taskImportId(item.title, item.createdAt)
      await db
        .prepare(
          `INSERT INTO tasks
           (
             id, organization_id, project_id, assignee_member_id, title, description, status, priority,
             estimated_minutes, actual_minutes, due_at, created_at, updated_at, column_id, client_id,
             client_name, type, score, rich_description, assignee_name, tags_json, attachments_json,
             comments_json, sub_items_json, created_by_member_id, assignment_status,
             assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at,
             assignment_rejection_reason
           )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, 'Axel Fleureau', ?, '[]', '[]', '[]', ?, 'accepted', ?, ?, ?, NULL)`,
        )
        .bind(
          taskId,
          principal.organizationId,
          item.projectId,
          assigneeMemberId,
          item.title,
          item.description,
          item.workflowStatus,
          item.priority,
          item.dueAt,
          item.createdAt,
          item.workflowStatus,
          item.clientId,
          item.clientName,
          item.type,
          item.score,
          item.richDescription,
          stringifyJson(item.tags),
          principal.memberId,
          principal.memberId,
          item.createdAt,
          item.createdAt,
        )
        .run()

      created += 1
    }

    return Response.json({
      items,
      summary: {
        total: items.length,
        created,
        skipped,
      },
    })
  } catch (error) {
    console.error("Task report import error:", error)
    return Response.json({ error: "Errore durante l'importazione del report operativo" }, { status: 500 })
  }
}
