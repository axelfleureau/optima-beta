import { createId } from "@/lib/cloudflare-db"
import type { WorkspacePrincipal } from "@/lib/workspace-db"
import { getStrategicMcpConnectors } from "@/lib/mcp-connectors"
import { safeAll } from "@/lib/operational-context"
import { getRuntimeSecret } from "@/lib/ai/openai-runtime"
import { getHermesBlueprint } from "@/lib/hermes-reference"

export type AgenticProviderKind = "ai_model" | "code_agent" | "media_model" | "local_model" | "router"
export type AgenticModelLane = "code" | "research" | "media" | "operations" | "chat" | "router"
export type AgenticModelMode = "hosted" | "self_hosted" | "gateway" | "router"
export type AgenticRuntimeStatus = "ready" | "needs_secret" | "needs_endpoint" | "reference_only"
export type AgenticAuthMethod =
  | "none"
  | "oauth_pkce"
  | "github_app"
  | "api_key_secret"
  | "service_account"
  | "runner_env"
  | "local_install"
  | "external_oauth"
  | "browser_session_oauth"

export type AgenticInstallState = "not_installed" | "guide_required" | "configured" | "healthy" | "blocked"

export interface AgenticProviderSpec {
  id: string
  label: string
  kind: AgenticProviderKind
  defaultModel: string
  lane: AgenticModelLane
  authMethod: AgenticAuthMethod
  installPattern: string
  tenantUse: string
  strengths: string[]
  requiredSecrets: string[]
  recommendedMcpConnectors: string[]
  notes: string
}

export interface AgenticModelHostSpec {
  id: string
  label: string
  providerId: string
  lane: AgenticModelLane
  mode: AgenticModelMode
  defaultModel: string
  runtimeAdapter: "openai_compatible" | "codex_cli" | "local_gateway"
  apiKeyEnv: string | null
  baseUrlEnv: string | null
  endpointEnv: string | null
  secretRefHint: string | null
  dataPolicy: string
  installSteps: string[]
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

export interface AgenticModelRoute {
  id: string
  organizationId: string
  lane: AgenticModelLane
  providerId: string
  model: string
  mode: AgenticModelMode
  status: string
  priority: number
  endpointRef: string | null
  secretRef: string | null
  config: Record<string, unknown>
  lastHealthAt: string | null
  lastHealthStatus: string | null
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface AgenticModelRuntimeSnapshot {
  hosts: Array<
    AgenticModelHostSpec & {
      runtimeStatus: AgenticRuntimeStatus
      runtimeDetail: string
    }
  >
  routes: AgenticModelRoute[]
  lanePlan: Array<{
    lane: AgenticModelLane
    providerId: string
    model: string
    mode: AgenticModelMode
    source: "tenant_route" | "default_host"
    status: string
    runtimeStatus: AgenticRuntimeStatus
  }>
}

export type AgenticExecutionContext = "interactive_chat" | "agent_job" | "scheduled_job" | "subagent_handoff"

export interface NativeAgenticRuntimePolicy {
  source: "optima_native_hermes_derived"
  contexts: Array<{
    id: AgenticExecutionContext
    label: string
    allowedToolsets: string[]
    blockedToolsets: string[]
    requiredReview: string[]
    notes: string
  }>
  lanePolicies: Array<{
    lane: AgenticModelLane
    defaultProviderId: string
    allowedConnectors: string[]
    blockedActions: string[]
    fallbackProviderId: string | null
  }>
  rules: string[]
}

export interface AgenticTenantIsolation {
  organizationId: string
  memberId: string
  secretBoundary: "secret_ref_only"
  dataBoundary: "organization_id"
  runnerBoundary: "job_payload_scoped"
  graphBoundary: "tenant_scoped_nodes_edges_sessions"
  reviewBoundary: "irreversible_actions_require_review"
  defaultBootstrapActions: string[]
  warnings: string[]
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
  modelRuntime: AgenticModelRuntimeSnapshot
  oauthGuidance: {
    pattern: string
    rules: string[]
  }
  tenantIsolation: AgenticTenantIsolation
  runtimePolicy: NativeAgenticRuntimePolicy
  hermesBlueprint: ReturnType<typeof getHermesBlueprint>
}

const PROVIDERS: AgenticProviderSpec[] = [
  {
    id: "codex",
    label: "Codex",
    kind: "code_agent",
    defaultModel: "codex-cli",
    lane: "code",
    authMethod: "runner_env",
    installPattern: "Installazione guidata su VPS/runner con CODEX_HOME ChatGPT separata, wrapper dedicato, token interno runner e review in Optima.",
    tenantUse: "Patch, PR, audit tecnico, task update da repository e deploy controllati.",
    strengths: ["coding", "patch", "git", "reviewable artifacts"],
    requiredSecrets: ["AGENT_RUNNER_API_KEY"],
    recommendedMcpConnectors: ["github", "browser", "cloudflare", "vercel", "hostinger"],
    notes: "Codex non deve mutare produzione senza job esplicito e approvazione. Autenticazione preferita: CODEX_HOME separata autenticata ChatGPT sul runner, richiamata da wrapper dedicato. API key a consumo solo fallback facoltativo. AGENT_RUNNER_API_KEY e token interno Optima-runner.",
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
    recommendedMcpConnectors: ["github", "browser"],
    notes: "Da usare come adapter dietro control plane, non come processo opaco fuori audit.",
  },
  {
    id: "gemma-hosted",
    label: "Gemma Hosted",
    kind: "ai_model",
    defaultModel: "gemma-hosted",
    lane: "operations",
    authMethod: "api_key_secret",
    installPattern: "Gateway hosted o provider compatibile solo se serve: API key facoltativa con secret_ref, endpoint_ref, quota e policy tenant.",
    tenantUse: "Operations agentiche, triage rapportini, classificazione richieste e assistant privacy-aware.",
    strengths: ["operations", "classification", "cost control", "privacy policy"],
    requiredSecrets: ["GEMMA_API_KEY"],
    recommendedMcpConnectors: ["notion", "telegram", "sendgrid"],
    notes: "Da preferire al modello locale solo quando il costo e sostenibile. API key facoltativa, con quota e budget.",
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
    recommendedMcpConnectors: ["notion", "telegram", "sendgrid"],
    notes: "Preferibile per dati sensibili quando non serve massima capacita reasoning.",
  },
  {
    id: "qwen",
    label: "Qwen",
    kind: "ai_model",
    defaultModel: "qwen-long-context",
    lane: "research",
    authMethod: "api_key_secret",
    installPattern: "Secret tenant/provider in vault o env solo come fallback; Optima salva solo secret_ref e policy.",
    tenantUse: "Research, sintesi lunga, analisi documentale e contesto multi-repository.",
    strengths: ["long context", "research", "summarization"],
    requiredSecrets: ["QWEN_API_KEY"],
    recommendedMcpConnectors: ["github", "notion", "browser", "cloudinary"],
    notes: "API key facoltativa e a consumo: usarla solo con policy chiara su dati tenant, budget e quota.",
  },
  {
    id: "minimax",
    label: "MiniMax",
    kind: "media_model",
    defaultModel: "minimax-media",
    lane: "media",
    authMethod: "api_key_secret",
    installPattern: "Secret per tenant o organization solo se serve provider a consumo; asset e risultati collegati al grafo media.",
    tenantUse: "Generazione/trasformazione contenuti audio-video e media operations.",
    strengths: ["media generation", "video", "voice", "creative variants"],
    requiredSecrets: ["MINIMAX_API_KEY"],
    recommendedMcpConnectors: ["browser", "cloudinary"],
    notes: "API key facoltativa e ultima spiaggia rispetto a strumenti gia inclusi o Browser MCP. Ogni output deve avere provenienza, prompt, asset sorgenti e stato review.",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "router",
    defaultModel: "gpt-5.2",
    lane: "chat",
    authMethod: "api_key_secret",
    installPattern: "Browser MCP/login utente prima; secret server-side o tenant-specific solo come fallback a consumo per API.",
    tenantUse: "Assistant principale, reasoning, tool orchestration e generazione strutturata.",
    strengths: ["reasoning", "tool use", "structured output"],
    requiredSecrets: ["OPENAI_API_KEY"],
    recommendedMcpConnectors: ["github", "notion", "browser", "cloudflare", "sendgrid"],
    notes: "API key OpenAI e facoltativa e ultima spiaggia a consumo. Il modello non sostituisce autorizzazioni e grafo: opera sempre nel principal tenant.",
  },
]

const MODEL_HOSTS: AgenticModelHostSpec[] = [
  {
    id: "qwen-hosted",
    label: "Qwen hosted runtime",
    providerId: "qwen",
    lane: "research",
    mode: "hosted",
    defaultModel: "qwen-long-context",
    runtimeAdapter: "openai_compatible",
    apiKeyEnv: "QWEN_API_KEY",
    baseUrlEnv: "QWEN_BASE_URL",
    endpointEnv: null,
    secretRefHint: "secret://tenant/{organizationId}/qwen",
    dataPolicy: "Usare per research e sintesi lunga. Dati tenant ammessi solo se policy e consenso organizzazione lo permettono.",
    installSteps: [
      "Prima valuta modello locale, Browser MCP o piano gia incluso; collega Qwen/OpenAI-compatible solo se serve davvero.",
      "Se usi API key a consumo, imposta budget/quota e salvala in secret manager o env runtime; Optima conserva solo secret_ref.",
      "Imposta QWEN_BASE_URL se non usi il gateway predefinito del provider.",
      "Esegui health check e abilita la route research.",
    ],
  },
  {
    id: "gemma-hosted",
    label: "Gemma hosted runtime",
    providerId: "gemma-hosted",
    lane: "operations",
    mode: "hosted",
    defaultModel: "gemma-hosted",
    runtimeAdapter: "openai_compatible",
    apiKeyEnv: "GEMMA_API_KEY",
    baseUrlEnv: "GEMMA_BASE_URL",
    endpointEnv: null,
    secretRefHint: "secret://tenant/{organizationId}/gemma",
    dataPolicy: "Usare per triage operativo, bozze, rapportini e classificazione a costo controllato.",
    installSteps: [
      "Preferisci Gemma locale o piano incluso quando basta.",
      "Se scegli provider hosted a consumo, configura GEMMA_API_KEY e GEMMA_BASE_URL con quota e budget nel runtime o secret manager.",
      "Abilita route operations e assegna Office Ops al provider Gemma Hosted.",
      "Mantieni fallback OpenAI/router per richieste ad alto ragionamento.",
    ],
  },
  {
    id: "gemma-local",
    label: "Gemma self-hosted runtime",
    providerId: "gemma",
    lane: "operations",
    mode: "self_hosted",
    defaultModel: "gemma-local",
    runtimeAdapter: "local_gateway",
    apiKeyEnv: null,
    baseUrlEnv: null,
    endpointEnv: "GEMMA_LOCAL_ENDPOINT",
    secretRefHint: null,
    dataPolicy: "Usare quando i dati non devono uscire dal perimetro VPS/rete privata.",
    installSteps: [
      "Installa il gateway locale sul VPS o su nodo GPU dedicato.",
      "Esponi solo endpoint privato/Tailscale e imposta GEMMA_LOCAL_ENDPOINT.",
      "Abilita health check e non inviare dati sensibili a provider esterni.",
    ],
  },
  {
    id: "minimax-media",
    label: "MiniMax media runtime",
    providerId: "minimax",
    lane: "media",
    mode: "hosted",
    defaultModel: "minimax-media",
    runtimeAdapter: "openai_compatible",
    apiKeyEnv: "MINIMAX_API_KEY",
    baseUrlEnv: "MINIMAX_BASE_URL",
    endpointEnv: null,
    secretRefHint: "secret://tenant/{organizationId}/minimax",
    dataPolicy: "Usare per asset, audio, video e varianti creative collegate a task, clienti e review.",
    installSteps: [
      "Prima valuta strumenti gia inclusi, Browser MCP o workflow manuale assistito.",
      "Se serve MiniMax/gateway a consumo, configura MINIMAX_API_KEY e opzionalmente MINIMAX_BASE_URL con quota e budget.",
      "Collega Cloudinary per archiviazione e trasformazioni asset.",
      "Permetti a Codex Engineer di aprire handoff verso Media Operator quando un job tecnico richiede media.",
    ],
  },
  {
    id: "openai-router",
    label: "OpenAI reasoning router",
    providerId: "openai",
    lane: "chat",
    mode: "router",
    defaultModel: "gpt-5.2",
    runtimeAdapter: "openai_compatible",
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrlEnv: null,
    endpointEnv: null,
    secretRefHint: "secret://tenant/{organizationId}/openai",
    dataPolicy: "Usare come router/reasoning principale e fallback quando Qwen/Gemma non bastano.",
    installSteps: [
      "Per ChatGPT web o strumenti senza API usa Browser MCP/login utente prima di API key.",
      "Configura OPENAI_API_KEY solo se serve API server-side, con tetto budget e quota.",
      "Usa il grafo operativo per decidere quando delegare a provider specializzati o locali.",
    ],
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

function mapModelRoute(row: any): AgenticModelRoute {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    lane: String(row.lane || "operations") as AgenticModelLane,
    providerId: String(row.provider_id || "openai"),
    model: String(row.model || ""),
    mode: String(row.mode || "hosted") as AgenticModelMode,
    status: String(row.status || "configured"),
    priority: Number(row.priority || 100),
    endpointRef: row.endpoint_ref ? String(row.endpoint_ref) : null,
    secretRef: row.secret_ref ? String(row.secret_ref) : null,
    config: parseJsonObject(row.config_json),
    lastHealthAt: row.last_health_at ? String(row.last_health_at) : null,
    lastHealthStatus: row.last_health_status ? String(row.last_health_status) : null,
    createdByMemberId: row.created_by_member_id ? String(row.created_by_member_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function getAgenticProviderCatalog() {
  return PROVIDERS
}

export function getAgenticModelHosts() {
  return MODEL_HOSTS
}

export function getOAuthGuidance() {
  return {
    pattern: "Authorization Code + PKCE per installazioni utente; GitHub App per repository; Browser MCP con profilo/sessione controllata per strumenti web senza API; secret_ref per API key solo fallback facoltativo a consumo; local_install per runner self-hosted.",
    rules: [
      "Ogni installazione e sempre scoped a organization_id.",
      "D1 salva stato, scope, policy e secret_ref; non salva token o API key.",
      "OAuth esterno deve usare redirect allowlist, state anti-CSRF e scope minimi.",
      "Browser MCP usa profili isolati, allowlist domini e review; non salva cookie o token in D1.",
      "Le installazioni manuali devono avere una guida esplicita e un health check.",
      "I subagenti ricevono solo connector e tool dichiarati nella loro lane.",
    ],
  }
}

export function getNativeAgenticRuntimePolicy(): NativeAgenticRuntimePolicy {
  return {
    source: "optima_native_hermes_derived",
    contexts: [
      {
        id: "interactive_chat",
        label: "Chat e command bar",
        allowedToolsets: ["graph_read", "business_lookup", "memory_read", "job_create"],
        blockedToolsets: ["deploy", "shell", "secret_read", "bulk_write"],
        requiredReview: ["job_create_with_repository", "customer_facing_send", "financial_statement"],
        notes: "La chat risponde subito solo quando il dato e nel grafo o nelle tabelle Optima; il lavoro operativo diventa job revisionabile.",
      },
      {
        id: "agent_job",
        label: "Job agentico",
        allowedToolsets: ["graph_read", "artifact_write", "git_read", "patch_propose", "mcp_allowlist", "browser_control_reviewed"],
        blockedToolsets: ["direct_deploy", "unscoped_customer_export", "secret_print"],
        requiredReview: ["patch_apply", "pull_request", "email_send", "database_mutation", "production_deploy"],
        notes: "Il runner riceve lane, connector concessi e brief; restituisce output in review prima di mutare stato irreversibile.",
      },
      {
        id: "scheduled_job",
        label: "Scheduler e cron",
        allowedToolsets: ["graph_read", "health_check", "digest_generate", "notification_draft"],
        blockedToolsets: ["interactive_messaging", "deploy", "shell", "secret_read"],
        requiredReview: ["write_business_records", "send_external_email", "modify_clients"],
        notes: "I cron devono essere visibili, cancellabili e non devono ereditare tool interattivi o privilegi larghi.",
      },
      {
        id: "subagent_handoff",
        label: "Handoff subagenti",
        allowedToolsets: ["graph_read", "memory_scoped", "connector_lane_allowlist", "handoff_event"],
        blockedToolsets: ["all_connectors", "cross_tenant_memory", "unreviewed_irreversible_action"],
        requiredReview: ["lane_escalation", "connector_escalation", "external_delivery"],
        notes: "Ogni subagente eredita solo lane, provider e connector dichiarati; l'escalation crea evento tracciato.",
      },
    ],
    lanePolicies: [
      {
        lane: "code",
        defaultProviderId: "codex",
        allowedConnectors: ["github", "browser", "cloudflare", "vercel", "hostinger"],
        blockedActions: ["direct_production_deploy", "secret_exfiltration", "unreviewed_force_push"],
        fallbackProviderId: "open-code",
      },
      {
        lane: "research",
        defaultProviderId: "qwen",
        allowedConnectors: ["github", "notion", "browser", "cloudinary"],
        blockedActions: ["write_customer_records", "send_external_message"],
        fallbackProviderId: "openai",
      },
      {
        lane: "media",
        defaultProviderId: "minimax",
        allowedConnectors: ["browser", "cloudinary", "google-drive"],
        blockedActions: ["publish_unreviewed_asset", "use_unlicensed_source"],
        fallbackProviderId: null,
      },
      {
        lane: "operations",
        defaultProviderId: "gemma-hosted",
        allowedConnectors: [
          "notion",
          "browser",
          "sendgrid",
          "telegram",
          "google-business-profile",
          "google-calendar",
          "meta-business-suite",
          "linkedin-pages",
          "google-drive",
          "cloudinary",
        ],
        blockedActions: [
          "send_unreviewed_admin_email",
          "modify_timesheets_without_trace",
          "publish_unapproved_social_post",
          "modify_google_business_profile_without_review",
        ],
        fallbackProviderId: "openai",
      },
      {
        lane: "chat",
        defaultProviderId: "openai",
        allowedConnectors: ["github", "notion", "browser", "cloudflare", "sendgrid"],
        blockedActions: ["answer_with_empty_model_content", "invent_missing_business_data"],
        fallbackProviderId: null,
      },
      {
        lane: "router",
        defaultProviderId: "openai",
        allowedConnectors: [
          "github",
          "notion",
          "browser",
          "cloudflare",
          "sendgrid",
          "telegram",
          "cloudinary",
          "google-business-profile",
          "google-calendar",
          "meta-business-suite",
          "linkedin-pages",
          "google-drive",
        ],
        blockedActions: ["bypass_tenant_scope", "bypass_review_room"],
        fallbackProviderId: null,
      },
    ],
    rules: [
      "Toolset e connector vengono risolti dal control plane Optima, non dal runner o dal modello.",
      "Ogni contesto parte da una allowlist minima e aggiunge capability solo tramite lane o job scope.",
      "La policy cron e piu restrittiva della policy chat: niente tool interattivi, deploy o shell.",
      "Fallback provider esplicito: non sostituire modello/provider in silenzio.",
      "Azioni irreversibili passano dalla review room con evento audit.",
    ],
  }
}

export function getAgenticTenantIsolation(principal: WorkspacePrincipal): AgenticTenantIsolation {
  return {
    organizationId: principal.organizationId,
    memberId: principal.memberId,
    secretBoundary: "secret_ref_only",
    dataBoundary: "organization_id",
    runnerBoundary: "job_payload_scoped",
    graphBoundary: "tenant_scoped_nodes_edges_sessions",
    reviewBoundary: "irreversible_actions_require_review",
    defaultBootstrapActions: [
      "seed_subagents_for_current_tenant",
      "seed_model_routes_for_current_tenant",
      "resolve_connectors_from_runtime_policy",
      "store_only_secret_refs",
      "return_artifacts_to_review_room",
    ],
    warnings: [
      "Non riusare token o memoria tra organization_id diversi.",
      "Il runner e condivisibile solo se ogni job contiene organizationId e non riceve segreti tenant in chiaro.",
      "Le sorgenti esterne importano indici redatti tenant-scoped, non dump completi.",
    ],
  }
}

export async function listModelRoutes(db: any, organizationId: string) {
  const rows = await safeAll(
    db,
    `SELECT * FROM agentic_model_routes
     WHERE organization_id = ?
     ORDER BY lane ASC, priority ASC, updated_at DESC`,
    [organizationId],
  )
  return rows.map(mapModelRoute)
}

async function getHostRuntimeStatus(host: AgenticModelHostSpec) {
  const apiKey = host.apiKeyEnv ? (await getRuntimeSecret(host.apiKeyEnv)).trim() : ""
  const baseUrl = host.baseUrlEnv ? (await getRuntimeSecret(host.baseUrlEnv)).trim() : ""
  const endpoint = host.endpointEnv ? (await getRuntimeSecret(host.endpointEnv)).trim() : ""

  if (host.mode === "self_hosted") {
    return endpoint
      ? { runtimeStatus: "ready" as const, runtimeDetail: `${host.endpointEnv} configurato` }
      : { runtimeStatus: "needs_endpoint" as const, runtimeDetail: `${host.endpointEnv} non configurato` }
  }

  if (host.mode === "router" || host.mode === "hosted") {
    if (apiKey) {
      return {
        runtimeStatus: "ready" as const,
        runtimeDetail: host.baseUrlEnv ? `${host.apiKeyEnv} presente${baseUrl ? `, ${host.baseUrlEnv} configurato` : ""}` : `${host.apiKeyEnv} presente`,
      }
    }
    return { runtimeStatus: "needs_secret" as const, runtimeDetail: `${host.apiKeyEnv} non configurato` }
  }

  return { runtimeStatus: "reference_only" as const, runtimeDetail: "Runtime solo documentato" }
}

export async function getAgenticModelRuntimeSnapshot(
  db: any,
  principal: WorkspacePrincipal,
): Promise<AgenticModelRuntimeSnapshot> {
  const routes = await listModelRoutes(db, principal.organizationId)
  const hosts = await Promise.all(
    MODEL_HOSTS.map(async (host) => ({
      ...host,
      ...(await getHostRuntimeStatus(host)),
    })),
  )

  const preferredLanes: AgenticModelLane[] = ["research", "operations", "chat", "code", "media"]
  const lanePlan = preferredLanes
    .map((lane) => {
      const route = routes.find((item) => item.lane === lane && item.status !== "disabled")
      const host = route
        ? hosts.find((item) => item.providerId === route.providerId && item.mode === route.mode) ?? hosts.find((item) => item.providerId === route.providerId)
        : hosts.find((item) => item.lane === lane)

      if (!route && !host) return null

      return {
        lane,
        providerId: route?.providerId ?? host!.providerId,
        model: route?.model || host!.defaultModel,
        mode: route?.mode ?? host!.mode,
        source: route ? "tenant_route" as const : "default_host" as const,
        status: route?.status ?? "suggested",
        runtimeStatus: host?.runtimeStatus ?? ("reference_only" as const),
      }
    })
    .filter((item): item is AgenticModelRuntimeSnapshot["lanePlan"][number] => Boolean(item))

  return { hosts, routes, lanePlan }
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
    modelRuntime: await getAgenticModelRuntimeSnapshot(db, principal),
    oauthGuidance: getOAuthGuidance(),
    tenantIsolation: getAgenticTenantIsolation(principal),
    runtimePolicy: getNativeAgenticRuntimePolicy(),
    hermesBlueprint: getHermesBlueprint(),
  }
}

const DEFAULT_SUBAGENTS: Array<Parameters<typeof createSubagent>[2]> = [
  {
    name: "Codex Engineer",
    slug: "codex-engineer",
    lane: "code",
    primaryProviderId: "codex",
    modelHint: "codex-cli",
    connectorIds: ["github", "browser", "cloudflare", "vercel", "hostinger"],
    systemPrompt: "Produce patch, report e PR in worktree isolato. Non fa deploy, push o mutazioni produzione senza approvazione esplicita del control plane.",
    permissions: { canCreatePatch: true, canCreatePullRequest: true, canDeploy: false, requiresReview: true },
    handoffPolicy: { onMissingRepository: "ask_or_infer_from_graph", onRiskyAction: "return_to_review" },
  },
  {
    name: "Research Analyst",
    slug: "research-analyst",
    lane: "research",
    primaryProviderId: "qwen",
    modelHint: "qwen-long-context",
    connectorIds: ["github", "notion", "browser", "cloudinary"],
    systemPrompt: "Raccoglie contesto, fonti e sintesi operative. Non inventa dati: segnala lacune e produce output revisionabile.",
    permissions: { canReadGraph: true, canWriteTasks: false, requiresSources: true },
    handoffPolicy: { onInsufficientSources: "return_to_review" },
  },
  {
    name: "Media Operator",
    slug: "media-operator",
    lane: "media",
    primaryProviderId: "minimax",
    modelHint: "minimax-media",
    connectorIds: ["browser", "cloudinary", "google-drive"],
    systemPrompt: "Gestisce generazione e trasformazione asset collegati a clienti, campagne e task, usando solo asset autorizzati.",
    permissions: { canCreateMedia: true, canMutateAssets: false, requiresReview: true },
    handoffPolicy: { onCopyrightRisk: "return_to_review" },
  },
  {
    name: "Client Publishing Operator",
    slug: "client-publishing-operator",
    lane: "operations",
    primaryProviderId: "gemma-hosted",
    modelHint: "gemma-hosted",
    connectorIds: ["google-business-profile", "google-calendar", "meta-business-suite", "linkedin-pages", "google-drive", "cloudinary"],
    systemPrompt:
      "Coordina pubblicazioni cliente, Google Business Profile, calendario editoriale, asset e approvazioni. Crea bozze e preview collegate a task/progetto; pubblicazioni e modifiche pubbliche richiedono approvazione esplicita.",
    permissions: {
      canReadClientChannels: true,
      canDraftSocialPosts: true,
      canDraftBusinessProfileUpdates: true,
      canPublishExternally: false,
      requiresClientApproval: true,
      requiresReview: true,
    },
    handoffPolicy: {
      onMissingOauth: "open_connector_wizard",
      onAssetNeeded: "handoff_to_media_operator",
      onApprovedPublish: "create_reviewed_publish_job",
    },
  },
  {
    name: "Office Ops",
    slug: "office-ops",
    lane: "operations",
    primaryProviderId: "gemma-hosted",
    modelHint: "gemma-hosted",
    connectorIds: ["notion", "sendgrid", "telegram"],
    systemPrompt: "Classifica richieste operative, rapportini e comunicazioni interne con modello leggero o hosted quando basta.",
    permissions: { canSendEmail: false, canDraftEmail: true, canCreateJob: true, requiresReview: true },
    handoffPolicy: { onExternalMessage: "create_job_or_draft" },
  },
  {
    name: "UX Quality Analyst",
    slug: "ux-quality-analyst",
    lane: "research",
    primaryProviderId: "qwen",
    modelHint: "qwen-long-context",
    connectorIds: ["github", "notion", "browser", "cloudinary"],
    systemPrompt: "Audita flussi reali, screenshot, feedback e telemetry per trovare attriti UI/UX, overflow, mobile regressions e copy ambiguo. Produce evidenze e patch suggestion, non mutazioni dirette.",
    permissions: { canReadGraph: true, canAuditUi: true, canCreateJob: true, canWriteCode: false, requiresEvidence: true },
    handoffPolicy: { onBugConfirmed: "handoff_to_codex_engineer", onMissingEvidence: "request_observation" },
  },
  {
    name: "Browser Operator",
    slug: "browser-operator",
    lane: "operations",
    primaryProviderId: "openai",
    modelHint: "browser-mcp-controller",
    connectorIds: ["browser", "notion", "cloudinary"],
    systemPrompt: "Usa Browser MCP per siti allowlist, sessioni OAuth autorizzate, QA visuale, ricerche e compilazione bozze. Non invia form, acquista, pubblica o modifica dati esterni senza review.",
    permissions: { canUseBrowser: true, canCaptureScreenshot: true, canSubmitForms: false, requiresReview: true, allowlistedOriginsOnly: true },
    handoffPolicy: { onLoginRequired: "request_owner_pairing", onIrreversibleAction: "return_to_review" },
  },
  {
    name: "Proposal PDF Engineer",
    slug: "proposal-pdf-engineer",
    lane: "code",
    primaryProviderId: "codex",
    modelHint: "codex-cli",
    connectorIds: ["github", "browser", "cloudinary"],
    systemPrompt: "Migliora preventivi, PDF, layout, brand kit, overflow e generatori riproducibili. Lavora su componenti e script, con screenshot/PDF di verifica e output in review.",
    permissions: { canCreatePatch: true, canRunBuild: true, canGeneratePdfPreview: true, canDeploy: false, requiresReview: true },
    handoffPolicy: { onBrandAssetNeeded: "handoff_to_media_operator", onApprovedPatch: "return_to_review_room" },
  },
  {
    name: "Graph Knowledge Curator",
    slug: "graph-knowledge-curator",
    lane: "research",
    primaryProviderId: "qwen",
    modelHint: "qwen-long-context",
    connectorIds: ["notion", "github", "cloudinary"],
    systemPrompt: "Indicizza knowhow, Notion, dossier, repo e fonti aziendali in nodi/archi tenant-scoped con confidence, source_id e deduplica. Non salva segreti e non importa dump non redatti.",
    permissions: { canReadGraph: true, canProposeGraphWrites: true, canBulkImport: false, requiresSourceId: true, requiresReview: true },
    handoffPolicy: { onSchemaGap: "create_codex_patch_job", onSensitiveData: "redact_and_review" },
  },
  {
    name: "Presence Ops Auditor",
    slug: "presence-ops-auditor",
    lane: "operations",
    primaryProviderId: "gemma-hosted",
    modelHint: "gemma-hosted",
    connectorIds: ["sendgrid", "telegram"],
    systemPrompt: "Controlla presenze, rapportini, ore, task collegate e anomalie calendario. Evidenzia incongruenze e prepara richieste di chiarimento o job correttivi revisionabili.",
    permissions: { canReadPresence: true, canDraftEmail: true, canCreateJob: true, canModifyTimesheets: false, requiresReview: true },
    handoffPolicy: { onTimesheetMutationNeeded: "return_to_admin_review", onMissingReport: "draft_reminder" },
  },
  {
    name: "Release Manager",
    slug: "release-manager",
    lane: "code",
    primaryProviderId: "codex",
    modelHint: "codex-cli",
    connectorIds: ["github", "cloudflare", "vercel", "hostinger"],
    systemPrompt: "Coordina build, test, commit, push e deploy solo dopo approvazione owner-scoped. Produce audit, version id, rollback plan e non usa force push.",
    permissions: { canCreatePatch: true, canRunBuild: true, canCommitPush: false, canDeploy: false, requiresOwnerApproval: true },
    handoffPolicy: { onApprovalGranted: "create_deploy_job", onBuildFailure: "return_to_review_with_logs" },
  },
  {
    name: "Security Governance Analyst",
    slug: "security-governance-analyst",
    lane: "research",
    primaryProviderId: "openai",
    modelHint: "gpt-5.2",
    connectorIds: ["github", "notion"],
    systemPrompt: "Rivede OAuth, MCP, secret_ref, tenant isolation, permessi subagenti, cron e runner. Cerca escalation, token leakage e azioni irreversibili non protette.",
    permissions: { canReadPolicies: true, canAuditSecurity: true, canCreateJob: true, canReadSecrets: false, requiresReview: true },
    handoffPolicy: { onCriticalRisk: "create_high_priority_codex_patch", onSecretNeeded: "ask_owner" },
  },
  {
    name: "Client Intelligence Analyst",
    slug: "client-intelligence-analyst",
    lane: "research",
    primaryProviderId: "qwen",
    modelHint: "qwen-long-context",
    connectorIds: ["notion", "github", "cloudinary"],
    systemPrompt: "Ricostruisce contesto clienti da Notion, preventivi, task, case study, asset e repo. Risponde solo con fonti verificabili e segnala dati mancanti.",
    permissions: { canReadClients: true, canReadQuotes: true, canReadGraph: true, canWriteClientRecords: false, requiresSources: true },
    handoffPolicy: { onMissingCommercialData: "create_import_job", onUsefulInsight: "propose_graph_node" },
  },
  {
    name: "Self Improvement Orchestrator",
    slug: "self-improvement-orchestrator",
    lane: "router",
    primaryProviderId: "openai",
    modelHint: "gpt-5.2",
    connectorIds: ["github", "browser", "cloudflare", "notion"],
    systemPrompt: "Legge telemetry, feedback, job falliti, richieste utente e readiness per decidere quali subagenti coinvolgere. Crea job piccoli, revisionabili e misurabili per migliorare Optima.",
    permissions: { canRouteSubagents: true, canCreateJob: true, canDeploy: false, requiresReview: true, tenantScopedOnly: true },
    handoffPolicy: { onUxIssue: "handoff_to_ux_quality_analyst", onCodePatch: "handoff_to_codex_engineer", onKnowledgeGap: "handoff_to_graph_knowledge_curator" },
  },
]

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

export async function upsertModelRoute(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    lane: AgenticModelLane
    providerId: string
    model: string
    mode?: AgenticModelMode
    status?: string
    priority?: number
    endpointRef?: string | null
    secretRef?: string | null
    config?: Record<string, unknown>
  },
) {
  const lane = input.lane
  const provider = PROVIDERS.find((item) => item.id === input.providerId)
  if (!provider) throw new Error("Provider modello non supportato.")

  const host = MODEL_HOSTS.find((item) => item.providerId === provider.id && item.lane === lane) ?? MODEL_HOSTS.find((item) => item.providerId === provider.id)
  const mode = input.mode ?? host?.mode ?? "hosted"
  const model = input.model.trim() || host?.defaultModel || provider.defaultModel

  await db
    .prepare(
      `INSERT INTO agentic_model_routes (
        id, organization_id, lane, provider_id, model, mode, status, priority,
        endpoint_ref, secret_ref, config_json, created_by_member_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, lane, provider_id, model) DO UPDATE SET
        mode = excluded.mode,
        status = excluded.status,
        priority = excluded.priority,
        endpoint_ref = excluded.endpoint_ref,
        secret_ref = excluded.secret_ref,
        config_json = excluded.config_json,
        created_by_member_id = excluded.created_by_member_id,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      createId("aimod"),
      principal.organizationId,
      lane,
      provider.id,
      model,
      mode,
      input.status || "configured",
      Number.isFinite(input.priority) ? Number(input.priority) : 100,
      input.endpointRef || host?.baseUrlEnv || host?.endpointEnv || null,
      input.secretRef || host?.secretRefHint?.replace("{organizationId}", principal.organizationId) || null,
      stringifyJson({
        ...(input.config || {}),
        runtimeAdapter: host?.runtimeAdapter,
        dataPolicy: host?.dataPolicy,
        installSteps: host?.installSteps,
      }),
      principal.memberId,
    )
    .run()
}

export async function seedHostedModelRoutes(db: any, principal: WorkspacePrincipal) {
  await upsertModelRoute(db, principal, {
    lane: "research",
    providerId: "qwen",
    model: "qwen-long-context",
    mode: "hosted",
    priority: 30,
    status: "configured",
  })
  await upsertModelRoute(db, principal, {
    lane: "operations",
    providerId: "gemma-hosted",
    model: "gemma-hosted",
    mode: "hosted",
    priority: 40,
    status: "configured",
  })
  await upsertModelRoute(db, principal, {
    lane: "chat",
    providerId: "openai",
    model: "gpt-5.2",
    mode: "router",
    priority: 50,
    status: "configured",
  })
  await upsertModelRoute(db, principal, {
    lane: "media",
    providerId: "minimax",
    model: "minimax-media",
    mode: "hosted",
    priority: 45,
    status: "configured",
    config: {
      collaboration: {
        from: "codex-engineer",
        to: "media-operator",
        trigger: "media_asset_or_visual_generation_required",
        storageConnector: "cloudinary",
        reviewRequired: true,
      },
    },
  })
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
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, slug) DO UPDATE SET
        name = excluded.name,
        lane = excluded.lane,
        status = 'active',
        primary_provider_id = excluded.primary_provider_id,
        model_hint = excluded.model_hint,
        connector_ids_json = excluded.connector_ids_json,
        system_prompt = excluded.system_prompt,
        permissions_json = excluded.permissions_json,
        handoff_policy_json = excluded.handoff_policy_json,
        created_by_member_id = excluded.created_by_member_id,
        updated_at = CURRENT_TIMESTAMP`,
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

export async function bootstrapAgenticTenant(db: any, principal: WorkspacePrincipal) {
  await seedHostedModelRoutes(db, principal)

  for (const subagent of DEFAULT_SUBAGENTS) {
    await createSubagent(db, principal, subagent)
  }

  return getAgenticCapabilitySnapshot(db, principal)
}
