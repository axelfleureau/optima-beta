export const dynamic = "force-dynamic";

/**
 * Invia al cliente la mail preimpostata con il link di approvazione della
 * consegna, e una mail di CONFERMA all'operatore che l'ha spedita (la sua
 * email di accesso a Optima). Reply-to = operatore, così le risposte del
 * cliente tornano a chi ha inviato.
 */

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canAccessTranche } from "@/lib/video-review-acl";
import { sendEmail } from "@/lib/sendgrid";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Template mail brandizzato Righello (inline style: gli email client odiano il CSS esterno). */
function reviewEmailHtml(opts: {
  clientName: string;
  trancheTitle: string;
  link: string;
  fromName: string;
}) {
  const { clientName, trancheTitle, link, fromName } = opts;
  return `<!doctype html><html><body style="margin:0;background:#0b0f17;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e7ebf3">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#111827;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
    <tr><td style="padding:22px 26px;border-bottom:1px solid rgba(255,255,255,.08)">
      <span style="font-size:13px;font-weight:800;letter-spacing:.14em;color:#ff6aa6;text-transform:uppercase">Righello · Post Review</span>
    </td></tr>
    <tr><td style="padding:26px">
      <p style="margin:0 0 6px;font-size:14px;color:#93a2b8">Ciao ${escapeHtml(clientName)},</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#fff">Ci sono contenuti pronti da approvare</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#c3ccdb">
        Abbiamo caricato <strong style="color:#fff">${escapeHtml(trancheTitle)}</strong>. Aprilo per rivederlo: puoi
        <strong style="color:#fff">approvarlo</strong> oppure lasciare <strong style="color:#fff">note di modifica</strong>
        direttamente sul punto del video o sulla slide.
      </p>
      <a href="${link}" style="display:inline-block;background:#d6487e;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:999px">Apri e approva &rarr;</a>
      <p style="margin:22px 0 0;font-size:12px;color:#7c8aa0">Oppure copia questo link:<br><span style="color:#9fb2cc;word-break:break-all">${link}</span></p>
    </td></tr>
    <tr><td style="padding:18px 26px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#7c8aa0">
      Inviato da ${escapeHtml(fromName)} · Righello
    </td></tr>
  </table></body></html>`;
}

function confirmEmailHtml(opts: {
  recipient: string;
  clientName: string;
  trancheTitle: string;
  link: string;
}) {
  const { recipient, clientName, trancheTitle, link } = opts;
  return `<!doctype html><html><body style="margin:0;background:#0b0f17;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e7ebf3">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#111827;border:1px solid rgba(255,255,255,.08);border-radius:16px">
    <tr><td style="padding:24px 26px">
      <span style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#22c55e;text-transform:uppercase">Invio confermato</span>
      <h1 style="margin:8px 0 12px;font-size:19px;color:#fff">Richiesta di approvazione inviata</h1>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#c3ccdb">
        Hai inviato a <strong style="color:#fff">${escapeHtml(recipient)}</strong> il link per approvare
        <strong style="color:#fff">${escapeHtml(trancheTitle)}</strong>${clientName ? ` (${escapeHtml(clientName)})` : ""}.
      </p>
      <p style="margin:14px 0 0;font-size:12px;color:#7c8aa0;word-break:break-all">Link: ${link}</p>
    </td></tr>
  </table></body></html>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getCloudflareDb();
  if (!db) {
    return Response.json(
      { error: "D1 database binding missing" },
      { status: 500 },
    );
  }
  const user = await requireClerkUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const principal = await ensureWorkspacePrincipal(db, user);

  if (!(await canAccessTranche(db, principal, id))) {
    return Response.json({ error: "Consegna non trovata" }, { status: 404 });
  }

  const tranche: any = await db
    .prepare(
      `SELECT t.id, t.title, t.token, c.name AS client_name,
              c.email AS client_email, c.contact_email
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.id = ? AND t.organization_id = ? LIMIT 1`,
    )
    .bind(id, principal.organizationId)
    .first();
  if (!tranche) {
    return Response.json({ error: "Consegna non trovata" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const override = String(body?.to || "").trim();
  const recipient =
    override ||
    String(tranche.client_email || "").trim() ||
    String(tranche.contact_email || "").trim();

  if (!recipient) {
    return Response.json(
      {
        error:
          "Nessuna email per questo cliente. Aggiungila nella scheda cliente o inseriscila qui.",
        needsEmail: true,
      },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(recipient)) {
    return Response.json(
      { error: "Indirizzo email non valido.", needsEmail: true },
      { status: 400 },
    );
  }

  const clientName = String(tranche.client_name || "").trim();
  const trancheTitle = String(tranche.title || "Contenuti");
  const link = `${new URL(request.url).origin}/review/${tranche.token}`;
  const operatorName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "Righello";
  const operatorEmail = String(user.email || "").trim();

  // 1) Mail al cliente (reply-to = operatore).
  const sentToClient = await sendEmail({
    to: recipient,
    subject: `${clientName ? `${clientName} — ` : ""}contenuti da approvare: ${trancheTitle}`,
    html: reviewEmailHtml({
      clientName: clientName || "",
      trancheTitle,
      link,
      fromName: operatorName,
    }),
    text: `Ciao ${clientName || ""},\nci sono contenuti pronti da approvare: ${trancheTitle}.\nApri e approva (o lascia note): ${link}\n\n${operatorName} · Righello`,
    replyTo: operatorEmail && EMAIL_RE.test(operatorEmail)
      ? { email: operatorEmail, name: operatorName }
      : undefined,
  });

  if (!sentToClient) {
    return Response.json(
      { error: "Invio al cliente non riuscito (email non configurata?)." },
      { status: 502 },
    );
  }

  // 2) Conferma all'operatore (best-effort: non blocca se fallisce).
  let confirmationTo: string | null = null;
  if (operatorEmail && EMAIL_RE.test(operatorEmail)) {
    const okConfirm = await sendEmail({
      to: operatorEmail,
      subject: `Inviata richiesta di approvazione${clientName ? ` — ${clientName}` : ""}`,
      html: confirmEmailHtml({ recipient, clientName, trancheTitle, link }),
      text: `Hai inviato a ${recipient} il link per approvare "${trancheTitle}"${clientName ? ` (${clientName})` : ""}.\nLink: ${link}`,
    }).catch(() => false);
    if (okConfirm) confirmationTo = operatorEmail;
  }

  return Response.json({
    ok: true,
    sentTo: recipient,
    confirmationTo,
  });
}
