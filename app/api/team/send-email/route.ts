export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import {
  appUrl,
  escapeHtml,
  renderBrandedEmail,
  renderEmailPanel,
  resolveEmailBrand,
} from "@/lib/email-branding";
import { sendEmail } from "@/lib/sendgrid";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const SENDER_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
  "capo-reparto",
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (!SENDER_ROLES.has(principal.role)) {
      return Response.json(
        { error: "Non hai i permessi per inviare email" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!userId || !subject || !message) {
      return Response.json(
        { error: "Campi obbligatori mancanti" },
        { status: 400 },
      );
    }

    const recipient = await db
      .prepare(
        `SELECT email, first_name, last_name
         FROM members
         WHERE id = ? AND organization_id = ?
         LIMIT 1`,
      )
      .bind(userId, principal.organizationId)
      .first();

    if (!recipient?.email) {
      return Response.json(
        { error: "Utente non trovato o senza email" },
        { status: 404 },
      );
    }

    const senderName =
      `${user.firstName} ${user.lastName}`.trim() || user.email;
    const recipientName =
      `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim();
    const baseUrl = appUrl().replace(/\/$/, "");
    const dashboardUrl = `${baseUrl}/dashboard`;
    const brand = await resolveEmailBrand(db, principal.organizationId);

    await sendEmail({
      to: { email: String(recipient.email), name: recipientName || undefined },
      subject,
      html: renderBrandedEmail({
        brand,
        preheader: `Messaggio operativo da ${senderName}.`,
        eyebrow: "Messaggio team",
        title: subject,
        intro: `Ciao${recipientName ? ` ${recipientName}` : ""}, hai ricevuto un aggiornamento operativo dal workspace.`,
        sections: [
          {
            title: "Messaggio",
            html: renderEmailPanel(
              `<div style="white-space:pre-line;line-height:1.72;font-size:16px;color:#172033">${escapeHtml(message)}</div>`,
            ),
          },
        ],
        cta: { label: "Apri Optima", url: dashboardUrl },
        footerNote: `Messaggio inviato da ${senderName} tramite Optima.`,
      }),
      text: `${message}\n\nApri Optima: ${dashboardUrl}\nMessaggio inviato da ${senderName} tramite Righello.`,
      replyTo: { email: user.email, name: senderName },
      categories: ["team-message"],
    });

    return Response.json({
      success: true,
      message: "Email inviata con successo",
      recipient: recipient.email,
    });
  } catch (error) {
    console.error("Team send email error:", error);
    return Response.json(
      { error: "Errore durante l'invio email" },
      { status: 500 },
    );
  }
}
