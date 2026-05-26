export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const EVENT_TYPES = new Set(["meeting", "call", "shooting", "delivery", "internal", "travel", "other"])
const STATUSES = new Set(["confirmed", "tentative", "cancelled"])

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
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

async function loadEvent(db: any, organizationId: string, id: string) {
  return db
    .prepare(
      `SELECT e.*,
              c.name AS client_name,
              p.name AS project_name,
              COALESCE(NULLIF(TRIM(om.first_name || ' ' || om.last_name), ''), om.email) AS owner_name
       FROM team_calendar_events e
       LEFT JOIN clients c ON c.id = e.client_id AND c.organization_id = e.organization_id
       LEFT JOIN projects p ON p.id = e.project_id AND p.organization_id = e.organization_id
       LEFT JOIN members om ON om.id = e.owner_member_id AND om.organization_id = e.organization_id
       WHERE e.organization_id = ? AND e.id = ?
       LIMIT 1`,
    )
    .bind(organizationId, id)
    .first()
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const { id } = await params
    const existing = await loadEvent(db, principal.organizationId, id)
    if (!existing) return Response.json({ error: "Evento non trovato" }, { status: 404 })

    const body = await request.json()
    const startsAt = normalizeDate(body.startsAt)
    const endsAt = normalizeDate(body.endsAt)
    if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      return Response.json({ error: "La fine deve essere successiva all'inizio" }, { status: 400 })
    }

    const assignments: string[] = []
    const values: unknown[] = []
    const setValue = (column: string, value: unknown) => {
      assignments.push(`${column} = ?`)
      values.push(value)
    }

    if ("title" in body) setValue("title", String(body.title || "").trim() || existing.title)
    if ("description" in body) setValue("description", typeof body.description === "string" ? body.description.trim() : "")
    if ("location" in body) setValue("location", typeof body.location === "string" ? body.location.trim() : "")
    if ("eventType" in body) {
      const requestedEventType = typeof body.eventType === "string" ? body.eventType : ""
      setValue("event_type", EVENT_TYPES.has(requestedEventType) ? requestedEventType : existing.event_type)
    }
    if ("status" in body) {
      const requestedStatus = typeof body.status === "string" ? body.status : ""
      setValue("status", STATUSES.has(requestedStatus) ? requestedStatus : existing.status)
    }
    if (startsAt) setValue("starts_at", startsAt)
    if (endsAt) setValue("ends_at", endsAt)
    if ("allDay" in body) setValue("all_day", body.allDay ? 1 : 0)
    if ("clientId" in body) setValue("client_id", normalizeNullableId(body.clientId))
    if ("projectId" in body) setValue("project_id", normalizeNullableId(body.projectId))
    if ("ownerMemberId" in body) setValue("owner_member_id", normalizeNullableId(body.ownerMemberId) || principal.memberId)
    if ("attendees" in body) setValue("attendees_json", JSON.stringify(normalizeStringArray(body.attendees)))

    if (assignments.length === 0) {
      return Response.json({ event: rowToEvent(existing) })
    }

    setValue("updated_at", new Date().toISOString())
    values.push(id, principal.organizationId)

    await db
      .prepare(`UPDATE team_calendar_events SET ${assignments.join(", ")} WHERE id = ? AND organization_id = ?`)
      .bind(...values)
      .run()

    const updated = await loadEvent(db, principal.organizationId, id)
    return Response.json({ event: rowToEvent(updated) })
  } catch (error) {
    console.error("Team calendar PATCH error:", error)
    return Response.json({ error: "Errore durante l'aggiornamento evento" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const { id } = await params

    await db
      .prepare(`DELETE FROM team_calendar_events WHERE id = ? AND organization_id = ?`)
      .bind(id, principal.organizationId)
      .run()

    return Response.json({ ok: true })
  } catch (error) {
    console.error("Team calendar DELETE error:", error)
    return Response.json({ error: "Errore durante eliminazione evento" }, { status: 500 })
  }
}
