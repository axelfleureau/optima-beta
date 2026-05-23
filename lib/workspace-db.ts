import { createId } from "@/lib/cloudflare-db"
import type { Project, ProjectMember, Task } from "@/lib/types"

type ClerkWorkspaceUser = {
  id: string
  organizationId: string
  role: string
  email: string
  firstName: string
  lastName: string
}

export type WorkspacePrincipal = {
  organizationId: string
  memberId: string
  role: string
  email: string
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function ensureWorkspacePrincipal(db: any, user: ClerkWorkspaceUser): Promise<WorkspacePrincipal> {
  const existingMember = await db
    .prepare(
      `SELECT m.id, m.organization_id, m.role
       FROM members m
       WHERE m.clerk_user_id = ?
       ORDER BY m.created_at ASC
       LIMIT 1`,
    )
    .bind(user.id)
    .first()

  if (existingMember?.id && existingMember?.organization_id) {
    return {
      organizationId: String(existingMember.organization_id),
      memberId: String(existingMember.id),
      role: String(existingMember.role || user.role),
      email: user.email,
    }
  }

  const invitedMember = await db
    .prepare(
      `SELECT id, organization_id, role
       FROM members
       WHERE lower(email) = lower(?)
         AND (status = 'invited' OR clerk_user_id LIKE 'invite:%')
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind(user.email)
    .first()

  if (invitedMember?.id && invitedMember?.organization_id) {
    await db
      .prepare(
        `UPDATE members
         SET clerk_user_id = ?,
             first_name = COALESCE(NULLIF(?, ''), first_name),
             last_name = COALESCE(NULLIF(?, ''), last_name),
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(user.id, user.firstName, user.lastName, invitedMember.id)
      .run()

    return {
      organizationId: String(invitedMember.organization_id),
      memberId: String(invitedMember.id),
      role: String(invitedMember.role || user.role),
      email: user.email,
    }
  }

  const organizationId = user.organizationId || `org_${user.id}`
  const memberId = createId("mem")
  const organizationName = user.email.endsWith("@wearerighello.com") ? "Righello" : user.email || "Optima"

  await db
    .prepare(
      `INSERT OR IGNORE INTO organizations (id, name, status)
       VALUES (?, ?, 'active')`,
    )
    .bind(organizationId, organizationName)
    .run()

  await db
    .prepare(
      `INSERT OR IGNORE INTO members
       (id, organization_id, clerk_user_id, email, first_name, last_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    )
    .bind(memberId, organizationId, user.id, user.email, user.firstName, user.lastName, user.role)
    .run()

  const member = await db
    .prepare(
      `SELECT id, organization_id, role
       FROM members
       WHERE organization_id = ? AND clerk_user_id = ?
       LIMIT 1`,
    )
    .bind(organizationId, user.id)
    .first()

  return {
    organizationId,
    memberId: String(member?.id || memberId),
    role: String(member?.role || user.role),
    email: user.email,
  }
}

export function mapTaskRow(row: any): Task {
  const columnId = String(row.column_id || row.status || "to-do")

  return {
    id: String(row.id),
    title: String(row.title || ""),
    description: row.description || "",
    richDescription: row.rich_description || "",
    status: columnId as Task["status"],
    columnId,
    priority: (row.priority || "medium") as Task["priority"],
    type: row.type || "",
    score: Number(row.score || 0),
    dueDate: row.due_at ? new Date(String(row.due_at)) : null,
    assignee: row.assignee_name || "",
    assignedUserId: row.assignee_member_id || null,
    assignmentStatus: row.assignment_status || "accepted",
    assignmentRequestedByMemberId: row.assignment_requested_by_member_id || null,
    assignmentRequestedAt: row.assignment_requested_at ? new Date(String(row.assignment_requested_at)) : null,
    assignmentRespondedAt: row.assignment_responded_at ? new Date(String(row.assignment_responded_at)) : null,
    assignmentRejectionReason: row.assignment_rejection_reason || null,
    clientId: row.client_id || "tenant",
    clientName: row.client_name || "",
    projectId: row.project_id || null,
    projectName: row.project_name || "",
    tenantId: String(row.organization_id),
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)) : new Date(),
    createdBy: row.created_by_member_id || undefined,
    tags: parseJson<string[]>(row.tags_json, []),
    attachments: parseJson<any[]>(row.attachments_json, []),
    comments: parseJson<any[]>(row.comments_json, []).map((comment) => ({
      ...comment,
      createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
      updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
    })),
    subItems: parseJson<any[]>(row.sub_items_json, []).map((item) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    })),
    parentItemId: row.parent_item_id || null,
    estimatedHours: Number(row.estimated_minutes || 0) / 60,
    actualHours: Number(row.actual_minutes || 0) / 60,
  }
}

export function mapProjectRows(projectRows: any[], memberRows: any[]): Project[] {
  const membersByProject = new Map<string, ProjectMember[]>()

  for (const row of memberRows) {
    const projectId = String(row.project_id || "")
    if (!projectId) continue

    const member: ProjectMember = {
      id: String(row.member_id),
      name:
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        String(row.email || "Utente"),
      email: String(row.email || ""),
      role: row.role ? String(row.role) : undefined,
    }

    membersByProject.set(projectId, [...(membersByProject.get(projectId) || []), member])
  }

  return projectRows.map((row) => {
    const members = membersByProject.get(String(row.id)) || []

    return {
      id: String(row.id),
      name: String(row.name || ""),
      clientId: row.client_id || null,
      clientName: row.client_name || "",
      tenantId: String(row.organization_id),
      status: (row.status || "planned") as Project["status"],
      budgetCents: Number(row.budget_cents || 0),
      startsAt: row.starts_at ? new Date(String(row.starts_at)) : null,
      dueAt: row.due_at ? new Date(String(row.due_at)) : null,
      members,
      memberIds: members.map((member) => member.id),
      createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)) : new Date(),
    }
  })
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? [])
}
