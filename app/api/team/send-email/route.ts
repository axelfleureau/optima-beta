export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { sendEmail } from "@/lib/sendgrid"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const SENDER_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"])

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://appbeta.wearerighello.com"
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    if (!SENDER_ROLES.has(principal.role)) {
      return Response.json({ error: "Non hai i permessi per inviare email" }, { status: 403 })
    }

    const body = await request.json()
    const userId = String(body.userId || "").trim()
    const subject = String(body.subject || "").trim()
    const message = String(body.message || "").trim()

    if (!userId || !subject || !message) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    const recipient = await db
      .prepare(
        `SELECT email, first_name, last_name
         FROM members
         WHERE id = ? AND organization_id = ?
         LIMIT 1`,
      )
      .bind(userId, principal.organizationId)
      .first()

    if (!recipient?.email) {
      return Response.json({ error: "Utente non trovato o senza email" }, { status: 404 })
    }

    const senderName = `${user.firstName} ${user.lastName}`.trim() || user.email
    const recipientName = `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim()
    const baseUrl = appUrl().replace(/\/$/, "")
    const dashboardUrl = `${baseUrl}/dashboard`
    const logoUrl = `${baseUrl}/assets/logos/righello-white.png`

    await sendEmail({
      to: { email: String(recipient.email), name: recipientName || undefined },
      subject,
      html: `
        <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:680px;margin:0 auto;background:#f4f7fb;color:#0f172a;padding:20px">
          <div style="background:#070b16;color:#ffffff;border:1px solid #182236;border-radius:18px;overflow:hidden">
            <div style="padding:30px 30px 24px;background:linear-gradient(135deg,#0b1020 0%,#111827 58%,#391129 100%)">
              <div style="font-size:0;line-height:0;margin:0 0 26px">
                <img src="${escapeHtml(logoUrl)}" width="148" alt="Righello" style="display:block;border:0;outline:none;text-decoration:none;max-width:148px;height:auto" />
              </div>
              <div style="font-size:12px;color:#ff5aa7;font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin:0 0 10px">Optima by Righello</div>
              <h1 style="margin:0;font-size:32px;line-height:1.08;color:#ffffff;font-weight:900">${escapeHtml(subject)}</h1>
              <p style="margin:14px 0 0;color:#b8c2d6;font-size:15px;line-height:1.55">Aggiornamento operativo inviato dal workspace Righello.</p>
            </div>
            <div style="background:#ffffff;color:#0f172a;padding:32px 30px 28px">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7">Ciao${recipientName ? ` ${escapeHtml(recipientName)}` : ""},</p>
              <div style="white-space:pre-line;line-height:1.72;font-size:17px;color:#172033">${escapeHtml(message)}</div>
              <div style="margin:30px 0 22px">
                <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;padding:15px 20px;border-radius:8px;text-decoration:none;font-weight:900;font-size:15px">Apri Optima</a>
              </div>
              <div style="border-top:1px solid #e5e7eb;padding-top:18px;margin-top:22px">
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">Messaggio inviato da <strong style="color:#0f172a">${escapeHtml(senderName)}</strong> tramite Optima, il sistema operativo interno di Righello.</p>
                <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">Se il pulsante non funziona, apri: <a href="${escapeHtml(dashboardUrl)}" style="color:#db2777;word-break:break-all">${escapeHtml(dashboardUrl)}</a></p>
              </div>
            </div>
          </div>
          <div style="text-align:center;padding:18px 8px 4px;color:#94a3b8;font-size:12px;line-height:1.5">
            Righello · Software, sistemi operativi e prodotti digitali.
          </div>
        </div>
      `,
      text: `${message}\n\nApri Optima: ${dashboardUrl}\nMessaggio inviato da ${senderName} tramite Righello.`,
      replyTo: { email: user.email, name: senderName },
      categories: ["team-message"],
    })

    return Response.json({
      success: true,
      message: "Email inviata con successo",
      recipient: recipient.email,
    })
  } catch (error) {
    console.error("Team send email error:", error)
    return Response.json({ error: "Errore durante l'invio email" }, { status: 500 })
  }
}
