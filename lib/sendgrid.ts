type EmailAddress = {
  email: string
  name?: string
}

type EmailAttachment = {
  content: string
  filename: string
  type?: string
  disposition?: "attachment" | "inline"
  contentId?: string
}

export type SendEmailParams = {
  to: string | EmailAddress | Array<string | EmailAddress>
  subject: string
  html?: string
  text?: string
  from?: EmailAddress
  replyTo?: EmailAddress
  attachments?: EmailAttachment[]
  categories?: string[]
}

function normalizeRecipient(recipient: string | EmailAddress): EmailAddress {
  return typeof recipient === "string" ? { email: recipient } : recipient
}

function getDefaultFrom(): EmailAddress {
  return {
    email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || "noreply@wearerighello.com",
    name: process.env.SENDGRID_FROM_NAME || "Optima by Righello",
  }
}

export function isSendGridConfigured() {
  return Boolean(process.env.SENDGRID_API_KEY?.trim())
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey?.trim()) {
    console.warn("SENDGRID_API_KEY is not configured. Email skipped.")
    return false
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to]
  const to = recipients.map(normalizeRecipient)

  if (to.length === 0 || !to.every((recipient) => recipient.email)) {
    throw new Error("Missing email recipient")
  }

  const content = [
    params.text ? { type: "text/plain", value: params.text } : null,
    params.html ? { type: "text/html", value: params.html } : null,
  ].filter(Boolean)

  if (content.length === 0) {
    throw new Error("Missing email content")
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to }],
      from: params.from || getDefaultFrom(),
      reply_to: params.replyTo,
      subject: params.subject,
      content,
      attachments: params.attachments,
      categories: params.categories,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    console.error("SendGrid mail send failed:", response.status, body.slice(0, 500))
    throw new Error(`SendGrid mail send failed with status ${response.status}`)
  }

  return true
}
