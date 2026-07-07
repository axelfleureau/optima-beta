import { TokenPlan } from "@/lib/constants/token-plans";
import {
  appUrl,
  escapeHtml,
  renderBrandedEmail,
  renderEmailPanel,
  renderInfoRows,
} from "@/lib/email-branding";
import { sendEmail } from "@/lib/sendgrid";

interface SubscriptionEmailData {
  userEmail: string;
  userName: string;
  plan: TokenPlan;
  billingCycleEnd?: Date;
}

function billingUrl() {
  return `${appUrl()}/dashboard/settings/billing`;
}

function dashboardUrl() {
  return `${appUrl()}/dashboard`;
}

function planPanel(plan: TokenPlan) {
  return renderEmailPanel(
    `${renderInfoRows([
      { label: "Piano", value: plan.name, strong: true },
      { label: "Prezzo", value: `EUR ${plan.price}/mese`, strong: true },
      {
        label: "Token mensili",
        value: plan.tokenLimit.toLocaleString("it-IT"),
        strong: true,
      },
    ])}
    <div style="height:1px;background:#e2e8f0;margin:14px 0"></div>
    <div style="font-size:13px;color:#64748b;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Funzionalita incluse</div>
    <ul style="margin:0;padding-left:18px;color:#334155;line-height:1.7">
      ${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
    </ul>`,
  );
}

export class SubscriptionEmailService {
  static async sendSubscriptionConfirmation(data: SubscriptionEmailData) {
    const { userEmail, userName, plan, billingCycleEnd } = data;

    try {
      await sendEmail({
        to: { email: userEmail, name: userName },
        subject: `Benvenuto in ${plan.name}`,
        html: renderBrandedEmail({
          preheader: `La tua sottoscrizione ${plan.name} e attiva.`,
          eyebrow: "Subscription",
          title: `Benvenuto in ${plan.name}`,
          intro: `Ciao ${userName}, il tuo piano e ora attivo e puoi iniziare a usare le funzionalita AI di Optima.`,
          sections: [
            { title: "Il tuo piano", html: planPanel(plan) },
            ...(billingCycleEnd
              ? [
                  {
                    title: "Rinnovo",
                    html: renderEmailPanel(
                      renderInfoRows([
                        {
                          label: "Prossimo rinnovo",
                          value: billingCycleEnd.toLocaleDateString("it-IT"),
                          strong: true,
                        },
                      ]),
                    ),
                  },
                ]
              : []),
          ],
          cta: { label: "Vai alla dashboard", url: dashboardUrl() },
          footerNote:
            "Gestisci il tuo piano dalle impostazioni di fatturazione.",
        }),
        text: `Ciao ${userName}, il tuo piano ${plan.name} e attivo. Dashboard: ${dashboardUrl()}`,
        categories: ["subscription-confirmation"],
      });

      console.log(`✅ Sent subscription confirmation to ${userEmail}`);
    } catch (error) {
      const err = error as Error;
      console.error(
        `❌ Failed to send subscription confirmation:`,
        err.message,
      );
      throw error;
    }
  }

  static async sendUpgradeNotification(
    data: SubscriptionEmailData & { previousPlan: TokenPlan },
  ) {
    const { userEmail, userName, plan, previousPlan } = data;

    try {
      await sendEmail({
        to: { email: userEmail, name: userName },
        subject: `Upgrade completato a ${plan.name}`,
        html: renderBrandedEmail({
          preheader: `Upgrade completato da ${previousPlan.name} a ${plan.name}.`,
          eyebrow: "Subscription",
          title: "Upgrade completato",
          intro: `Ciao ${userName}, il tuo upgrade a ${plan.name} e stato completato con successo.`,
          sections: [
            {
              title: "Confronto piano",
              html: renderEmailPanel(
                renderInfoRows([
                  { label: "Piano precedente", value: previousPlan.name },
                  { label: "Nuovo piano", value: plan.name, strong: true },
                  {
                    label: "Token mensili",
                    value: `${previousPlan.tokenLimit.toLocaleString("it-IT")} -> ${plan.tokenLimit.toLocaleString("it-IT")}`,
                    strong: true,
                  },
                  {
                    label: "Prezzo",
                    value: `EUR ${previousPlan.price} -> EUR ${plan.price}`,
                    strong: true,
                  },
                ]),
              ),
            },
          ],
          cta: { label: "Esplora le funzionalita", url: dashboardUrl() },
        }),
        text: `Ciao ${userName}, upgrade completato a ${plan.name}. Dashboard: ${dashboardUrl()}`,
        categories: ["subscription-upgrade"],
      });

      console.log(`✅ Sent upgrade notification to ${userEmail}`);
    } catch (error) {
      const err = error as Error;
      console.error(`❌ Failed to send upgrade notification:`, err.message);
      throw error;
    }
  }

  static async sendCancellationConfirmation(data: SubscriptionEmailData) {
    const { userEmail, userName, plan, billingCycleEnd } = data;
    const accessUntil =
      billingCycleEnd?.toLocaleDateString("it-IT") || "fine ciclo corrente";

    try {
      await sendEmail({
        to: { email: userEmail, name: userName },
        subject: `Conferma cancellazione - ${plan.name}`,
        html: renderBrandedEmail({
          preheader: `Cancellazione registrata per ${plan.name}.`,
          eyebrow: "Subscription",
          title: "Sottoscrizione cancellata",
          intro: `Ciao ${userName}, abbiamo ricevuto la richiesta di cancellazione per ${plan.name}.`,
          sections: [
            {
              title: "Accesso",
              html: renderEmailPanel(
                renderInfoRows([
                  { label: "Piano", value: plan.name, strong: true },
                  {
                    label: "Accesso attivo fino a",
                    value: accessUntil,
                    strong: true,
                  },
                  { label: "Rinnovo automatico", value: "Disattivato" },
                ]),
              ),
            },
          ],
          cta: { label: "Gestisci fatturazione", url: billingUrl() },
          footerNote:
            "Puoi riattivare la sottoscrizione in qualsiasi momento dalle impostazioni.",
        }),
        text: `Ciao ${userName}, cancellazione registrata per ${plan.name}. Accesso attivo fino a ${accessUntil}. Gestisci: ${billingUrl()}`,
        categories: ["subscription-cancellation"],
      });

      console.log(`✅ Sent cancellation confirmation to ${userEmail}`);
    } catch (error) {
      const err = error as Error;
      console.error(
        `❌ Failed to send cancellation confirmation:`,
        err.message,
      );
      throw error;
    }
  }
}
