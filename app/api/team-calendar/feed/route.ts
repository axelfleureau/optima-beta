export const dynamic = "force-dynamic"

import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { canManageTime } from "@/lib/time-tracking"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export async function GET(request: Request) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    if (!db) return Response.json({ error: "D1 database binding missing" }, { status: 500 })

    const principal = await ensureWorkspacePrincipal(db, user)
    const isManager = canManageTime(principal)
    const existing = await db
      .prepare(
        `SELECT token
         FROM team_calendar_feeds
         WHERE organization_id = ? AND member_id = ? AND scope = 'team'
         LIMIT 1`,
      )
      .bind(principal.organizationId, principal.memberId)
      .first()

    const token = existing?.token ? String(existing.token) : `${createId("cal")}_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    if (!existing?.token) {
      await db
        .prepare(
          `INSERT INTO team_calendar_feeds
           (id, organization_id, member_id, token, scope, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'team', ?, ?)`,
        )
        .bind(createId("feed"), principal.organizationId, principal.memberId, token, now, now)
        .run()
    }

    const origin = new URL(request.url).origin

    const url = `${origin}/api/team-calendar/ics/${encodeURIComponent(token)}`

    return Response.json({
      url,
      googleCalendarUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`,
      scope: isManager ? "team" : "personal",
      instructions: [
        isManager
          ? "Questo feed include il calendario team visibile a direzione/admin."
          : "Questo feed include solo il tuo calendario personale.",
        "iPhone: Impostazioni > Calendario > Account > Aggiungi account > Altro > Aggiungi calendario con iscrizione.",
        "Google Calendar: Altri calendari > Da URL, poi incolla questo link.",
        "Il calendario resta in sola lettura: Optima rimane la fonte degli eventi.",
      ],
    })
  } catch (error) {
    console.error("Team calendar feed error:", error)
    return Response.json({ error: "Errore durante la generazione del feed calendario" }, { status: 500 })
  }
}
