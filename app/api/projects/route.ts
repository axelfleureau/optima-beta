export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal, mapProjectRows } from "@/lib/workspace-db"

function normalizeProjectStatus(value: unknown) {
  const status = typeof value === "string" ? value : ""
  return ["planned", "active", "in-progress", "completed", "on-hold", "archived"].includes(status)
    ? status
    : "active"
}

function normalizeNullableId(value: unknown) {
  if (typeof value !== "string") return null
  const nextValue = value.trim()
  if (!nextValue || nextValue === "tenant" || nextValue === "all") return null
  return nextValue
}

function normalizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  ]
}

async function assertClient(db: any, organizationId: string, clientId: string | null) {
  if (!clientId) return null

  const client = await db
    .prepare(`SELECT id, name FROM clients WHERE organization_id = ? AND id = ? LIMIT 1`)
    .bind(organizationId, clientId)
    .first()

  if (!client?.id) {
    throw new Error("Cliente non trovato")
  }

  return client
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const clientId = normalizeNullableId(searchParams.get("clientId"))

    const projectQuery =
      principal.role === "junior"
        ? db
            .prepare(
              `SELECT p.*, c.name AS client_name
               FROM projects p
               LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
               WHERE p.organization_id = ?
                 AND (? IS NULL OR p.client_id = ?)
                 AND EXISTS (
                   SELECT 1
                   FROM project_members pm
                   WHERE pm.project_id = p.id
                     AND pm.member_id = ?
                     AND pm.organization_id = p.organization_id
                 )
               ORDER BY p.updated_at DESC`,
            )
            .bind(principal.organizationId, clientId, clientId, principal.memberId)
        : db
            .prepare(
              `SELECT p.*, c.name AS client_name
               FROM projects p
               LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
               WHERE p.organization_id = ?
                 AND (? IS NULL OR p.client_id = ?)
               ORDER BY p.updated_at DESC`,
            )
            .bind(principal.organizationId, clientId, clientId)

    const [projectResult, memberResult] = await Promise.all([
      projectQuery.all(),
      db
        .prepare(
          `SELECT pm.project_id, m.id AS member_id, m.email, m.first_name, m.last_name, m.role
           FROM project_members pm
           INNER JOIN members m ON m.id = pm.member_id AND m.organization_id = pm.organization_id
           WHERE pm.organization_id = ?`,
        )
        .bind(principal.organizationId)
        .all(),
    ])

    return Response.json({
      projects: mapProjectRows(projectResult.results || [], memberResult.results || []),
    })
  } catch (error) {
    console.error("Projects GET error:", error)
    return Response.json({ error: "Errore nel caricamento dei progetti" }, { status: 500 })
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
    if (principal.role === "junior") {
      return Response.json({ error: "Permessi insufficienti" }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return Response.json({ error: "Il nome del progetto è obbligatorio" }, { status: 400 })
    }

    const clientId = normalizeNullableId(body.clientId)
    await assertClient(db, principal.organizationId, clientId)

    const memberIds = normalizeMemberIds(body.memberIds)
    const projectId = createId("proj")
    const now = new Date().toISOString()
    const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null
    const startsAt = body.startsAt ? new Date(body.startsAt).toISOString() : null

    await db
      .prepare(
        `INSERT INTO projects
         (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        projectId,
        principal.organizationId,
        clientId,
        name,
        normalizeProjectStatus(body.status),
        Number(body.budgetCents || 0),
        startsAt,
        dueAt,
        now,
        now,
      )
      .run()

    const safeMemberIds = memberIds.length > 0 ? memberIds : [principal.memberId]
    for (const memberId of safeMemberIds) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
           SELECT ?, id, organization_id, ?
           FROM members
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(projectId, memberId === principal.memberId ? "owner" : "member", principal.organizationId, memberId)
        .run()
    }

    const [projectResult, memberResult] = await Promise.all([
      db
        .prepare(
          `SELECT p.*, c.name AS client_name
           FROM projects p
           LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
           WHERE p.organization_id = ? AND p.id = ?`,
        )
        .bind(principal.organizationId, projectId)
        .all(),
      db
        .prepare(
          `SELECT pm.project_id, m.id AS member_id, m.email, m.first_name, m.last_name, m.role
           FROM project_members pm
           INNER JOIN members m ON m.id = pm.member_id AND m.organization_id = pm.organization_id
           WHERE pm.organization_id = ? AND pm.project_id = ?`,
        )
        .bind(principal.organizationId, projectId)
        .all(),
    ])

    return Response.json({ project: mapProjectRows(projectResult.results || [], memberResult.results || [])[0] }, { status: 201 })
  } catch (error) {
    console.error("Projects POST error:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Errore durante la creazione del progetto" },
      { status: 500 },
    )
  }
}
