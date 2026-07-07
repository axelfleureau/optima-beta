// Email Service for Invoice Delivery
import type { Quote } from "@/lib/ai-quote-service";
import {
  escapeHtml,
  renderBrandedEmail,
  renderEmailPanel,
  renderInfoRows,
} from "@/lib/email-branding";
import {
  getInvoicePDFBlob,
  type InvoicePaymentData,
} from "@/lib/invoice-generator";
import { sendEmail } from "@/lib/sendgrid";

function toBase64(arrayBuffer: ArrayBuffer) {
  return Buffer.from(arrayBuffer).toString("base64");
}

export async function sendInvoiceEmail(
  invoiceNumber: string,
  payment: InvoicePaymentData,
  quote: Quote,
  clientName: string,
  clientEmail: string,
): Promise<boolean> {
  try {
    // Generate PDF invoice
    const pdfBlob = getInvoicePDFBlob(
      invoiceNumber,
      payment,
      quote,
      clientName,
      clientEmail,
    );

    // Determine payment type label for email
    let paymentTypeLabel = "Pagamento Completo";
    if (payment.paymentType === "deposit") {
      paymentTypeLabel = `Deposito${payment.depositPercentage ? ` (${payment.depositPercentage}%)` : ""}`;
    } else if (payment.paymentType === "milestone") {
      paymentTypeLabel = `Milestone${payment.milestoneName ? `: ${payment.milestoneName}` : ""}`;
    }

    // Email HTML body
    const emailHTML = renderBrandedEmail({
      preheader: `Fattura ${invoiceNumber} per pagamento ricevuto.`,
      eyebrow: "Fattura",
      title: "Fattura pagamento ricevuto",
      intro: `Gentile ${clientName}, grazie per il pagamento. Trovi in allegato la fattura relativa al pagamento ricevuto.`,
      sections: [
        {
          title: "Dettagli fattura",
          html: renderEmailPanel(
            renderInfoRows([
              { label: "Numero fattura", value: invoiceNumber, strong: true },
              { label: "Preventivo", value: quote.title, strong: true },
              { label: "Tipo pagamento", value: paymentTypeLabel },
              {
                label: "Importo",
                value: `EUR ${payment.amount.toFixed(2)}`,
                strong: true,
              },
              {
                label: "Stato",
                value:
                  payment.status === "succeeded"
                    ? "Completato"
                    : payment.status,
              },
            ]),
          ),
        },
      ],
      footerNote: "Per qualsiasi domanda, non esitare a contattarci.",
    });

    await sendEmail({
      to: { email: clientEmail, name: clientName },
      subject: `Fattura ${invoiceNumber} - Pagamento Ricevuto`,
      html: emailHTML,
      attachments: [
        {
          filename: `Fattura_${invoiceNumber}.pdf`,
          content: toBase64(await pdfBlob.arrayBuffer()),
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
      categories: ["invoice"],
    });

    console.log(
      `✅ Invoice email sent to ${clientEmail} for invoice ${invoiceNumber}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Error sending invoice email:", error);
    return false;
  }
}

export type ReminderType = "threeDay" | "oneDay" | "sameDay";

export interface MilestoneReminderData {
  quoteTitle: string;
  quoteName: string;
  milestoneName: string;
  milestoneAmount: number;
  dueDate: Date;
  paymentUrl: string;
  clientName: string;
}

function getMilestoneReminderContent(
  type: ReminderType,
  data: MilestoneReminderData,
) {
  const formattedDate = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data.dueDate);

  const formattedAmount = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(data.milestoneAmount);

  if (type === "threeDay") {
    return {
      subject: `Promemoria: Milestone "${data.milestoneName}" in scadenza tra 3 giorni`,
      title: "Promemoria milestone",
      urgencyColor: "#3b82f6",
      message: `
        <p>Gentile ${data.clientName},</p>
        <p>Ti ricordiamo che la milestone <strong>"${data.milestoneName}"</strong> relativa al preventivo <strong>"${data.quoteName}"</strong> è in scadenza tra <strong>3 giorni</strong>.</p>
        <p>Data scadenza: <strong>${formattedDate}</strong></p>
        <p>Per procedere con il pagamento e sbloccare l'avanzamento del progetto, clicca sul pulsante qui sotto.</p>
      `,
      ctaText: "Procedi al Pagamento",
      ctaBg: "#3b82f6",
    };
  }

  if (type === "oneDay") {
    return {
      subject: `⚠️ Urgente: Milestone "${data.milestoneName}" scade domani`,
      title: "Promemoria urgente",
      urgencyColor: "#f59e0b",
      message: `
        <p>Gentile ${data.clientName},</p>
        <p>La milestone <strong>"${data.milestoneName}"</strong> del preventivo <strong>"${data.quoteName}"</strong> scadrà <strong>domani (${formattedDate})</strong>.</p>
        <p>Ti invitiamo a completare il pagamento per evitare ritardi nell'avanzamento del progetto.</p>
      `,
      ctaText: "Paga Ora",
      ctaBg: "#f59e0b",
    };
  }

  return {
    subject: `🚨 Ultimo Avviso: Milestone "${data.milestoneName}" scade oggi`,
    title: "Ultimo avviso",
    urgencyColor: "#ef4444",
    message: `
      <p>Gentile ${data.clientName},</p>
      <p>La milestone <strong>"${data.milestoneName}"</strong> del preventivo <strong>"${data.quoteName}"</strong> scade <strong>oggi (${formattedDate})</strong>.</p>
      <p><strong>Questo è l'ultimo giorno disponibile</strong> per completare il pagamento. Ti preghiamo di procedere immediatamente per non bloccare l'avanzamento del progetto.</p>
    `,
    ctaText: "Paga Immediatamente",
    ctaBg: "#ef4444",
  };
}

export async function sendMilestoneReminder(
  reminderType: ReminderType,
  data: MilestoneReminderData,
  clientEmail: string,
): Promise<boolean> {
  try {
    const content = getMilestoneReminderContent(reminderType, data);
    const formattedAmount = new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(data.milestoneAmount);

    const emailHTML = renderBrandedEmail({
      preheader: `${content.title}: ${data.milestoneName}`,
      eyebrow: "Milestone",
      title: content.title,
      intro: `${data.clientName}, la milestone "${data.milestoneName}" relativa al preventivo "${data.quoteName}" richiede attenzione.`,
      sections: [
        {
          title: "Messaggio",
          html: renderEmailPanel(
            `<div style="color:#334155;line-height:1.7">${content.message}</div>`,
          ),
        },
        {
          title: "Dettagli milestone",
          html: renderEmailPanel(
            renderInfoRows([
              { label: "Preventivo", value: data.quoteName, strong: true },
              { label: "Milestone", value: data.milestoneName, strong: true },
              { label: "Importo", value: formattedAmount, strong: true },
              {
                label: "Scadenza",
                value: new Intl.DateTimeFormat("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(data.dueDate),
                strong: true,
              },
            ]),
          ),
        },
      ],
      cta: { label: content.ctaText, url: data.paymentUrl },
      footerNote:
        "Per qualsiasi domanda o chiarimento, non esitare a contattarci.",
    });

    await sendEmail({
      to: { email: clientEmail, name: data.clientName },
      subject: content.subject,
      html: emailHTML,
      categories: ["milestone-reminder", reminderType],
    });

    console.log(
      `✅ Milestone reminder (${reminderType}) sent to ${clientEmail} for milestone "${data.milestoneName}"`,
    );
    return true;
  } catch (error) {
    console.error(
      `❌ Error sending milestone reminder (${reminderType}):`,
      error,
    );
    return false;
  }
}
