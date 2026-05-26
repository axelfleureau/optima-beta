export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const EVENT_TYPES = new Set(["meeting", "call", "shooting", "delivery", "internal", "travel", "other"])
const STATUSES = new Set(["confirmed", "tentative", "cancelled"])

function normalizeDate(value: unknown, fallback: Date) {
  if (typeof value !== "string" || !value.trim()) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function normalizeNullableId(value: unknown) {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized && normalized !== "all" && normalized !== "none" ? normalized : null
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  ]
}

function parseAttendees(value: unknown) {
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function rowToEvent(row: any) {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    description: row.description || "",
    location: row.location || "",
    eventType: row.event_type || "meeting",
    status: row.status || "confirmed",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: Boolean(row.all_day),
    clientId: row.client_id || null,
    clientName: row.client_name || "",
    projectId: row.project_id || null,
    projectName: row.project_name || "",
    ownerMemberId: row.owner_member_id || null,
    ownerName: row.owner_name || "",
    attendees: parseAttendees(row.attendees_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getOptions(db: any, organizationId: string) {
  const [membersResult, clientsResult, projectsResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, email, first_name, last_name, role
         FROM members
         WHERE organization_id = ? AND status = 'active'
         ORDER BY first_name, last_name, email`,
      )
      .bind(organizationId)
      .all(),
    db
      .prepare(
        `SELECT id, name
         FROM clients
         WHERE organization_id = ? AND status = 'active'
         ORDER BY name`,
      )
      .bind(organizationId)
      .all(),
    db
      .prepare(
        `SELECT p.id, p.name, p.client_id, c.name AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
         WHERE p.organization_id = ? AND p.status NOT IN ('archived', 'completed')
         ORDER BY p.updated_at DESC
         LIMIT 200`,
      )
      .bind(organizationId)
      .all(),
  ])

  return {
    members: (membersResult.results || []).map((member: any) => ({
      id: String(member.id),
      name: [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email,
      email: member.email,
      role: member.role,
    })),
    clients: (clientsResult.results || []).map((client: any) => ({
      id: String(client.id),
      name: String(client.name || ""),
    })),
    projects: (projectsResult.results || []).map((project: any) => ({
      id: String(project.id),
      name: String(project.name || ""),
      clientId: project.client_id || null,
      clientName: project.client_name || "",
    })),
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
    const from = normalizeDate(searchParams.get("from"), defaultFrom).toISOString()
    const to = normalizeDate(searchParams.get("to"), defaultTo).toISOString()
    const scope = searchParams.get("scope") === "mine" ? "mine" : "team"

    const memberFilter = scope === "mine"
      ? "AND (e.owner_member_id = ? OR e.created_by_member_id = ? OR e.attendees_json LIKE ?)"
      : ""
    const memberParams = scope === "mine" ? [principal.memberId, principal.memberId, `%${principal.memberId}%`] : []

    const result = await db
      .prepare(
        `SELECT e.*,
                c.name AS client_name,
                p.name AS project_name,
                COALESCE(NULLIF(TRIM(om.first_name || ' ' || om.last_name), ''), om.email) AS owner_name
         FROM team_calendar_events e
         LEFT JOIN clients c ON c.id = e.client_id AND c.organization_id = e.organization_id
         LEFT JOIN projects p ON p.id = e.project_id AND p.organization_id = e.organization_id
         LEFT JOIN members om ON om.id = e.owner_member_id AND om.organization_id = e.organization_id
         WHERE e.organization_id = ?
           AND e.starts_at <= ?
           AND e.ends_at >= ?
           ${memberFilter}
         ORDER BY e.starts_at ASC`,
      )
      .bind(principal.organizationId, to, from, ...memberParams)
      .all()

    return Response.json({
      events: (result.results || []).map(rowToEvent),
      options: await getOptions(db, principal.organizationId),
      memberId: principal.memberId,
      role: principal.role,
    })
  } catch (error) {
    console.error("Team calendar GET error:", error)
    return Response.json({ error: "Errore nel caricamento del calendario team" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) return Response.json({ error: "Titolo evento obbligatorio" }, { status: 400 })

    const startsAt = normalizeDate(body.startsAt, new Date())
    const endsAt = normalizeDate(body.endsAt, new Date(startsAt.getTime() + 60 * 60 * 1000))
    if (endsAt.getTime() < startsAt.getTime()) {
      return Response.json({ error: "La fine deve essere successiva all'inizio" }, { status: 400 })
    }

    const eventId = createId("evt")
    const now = new Date().toISOString()
    const requestedEventType = typeof body.eventType === "string" ? body.eventType : ""
    const requestedStatus = typeof body.status === "string" ? body.status : ""
    const eventType = EVENT_TYPES.has(requestedEventType) ? requestedEventType : "meeting"
    const status = STATUSES.has(requestedStatus) ? requestedStatus : "confirmed"
    const ownerMemberId = normalizeNullableId(body.ownerMemberId) || principal.memberId
    const attendees = normalizeStringArray(body.attendees)

    await db
      .prepare(
        `INSERT INTO team_calendar_events
         (id, organization_id, title, description, location, event_type, status, starts_at, ends_at, all_day,
          client_id, project_id, owner_member_id, created_by_member_id, attendees_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        eventId,
        principal.organizationId,
        title,
        typeof body.description === "string" ? body.description.trim() : "",
        typeof body.location === "string" ? body.location.trim() : "",
        eventType,
        status,
        startsAt.toISOString(),
        endsAt.toISOString(),
        body.allDay ? 1 : 0,
        normalizeNullableId(body.clientId),
        normalizeNullableId(body.projectId),
        ownerMemberId,
        principal.memberId,
        JSON.stringify(attendees),
        now,
        now,
      )
      .run()

    const created = await db
      .prepare(
        `SELECT e.*,
                c.name AS client_name,
                p.name AS project_name,
                COALESCE(NULLIF(TRIM(om.first_name || ' ' || om.last_name), ''), om.email) AS owner_name
         FROM team_calendar_events e
         LEFT JOIN clients c ON c.id = e.client_id AND c.organization_id = e.organization_id
         LEFT JOIN projects p ON p.id = e.project_id AND p.organization_id = e.organization_id
         LEFT JOIN members om ON om.id = e.owner_member_id AND om.organization_id = e.organization_id
         WHERE e.organization_id = ? AND e.id = ?`,
      )
      .bind(principal.organizationId, eventId)
      .first()

    return Response.json({ event: rowToEvent(created) }, { status: 201 })
  } catch (error) {
    console.error("Team calendar POST error:", error)
    return Response.json({ error: "Errore durante la creazione dell'evento" }, { status: 500 })
  }
}
