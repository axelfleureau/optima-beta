import {
  appUrl,
  defaultEmailBrand,
  escapeHtml,
  type EmailBrand,
  renderBrandedEmail,
  renderEmailPanel,
  renderInfoRows,
} from "@/lib/email-branding";
import { sendEmail } from "@/lib/sendgrid";

interface InviteEmailData {
  to: string;
  firstName: string;
  lastName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  resetLink: string;
  loginLink?: string;
  organizationName?: string;
  customMessage?: string;
}

interface ClientWelcomeEmailData {
  clientName: string;
  clientEmail: string;
  password?: string;
  agencyName: string;
  loginUrl?: string;
  brand?: EmailBrand;
}

interface OperationalReportSummaryEmailData {
  to?: string;
  brand?: EmailBrand;
  memberName: string;
  memberEmail: string;
  dateLabel: string;
  checkInLabel: string;
  checkOutLabel: string;
  presenceLabel: string;
  activityLabel: string;
  notes?: string;
  entries: Array<{
    projectName?: string;
    clientName?: string;
    taskTitle?: string;
    note: string;
    minutesLabel: string;
  }>;
}

interface OperationalReportChangesRequestedEmailData {
  to: string;
  recipientName: string;
  reviewerName: string;
  brand?: EmailBrand;
  dateLabel: string;
  notes?: string;
  reportUrl?: string;
}

function activityRows(entries: OperationalReportSummaryEmailData["entries"]) {
  if (!entries.length) {
    return `<tr><td colspan="5" style="padding:14px;color:#64748b">Nessuna attivita registrata.</td></tr>`;
  }

  return entries
    .map(
      (entry) => `
        <tr>
          <td style="padding:11px;border-bottom:1px solid #e2e8f0;font-weight:800;color:#0f172a;white-space:nowrap">${escapeHtml(entry.minutesLabel)}</td>
          <td style="padding:11px;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(entry.projectName || "Attivita generale")}</td>
          <td style="padding:11px;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(entry.clientName || "-")}</td>
          <td style="padding:11px;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(entry.taskTitle || "-")}</td>
          <td style="padding:11px;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(entry.note || "Attivita registrata")}</td>
        </tr>
      `,
    )
    .join("");
}

export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  const activationUrl =
    data.resetLink ||
    `${appUrl()}/register?email=${encodeURIComponent(data.to)}`;
  const loginUrl =
    data.loginLink || `${appUrl()}/login?email=${encodeURIComponent(data.to)}`;
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const customMessage = data.customMessage?.trim();
  const organizationName = data.organizationName || "Righello";
  const brand = defaultEmailBrand(organizationName);

  const sent = await sendEmail({
    to: { email: data.to, name: fullName },
    subject: `Invito a Optima da ${data.inviterName}`,
    html: renderBrandedEmail({
      brand,
      preheader: `${data.inviterName} ti ha invitato nel workspace ${organizationName}.`,
      eyebrow: "Invito team",
      title: `Sei stato invitato in ${organizationName}`,
      intro: `Ciao ${fullName || data.to}, ${data.inviterName} ti ha invitato a entrare nel workspace Optima con ruolo ${data.role}.`,
      sections: [
        customMessage
          ? {
              title: "Messaggio",
              html: renderEmailPanel(
                `<div style="color:#831843;white-space:pre-wrap">${escapeHtml(customMessage)}</div>`,
              ),
            }
          : {
              title: "Accesso",
              html: renderInfoRows([
                {
                  label: "Organizzazione",
                  value: organizationName,
                  strong: true,
                },
                { label: "Ruolo", value: data.role, strong: true },
                { label: "Invitato da", value: data.inviterEmail },
              ]),
            },
      ],
      cta: { label: "Accetta invito", url: activationUrl },
      footerNote: `Invito inviato da ${data.inviterEmail}. Se hai gia un account puoi accedere da ${loginUrl}`,
    }),
    text: `Ciao ${fullName || data.to}, sei stato invitato in ${organizationName} su Optima da ${data.inviterName}. Accetta invito: ${activationUrl} - Se hai gia un account accedi da: ${loginUrl}`,
    replyTo: data.inviterEmail
      ? { email: data.inviterEmail, name: data.inviterName }
      : undefined,
    categories: ["team-invite"],
  });

  if (!sent) {
    throw new Error("SendGrid non configurato");
  }
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string,
): Promise<void> {
  const loginUrl = `${appUrl()}/login`;
  await sendEmail({
    to: { email, name: firstName },
    subject: "Benvenuto in Optima",
    html: renderBrandedEmail({
      preheader: "Il tuo account Optima e pronto.",
      eyebrow: "Benvenuto",
      title: `Benvenuto in Optima, ${firstName}`,
      intro:
        "Il tuo account e pronto. Puoi accedere alla piattaforma e iniziare a lavorare su task, rapportini e workspace.",
      cta: { label: "Accedi a Optima", url: loginUrl },
    }),
    text: `Benvenuto in Optima, ${firstName}. Accedi: ${loginUrl}`,
    categories: ["welcome"],
  });
}

export async function sendClientWelcomeEmail(
  data: ClientWelcomeEmailData,
): Promise<void> {
  const loginUrl = data.loginUrl || `${appUrl()}/login`;
  const brand = data.brand || defaultEmailBrand(data.agencyName);
  const credentialsBlock = data.password
    ? renderEmailPanel(
        renderInfoRows([
          { label: "Email", value: data.clientEmail, strong: true },
          { label: "Password temporanea", value: data.password, strong: true },
        ]),
      )
    : "";

  await sendEmail({
    to: { email: data.clientEmail, name: data.clientName },
    subject: `Benvenuto in ${data.agencyName}`,
    html: renderBrandedEmail({
      brand,
      preheader: `Il tuo accesso a ${data.agencyName} e pronto.`,
      eyebrow: "Account cliente",
      title: "Il tuo account e pronto",
      intro: `Ciao ${data.clientName}, abbiamo creato il tuo accesso alla piattaforma per seguire lavori, task e avanzamenti.`,
      sections: credentialsBlock
        ? [{ title: "Credenziali", html: credentialsBlock }]
        : undefined,
      cta: { label: "Accedi alla piattaforma", url: loginUrl },
      footerNote: "Ti consigliamo di cambiare password al primo accesso.",
    }),
    text: `Ciao ${data.clientName}, il tuo account e pronto. Accedi: ${loginUrl}`,
    categories: ["client-welcome"],
  });
}

export async function sendOperationalReportSummaryEmail(
  data: OperationalReportSummaryEmailData,
): Promise<boolean> {
  const recipient = data.to || "amministrazione@wearerighello.com";
  const brand = data.brand || defaultEmailBrand();

  return sendEmail({
    to: recipient,
    subject: `Rapportino ${data.memberName} - ${data.dateLabel}`,
    html: renderBrandedEmail({
      brand,
      preheader: `${data.memberName} ha inviato il rapportino ${data.dateLabel}.`,
      eyebrow: "Rapportini",
      title: "Rapportino inviato",
      intro: `${data.memberName} ha inviato il riepilogo operativo per ${data.dateLabel}.`,
      sections: [
        {
          title: "Riepilogo giornata",
          html: renderEmailPanel(
            renderInfoRows([
              {
                label: "Dipendente",
                value: `${data.memberName} (${data.memberEmail})`,
                strong: true,
              },
              {
                label: "Entrata / uscita",
                value: `${data.checkInLabel} - ${data.checkOutLabel}`,
                strong: true,
              },
              {
                label: "Presenza netta",
                value: data.presenceLabel,
                strong: true,
              },
              {
                label: "Attivita registrate",
                value: data.activityLabel,
                strong: true,
              },
            ]),
          ),
        },
        {
          title: "Attivita",
          html: `
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <thead>
                <tr style="background:#f1f5f9;text-align:left">
                  <th style="padding:11px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Tempo</th>
                  <th style="padding:11px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Progetto</th>
                  <th style="padding:11px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Cliente</th>
                  <th style="padding:11px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Task</th>
                  <th style="padding:11px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Nota</th>
                </tr>
              </thead>
              <tbody>${activityRows(data.entries)}</tbody>
            </table>
          `,
        },
        ...(data.notes?.trim()
          ? [
              {
                title: "Note fine giornata",
                html: renderEmailPanel(
                  `<div style="white-space:pre-wrap;color:#334155">${escapeHtml(data.notes)}</div>`,
                ),
              },
            ]
          : []),
      ],
    }),
    text: [
      `Rapportino ${data.memberName} - ${data.dateLabel}`,
      `Entrata/uscita: ${data.checkInLabel} - ${data.checkOutLabel}`,
      `Presenza: ${data.presenceLabel}`,
      `Attivita: ${data.activityLabel}`,
      data.notes ? `Note: ${data.notes}` : "",
      ...data.entries.map(
        (entry) =>
          `- ${entry.minutesLabel} | ${entry.projectName || "Attivita generale"} | ${entry.clientName || "-"} | ${entry.taskTitle || "-"} | ${entry.note}`,
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    categories: ["operational-report"],
  });
}

export async function sendOperationalReportChangesRequestedEmail(
  data: OperationalReportChangesRequestedEmailData,
): Promise<boolean> {
  const brand = data.brand || defaultEmailBrand();
  const reportUrl = data.reportUrl || `${appUrl()}/rapportini`;
  const notes = data.notes?.trim();

  return sendEmail({
    to: { email: data.to, name: data.recipientName },
    subject: `Modifiche richieste al rapportino - ${data.dateLabel}`,
    html: renderBrandedEmail({
      brand,
      preheader: `${data.reviewerName} ha richiesto modifiche al rapportino ${data.dateLabel}.`,
      eyebrow: "Review rapportino",
      title: "Sono richieste modifiche",
      intro: `Ciao ${data.recipientName}, ${data.reviewerName} ha richiesto una revisione del rapportino del ${data.dateLabel}.`,
      sections: [
        {
          title: "Dettaglio review",
          html: renderEmailPanel(
            renderInfoRows([
              { label: "Giornata", value: data.dateLabel, strong: true },
              { label: "Responsabile", value: data.reviewerName, strong: true },
              { label: "Stato", value: "Modifiche richieste", strong: true },
            ]),
          ),
        },
        {
          title: "Indicazioni",
          html: renderEmailPanel(
            `<div style="white-space:pre-wrap;color:#334155">${escapeHtml(notes || "Apri il rapportino, controlla orari, attivita e note, poi reinvialo per la review.")}</div>`,
          ),
        },
      ],
      cta: { label: "Apri rapportino", url: reportUrl },
    }),
    text: [
      `Modifiche richieste al rapportino - ${data.dateLabel}`,
      `${data.reviewerName} ha richiesto una revisione.`,
      notes ? `Note: ${notes}` : "",
      `Apri rapportino: ${reportUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    categories: ["operational-report-review"],
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Reimposta la password di Optima",
    html: renderBrandedEmail({
      preheader: "Richiesta di reset password Optima.",
      eyebrow: "Sicurezza",
      title: "Reimposta la password",
      intro: "Usa il link qui sotto per scegliere una nuova password.",
      cta: { label: "Reimposta password", url: resetLink },
    }),
    text: `Reimposta la password: ${resetLink}`,
    categories: ["password-reset"],
  });
}
