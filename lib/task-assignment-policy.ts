const ROLE_LEVELS: Record<string, number> = {
  "super-admin": 6,
  admin: 5,
  direzione: 4,
  "capo-reparto": 3,
  junior: 2,
  client: 1,
}

export type TaskAssignmentStatus = "accepted" | "pending" | "rejected"

export function getRoleLevel(role: unknown) {
  return ROLE_LEVELS[String(role || "").toLowerCase()] || 0
}

export function requiresAssignmentAcceptance({
  assignerRole,
  assigneeRole,
  assignerMemberId,
  assigneeMemberId,
}: {
  assignerRole: unknown
  assigneeRole: unknown
  assignerMemberId: string
  assigneeMemberId?: string | null
}) {
  if (!assigneeMemberId || assignerMemberId === assigneeMemberId) return false

  const assignerLevel = getRoleLevel(assignerRole)
  const assigneeLevel = getRoleLevel(assigneeRole)

  return assignerLevel > 0 && assignerLevel === assigneeLevel
}

export function buildMemberDisplayName(member: any) {
  return (
    [member?.first_name, member?.last_name].filter(Boolean).join(" ").trim() ||
    String(member?.email || "")
  )
}
