import type { WorkspacePrincipal } from "@/lib/workspace-db"

export const TIME_MANAGER_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"])

export function canManageTime(principal: WorkspacePrincipal) {
  return TIME_MANAGER_ROLES.has(principal.role)
}

export function normalizeDate(value: unknown) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : new Date().toISOString().slice(0, 10)
  const parsed = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : raw.slice(0, 10)
}

export function normalizeMinutes(value: unknown) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes)) return 0
  return Math.max(1, Math.min(1440, Math.round(minutes)))
}

export function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0
  return Math.round((endMs - startMs) / 60000)
}
