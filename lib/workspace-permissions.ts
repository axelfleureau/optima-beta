export const WORKSPACE_MANAGER_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
  "capo-reparto",
]);
export const INTERNAL_ECONOMIC_DATA_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
  "capo-reparto",
]);
export const WORKSPACE_CLIENT_ROLES = new Set(["client"]);
export const WORKSPACE_EXTERNAL_ROLES = new Set([
  "freelance",
  "external",
  "collaboratore-esterno",
]);
export const WORKSPACE_OPERATIVE_ROLES = new Set([
  "junior",
  "member",
  "dipendente",
  "employee",
]);
export const CLIENT_DIRECTORY_ROLES = new Set([
  ...WORKSPACE_MANAGER_ROLES,
  ...WORKSPACE_OPERATIVE_ROLES,
]);

export function workspaceRole(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isWorkspaceManager(value: unknown) {
  return WORKSPACE_MANAGER_ROLES.has(workspaceRole(value));
}

export function isWorkspaceClient(value: unknown) {
  return WORKSPACE_CLIENT_ROLES.has(workspaceRole(value));
}

export function isExternalWorkspaceMember(value: unknown) {
  return WORKSPACE_EXTERNAL_ROLES.has(workspaceRole(value));
}

export function isOperativeWorkspaceMember(value: unknown) {
  return WORKSPACE_OPERATIVE_ROLES.has(workspaceRole(value));
}

export function canBrowseClientDirectory(value: unknown) {
  return CLIENT_DIRECTORY_ROLES.has(workspaceRole(value));
}

export function canViewAllWorkspaceData(value: unknown) {
  return isWorkspaceManager(value);
}

export function canViewInternalEconomicData(value: unknown) {
  return INTERNAL_ECONOMIC_DATA_ROLES.has(workspaceRole(value));
}
