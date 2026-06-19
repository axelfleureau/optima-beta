export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return { ok: false, error: "CRON_SECRET not configured", status: 500 as const }
  const authHeader = request.headers.get("authorization") || ""
  if (authHeader !== `Bearer ${cronSecret}`) return { ok: false, error: "Unauthorized", status: 401 as const }
  return { ok: true as const }
}

function todayInRome() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, error: "missing-token" }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  return { ok: response.ok, status: response.status }
}

function reminderText(row: any, date: string) {
  const missing: string[] = []
  if (!row.check_in_at && row.status !== "absent") missing.push("check-in")
  if (row.check_in_at && !row.check_out_at && row.status !== "absent") missing.push("checkout")
  if (row.review_status !== "submitted" && row.review_status !== "approved") missing.push("rapportino")

  if (!missing.length) return ""

  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email || "utente"
  return [
    `Promemoria Optima per ${name}`,
    `Giornata: ${date}`,
    `Manca: ${missing.join(", ")}`,
    "",
    "Puoi rispondere qui con una frase naturale, ad esempio: “ho fatto checkout alle 18 e ho lavorato su Portopiccolo”, oppure aprire Rapportini in Optima per controllare tutto prima dell'invio.",
  ].join("\n")
}

export async function POST(request: NextRequest) {
  const auth = isAuthorizedCron(request)
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status })

  const db = await getCloudflareDb()
  if (!db) return Response.json({ ok: false, error: "D1 database binding missing" }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayInRome()

  const rows = await db
    .prepare(
      `SELECT tc.chat_id,
              m.id AS member_id,
              m.email,
              m.first_name,
              m.last_name,
              wd.check_in_at,
              wd.check_out_at,
              COALESCE(wd.status, 'missing') AS status,
              COALESCE(wd.review_status, 'draft') AS review_status
       FROM telegram_authorized_chats tc
       JOIN members m ON m.id = tc.member_id AND m.organization_id = tc.organization_id
       LEFT JOIN work_days wd
         ON wd.organization_id = m.organization_id
        AND wd.member_id = m.id
        AND wd.entry_date = ?
       WHERE COALESCE(tc.status, 'active') = 'active'
         AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
       ORDER BY m.email ASC`,
    )
    .bind(date)
    .all()

  const results = []
  for (const row of rows.results || []) {
    const text = reminderText(row, date)
    if (!text) {
      results.push({ chatId: row.chat_id, memberId: row.member_id, status: "skipped", reason: "complete" })
      continue
    }
    const sent = await sendTelegramMessage(String(row.chat_id), text)
    results.push({ chatId: row.chat_id, memberId: row.member_id, status: sent.ok ? "sent" : "failed", telegramStatus: sent.status })
  }

  return Response.json({ ok: true, date, checked: results.length, results })
}
