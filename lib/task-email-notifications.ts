import {
  appUrl,
  escapeHtml,
  renderBrandedEmail,
  renderEmailPanel,
  resolveEmailBrand,
  type EmailBrand,
} from "@/lib/email-branding";
import { sendEmail } from "@/lib/sendgrid";
import type { WorkspacePrincipal } from "@/lib/workspace-db";

type WorkspaceActor = {
  email?: string;
  firstName?: string;
  lastName?: string;
};

type TaskNotificationInput = {
  db: any;
  principal: WorkspacePrincipal;
  actor: WorkspaceActor;
  previousTask: any;
  updatedTask: any;
  changes: Record<string, unknown>;
};

type Recipient = {
  email: string;
  name: string;
};

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
]);

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function actorName(actor: WorkspaceActor) {
  return (
    [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() ||
    actor.email ||
    "Utente Optima"
  );
}

function recipientName(row: any) {
  return (
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.name ||
    row.company ||
    row.email ||
    "Destinatario"
  );
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function latestNewComment(
  previousTask: any,
  updatedTask: any,
  changes: Record<string, unknown>,
) {
  if (!("comments" in changes)) return null;

  const previousComments = parseArray(previousTask?.comments_json);
  const updatedComments = parseArray(
    changes.comments ?? updatedTask?.comments_json,
  );
  if (updatedComments.length === 0) return null;

  const previousIds = new Set(
    previousComments.map((comment: any) => String(comment?.id || "")),
  );
  const comment =
    updatedComments.find(
      (item: any) => !previousIds.has(String(item?.id || "")),
    ) || updatedComments.at(-1);
  if (!comment?.text) return null;

  return {
    text: String(comment.text),
    authorName: String(comment.authorName || comment.author_name || ""),
    mentions: Array.isArray(comment.mentions) ? comment.mentions : [],
  };
}

async function resolveMentionRecipients(
  db: any,
  organizationId: string,
  latestComment: ReturnType<typeof latestNewComment>,
): Promise<Recipient[]> {
  const mentionIds = Array.from(
    new Set(
      (latestComment?.mentions || [])
        .map((mention: any) => String(mention?.id || "").trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  );
  if (!mentionIds.length) return [];

  const placeholders = mentionIds.map(() => "?").join(",");
  const result = await db
    .prepare(
      `SELECT id, email, first_name, last_name
       FROM members
       WHERE organization_id = ?
         AND id IN (${placeholders})
         AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled', 'inactive')`,
    )
    .bind(organizationId, ...mentionIds)
    .all();

  return (result.results || [])
    .filter((member: any) => member.email)
    .map((member: any) => ({
      email: String(member.email),
      name: recipientName(member),
    }));
}

function hasClientVisibleChange(changes: Record<string, unknown>) {
  return Object.keys(changes).some((key) =>
    CLIENT_VISIBLE_CHANGE_KEYS.has(key),
  );
}

function changeSummary(
  changes: Record<string, unknown>,
  latestComment: ReturnType<typeof latestNewComment>,
) {
  if (latestComment) return "Nuovo commento";
  if ("attachments" in changes) return "Allegati aggiornati";
  if ("columnId" in changes || "status" in changes) return "Stato aggiornato";
  if ("dueDate" in changes) return "Scadenza aggiornata";
  if ("title" in changes) return "Titolo aggiornato";
  if ("description" in changes || "richDescription" in changes)
    return "Descrizione aggiornata";
  if ("subItems" in changes) return "Sotto-attivita aggiornate";
  if ("deleted" in changes) return "Task eliminata";
  if ("assignmentAction" in changes) return "Assegnazione aggiornata";
  return "Task aggiornata";
}

async function resolveTenantRecipient(
  db: any,
  organizationId: string,
): Promise<Recipient> {
  const organization = await db
    .prepare(
      `SELECT name
       FROM organizations
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()
    .catch(() => null);

  const organizationName = String(organization?.name || "Righello").trim();
  const configuredEmail =
    process.env.TENANT_NOTIFICATION_EMAIL ||
    process.env.TENANT_MAILBOX_EMAIL ||
    "";

  return {
    email: configuredEmail.trim() || "hello@wearerighello.com",
    name: organizationName ? `${organizationName} operations` : "Tenant",
  };
}

async function resolveAssigneeRecipient(
  db: any,
  organizationId: string,
  task: any,
): Promise<Recipient | null> {
  const memberId = task?.assignee_member_id
    ? String(task.assignee_member_id)
    : "";
  if (!memberId) return null;

  const member = await db
    .prepare(
      `SELECT email, first_name, last_name
       FROM members
       WHERE organization_id = ? AND id = ?
       LIMIT 1`,
    )
    .bind(organizationId, memberId)
    .first();

  if (!member?.email) return null;

  return {
    email: String(member.email),
    name: recipientName(member),
  };
}

async function resolveClientRecipient(
  db: any,
  organizationId: string,
  task: any,
): Promise<Recipient | null> {
  const clientId = task?.client_id ? String(task.client_id) : "";
  if (!clientId || clientId === "tenant" || clientId === "all") return null;

  const client = await db
    .prepare(
      `SELECT email, name, company
       FROM clients
       WHERE organization_id = ? AND id = ?
       LIMIT 1`,
    )
    .bind(organizationId, clientId)
    .first();

  if (!client?.email) return null;

  return {
    email: String(client.email),
    name: recipientName(client),
  };
}

function sameMailbox(left?: string, right?: string) {
  return Boolean(
    left && right && normalizeEmail(left) === normalizeEmail(right),
  );
}

function renderTaskEmail(params: {
  brand?: EmailBrand;
  preheader: string;
  heading: string;
  intro: string;
  taskTitle: string;
  taskMeta: string;
  commentText?: string;
  actionLabel: string;
  url: string;
}) {
  const commentBlock = params.commentText
    ? renderEmailPanel(
        `<div style="color:#831843;white-space:pre-wrap">${escapeHtml(params.commentText)}</div>`,
      )
    : "";

  return renderBrandedEmail({
    brand: params.brand,
    preheader: params.preheader,
    eyebrow: "Workspace",
    title: params.heading,
    intro: params.intro,
    sections: [
      {
        title: "Task",
        html: renderEmailPanel(
          `<div style="font-size:13px;color:#64748b;margin-bottom:6px">${escapeHtml(params.taskMeta)}</div>
           <div style="font-size:18px;font-weight:800;color:#0f172a">${escapeHtml(params.taskTitle)}</div>`,
        ),
      },
      ...(commentBlock ? [{ title: "Messaggio", html: commentBlock }] : []),
    ],
    cta: { label: params.actionLabel, url: params.url },
  });
}

function dedupeRecipients(recipients: Array<Recipient | null | undefined>) {
  const seen = new Set<string>();
  return recipients.filter((recipient): recipient is Recipient => {
    const email = normalizeEmail(recipient?.email);
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export async function notifyTaskChange(input: TaskNotificationInput) {
  const latestComment = latestNewComment(
    input.previousTask,
    input.updatedTask,
    input.changes,
  );
  const isClientActor = input.principal.role === "client";
  const taskTitle = String(
    input.updatedTask?.title || input.previousTask?.title || "Task",
  );
  const taskUrl = `${appUrl()}/workspace`;
  const name = actorName(input.actor);
  const summary = changeSummary(input.changes, latestComment);
  const commentText = latestComment?.text;
  const brand = await resolveEmailBrand(
    input.db,
    input.principal.organizationId,
  );

  const operationalRecipients = dedupeRecipients([
    await resolveTenantRecipient(input.db, input.principal.organizationId),
    await resolveAssigneeRecipient(
      input.db,
      input.principal.organizationId,
      input.updatedTask,
    ),
    ...(await resolveMentionRecipients(
      input.db,
      input.principal.organizationId,
      latestComment,
    )),
  ]);

  if (operationalRecipients.length > 0) {
    const heading = latestComment
      ? "Nuovo commento sulla task"
      : "Task aggiornata";
    const intro = `${name} ha aggiornato una task del workspace.`;

    await sendEmail({
      to: operationalRecipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
      })),
      subject: `${summary}: ${taskTitle}`,
      html: renderTaskEmail({
        brand,
        preheader: `${summary} su ${taskTitle}`,
        heading,
        intro,
        taskTitle,
        taskMeta: summary,
        commentText,
        actionLabel: "Apri la task",
        url: taskUrl,
      }),
      text: `${intro}\n\nTask: ${taskTitle}\nAggiornamento: ${summary}\n${commentText ? `\nMessaggio:\n${commentText}\n` : ""}\nApri Optima: ${taskUrl}`,
      replyTo: input.actor.email
        ? { email: input.actor.email, name }
        : undefined,
      categories: ["task-operational-update"],
    });
  }

  if (isClientActor) {
    return;
  }

  if (!hasClientVisibleChange(input.changes)) return;

  const recipient = await resolveClientRecipient(
    input.db,
    input.principal.organizationId,
    input.updatedTask,
  );
  if (!recipient || sameMailbox(recipient.email, input.actor.email)) return;

  const heading = latestComment
    ? "Nuovo messaggio dal team Righello"
    : "Aggiornamento sulla tua task";
  const intro = `${name} ha aggiornato una task che ti riguarda.`;

  await sendEmail({
    to: { email: recipient.email, name: recipient.name },
    subject: `${summary}: ${taskTitle}`,
    html: renderTaskEmail({
      brand,
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
  });
}
