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

    await sendEmail({
      to: { email: String(recipient.email), name: recipientName || undefined },
      subject,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;color:#0f172a">
          <div style="background:#0b1323;color:white;padding:28px;border-radius:14px 14px 0 0">
            <div style="font-size:14px;color:#f472b6;font-weight:700;letter-spacing:.04em">OPTIMA</div>
            <h1 style="margin:10px 0 0;font-size:24px">${escapeHtml(subject)}</h1>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 14px 14px;background:white">
            <p style="white-space:pre-line;line-height:1.65">${escapeHtml(message)}</p>
            <p style="margin-top:28px;color:#64748b;font-size:13px">Messaggio inviato da ${escapeHtml(senderName)}.</p>
          </div>
        </div>
      `,
      text: message,
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
