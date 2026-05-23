import { sendEmail } from "@/lib/sendgrid"

interface InviteEmailData {
  to: string
  firstName: string
  lastName: string
  inviterName: string
  inviterEmail: string
  role: string
  resetLink: string
  customMessage?: string
}

interface ClientWelcomeEmailData {
  clientName: string
  clientEmail: string
  password?: string
  agencyName: string
  loginUrl?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://optima-beta-staging.axel-15d.workers.dev"
}

export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  const activationUrl = data.resetLink || `${appUrl()}/register?email=${encodeURIComponent(data.to)}`
  const fullName = `${data.firstName} ${data.lastName}`.trim()
  const customMessage = data.customMessage?.trim()

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;color:#0f172a">
      <div style="background:#0b1323;color:white;padding:32px;border-radius:16px 16px 0 0">
        <div style="font-size:14px;color:#f472b6;font-weight:700;letter-spacing:.04em">OPTIMA</div>
        <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2">Invito al team</h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px">
        <p>Ciao ${escapeHtml(fullName)},</p>
        <p>${escapeHtml(data.inviterName)} ti ha invitato a entrare nel team Optima con ruolo <strong>${escapeHtml(data.role)}</strong>.</p>
        ${customMessage ? `<blockquote style="border-left:4px solid #ec4899;margin:24px 0;padding:12px 16px;background:#fdf2f8;color:#831843">${escapeHtml(customMessage)}</blockquote>` : ""}
        <p style="margin:28px 0">
          <a href="${activationUrl}" style="display:inline-block;background:#ec4899;color:white;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:700">Attiva account</a>
        </p>
        <p style="font-size:13px;color:#64748b">Invito inviato da ${escapeHtml(data.inviterEmail)}. Se non ti aspettavi questa email puoi ignorarla.</p>
      </div>
    </div>
  `

  const sent = await sendEmail({
    to: { email: data.to, name: fullName },
    subject: `Invito a Optima da ${data.inviterName}`,
    html,
    text: `Ciao ${fullName}, sei stato invitato a Optima da ${data.inviterName}. Attiva il tuo account: ${activationUrl}`,
    replyTo: data.inviterEmail ? { email: data.inviterEmail, name: data.inviterName } : undefined,
    categories: ["team-invite"],
  })

  if (!sent) {
    throw new Error("SendGrid non configurato")
  }
}

export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  await sendEmail({
    to: { email, name: firstName },
    subject: "Benvenuto in Optima",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto">
        <h1>Benvenuto in Optima, ${escapeHtml(firstName)}.</h1>
        <p>Il tuo account è pronto. Puoi accedere alla piattaforma dal link qui sotto.</p>
        <p><a href="${appUrl()}/login" style="color:#ec4899;font-weight:700">Accedi a Optima</a></p>
      </div>
    `,
    text: `Benvenuto in Optima, ${firstName}. Accedi: ${appUrl()}/login`,
    categories: ["welcome"],
  })
}

export async function sendClientWelcomeEmail(data: ClientWelcomeEmailData): Promise<void> {
  const loginUrl = data.loginUrl || `${appUrl()}/login`
  const credentialsBlock = data.password
    ? `<div style="background:#f8fafc;border-left:4px solid #ec4899;padding:16px;margin:22px 0">
        <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(data.clientEmail)}</p>
        <p style="margin:0"><strong>Password temporanea:</strong> ${escapeHtml(data.password)}</p>
      </div>`
    : ""

  await sendEmail({
    to: { email: data.clientEmail, name: data.clientName },
    subject: `Benvenuto in ${data.agencyName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;color:#0f172a">
        <div style="background:#0b1323;color:white;padding:32px;border-radius:16px 16px 0 0">
          <div style="font-size:14px;color:#f472b6;font-weight:700;letter-spacing:.04em">${escapeHtml(data.agencyName)}</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2">Il tuo account è pronto</h1>
        </div>
        <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px">
          <p>Ciao ${escapeHtml(data.clientName)},</p>
          <p>abbiamo creato il tuo accesso alla piattaforma per seguire lavori, task e avanzamenti.</p>
          ${credentialsBlock}
          <p style="margin:28px 0">
            <a href="${loginUrl}" style="display:inline-block;background:#ec4899;color:white;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:700">Accedi alla piattaforma</a>
          </p>
          <p style="font-size:13px;color:#64748b">Ti consigliamo di cambiare password al primo accesso.</p>
        </div>
      </div>
    `,
    text: `Ciao ${data.clientName}, il tuo account è pronto. Accedi: ${loginUrl}`,
    categories: ["client-welcome"],
  })
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Reimposta la password di Optima",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto">
        <h1>Reimposta la password</h1>
        <p>Usa il link qui sotto per scegliere una nuova password.</p>
        <p><a href="${resetLink}" style="color:#ec4899;font-weight:700">Reimposta password</a></p>
      </div>
    `,
    text: `Reimposta la password: ${resetLink}`,
    categories: ["password-reset"],
  })
}
