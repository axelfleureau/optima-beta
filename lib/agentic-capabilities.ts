import { createId } from "@/lib/cloudflare-db"
import type { WorkspacePrincipal } from "@/lib/workspace-db"
import { getStrategicMcpConnectors } from "@/lib/mcp-connectors"
import { safeAll } from "@/lib/operational-context"

export type AgenticProviderKind = "ai_model" | "code_agent" | "media_model" | "local_model" | "router"
export type AgenticAuthMethod =
  | "none"
  | "oauth_pkce"
  | "github_app"
  | "api_key_secret"
  | "service_account"
  | "runner_env"
  | "local_install"
  | "external_oauth"

export type AgenticInstallState = "not_installed" | "guide_required" | "configured" | "healthy" | "blocked"

export interface AgenticProviderSpec {
  id: string
  label: string
  kind: AgenticProviderKind
  defaultModel: string
  lane: "code" | "research" | "media" | "operations" | "chat" | "router"
  authMethod: AgenticAuthMethod
  installPattern: string
  tenantUse: string
  strengths: string[]
  requiredSecrets: string[]
  recommendedMcpConnectors: string[]
  notes: string
}

export interface AgenticProviderInstallation {
  id: string
  organizationId: string
  providerId: string
  providerKind: string
  displayName: string
  status: string
  authMethod: string
  installState: AgenticInstallState
  tenantPolicy: Record<string, unknown>
  config: Record<string, unknown>
  secretRef: string | null
  installedByMemberId: string | null
  installedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface McpConnectorInstallation {
  id: string
  organizationId: string
  connectorId: string
  displayName: string
  status: string
  authMethod: AgenticAuthMethod
  installState: AgenticInstallState
  scopes: string[]
  config: Record<string, unknown>
  secretRef: string | null
  oauthSubject: string | null
  installedByMemberId: string | null
  installedAt: string | null
  lastHealthAt: string | null
  lastHealthStatus: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentSubagent {
  id: string
  organizationId: string
  name: string
  slug: string
  lane: string
  status: string
  primaryProviderId: string
  modelHint: string | null
  connectorIds: string[]
  systemPrompt: string
  permissions: Record<string, unknown>
  handoffPolicy: Record<string, unknown>
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface AgenticCapabilitySnapshot {
  providerCatalog: AgenticProviderSpec[]
  mcpConnectorCatalog: ReturnType<typeof getStrategicMcpConnectors>
  providerInstallations: AgenticProviderInstallation[]
  connectorInstallations: McpConnectorInstallation[]
  subagents: AgentSubagent[]
  oauthGuidance: {
    pattern: string
    rules: string[]
  }
}

const PROVIDERS: AgenticProviderSpec[] = [
  {
    id: "codex",
    label: "Codex",
    kind: "code_agent",
    defaultModel: "codex-cli",
    lane: "code",
    authMethod: "runner_env",
    installPattern: "Installazione guidata su VPS/runner con token server-side e review in Optima.",
    tenantUse: "Patch, PR, audit tecnico, task update da repository e deploy controllati.",
    strengths: ["coding", "patch", "git", "reviewable artifacts"],
    requiredSecrets: ["AGENT_RUNNER_API_KEY", "OPENAI_API_KEY"],
    recommendedMcpConnectors: ["github", "cloudflare", "vercel", "hostinger"],
    notes: "Codex non deve mutare produzione senza job esplicito e approvazione.",
  },
  {
    id: "open-code",
    label: "OpenCode",
    kind: "code_agent",
    defaultModel: "opencode-cli",
    lane: "code",
    authMethod: "local_install",
    installPattern: "Installazione guidata sul runner; Optima conserva solo stato, policy e audit.",
    tenantUse: "Alternativa o subagente locale per lavori codice dove serve controllo self-hosted.",
    strengths: ["local tooling", "code edits", "terminal workflows"],
    requiredSecrets: [],
    recommendedMcpConnectors: ["github"],
    notes: "Da usare come adapter dietro control plane, non come processo opaco fuori audit.",
  },
  {
    id: "gemma",
    label: "Gemma",
    kind: "local_model",
    defaultModel: "gemma-local",
    lane: "operations",
    authMethod: "local_install",
    installPattern: "Modello locale sul runner o gateway interno; nessun dato tenant inviato a provider esterni.",
    tenantUse: "Classificazione, bozze, triage leggero, privacy-first assistant.",
    strengths: ["local privacy", "classification", "low-latency triage"],
    requiredSecrets: [],
    recommendedMcpConnectors: ["telegram", "sendgrid"],
    notes: "Preferibile per dati sensibili quando non serve massima capacita reasoning.",
  },
  {
    id: "qwen",
    label: "Qwen",
    kind: "ai_model",
    defaultModel: "qwen-long-context",
    lane: "research",
    authMethod: "api_key_secret",
    installPattern: "Secret tenant/provider in vault o env; Optima salva solo secret_ref e policy.",
    tenantUse: "Research, sintesi lunga, analisi documentale e contesto multi-repository.",
    strengths: ["long context", "research", "summarization"],
    requiredSecrets: ["QWEN_API_KEY"],
    recommendedMcpConnectors: ["github", "cloudinary"],
    notes: "Richiede policy chiara su quali dati tenant possono uscire dal runtime Optima.",
  },
  {
    id: "minimax",
    label: "MiniMax",
    kind: "media_model",
    defaultModel: "minimax-media",
    lane: "media",
    authMethod: "api_key_secret",
    installPattern: "Secret per tenant o organization; asset e risultati collegati al grafo media.",
    tenantUse: "Generazione/trasformazione contenuti audio-video e media operations.",
    strengths: ["media generation", "video", "voice", "creative variants"],
    requiredSecrets: ["MINIMAX_API_KEY"],
    recommendedMcpConnectors: ["cloudinary"],
    notes: "Ogni output deve avere provenienza, prompt, asset sorgenti e stato review.",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "router",
    defaultModel: "gpt-5.2",
    lane: "chat",
    authMethod: "api_key_secret",
    installPattern: "Secret server-side o tenant-specific; usato da chat, command bar e reasoning.",
    tenantUse: "Assistant principale, reasoning, tool orchestration e generazione strutturata.",
    strengths: ["reasoning", "tool use", "structured output"],
    requiredSecrets: ["OPENAI_API_KEY"],
    recommendedMcpConnectors: ["github", "cloudflare", "sendgrid"],
    notes: "Il modello non sostituisce autorizzazioni e grafo: opera sempre nel principal tenant.",
  },
]

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "string") return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: unknown): string[] {
  if (!value || typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : []
  } catch {
    return []
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value && typeof value === "object" ? value : {})
}

function mapProviderInstallation(row: any): AgenticProviderInstallation {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    providerId: String(row.provider_id),
    providerKind: String(row.provider_kind || "ai_model"),
    displayName: String(row.display_name || row.provider_id),
    status: String(row.status || "available"),
    authMethod: String(row.auth_method || "none"),
    installState: String(row.install_state || "not_installed") as AgenticInstallState,
    tenantPolicy: parseJsonObject(row.tenant_policy_json),
    config: parseJsonObject(row.config_json),
    secretRef: row.secret_ref ? String(row.secret_ref) : null,
    installedByMemberId: row.installed_by_member_id ? String(row.installed_by_member_id) : null,
    installedAt: row.installed_at ? String(row.installed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapConnectorInstallation(row: any): McpConnectorInstallation {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    connectorId: String(row.connector_id),
    displayName: String(row.display_name || row.connector_id),
    status: String(row.status || "available"),
    authMethod: String(row.auth_method || "oauth_pkce") as AgenticAuthMethod,
    installState: String(row.install_state || "not_installed") as AgenticInstallState,
    scopes: parseJsonArray(row.scopes_json),
    config: parseJsonObject(row.config_json),
    secretRef: row.secret_ref ? String(row.secret_ref) : null,
    oauthSubject: row.oauth_subject ? String(row.oauth_subject) : null,
    installedByMemberId: row.installed_by_member_id ? String(row.installed_by_member_id) : null,
    installedAt: row.installed_at ? String(row.installed_at) : null,
    lastHealthAt: row.last_health_at ? String(row.last_health_at) : null,
    lastHealthStatus: row.last_health_status ? String(row.last_health_status) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapSubagent(row: any): AgentSubagent {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name || row.slug),
    slug: String(row.slug),
    lane: String(row.lane || "operations"),
    status: String(row.status || "active"),
    primaryProviderId: String(row.primary_provider_id || "openai"),
    modelHint: row.model_hint ? String(row.model_hint) : null,
    connectorIds: parseJsonArray(row.connector_ids_json),
    systemPrompt: String(row.system_prompt || ""),
    permissions: parseJsonObject(row.permissions_json),
    handoffPolicy: parseJsonObject(row.handoff_policy_json),
    createdByMemberId: row.created_by_member_id ? String(row.created_by_member_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function getAgenticProviderCatalog() {
  return PROVIDERS
}

export function getOAuthGuidance() {
  return {
    pattern: "Authorization Code + PKCE per installazioni utente; GitHub App per repository; secret_ref per API key; local_install per runner self-hosted.",
    rules: [
      "Ogni installazione e sempre scoped a organization_id.",
      "D1 salva stato, scope, policy e secret_ref; non salva token o API key.",
      "OAuth esterno deve usare redirect allowlist, state anti-CSRF e scope minimi.",
      "Le installazioni manuali devono avere una guida esplicita e un health check.",
      "I subagenti ricevono solo connector e tool dichiarati nella loro lane.",
    ],
  }
}

export async function listProviderInstallations(db: any, organizationId: string) {
  const rows = await safeAll(
    db,
    `SELECT * FROM agentic_provider_installations
     WHERE organization_id = ?
     ORDER BY updated_at DESC`,
    [organizationId],
  )
  return rows.map(mapProviderInstallation)
}

export async function listConnectorInstallations(db: any, organizationId: string) {
  const rows = await safeAll(
    db,
    `SELECT * FROM mcp_connector_installations
     WHERE organization_id = ?
     ORDER BY updated_at DESC`,
    [organizationId],
  )
  return rows.map(mapConnectorInstallation)
}

export async function listSubagents(db: any, organizationId: string) {
  const rows = await safeAll(
    db,
    `SELECT * FROM agent_subagents
     WHERE organization_id = ?
     ORDER BY
       CASE status WHEN 'active' THEN 0 ELSE 1 END,
       lane ASC,
       name ASC`,
    [organizationId],
  )
  return rows.map(mapSubagent)
}

export async function getAgenticCapabilitySnapshot(
  db: any,
  principal: WorkspacePrincipal,
): Promise<AgenticCapabilitySnapshot> {
  const [providerInstallations, connectorInstallations, subagents] = await Promise.all([
    listProviderInstallations(db, principal.organizationId),
    listConnectorInstallations(db, principal.organizationId),
    listSubagents(db, principal.organizationId),
  ])

  return {
    providerCatalog: getAgenticProviderCatalog(),
    mcpConnectorCatalog: getStrategicMcpConnectors(),
    providerInstallations,
    connectorInstallations,
    subagents,
    oauthGuidance: getOAuthGuidance(),
  }
}

export async function upsertProviderInstallation(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    providerId: string
    installState?: AgenticInstallState
    config?: Record<string, unknown>
    tenantPolicy?: Record<string, unknown>
    secretRef?: string | null
  },
) {
  const provider = PROVIDERS.find((item) => item.id === input.providerId)
  if (!provider) throw new Error("Provider agentico non supportato.")

  await db
    .prepare(
      `INSERT INTO agentic_provider_installations (
        id, organization_id, provider_id, provider_kind, display_name, status,
        auth_method, install_state, tenant_policy_json, config_json, secret_ref,
        installed_by_member_id, installed_at
      ) VALUES (?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(organization_id, provider_id) DO UPDATE SET
        provider_kind = excluded.provider_kind,
        display_name = excluded.display_name,
        auth_method = excluded.auth_method,
        install_state = excluded.install_state,
        tenant_policy_json = excluded.tenant_policy_json,
        config_json = excluded.config_json,
        secret_ref = excluded.secret_ref,
        installed_by_member_id = excluded.installed_by_member_id,
        installed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      createId("aiprv"),
      principal.organizationId,
      provider.id,
      provider.kind,
      provider.label,
      provider.authMethod,
      input.installState || "guide_required",
      stringifyJson(input.tenantPolicy),
      stringifyJson(input.config),
      input.secretRef || null,
      principal.memberId,
    )
    .run()
}

export async function upsertConnectorInstallation(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    connectorId: string
    installState?: AgenticInstallState
    authMethod?: AgenticAuthMethod
    scopes?: string[]
    config?: Record<string, unknown>
    secretRef?: string | null
    oauthSubject?: string | null
  },
) {
  const connector = getStrategicMcpConnectors().find((item) => item.id === input.connectorId)
  if (!connector) throw new Error("Connector MCP non supportato.")

  const authMethod = input.authMethod || (connector.requiredEnv.length ? "api_key_secret" : "oauth_pkce")

  await db
    .prepare(
      `INSERT INTO mcp_connector_installations (
        id, organization_id, connector_id, display_name, status, auth_method,
        install_state, scopes_json, config_json, secret_ref, oauth_subject,
        installed_by_member_id, installed_at
      ) VALUES (?, ?, ?, ?, 'available', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(organization_id, connector_id) DO UPDATE SET
        display_name = excluded.display_name,
        auth_method = excluded.auth_method,
        install_state = excluded.install_state,
        scopes_json = excluded.scopes_json,
        config_json = excluded.config_json,
        secret_ref = excluded.secret_ref,
        oauth_subject = excluded.oauth_subject,
        installed_by_member_id = excluded.installed_by_member_id,
        installed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      createId("mcpi"),
      principal.organizationId,
      connector.id,
      connector.label,
      authMethod,
      input.installState || "guide_required",
      JSON.stringify(Array.isArray(input.scopes) ? input.scopes : []),
      stringifyJson(input.config),
      input.secretRef || null,
      input.oauthSubject || null,
      principal.memberId,
    )
    .run()
}

export async function createSubagent(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    name: string
    slug: string
    lane: string
    primaryProviderId: string
    modelHint?: string | null
    connectorIds?: string[]
    systemPrompt?: string
    permissions?: Record<string, unknown>
    handoffPolicy?: Record<string, unknown>
  },
) {
  const name = input.name.trim()
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")
  if (!name || !slug) throw new Error("Nome e slug subagente sono obbligatori.")

  await db
    .prepare(
      `INSERT INTO agent_subagents (
        id, organization_id, name, slug, lane, status, primary_provider_id,
        model_hint, connector_ids_json, system_prompt, permissions_json,
        handoff_policy_json, created_by_member_id
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      createId("subag"),
      principal.organizationId,
      name,
      slug,
      input.lane.trim() || "operations",
      input.primaryProviderId,
      input.modelHint || null,
      JSON.stringify(Array.isArray(input.connectorIds) ? input.connectorIds : []),
      input.systemPrompt || "",
      stringifyJson(input.permissions),
      stringifyJson(input.handoffPolicy),
      principal.memberId,
    )
    .run()
}
