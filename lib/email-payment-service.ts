/**
 * Email Payment Service
 *
 * PHASE 5C: Quote Auto-Payment - Email Notifications
 *
 * This service handles email notifications for payment events,
 * using SendGrid's HTTP API for Cloudflare Workers compatibility.
 */

import {
  escapeHtml,
  renderBrandedEmail,
  renderEmailPanel,
  renderInfoRows,
} from "@/lib/email-branding";
import { sendEmail } from "@/lib/sendgrid";

/**
 * Send payment success confirmation email to client
 *
 * @param clientEmail - Client's email address
 * @param clientName - Client's name
 * @param quoteName - Name/title of the quote
 * @param amount - Payment amount in cents
 * @param currency - Currency code (EUR, USD, etc.)
 */
export async function sendPaymentSuccessEmail(
  clientEmail: string,
  clientName: string,
  quoteName: string,
  amount: number,
  currency: string,
): Promise<void> {
  try {
    const formattedAmount = (amount / 100).toFixed(2);
    const currencySymbol = currency.toUpperCase();

    const subject = `Pagamento confermato - ${quoteName}`;

    const html = renderBrandedEmail({
      preheader: `Pagamento confermato per ${quoteName}.`,
      eyebrow: "Pagamento",
      title: "Pagamento confermato",
      intro: `Gentile ${clientName}, il pagamento per il preventivo ${quoteName} e stato completato con successo.`,
      sections: [
        {
          title: "Dettagli pagamento",
          html: renderEmailPanel(
            `<div style="font-size:30px;font-weight:900;color:#10b981;margin-bottom:14px">${escapeHtml(formattedAmount)} ${escapeHtml(currencySymbol)}</div>${renderInfoRows(
              [
                { label: "Preventivo", value: quoteName, strong: true },
                {
                  label: "Importo",
                  value: `${formattedAmount} ${currencySymbol}`,
                  strong: true,
                },
                {
                  label: "Data",
                  value: new Date().toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }),
                },
                { label: "Stato", value: "Pagato", strong: true },
              ],
            )}`,
          ),
        },
      ],
      footerNote:
        "Questa e una conferma automatica del pagamento. Per qualsiasi domanda, contatta il nostro supporto.",
    });

    await sendEmail({
      to: { email: clientEmail, name: clientName },
      subject,
      html,
      categories: ["payment-success"],
    });

    console.log(`✅ Sent payment success email to ${clientEmail}`);
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Failed to send payment success email:`, err.message);
    throw error;
  }
}

/**
 * Send payment failure notification email to client
 *
 * @param clientEmail - Client's email address
 * @param clientName - Client's name
 * @param quoteName - Name/title of the quote
 * @param errorMessage - Error message from payment failure
 */
export async function sendPaymentFailureEmail(
  clientEmail: string,
  clientName: string,
  quoteName: string,
  errorMessage?: string,
): Promise<void> {
  try {
    const subject = `Pagamento non riuscito - ${quoteName}`;

    const html = renderBrandedEmail({
      preheader: `Pagamento non riuscito per ${quoteName}.`,
      eyebrow: "Pagamento",
      title: "Pagamento non riuscito",
      intro: `Gentile ${clientName}, il pagamento per il preventivo ${quoteName} non e andato a buon fine.`,
      sections: [
        ...(errorMessage
          ? [
              {
                title: "Motivo",
                html: renderEmailPanel(
                  `<div style="color:#991b1b">${escapeHtml(errorMessage)}</div>`,
                ),
              },
            ]
          : []),
        {
          title: "Cosa puoi fare",
          html: renderEmailPanel(
            `<ul style="margin:0;padding-left:18px;color:#334155;line-height:1.7">
              <li>Verifica fondi e limiti della carta.</li>
              <li>Prova con un altro metodo di pagamento.</li>
              <li>Contatta la banca se il blocco persiste.</li>
            </ul>`,
          ),
        },
      ],
      footerNote: "Per assistenza, contatta il nostro supporto.",
    });

    await sendEmail({
      to: { email: clientEmail, name: clientName },
      subject,
      html,
      categories: ["payment-failure"],
    });

    console.log(`✅ Sent payment failure email to ${clientEmail}`);
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Failed to send payment failure email:`, err.message);
    throw error;
  }
}
