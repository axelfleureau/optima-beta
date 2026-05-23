import { sendEmail } from "@/lib/sendgrid"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

type WorkspaceActor = {
  email?: string
  firstName?: string
  lastName?: string
}

type TaskNotificationInput = {
  db: any
  principal: WorkspacePrincipal
  actor: WorkspaceActor
  previousTask: any
  updatedTask: any
  changes: Record<string, unknown>
}

type Recipient = {
  email: string
  name: string
}

const CLIENT_VISIBLE_CHANGE_KEYS = new Set([
  "title",
  "description",
  "richDescription",
  "priority",
  "type",
  "score",
  "columnId",
  "status",
  "dueDate",
  "comments",
  "attachments",
  "subItems",
])

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

function actorName(actor: WorkspaceActor) {
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || actor.email || "Utente Optima"
}

function recipientName(row: any) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.name || row.company || row.email || "Destinatario"
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function latestNewComment(previousTask: any, updatedTask: any, changes: Record<string, unknown>) {
  if (!("comments" in changes)) return null

  const previousComments = parseArray(previousTask?.comments_json)
  const updatedComments = parseArray(changes.comments ?? updatedTask?.comments_json)
  if (updatedComments.length === 0) return null

  const previousIds = new Set(previousComments.map((comment: any) => String(comment?.id || "")))
  const comment = updatedComments.find((item: any) => !previousIds.has(String(item?.id || ""))) || updatedComments.at(-1)
  if (!comment?.text) return null

  return {
    text: String(comment.text),
    authorName: String(comment.authorName || comment.author_name || ""),
  }
}

function hasClientVisibleChange(changes: Record<string, unknown>) {
  return Object.keys(changes).some((key) => CLIENT_VISIBLE_CHANGE_KEYS.has(key))
}

function changeSummary(changes: Record<string, unknown>, latestComment: ReturnType<typeof latestNewComment>) {
  if (latestComment) return "Nuovo commento"
  if ("attachments" in changes) return "Allegati aggiornati"
  if ("columnId" in changes || "status" in changes) return "Stato aggiornato"
  if ("dueDate" in changes) return "Scadenza aggiornata"
  if ("title" in changes) return "Titolo aggiornato"
  if ("description" in changes || "richDescription" in changes) return "Descrizione aggiornata"
  if ("subItems" in changes) return "Sotto-attivita aggiornate"
  return "Task aggiornata"
}

async function resolveMemberRecipient(db: any, organizationId: string, task: any): Promise<Recipient | null> {
  const memberIds = [task?.assignee_member_id, task?.created_by_member_id].filter(Boolean)

  for (const memberId of memberIds) {
    const member = await db
      .prepare(
        `SELECT email, first_name, last_name
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(organizationId, memberId)
      .first()

    if (member?.email) {
      return {
        email: String(member.email),
        name: recipientName(member),
      }
    }
  }

  return null
}

async function resolveClientRecipient(db: any, organizationId: string, task: any): Promise<Recipient | null> {
  const clientId = task?.client_id ? String(task.client_id) : ""
  if (!clientId || clientId === "tenant" || clientId === "all") return null

  const client = await db
    .prepare(
      `SELECT email, name, company
       FROM clients
       WHERE organization_id = ? AND id = ?
       LIMIT 1`,
    )
    .bind(organizationId, clientId)
    .first()

  if (!client?.email) return null

  return {
    email: String(client.email),
    name: recipientName(client),
  }
}

function sameMailbox(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase())
}

function renderTaskEmail(params: {
  preheader: string
  heading: string
  intro: string
  taskTitle: string
  taskMeta: string
  commentText?: string
  actionLabel: string
  url: string
}) {
  const commentBlock = params.commentText
    ? `<div style="margin:22px 0;padding:16px;border-left:4px solid #ec4899;background:#fdf2f8;color:#831843;white-space:pre-wrap">${escapeHtml(params.commentText)}</div>`
    : ""

  return `
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(params.preheader)}</div>
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;color:#0f172a">
      <div style="background:#050711;color:white;padding:30px;border-radius:16px 16px 0 0">
        <div style="font-size:13px;color:#f472b6;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Optima</div>
        <h1 style="margin:12px 0 0;font-size:27px;line-height:1.2">${escapeHtml(params.heading)}</h1>
      </div>
      <div style="background:white;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px">
        <p style="font-size:16px;line-height:1.6;margin:0 0 18px">${escapeHtml(params.intro)}</p>
        <div style="padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">${escapeHtml(params.taskMeta)}</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a">${escapeHtml(params.taskTitle)}</div>
        </div>
        ${commentBlock}
        <p style="margin:28px 0 0">
          <a href="${params.url}" style="display:inline-block;background:#ec4899;color:white;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:800">${escapeHtml(params.actionLabel)}</a>
        </p>
      </div>
    </div>
  `
}

export async function notifyTaskChange(input: TaskNotificationInput) {
  const latestComment = latestNewComment(input.previousTask, input.updatedTask, input.changes)
  const isClientActor = input.principal.role === "client"
  const taskTitle = String(input.updatedTask?.title || input.previousTask?.title || "Task")
  const taskUrl = `${appUrl()}/workspace`
  const name = actorName(input.actor)
  const summary = changeSummary(input.changes, latestComment)

  if (isClientActor) {
    if (!latestComment && !("attachments" in input.changes)) return

    const recipient = await resolveMemberRecipient(input.db, input.principal.organizationId, input.updatedTask)
    if (!recipient || sameMailbox(recipient.email, input.actor.email)) return

    const heading = latestComment ? "Nuovo commento cliente" : "Nuovo follow up cliente"
    const intro = `${name} ha aggiornato la task lato cliente.`
    const commentText = latestComment?.text

    await sendEmail({
      to: { email: recipient.email, name: recipient.name },
      subject: `${heading}: ${taskTitle}`,
      html: renderTaskEmail({
        preheader: `${summary} su ${taskTitle}`,
        heading,
        intro,
        taskTitle,
        taskMeta: summary,
        commentText,
        actionLabel: "Apri la task",
        url: taskUrl,
      }),
      text: `${intro}\n\nTask: ${taskTitle}\n${commentText ? `\nCommento:\n${commentText}\n` : ""}\nApri Optima: ${taskUrl}`,
      replyTo: input.actor.email ? { email: input.actor.email, name } : undefined,
      categories: ["task-client-followup"],
    })

    return
  }

  if (!hasClientVisibleChange(input.changes)) return

  const recipient = await resolveClientRecipient(input.db, input.principal.organizationId, input.updatedTask)
  if (!recipient || sameMailbox(recipient.email, input.actor.email)) return

  const heading = latestComment ? "Nuovo messaggio dal team Righello" : "Aggiornamento sulla tua task"
  const intro = `${name} ha aggiornato una task che ti riguarda.`
  const commentText = latestComment?.text

  await sendEmail({
    to: { email: recipient.email, name: recipient.name },
    subject: `${summary}: ${taskTitle}`,
    html: renderTaskEmail({
      preheader: `${summary} su ${taskTitle}`,
      heading,
      intro,
      taskTitle,
      taskMeta: summary,
      commentText,
      actionLabel: "Apri Optima",
      url: taskUrl,
    }),
    text: `${intro}\n\nTask: ${taskTitle}\nAggiornamento: ${summary}\n${commentText ? `\nMessaggio:\n${commentText}\n` : ""}\nApri Optima: ${taskUrl}`,
    replyTo: input.actor.email ? { email: input.actor.email, name } : undefined,
    categories: ["task-agency-update"],
  })
}
