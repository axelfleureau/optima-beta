import type { Client, Project, Task } from "@/lib/types"

function normalizeWorkspaceLabel(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

export function isInternalWorkspaceClient(client: Client, companyName?: string | null) {
  const normalizedName = normalizeWorkspaceLabel(client.name)
  const normalizedCompanyName = normalizeWorkspaceLabel(companyName || "Righello")

  return (
    client.id === "tenant" ||
    client.type === "internal" ||
    client.source === "internal-workspace" ||
    normalizedName === "team interno" ||
    normalizedName === normalizedCompanyName
  )
}

export function getInternalWorkspaceClientIds(clients: Client[], companyName?: string | null) {
  return new Set(clients.filter((client) => isInternalWorkspaceClient(client, companyName)).map((client) => client.id))
}

export function isInternalWorkspaceTask(
  task: Task,
  internalClientIds: Set<string>,
  companyName?: string | null,
) {
  const normalizedClientName = normalizeWorkspaceLabel(task.clientName)
  const normalizedCompanyName = normalizeWorkspaceLabel(companyName || "Righello")

  return (
    task.clientId === "tenant" ||
    !task.clientId ||
    internalClientIds.has(task.clientId) ||
    normalizedClientName === "team interno" ||
    normalizedClientName === normalizedCompanyName
  )
}

export function isInternalWorkspaceProject(
  project: Project,
  internalClientIds: Set<string>,
  companyName?: string | null,
) {
  const normalizedClientName = normalizeWorkspaceLabel(project.clientName)
  const normalizedCompanyName = normalizeWorkspaceLabel(companyName || "Righello")

  return (
    !project.clientId ||
    internalClientIds.has(project.clientId) ||
    normalizedClientName === "team interno" ||
    normalizedClientName === normalizedCompanyName
  )
}
