export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { TIME_MANAGER_ROLES } from "@/lib/time-tracking"

function escapeIcsText(value: unknown) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

function formatUtc(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

function addOneDay(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  date.setUTCDate(date.getUTCDate() + 1)
  return date
}

function eventDescription(row: any) {
  return [
    row.description,
    row.client_name ? `Cliente: ${row.client_name}` : "",
    row.project_name ? `Progetto: ${row.project_name}` : "",
    row.owner_name ? `Referente: ${row.owner_name}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const db = await getCloudflareDb()
    if (!db) return new Response("D1 database binding missing", { status: 500 })

    const feed = await db
      .prepare(
        `SELECT f.organization_id,
                f.member_id,
                COALESCE(m.role, 'junior') AS role,
                COALESCE(NULLIF(TRIM(m.first_name || ' ' || m.last_name), ''), m.email) AS member_name
         FROM team_calendar_feeds f
         LEFT JOIN members m ON m.id = f.member_id AND m.organization_id = f.organization_id
         WHERE f.token = ?
         LIMIT 1`,
      )
      .bind(token)
      .first()

    if (!feed?.organization_id) {
      return new Response("Calendar feed not found", { status: 404 })
    }

    const from = new Date()
    from.setDate(from.getDate() - 30)
    const to = new Date()
    to.setFullYear(to.getFullYear() + 1)

    const isManagerFeed = TIME_MANAGER_ROLES.has(String(feed.role || "junior"))
    const memberFilter = isManagerFeed
      ? ""
      : "AND (e.owner_member_id = ? OR e.created_by_member_id = ? OR e.attendees_json LIKE ?)"
    const memberParams = isManagerFeed
      ? []
      : [String(feed.member_id || ""), String(feed.member_id || ""), `%${String(feed.member_id || "")}%`]

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
           AND e.status != 'cancelled'
           AND e.starts_at <= ?
           AND e.ends_at >= ?
           ${memberFilter}
         ORDER BY e.starts_at ASC`,
      )
      .bind(String(feed.organization_id), to.toISOString(), from.toISOString(), ...memberParams)
      .all()

    const now = formatUtc(new Date())
    const events = (result.results || []).map((row: any) => {
      const allDay = Boolean(row.all_day)
      const status = String(row.status || "confirmed").toUpperCase() === "TENTATIVE" ? "TENTATIVE" : "CONFIRMED"
      const startsAt = String(row.starts_at)
      const endsAt = String(row.ends_at)
      const dtStart = allDay ? `DTSTART;VALUE=DATE:${formatDate(startsAt)}` : `DTSTART:${formatUtc(startsAt)}`
      const dtEnd = allDay ? `DTEND;VALUE=DATE:${formatDate(addOneDay(endsAt))}` : `DTEND:${formatUtc(endsAt)}`

      return [
        "BEGIN:VEVENT",
        `UID:${escapeIcsText(row.id)}@optima.wearerighello.com`,
        `DTSTAMP:${now}`,
        dtStart,
        dtEnd,
        `SUMMARY:${escapeIcsText(row.title)}`,
        `DESCRIPTION:${escapeIcsText(eventDescription(row))}`,
        row.location ? `LOCATION:${escapeIcsText(row.location)}` : "",
        `STATUS:${status}`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n")
    })

    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Righello//Optima Team Calendar//IT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcsText(isManagerFeed ? "Optima Team" : `Optima ${feed.member_name || "Personale"}`)}`,
      "X-WR-TIMEZONE:Europe/Rome",
      ...events,
      "END:VCALENDAR",
      "",
    ].join("\r\n")

    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    })
  } catch (error) {
    console.error("Team calendar ICS error:", error)
    return new Response("Calendar feed error", { status: 500 })
  }
}
