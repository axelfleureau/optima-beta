import { createId } from "@/lib/cloudflare-db"

export type NotificationType = "task_assigned" | "task_updated" | "comment_added" | "due_date" | "general"

type CreateNotificationInput = {
  organizationId: string
  memberId: string
  actorMemberId?: string | null
  type: NotificationType
  title: string
  message: string
  taskId?: string | null
  metadata?: Record<string, unknown> | null
}

export function parseNotificationMetadata(value: unknown) {
  if (typeof value !== "string" || !value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export async function createNotification(db: any, input: CreateNotificationInput) {
  if (!input.organizationId || !input.memberId || !input.title || !input.message) {
    return null
  }

  const id = createId("ntf")
  await db
    .prepare(
      `INSERT INTO notifications
       (id, organization_id, member_id, actor_member_id, type, title, message, task_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.organizationId,
      input.memberId,
      input.actorMemberId || null,
      input.type,
      input.title,
      input.message,
      input.taskId || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    )
    .run()

  return id
}

export async function notifyMembers(
  db: any,
  input: Omit<CreateNotificationInput, "memberId"> & {
    memberIds: Array<string | null | undefined>
  },
) {
  const recipients = Array.from(
    new Set(
      input.memberIds
        .filter((memberId): memberId is string => Boolean(memberId))
        .filter((memberId) => memberId !== input.actorMemberId),
    ),
  )

  await Promise.all(
    recipients.map((memberId) =>
      createNotification(db, {
        ...input,
        memberId,
      }),
    ),
  )
}
