"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileSearch,
  Eye,
  FileText,
  GitBranch,
  Loader2,
  MessageSquareText,
  Minus,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { AgentJob, AgentJobArtifact, AgentJobEvent, AgentRunnerHeartbeat } from "@/lib/agent-jobs"

interface AgentRunnerControlState {
  enabled: boolean
  status: "enabled" | "suspended"
  reason: string | null
}

const statusCopy: Record<string, string> = {
  queued: "In coda",
  running: "In esecuzione",
  needs_review: "Da approvare",
  approved: "Approvato",
  rejected: "Respinto",
  cancelled: "Annullato",
  failed: "Errore",
}

const statusClass: Record<string, string> = {
  queued: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  running: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  needs_review: "border-righello-pink/40 bg-righello-pink/10 text-pink-100",
  approved: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  rejected: "border-red-300/30 bg-red-300/10 text-red-100",
  cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  failed: "border-red-300/30 bg-red-300/10 text-red-100",
}

interface AgentJobDetails {
  job: AgentJob
  artifacts: AgentJobArtifact[]
  events: AgentJobEvent[]
}

interface BrowserMcpSession {
  id: string
  status: string
  target: string
  startUrl: string
  gatewayUrl: string | null
  gatewayHealthUrl?: string | null
  fallbackGatewayUrl?: string | null
  fallbackGatewayHealthUrl?: string | null
  callbackUrl: string
  pairingCode: string
  expiresAt: string
  instructions: string[]
  runnerCommand: string
  installCommand?: string
  missingEnv: string[]
}

interface AgenticCapabilities {
  providerCatalog: Array<{
    id: string
    label: string
    kind: string
    lane: string
    authMethod: string
    defaultModel: string
    installPattern: string
    tenantUse: string
    strengths: string[]
    requiredSecrets: string[]
    recommendedMcpConnectors: string[]
    notes: string
  }>
  mcpConnectorCatalog: Array<{
    id: string
    label: string
    status: string
    category: string
    purpose: string
    graphUse: string[]
    requiredEnv: string[]
    optionalEnv?: string[]
    authMethod?: string
    setupSteps?: string[]
    healthCheck?: string
    notes: string
  }>
  providerInstallations: Array<{
    providerId: string
    installState: string
    authMethod: string
    secretRef: string | null
    updatedAt: string
  }>
  connectorInstallations: Array<{
    connectorId: string
    installState: string
    authMethod: string
    scopes: string[]
    config?: Record<string, unknown>
    secretRef: string | null
    oauthSubject?: string | null
    lastHealthAt?: string | null
    lastHealthStatus?: string | null
    updatedAt: string
  }>
  modelRuntime: {
    hosts: Array<{
      id: string
      label: string
      providerId: string
      lane: string
      mode: string
      defaultModel: string
      runtimeAdapter: string
      apiKeyEnv: string | null
      baseUrlEnv: string | null
      endpointEnv: string | null
      secretRefHint: string | null
      dataPolicy: string
      installSteps: string[]
      runtimeStatus: string
      runtimeDetail: string
    }>
    routes: Array<{
      id: string
      lane: string
      providerId: string
      model: string
      mode: string
      status: string
      priority: number
      endpointRef: string | null
      secretRef: string | null
    }>
    lanePlan: Array<{
      lane: string
      providerId: string
      model: string
      mode: string
      source: string
      status: string
      runtimeStatus: string
    }>
  }
  subagents: Array<{
    id: string
    name: string
    slug: string
    lane: string
    status: string
    primaryProviderId: string
    modelHint: string | null
    connectorIds: string[]
  }>
  oauthGuidance: {
    pattern: string
    rules: string[]
  }
  tenantIsolation: {
    organizationId: string
    memberId: string
    secretBoundary: string
    dataBoundary: string
    runnerBoundary: string
    graphBoundary: string
    reviewBoundary: string
    defaultBootstrapActions: string[]
    warnings: string[]
  }
  runtimePolicy: {
    source: string
    contexts: Array<{
      id: string
      label: string
      allowedToolsets: string[]
      blockedToolsets: string[]
      requiredReview: string[]
      notes: string
    }>
    lanePolicies: Array<{
      lane: string
      defaultProviderId: string
      allowedConnectors: string[]
      blockedActions: string[]
      fallbackProviderId: string | null
    }>
    rules: string[]
  }
  hermesBlueprint: {
    reference: {
      repository: string
      localClone: string
      auditedRevision: string
      auditedTag: string
      license: string
      importPolicy: string
      integrationRule: string
    }
    patterns: Array<{
      id: string
      lane: string
      label: string
      status: string
      hermesFiles: string[]
      optimaSurface: string[]
      implementation: string
      guardrails: string[]
    }>
    stats: {
      total: number
      byStatus: Record<string, number>
      implementedOrPartial: number
    }
  }
}

interface AgenticGraphSnapshot {
  stats: {
    nodes: number
    edges: number
    sessions: number
    byType: Record<string, number>
  }
  nodes: Array<{
    id: string
    nodeType: string
    title: string
    confidence: string
    summary: string
    sourceType: string
    sourceId: string
    sourceUrl: string | null
    tags: string[]
    properties: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
    edgeType: string
    confidence: string
    weight: number
    properties: Record<string, unknown>
  }>
  referenceSources: Array<{
    id: string
    label: string
    importPolicy: string
    sourceType: string
  }>
}

type AgenticGraphNode = AgenticGraphSnapshot["nodes"][number]
type AgenticGraphEdge = AgenticGraphSnapshot["edges"][number]

interface AgenticGraphNodeDetail {
  node: AgenticGraphNode
  edges: AgenticGraphEdge[]
  connectedNodes: AgenticGraphNode[]
}

interface AgenticReadinessGap {
  id: string
  area: string
  label: string
  status: "ready" | "partial" | "blocked" | "missing"
  severity: "critical" | "high" | "medium" | "low"
  current: string
  target: string
  nextActions: string[]
  jobHint?: {
    title: string
    brief: string
  }
}

interface AgenticProductionReadiness {
  generatedAt: string
  summary: {
    coreReady: boolean
    agenticReady: boolean
    readyCount: number
    partialCount: number
    blockedCount: number
    missingCount: number
    score: number
    headline: string
    nextCriticalAction: string
  }
  metrics?: {
    mcpAuthMode?: string
    mcpAuthorizationConfigured?: boolean
    mcpOAuthAuthorizationCodeConfigured?: boolean
    mcpJwtBearerConfigured?: boolean
    mcpServiceTokenConfigured?: boolean
    connectorConfiguredCount?: number
    connectorTotalCount?: number
  }
  gaps: AgenticReadinessGap[]
}

interface SelfImprovementSnapshot {
  generatedAt: string
  windowDays: number
  score: number
  summary: string
  signals: Array<{
    id: string
    label: string
    severity: "critical" | "high" | "medium" | "low"
    count: number
    detail: string
  }>
  metrics: {
    aiCalls: number
    aiTokens: number
    negativeFeedback: number
    failedJobs: number
    reviewJobs: number
    staleQueuedJobs: number
    recentTasks: number
    recentQuotes: number
  }
  recommendedJob: {
    title: string
    contextSummary: string
    brief: string
    priority: number
  }
}

interface AgenticRecoverySnapshot {
  generatedAt: string
  score: number
  headline: string
  nextAction: string
  metrics: {
    graphNodes: number
    graphEdges: number
    knowhowNodes: number
    providerConfigured: number
    providerTotal: number
    connectorConfigured: number
    connectorTotal: number
    subagents: number
    readyRuntimeHosts: number
    runtimeHosts: number
    readinessScore: number
    selfImprovementScore: number | null
    recoveryJobActive: boolean
  }
  phases: Array<{
    id: string
    label: string
    status: "healthy" | "recovering" | "blocked"
    severity: "critical" | "high" | "medium" | "low"
    score: number
    current: string
    target: string
    actions: string[]
  }>
  recommendedJob: {
    title: string
    contextSummary: string
    brief: string
    priority: number
  }
}

const initialForm = {
  title: "",
  jobType: "task_update",
  priority: 3,
  repoUrl: "",
  repoBranch: "",
  contextSummary: "",
  brief: "",
}

const initialManualGraphNodeForm = {
  nodeType: "knowledge_base",
  title: "",
  summary: "",
  sourceType: "manual",
  confidence: "manual",
  tags: "",
  sourceUrl: "",
}

const jobTypesRequiringRepository = new Set(["codex_patch", "deploy"])
const terminalJobStatuses = new Set(["approved", "rejected", "cancelled"])
const OPTIMA_REPOSITORY_URL = "https://github.com/axelfleureau/optima-beta"
const OPTIMA_REPOSITORY_BRANCH = "codex/pause-vps-runner"
const priorityProviderIds = ["codex", "openai", "qwen", "gemma-hosted", "minimax"]
const priorityConnectorIds = ["codex", "github", "notion", "browser", "cloudflare", "sendgrid", "telegram", "cloudinary", "hostinger"]
type JobFilter = "active" | "review" | "running" | "done" | "all"

function compactJobCardOutput(value: string, maxLength = 360) {
  const normalized = value
    .replace(/OpenAI Codex v[^\n]+/gi, "")
    .replace(/workdir:\s*\S+/gi, "")
    .replace(/session id:\s*\S+/gi, "")
    .replace(/reasoning effort:\s*\S+/gi, "")
    .replace(/reasoning summaries:\s*\S+/gi, "")
    .replace(/sandbox:\s*[^\n]+/gi, "")
    .replace(/approval:\s*\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized) return "Output tecnico disponibile nella review room."
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trim()}... Apri Revisiona per log completo, artefatti e azioni.`
}

const quickJobTemplates = [
  {
    label: "Task GitHub",
    title: "Aggiorna task da attivita GitHub",
    jobType: "task_update",
    priority: 3,
    contextSummary: "GitHub multi-repository",
    brief:
      "Leggi le attivita GitHub successive all'ultimo aggiornamento applicato in Optima. Raggruppa per progetto/cliente, evita duplicati, produci report e script SQL idempotente con task/time entry revisionabili. Non fare deploy, commit o push.",
  },
  {
    label: "Patch UI",
    title: "Patch UI/UX Optima",
    jobType: "codex_patch",
    priority: 2,
    contextSummary: "Frontend Optima",
    brief:
      "Analizza il problema UI/UX indicato, proponi e applica una patch coerente con il design system Optima. Verifica mobile/desktop, typecheck e restituisci diff, rischi e note di deploy.",
  },
  {
    label: "Ricerca",
    title: "Ricerca operativa con fonti",
    jobType: "research",
    priority: 3,
    contextSummary: "Research / decisione operativa",
    brief:
      "Raccogli contesto verificabile, collega fonti e dati del grafo Optima, produci sintesi decisionale con rischi, lacune e prossime azioni. Non inventare informazioni non presenti.",
  },
  {
    label: "Deploy",
    title: "Deploy controllato Optima",
    jobType: "deploy",
    priority: 1,
    contextSummary: "Cloudflare / VPS",
    brief:
      "Prepara deploy controllato: verifica stato git, migration, build, health check, runner VPS e rollback plan. Esegui solo le azioni autorizzate e rimanda output in review.",
  },
] as const

const graphNodeTypeVisual: Record<string, { fill: string; stroke: string; label: string }> = {
  system: { fill: "#db2777", stroke: "#f9a8d4", label: "Sistema" },
  capability: { fill: "#0891b2", stroke: "#67e8f9", label: "Capability" },
  graph_engine: { fill: "#14b8a6", stroke: "#99f6e4", label: "Motore grafo" },
  graph_workspace: { fill: "#a855f7", stroke: "#e9d5ff", label: "Workspace grafo" },
  knowledge_base: { fill: "#7c3aed", stroke: "#c4b5fd", label: "Knowledge base" },
  development_knowhow: { fill: "#475569", stroke: "#cbd5e1", label: "Know-how" },
  reference_source: { fill: "#059669", stroke: "#6ee7b7", label: "Sorgente" },
  subagent: { fill: "#8b5cf6", stroke: "#ddd6fe", label: "Subagente" },
  connector: { fill: "#d97706", stroke: "#fcd34d", label: "Connector" },
  codex_skill: { fill: "#0ea5e9", stroke: "#bae6fd", label: "Skill Codex" },
  source_map: { fill: "#64748b", stroke: "#cbd5e1", label: "Mappa fonti" },
  skill_metadata: { fill: "#38bdf8", stroke: "#e0f2fe", label: "Metadata skill" },
  operational_dossier: { fill: "#f43f5e", stroke: "#fecdd3", label: "Dossier" },
  repository: { fill: "#22c55e", stroke: "#bbf7d0", label: "Repository" },
  runtime_source: { fill: "#f97316", stroke: "#fed7aa", label: "Runtime" },
  operational_audit: { fill: "#f59e0b", stroke: "#fde68a", label: "Audit" },
  notion_database: { fill: "#2563eb", stroke: "#93c5fd", label: "DB Notion" },
  notion_task: { fill: "#1d4ed8", stroke: "#bfdbfe", label: "Task Notion" },
  notion_client: { fill: "#0369a1", stroke: "#7dd3fc", label: "Cliente Notion" },
  hermes_memory: { fill: "#0d9488", stroke: "#5eead4", label: "Hermes" },
  hermes_skill: { fill: "#0f766e", stroke: "#99f6e4", label: "Skill Hermes" },
  obsidian_note: { fill: "#7e22ce", stroke: "#f0abfc", label: "Nota Obsidian" },
}

const graphConfidenceStroke: Record<string, string> = {
  manual: "#f472b6",
  extracted: "#22d3ee",
  inferred: "#34d399",
  ambiguous: "#f59e0b",
}

const graphConfidenceCopy: Record<string, string> = {
  manual: "manuale",
  extracted: "estratto",
  inferred: "inferito",
  ambiguous: "da verificare",
}

const graphSourceCopy: Record<string, string> = {
  internal: "Optima",
  hermes_readonly: "Hermes Righello",
  notion_righello: "Notion Righello",
  codex_knowhow: "Know-how Codex",
  open_source_reference: "Open source",
  product_pattern: "Pattern prodotto",
  private_readonly_source: "Sorgente privata",
  local_tool: "Tool locale",
  obsidian_vault: "Obsidian Vault",
}

const installStateCopy: Record<string, string> = {
  not_installed: "Non configurato",
  guide_required: "Setup da fare",
  configured: "Policy salvata",
  healthy: "Env rilevata",
  blocked: "Bloccato",
}

const installStateTone: Record<string, string> = {
  not_installed: "border-white/10 bg-white/5 text-slate-400",
  guide_required: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  configured: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  healthy: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  blocked: "border-red-300/25 bg-red-300/10 text-red-100",
}

const runtimeStatusTone: Record<string, string> = {
  ready: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  needs_secret: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  needs_endpoint: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  reference_only: "border-white/10 bg-white/5 text-slate-400",
}

const readinessStatusCopy: Record<AgenticReadinessGap["status"], string> = {
  ready: "Pronto",
  partial: "Parziale",
  blocked: "Bloccato",
  missing: "Manca",
}

const readinessStatusTone: Record<AgenticReadinessGap["status"], string> = {
  ready: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  partial: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  blocked: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  missing: "border-red-300/25 bg-red-300/10 text-red-100",
}

const readinessSeverityTone: Record<AgenticReadinessGap["severity"], string> = {
  critical: "text-red-100",
  high: "text-amber-100",
  medium: "text-cyan-100",
  low: "text-emerald-100",
}

const recommendedSubagents = [
  {
    name: "Codex Engineer",
    slug: "codex-engineer",
    lane: "code",
    primaryProviderId: "codex",
    modelHint: "codex-cli",
    connectorIds: ["github", "cloudflare", "vercel", "hostinger", "cloudinary"],
    systemPrompt: "Produce patch, report e PR in worktree isolato. Se il lavoro richiede asset media, apre handoff tracciato verso Media Operator/MiniMax invece di generare media fuori review.",
    permissions: { canCreatePatch: true, canCreatePullRequest: true, canDeploy: false, requiresReview: true },
    handoffPolicy: {
      onMissingRepository: "ask_or_infer_from_graph",
      onRiskyAction: "return_to_review",
      onMediaAssetRequired: "handoff_to_media_operator_minimax",
    },
  },
  {
    name: "Research Analyst",
    slug: "research-analyst",
    lane: "research",
    primaryProviderId: "qwen",
    modelHint: "qwen-long-context",
    connectorIds: ["github", "notion", "cloudinary"],
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
    connectorIds: ["cloudinary"],
    systemPrompt: "Collabora con Codex Engineer quando patch, landing o automazioni richiedono asset. Gestisce generazione e trasformazione asset collegati a clienti, campagne e task, usando solo asset autorizzati.",
    permissions: { canCreateMedia: true, canMutateAssets: false, requiresReview: true },
    handoffPolicy: { onCopyrightRisk: "return_to_review" },
  },
  {
    name: "Office Ops",
    slug: "office-ops",
    lane: "operations",
    primaryProviderId: "gemma",
    modelHint: "gemma-local",
    connectorIds: ["notion", "sendgrid", "telegram"],
    systemPrompt: "Classifica richieste operative, rapportini e comunicazioni interne con modello leggero o locale quando basta.",
    permissions: { canSendEmail: false, canDraftEmail: true, canCreateJob: true, requiresReview: true },
    handoffPolicy: { onExternalMessage: "create_job_or_draft" },
  },
]

function installTone(state: string) {
  return installStateTone[state] ?? installStateTone.not_installed
}

function installLabel(state: string) {
  return installStateCopy[state] ?? state
}

function providerSetupHint(provider: AgenticCapabilities["providerCatalog"][number]) {
  if (provider.authMethod === "runner_env") {
    return "Configura env sul VPS runner e su Cloudflare quando serve. Poi esegui un health-check: se heartbeat, CLI e secret sono ok, Optima puo usarlo."
  }
  if (provider.authMethod === "local_install") {
    return "Installa il runtime/CLI nella macchina runner autorizzata. Optima deve solo vedere policy e health check, non password o token in chiaro."
  }
  if (provider.authMethod === "api_key_secret") {
    return "API key a consumo solo come ultima spiaggia e facoltativa: prima valuta OAuth, Browser MCP, modello locale o provider gia incluso. Se la usi, resta nel runtime come secret_ref."
  }
  if (provider.authMethod === "none") {
    return "Non richiede segreti: va attivato con policy tenant e prova di esecuzione locale."
  }
  return "Usa installazione guidata, salva solo secret_ref e verifica con health check prima di dichiararlo operativo."
}

function providerAuthLabel(method?: string) {
  if (method === "oauth_pkce") return "OAuth / PKCE"
  if (method === "external_oauth") return "OAuth esterno"
  if (method === "runner_env") return "Runner env"
  if (method === "local_install") return "Install locale"
  if (method === "api_key_secret") return "API key opzionale / fallback"
  return "Nessun segreto"
}

function providerPrimaryActionLabel(provider: AgenticCapabilities["providerCatalog"][number]) {
  if (provider.id === "codex") return "Configura login"
  if (provider.id === "openai") return "Configura AI"
  if (provider.authMethod === "runner_env") return "Configura runner"
  if (provider.authMethod === "local_install") return "Configura install"
  if (provider.authMethod === "oauth_pkce" || provider.authMethod === "external_oauth") return "Configura OAuth"
  if (provider.authMethod === "api_key_secret") return "Configura opzioni"
  return "Configura provider"
}

function providerCredentialLabel(secret: string) {
  if (secret === "AGENT_RUNNER_API_KEY") return "token interno runner"
  if (secret.endsWith("_API_KEY")) return "API key facoltativa"
  return "credential fallback"
}

function providerInstallSteps(provider: AgenticCapabilities["providerCatalog"][number]) {
  if (provider.id === "codex") {
    return [
      "Sul VPS runner avvia login Codex CLI con device auth o sessione autorizzata: `codex login --device-auth` quando disponibile.",
      "Completa il codice/QR dal telefono o dal browser autorizzato di Axel, poi verifica `codex login status` sul runner.",
      "Configura solo il token interno Optima necessario al polling del runner, cioe AGENT_RUNNER_API_KEY. Non e una API key a consumo e non sostituisce il login Codex.",
      "Esegui health-check: heartbeat runner, `codex exec` dry-run, artefatto revisionabile e nessun deploy automatico.",
    ]
  }
  if (provider.authMethod === "runner_env") {
    return [
      "Verifica il runner autorizzato e il perimetro tenant: workdir isolata, heartbeat recente e nessun accesso a servizi esterni non allowlist.",
      `Configura nel runtime solo i secret necessari: ${provider.requiredSecrets.length ? provider.requiredSecrets.join(", ") : "nessun secret obbligatorio"}.`,
      "Salva in Optima policy e secret_ref, poi esegui health-check revisionabile prima di dichiarare il provider operativo.",
    ]
  }
  if (provider.authMethod === "api_key_secret") {
    return [
      "Prima prova un percorso senza consumo variabile: OAuth ufficiale, Browser MCP con login utente, modello locale o piano gia incluso.",
      "Se serve davvero una API key a pagamento, trattala come fallback facoltativo con tetto budget, scope minimi e quota controllata.",
      "Salvala solo in Cloudflare secret, VPS env o tenant vault: Optima conserva secret_ref, stato installazione e health-check, non la chiave.",
    ]
  }
  if (provider.authMethod === "local_install") {
    return [
      "Installa runtime/CLI sul runner autorizzato o nodo privato.",
      "Esponi solo endpoint locale/Tailscale o comando controllato da policy.",
      "Registra in Optima installazione, health-check e limiti d'uso per tenant.",
    ]
  }
  if (provider.authMethod === "oauth_pkce" || provider.authMethod === "external_oauth") {
    return [
      "Apri installazione OAuth con state/PKCE e redirect allowlist.",
      "Autorizza solo scope minimi e account corretti.",
      "Salva token nel runtime autorizzato; Optima conserva subject, scope, stato e secret_ref.",
    ]
  }
  return ["Salva policy tenant.", "Esegui health-check.", "Abilita il provider solo se il test e verificato."]
}

function providerWizardNotice(provider: AgenticCapabilities["providerCatalog"][number]) {
  if (provider.id === "codex") {
    return "Codex non deve rimandarti prima alle API key: la strada preferita e login/device-auth del Codex CLI sul VPS runner. API key a consumo o access token sono fallback facoltativi; AGENT_RUNNER_API_KEY e solo token interno Optima-runner."
  }
  if (provider.id === "openai") {
    return "Per ChatGPT web, Nano Banana o strumenti senza API la strada preferita e Browser MCP con pairing/login utente. OpenAI API key e ultima spiaggia facoltativa, solo se vuoi chiamare modelli via API server-side con costi controllati."
  }
  if (provider.authMethod === "runner_env") {
    return "Questo provider non si collega da telefono con OAuth: si abilita configurando il runner autorizzato e verificando heartbeat, CLI e secret."
  }
  if (provider.authMethod === "api_key_secret") {
    return "Non partire dalla API key: e una modalita a consumo, facoltativa e da usare solo se OAuth/Browser MCP/local non bastano. Se la configuri, resta nel runtime autorizzato."
  }
  return "La configurazione reale deve salvare stato, policy e secret_ref. Il job serve solo per health-check o audit, non per inserire credenziali."
}

function providerSetupModes(provider: AgenticCapabilities["providerCatalog"][number]) {
  if (provider.id === "codex") {
    return [
      {
        label: "Login Codex CLI",
        tone: "recommended",
        body: "Sul VPS esegui device auth/login del Codex CLI e autorizzi tu l'account. Optima verifica lo stato del CLI, non conserva la password.",
      },
      {
        label: "Browser MCP / QR",
        tone: "oauth",
        body: "Per sessioni web o login da telefono usa Browser MCP: profilo isolato, allowlist, pairing/QR e review prima di azioni esterne.",
      },
      {
        label: "Token/API fallback",
        tone: "fallback",
        body: "API key a consumo solo se inevitabile. AGENT_RUNNER_API_KEY invece e token interno Optima-runner, non billing provider.",
      },
    ]
  }
  if (provider.id === "openai") {
    return [
      {
        label: "Browser MCP / ChatGPT",
        tone: "recommended",
        body: "Per ChatGPT, Nano Banana e strumenti web: login utente in browser controllato, profilo isolato, allowlist domini e audit.",
      },
      {
        label: "OAuth provider",
        tone: "oauth",
        body: "Se il servizio espone OAuth/PKCE reale, Optima deve aprire callback con state, scope minimi e token nel runtime autorizzato.",
      },
      {
        label: "API key facoltativa",
        tone: "fallback",
        body: "Ultima spiaggia per chiamate server-side ai modelli, con budget e quota. Non e la strada per usare account ChatGPT web.",
      },
    ]
  }
  if (provider.authMethod === "api_key_secret") {
    return [
      {
        label: "OAuth/connector se disponibile",
        tone: "oauth",
        body: "Preferisci OAuth o connector ufficiale quando il provider lo supporta davvero.",
      },
      {
        label: "API key facoltativa",
        tone: "fallback",
        body: "Solo se non esistono OAuth, Browser MCP, modello locale o piano gia incluso. Deve avere budget/quote e secret_ref.",
      },
    ]
  }
  return [
    {
      label: providerAuthLabel(provider.authMethod),
      tone: "recommended",
      body: providerSetupHint(provider),
    },
  ]
}

function setupModeClass(tone: string) {
  if (tone === "recommended") return "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-50"
  if (tone === "oauth") return "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-50"
  return "border-amber-300/20 bg-amber-300/[0.07] text-amber-50"
}

function runtimeTone(state: string) {
  return runtimeStatusTone[state] ?? runtimeStatusTone.reference_only
}

function getRequestedOutput(jobType: string) {
  if (jobType === "task_update") return ["report", "task-update", "sql-seed"]
  if (jobType === "quote_pdf") return ["quote", "pdf", "report"]
  if (jobType === "research") return ["report", "sources"]
  return ["patch", "report", "pull-request", "task-update"]
}

function getTitlePlaceholder(jobType: string) {
  if (jobType === "task_update") return "Es. Aggiorna task Axel da attivita GitHub"
  if (jobType === "quote_pdf") return "Es. Genera preventivo DICO/SYSTEMDOC"
  if (jobType === "research") return "Es. Analizza stato progetto Solero"
  if (jobType === "deploy") return "Es. Deploy controllato Optima production"
  return "Es. Patch UI rapportini"
}

function getBriefPlaceholder(jobType: string) {
  if (jobType === "task_update") {
    return "Es. Leggi le attivita GitHub di axelfleureau dall'ultimo aggiornamento task, raggruppale per progetto/cliente e produci uno script SQL idempotente con task e time entry da revisionare. Non fare deploy, commit o push."
  }

  return "Descrivi cosa deve fare il runner, cosa deve produrre e quali limiti rispettare..."
}

function getGraphNodeLayout(
  nodes: AgenticGraphSnapshot["nodes"],
  edges: AgenticGraphSnapshot["edges"] = [],
  options: { limit?: number; selectedNodeId?: string | null } = {},
) {
  const typeOrder = [
    "system",
    "graph_engine",
    "graph_workspace",
    "knowledge_base",
    "capability",
    "subagent",
    "connector",
    "reference_source",
    "notion_database",
    "notion_client",
    "notion_task",
    "hermes_memory",
    "hermes_skill",
    "obsidian_note",
    "development_knowhow",
  ]
  const limit = options.limit ?? 18
  const selectedNodeId = options.selectedNodeId ?? null
  const degreeByNode = new Map<string, number>()
  const neighborIds = new Set<string>()
  for (const edge of edges) {
    degreeByNode.set(edge.fromNodeId, (degreeByNode.get(edge.fromNodeId) || 0) + 1)
    degreeByNode.set(edge.toNodeId, (degreeByNode.get(edge.toNodeId) || 0) + 1)
    if (selectedNodeId && edge.fromNodeId === selectedNodeId) neighborIds.add(edge.toNodeId)
    if (selectedNodeId && edge.toNodeId === selectedNodeId) neighborIds.add(edge.fromNodeId)
  }

  const visibleNodes = [...nodes]
    .sort((a, b) => {
      if (selectedNodeId) {
        if (a.id === selectedNodeId) return -1
        if (b.id === selectedNodeId) return 1
        const neighborDelta = Number(neighborIds.has(b.id)) - Number(neighborIds.has(a.id))
        if (neighborDelta !== 0) return neighborDelta
      }
      const degreeDelta = (degreeByNode.get(b.id) || 0) - (degreeByNode.get(a.id) || 0)
      if (degreeDelta !== 0) return degreeDelta
      const aType = typeOrder.includes(a.nodeType) ? typeOrder.indexOf(a.nodeType) : typeOrder.length
      const bType = typeOrder.includes(b.nodeType) ? typeOrder.indexOf(b.nodeType) : typeOrder.length
      const typeDelta = aType - bType
      if (typeDelta !== 0) return typeDelta
      return a.title.localeCompare(b.title)
    })
    .slice(0, limit)

  const selectedIndex = visibleNodes.findIndex((node) => node.id === selectedNodeId)
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id))
  const visibleEdgeInputs = edges.filter((edge) => visibleNodeIds.has(edge.fromNodeId) && visibleNodeIds.has(edge.toNodeId))

  const layout = visibleNodes.map((node, index) => {
    const degree = degreeByNode.get(node.id) || 0
    const typeBoost =
      node.nodeType === "system" || node.nodeType === "knowledge_base"
        ? 1.8
        : node.nodeType === "graph_engine" || node.nodeType === "graph_workspace"
          ? 1.35
          : node.nodeType === "capability"
            ? 0.9
            : 0
    const selectedBoost = node.id === selectedNodeId ? 1.5 : neighborIds.has(node.id) ? 0.6 : 0
    const r = Math.max(0.75, Math.min(4.8, 0.95 + Math.sqrt(degree + 1) * 0.42 + typeBoost * 0.42 + selectedBoost * 0.34))

    let x: number
    let y: number
    const isSelected = node.id === selectedNodeId
    const isNeighbor = neighborIds.has(node.id)

    if (selectedNodeId && selectedIndex >= 0) {
      if (isSelected) {
        x = 50
        y = 50
      } else if (isNeighbor) {
        const neighbors = visibleNodes.filter((item) => neighborIds.has(item.id))
        const neighborIndex = Math.max(0, neighbors.findIndex((item) => item.id === node.id))
        const point = seededGraphPoint(`${node.id}:${neighborIndex}`, 12 + Math.min(17, neighbors.length * 0.34), -92 + (360 / Math.max(1, neighbors.length)) * neighborIndex)
        x = point.x
        y = point.y
      } else {
        const outerNodes = visibleNodes.filter((item) => item.id !== selectedNodeId && !neighborIds.has(item.id))
        const outerIndex = Math.max(0, outerNodes.findIndex((item) => item.id === node.id))
        const point = seededGraphPoint(`${node.id}:${outerIndex}`, 26 + (outerIndex % 9) * 2.7, outerIndex * 137.508 - 24)
        x = point.x
        y = point.y
      }
    } else if (index === 0) {
      x = 50
      y = 50
    } else {
      const point = seededGraphPoint(`${node.id}:${index}`, 5 + Math.sqrt(index) * 4.9, index * 137.508 - 90)
      x = point.x
      y = point.y
    }

    return {
      node,
      x: Math.max(7, Math.min(93, x)),
      y: Math.max(8, Math.min(92, y)),
      vx: 0,
      vy: 0,
      r,
      degree,
      isSelected,
      isNeighbor,
      visual: graphNodeTypeVisual[node.nodeType] ?? { fill: "#334155", stroke: "#94a3b8", label: node.nodeType },
    }
  })

  const layoutById = new Map(layout.map((item) => [item.node.id, item]))
  for (let pass = 0; pass < 118; pass += 1) {
    const cooling = 1 - pass / 118

    for (let i = 0; i < layout.length; i += 1) {
      for (let j = i + 1; j < layout.length; j += 1) {
        const a = layout[i]
        const b = layout[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.max(0.001, Math.hypot(dx, dy))
        const minDistance = a.r + b.r + 1.6
        const charge = Math.min(4.8, (minDistance * minDistance) / (distance * 1.55)) * cooling
        const ux = dx / distance
        const uy = dy / distance

        if (!a.isSelected) {
          a.vx -= ux * charge * 0.08
          a.vy -= uy * charge * 0.08
        }
        if (!b.isSelected) {
          b.vx += ux * charge * 0.08
          b.vy += uy * charge * 0.08
        }
      }
    }

    for (const edge of visibleEdgeInputs) {
      const from = layoutById.get(edge.fromNodeId)
      const to = layoutById.get(edge.toNodeId)
      if (!from || !to) continue
      const selectedEdge = Boolean(selectedNodeId && (edge.fromNodeId === selectedNodeId || edge.toNodeId === selectedNodeId))
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.max(0.001, Math.hypot(dx, dy))
      const desiredDistance = selectedEdge ? 12 : Math.max(8, 17 - Math.min(6, Number(edge.weight || 1) * 2))
      const force = (distance - desiredDistance) * (selectedEdge ? 0.023 : 0.012) * cooling
      const ux = dx / distance
      const uy = dy / distance
      if (!from.isSelected) {
        from.vx += ux * force
        from.vy += uy * force
      }
      if (!to.isSelected) {
        to.vx -= ux * force
        to.vy -= uy * force
      }
    }

    for (const item of layout) {
      if (item.isSelected) {
        item.x = 50
        item.y = 50
        item.vx = 0
        item.vy = 0
        continue
      }

      const gravity = selectedNodeId ? (item.isNeighbor ? 0.006 : 0.002) : 0.004
      item.vx += (50 - item.x) * gravity * cooling
      item.vy += (50 - item.y) * gravity * cooling
      item.vx *= 0.82
      item.vy *= 0.82
      item.x = Math.max(6, Math.min(94, item.x + item.vx))
      item.y = Math.max(7, Math.min(93, item.y + item.vy))
    }
  }

  return layout
}

function hashGraphValue(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededGraphPoint(seed: string, radius: number, baseAngle: number) {
  const hash = hashGraphValue(seed)
  const jitterAngle = ((hash % 41) - 20) * 0.9
  const jitterRadius = (((hash >>> 8) % 100) / 100 - 0.5) * 5
  const angle = (baseAngle + jitterAngle) * (Math.PI / 180)
  const safeRadius = Math.max(4, Math.min(43, radius + jitterRadius))
  return {
    x: 50 + Math.cos(angle) * safeRadius,
    y: 50 + Math.sin(angle) * safeRadius * 0.78,
  }
}

function compactGraphLabel(value: string) {
  const clean = value.replace(/^Optima\s+/i, "").replace(/^Codex\s+/i, "")
  return clean.length > 18 ? `${clean.slice(0, 16).trim()}...` : clean
}

function graphMapSummary({
  visibleNodes,
  loadedNodes,
  totalNodes,
  visibleEdges,
  totalEdges,
  filtered,
}: {
  visibleNodes: number
  loadedNodes: number
  totalNodes: number
  visibleEdges: number
  totalEdges: number
  filtered: boolean
}) {
  const scope = filtered ? "filtrati" : "caricati"
  return `${visibleNodes} visibili · ${loadedNodes}/${totalNodes} nodi ${scope} · ${visibleEdges}/${totalEdges} archi`
}

const GRAPH_MIN_ZOOM = 0.45
const GRAPH_FIT_ZOOM = 0.62
const GRAPH_MAX_ZOOM = 2.8
const GRAPH_ZOOM_PRESETS = [0.5, 0.7, 0.85, 1]
const OBSIDIAN_VAULT_NAME = "Optima Obsidian Vault"
const OBSIDIAN_VAULT_PATH = "/Users/axel/Documents/Optima Obsidian Vault"
const OBSIDIAN_VAULT_URI = `obsidian://open?vault=${encodeURIComponent(OBSIDIAN_VAULT_NAME)}`
const OBSIDIAN_GRAPH_INDEX_URI = `obsidian://open?vault=${encodeURIComponent(OBSIDIAN_VAULT_NAME)}&file=${encodeURIComponent("Optima Graph Memory.md")}`
const OBSIDIAN_AGENTIC_DASHBOARD_URI = `obsidian://open?vault=${encodeURIComponent(OBSIDIAN_VAULT_NAME)}&file=${encodeURIComponent("Dashboards/Agentic OS.md")}`

function openObsidianUri(uri: string, label: string) {
  if (typeof window === "undefined") return
  window.location.href = uri
  window.setTimeout(() => {
    toast.info(`${label}: se non si apre, Obsidian non ha il vault registrato su questo dispositivo. Usa Aggiorna vault dal Mac, poi aprilo dall'app Obsidian.`)
  }, 900)
}

function clampGraphZoom(value: number) {
  return Math.max(GRAPH_MIN_ZOOM, Math.min(GRAPH_MAX_ZOOM, value))
}

function GraphMemoryMap({
  graphMemory,
  selectedNodeId,
  filtered = false,
  onSelectNode,
}: {
  graphMemory: AgenticGraphSnapshot | null
  selectedNodeId?: string | null
  filtered?: boolean
  onSelectNode?: (node: AgenticGraphNode) => void
}) {
  type CanvasNode = ReturnType<typeof getGraphNodeLayout>[number] & {
    stableX: number
    stableY: number
  }
  type CanvasDragState =
    | {
        mode: "pan"
        pointerId: number
        startX: number
        startY: number
        startPan: { x: number; y: number }
      }
    | {
        mode: "node"
        pointerId: number
        nodeId: string
      }

  const [nodeLimit, setNodeLimit] = useState(160)
  const [zoom, setZoom] = useState(GRAPH_FIT_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<CanvasDragState | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const simNodesRef = useRef<CanvasNode[]>([])
  const dragRef = useRef<CanvasDragState | null>(null)
  const lastTapRef = useRef<{ nodeId: string | null; x: number; y: number; time: number } | null>(null)

  const layout = useMemo(
    () => getGraphNodeLayout(graphMemory?.nodes ?? [], graphMemory?.edges ?? [], { limit: nodeLimit, selectedNodeId }),
    [graphMemory?.nodes, graphMemory?.edges, nodeLimit, selectedNodeId],
  )
  const totalNodes = graphMemory?.stats.nodes ?? layout.length
  const totalEdges = graphMemory?.stats.edges ?? graphMemory?.edges?.length ?? 0
  const loadedNodes = graphMemory?.nodes.length ?? layout.length
  const nodePosition = new Map(layout.map((item) => [item.node.id, item]))
  const selectedLayoutNode = selectedNodeId ? nodePosition.get(selectedNodeId) : null
  const hoveredLayoutNode = hoveredNodeId ? nodePosition.get(hoveredNodeId) : null
  const focusLayoutNode = selectedLayoutNode ?? hoveredLayoutNode
  const focusNodeId = selectedNodeId ?? hoveredNodeId
  const visibleEdges = (graphMemory?.edges ?? [])
    .map((edge) => ({
      edge,
      from: nodePosition.get(edge.fromNodeId),
      to: nodePosition.get(edge.toNodeId),
    }))
    .filter((item): item is { edge: AgenticGraphSnapshot["edges"][number]; from: (typeof layout)[number]; to: (typeof layout)[number] } =>
      Boolean(item.from && item.to),
    )
    .sort((a, b) => {
      if (selectedNodeId) {
        const aSelected = a.edge.fromNodeId === selectedNodeId || a.edge.toNodeId === selectedNodeId
        const bSelected = b.edge.fromNodeId === selectedNodeId || b.edge.toNodeId === selectedNodeId
        const selectedDelta = Number(bSelected) - Number(aSelected)
        if (selectedDelta !== 0) return selectedDelta
      }
      return Number(b.edge.weight || 0) - Number(a.edge.weight || 0)
    })
    .slice(0, Math.max(18, Math.min(360, nodeLimit * 4)))
  const isPartialMap = totalNodes > layout.length || totalEdges > visibleEdges.length
  const densityOptions = [48, 96, 160, 240].filter((limit) => limit <= Math.max(240, loadedNodes || 0))
  const summary = graphMapSummary({
    visibleNodes: layout.length,
    loadedNodes,
    totalNodes,
    visibleEdges: visibleEdges.length,
    totalEdges,
    filtered,
  })

  useEffect(() => {
    const previousNodes = new Map(simNodesRef.current.map((node) => [node.node.id, node]))
    simNodesRef.current = layout.map((node) => {
      const previous = previousNodes.get(node.node.id)
      return {
        ...node,
        x: previous?.x ?? node.x,
        y: previous?.y ?? node.y,
        vx: previous?.vx ?? 0,
        vy: previous?.vy ?? 0,
        stableX: node.x,
        stableY: node.y,
      }
    })
  }, [layout])

  useEffect(() => {
    dragRef.current = dragState
  }, [dragState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout.length) return
    const graphCanvas = canvas

    let frame = 0
    let disposed = false

    function resizeCanvas(context: CanvasRenderingContext2D) {
      const rect = graphCanvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      const targetWidth = Math.floor(width * dpr)
      const targetHeight = Math.floor(height * dpr)
      if (graphCanvas.width !== targetWidth || graphCanvas.height !== targetHeight) {
        graphCanvas.width = targetWidth
        graphCanvas.height = targetHeight
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { width, height }
    }

    function project(width: number, height: number, x: number, y: number) {
      const scale = (Math.min(width, height) * 0.9 * zoom) / 100
      return {
        x: width / 2 + (x - 50 - pan.x) * scale,
        y: height / 2 + (y - 50 - pan.y) * scale,
        scale,
      }
    }

    function tick() {
      if (disposed) return
      const context = graphCanvas.getContext("2d")
      if (!context) return

      const nodes = simNodesRef.current
      const nodeById = new Map(nodes.map((node) => [node.node.id, node]))
      const alpha = dragRef.current?.mode === "node" ? 0.4 : 0.18

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const distance = Math.max(0.08, Math.hypot(dx, dy))
          const minDistance = Math.max(1.8, a.r * 0.48 + b.r * 0.48 + 1.1)
          const push = Math.min(0.045, (minDistance * minDistance) / (distance * distance * 34)) * alpha
          const ux = dx / distance
          const uy = dy / distance
          if (!(dragRef.current?.mode === "node" && dragRef.current.nodeId === a.node.id)) {
            a.vx -= ux * push
            a.vy -= uy * push
          }
          if (!(dragRef.current?.mode === "node" && dragRef.current.nodeId === b.node.id)) {
            b.vx += ux * push
            b.vy += uy * push
          }
        }
      }

      for (const { edge } of visibleEdges) {
        const from = nodeById.get(edge.fromNodeId)
        const to = nodeById.get(edge.toNodeId)
        if (!from || !to) continue
        const dx = to.x - from.x
        const dy = to.y - from.y
        const distance = Math.max(0.08, Math.hypot(dx, dy))
        const selectedEdge = focusNodeId && (edge.fromNodeId === focusNodeId || edge.toNodeId === focusNodeId)
        const desired = selectedEdge ? 8 : Math.max(5.5, 11 - Math.min(4, Number(edge.weight || 1) * 1.4))
        const pull = (distance - desired) * (selectedEdge ? 0.004 : 0.0024) * alpha
        const ux = dx / distance
        const uy = dy / distance
        if (!(dragRef.current?.mode === "node" && dragRef.current.nodeId === from.node.id)) {
          from.vx += ux * pull
          from.vy += uy * pull
        }
        if (!(dragRef.current?.mode === "node" && dragRef.current.nodeId === to.node.id)) {
          to.vx -= ux * pull
          to.vy -= uy * pull
        }
      }

      for (const node of nodes) {
        if (dragRef.current?.mode === "node" && dragRef.current.nodeId === node.node.id) continue
        const anchorStrength = selectedNodeId ? (node.node.id === selectedNodeId ? 0.055 : node.isNeighbor ? 0.012 : 0.003) : 0.004
        node.vx += (node.stableX - node.x) * anchorStrength * alpha
        node.vy += (node.stableY - node.y) * anchorStrength * alpha
        node.vx += (50 - node.x) * 0.0009
        node.vy += (50 - node.y) * 0.0009
        node.vx *= 0.88
        node.vy *= 0.88
        node.x = Math.max(3, Math.min(97, node.x + node.vx))
        node.y = Math.max(4, Math.min(96, node.y + node.vy))
      }

      const { width, height } = resizeCanvas(context)
      context.clearRect(0, 0, width, height)

      const gradient = context.createRadialGradient(width * 0.5, height * 0.48, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.6)
      gradient.addColorStop(0, "rgba(88, 28, 135, 0.28)")
      gradient.addColorStop(0.38, "rgba(15, 23, 42, 0.18)")
      gradient.addColorStop(1, "rgba(2, 6, 23, 0)")
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      context.save()
      context.globalAlpha = 0.12
      context.fillStyle = "#cbd5e1"
      const dotStep = Math.max(18, 22 * zoom)
      for (let x = ((-pan.x * 4) % dotStep) - dotStep; x < width + dotStep; x += dotStep) {
        for (let y = ((-pan.y * 4) % dotStep) - dotStep; y < height + dotStep; y += dotStep) {
          context.beginPath()
          context.arc(x, y, 0.75, 0, Math.PI * 2)
          context.fill()
        }
      }
      context.restore()

      context.save()
      context.globalCompositeOperation = "lighter"
      for (const { edge } of visibleEdges) {
        const from = nodeById.get(edge.fromNodeId)
        const to = nodeById.get(edge.toNodeId)
        if (!from || !to) continue
        const selectedEdge = focusNodeId && (edge.fromNodeId === focusNodeId || edge.toNodeId === focusNodeId)
        const a = project(width, height, from.x, from.y)
        const b = project(width, height, to.x, to.y)
        context.beginPath()
        context.moveTo(a.x, a.y)
        context.lineTo(b.x, b.y)
        context.strokeStyle = selectedEdge ? (graphConfidenceStroke[edge.confidence] ?? "#a78bfa") : "rgba(148, 163, 184, 0.48)"
        context.globalAlpha = focusNodeId ? (selectedEdge ? 0.36 : 0.025) : edge.confidence === "ambiguous" ? 0.045 : 0.105
        context.lineWidth = selectedEdge ? 0.72 : Math.max(0.18, Math.min(0.52, Number(edge.weight || 1) * 0.16 * zoom))
        context.stroke()
      }
      context.restore()

      const sortedNodes = [...nodes].sort((a, b) => a.r - b.r)
      for (const node of sortedNodes) {
        const point = project(width, height, node.x, node.y)
        const isHovered = hoveredNodeId === node.node.id
        const isFocused = selectedNodeId === node.node.id || isHovered
        const isDimmed = Boolean(focusNodeId && !isFocused && !node.isNeighbor)
        const radius = Math.max(isFocused ? 2.8 : 1.35, Math.min(isFocused ? 7.5 : 4.2, node.r * 0.74 * zoom))
        context.save()
        context.globalAlpha = isDimmed ? 0.18 : 1
        context.shadowColor = node.visual.fill
        context.shadowBlur = isFocused ? 18 : node.isNeighbor ? 8 : 3
        context.beginPath()
        context.arc(point.x, point.y, radius + (isFocused ? 3.4 : 0.9), 0, Math.PI * 2)
        context.fillStyle = `${node.visual.fill}${isFocused ? "2f" : "14"}`
        context.fill()
        context.shadowBlur = isFocused ? 12 : 3
        context.beginPath()
        context.arc(point.x, point.y, radius, 0, Math.PI * 2)
        context.fillStyle = node.visual.fill
        context.fill()
        context.lineWidth = isFocused ? 1.25 : node.isNeighbor ? 0.55 : 0.32
        context.strokeStyle = isFocused ? "#f8fafc" : node.isNeighbor ? "#ddd6fe" : node.visual.stroke
        context.stroke()
        context.shadowBlur = 0
        context.beginPath()
        context.arc(point.x - radius * 0.26, point.y - radius * 0.28, Math.max(0.55, radius * 0.2), 0, Math.PI * 2)
        context.fillStyle = "rgba(255,255,255,0.72)"
        context.fill()

        const shouldLabel = isFocused
        if (shouldLabel) {
          const label = compactGraphLabel(node.node.title)
          context.font = "600 10px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          context.textAlign = "center"
          context.textBaseline = "top"
          context.lineWidth = 4
          context.strokeStyle = "rgba(3, 7, 18, 0.92)"
          context.strokeText(label, point.x, point.y + radius + 6)
          context.fillStyle = isDimmed ? "#64748b" : "#f8fafc"
          context.fillText(label, point.x, point.y + radius + 6)
        }
        context.restore()
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [focusNodeId, hoveredNodeId, layout.length, pan.x, pan.y, selectedNodeId, visibleEdges, zoom])

  function canvasToWorld(event: React.PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const scale = (Math.min(width, height) * 0.9 * zoom) / 100
    return {
      x: (event.clientX - rect.left - width / 2) / scale + 50 + pan.x,
      y: (event.clientY - rect.top - height / 2) / scale + 50 + pan.y,
      scale,
      width,
      height,
    }
  }

  function findCanvasNode(event: React.PointerEvent<HTMLDivElement>) {
    const world = canvasToWorld(event)
    if (!world) return null
    let nearest: CanvasNode | null = null
    let nearestDistance = Infinity
    for (const node of simNodesRef.current) {
      const distance = Math.hypot(node.x - world.x, node.y - world.y)
      const radius = Math.max(2.8, node.r * 0.92) / Math.max(0.55, zoom)
      if (distance < radius + 2.4 && distance < nearestDistance) {
        nearest = node
        nearestDistance = distance
      }
    }
    return nearest
  }

  function resetGraphView() {
    setZoom(GRAPH_FIT_ZOOM)
    setPan({ x: 0, y: 0 })
  }

  function handleGraphPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const hit = findCanvasNode(event)
    if (hit) {
      setHoveredNodeId(hit.node.id)
      setDragState({ mode: "node", pointerId: event.pointerId, nodeId: hit.node.id })
      lastTapRef.current = { nodeId: hit.node.id, x: event.clientX, y: event.clientY, time: Date.now() }
      return
    }
    setDragState({ mode: "pan", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startPan: pan })
  }

  function handleGraphPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      handleGraphPointerHover(event)
      return
    }
    if (dragState.pointerId !== event.pointerId) return
    if (dragState.mode === "node") {
      const world = canvasToWorld(event)
      if (!world) return
      const node = simNodesRef.current.find((item) => item.node.id === dragState.nodeId)
      if (!node) return
      node.x = Math.max(3, Math.min(97, world.x))
      node.y = Math.max(4, Math.min(96, world.y))
      node.vx = 0
      node.vy = 0
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dx = (event.clientX - dragState.startX) * (100 / zoom / Math.max(1, rect.width))
    const dy = (event.clientY - dragState.startY) * (100 / zoom / Math.max(1, rect.height))
    setPan({
      x: Math.max(-45, Math.min(45, dragState.startPan.x - dx)),
      y: Math.max(-45, Math.min(45, dragState.startPan.y - dy)),
    })
  }

  function handleGraphPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState?.pointerId !== event.pointerId) return
    if (dragState.mode === "node") {
      const tap = lastTapRef.current
      if (tap && tap.nodeId === dragState.nodeId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 8 && Date.now() - tap.time < 350) {
        const node = simNodesRef.current.find((item) => item.node.id === dragState.nodeId)
        if (node) onSelectNode?.(node.node)
      }
    }
    setDragState(null)
  }

  function handleGraphPointerHover(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState) return
    const hit = findCanvasNode(event)
    setHoveredNodeId((current) => (current === hit?.node.id ? current : hit?.node.id ?? null))
  }

  return (
    <div className="mt-3 min-w-0 overflow-hidden rounded-lg border border-[#2b2f46] bg-[#080a12] shadow-[0_0_0_1px_rgba(124,58,237,0.08),0_24px_90px_rgba(0,0,0,0.38)]">
      <div className="flex flex-col gap-2 border-b border-white/10 bg-[#0b0d16] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#a78bfa] shadow-[0_0_18px_rgba(167,139,250,0.85)]" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black uppercase tracking-[0.18em] text-slate-200">Anteprima grafo Optima</p>
            <p className="truncate text-[10px] font-semibold text-slate-500">{summary}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <button
            type="button"
            onClick={() => openObsidianUri(OBSIDIAN_AGENTIC_DASHBOARD_URI, "Dashboard Obsidian")}
            className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[10px] font-bold text-slate-200 transition hover:bg-white/10"
            title="Apre la dashboard Agentic OS nel vault Obsidian locale."
          >
            Obsidian OS
          </button>
          {densityOptions.map((limit) => (
            <button
              key={limit}
              type="button"
              onClick={() => setNodeLimit(limit)}
              className={`h-7 shrink-0 rounded-md border px-2 text-[10px] font-bold transition ${
                nodeLimit === limit ? "border-[#7c3aed] bg-[#7c3aed]/25 text-violet-100" : "border-white/10 bg-white/[0.025] text-slate-500 hover:bg-white/10"
              }`}
            >
              {limit}
            </button>
          ))}
          {GRAPH_ZOOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setZoom(preset)
                setPan({ x: 0, y: 0 })
              }}
              className={`h-7 shrink-0 rounded-md border px-2 text-[10px] font-bold transition ${
                Math.abs(zoom - preset) < 0.01
                  ? "border-[#7c3aed] bg-[#7c3aed]/25 text-violet-100"
                  : "border-white/10 bg-white/[0.025] text-slate-500 hover:bg-white/10"
              }`}
              aria-label={`Imposta zoom grafo al ${Math.round(preset * 100)}%`}
            >
              {Math.round(preset * 100)}%
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setZoom((current) => clampGraphZoom(current - 0.15))}
            className="h-7 w-7 shrink-0 rounded-md border-white/10 bg-transparent p-0 text-slate-300 hover:bg-white/10"
            aria-label="Riduci zoom grafo"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-10 shrink-0 text-center text-[10px] font-bold text-slate-500">{Math.round(zoom * 100)}%</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setZoom((current) => clampGraphZoom(current + 0.15))}
            className="h-7 w-7 shrink-0 rounded-md border-white/10 bg-transparent p-0 text-slate-300 hover:bg-white/10"
            aria-label="Aumenta zoom grafo"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetGraphView}
            className="h-7 shrink-0 rounded-md border-white/10 bg-transparent px-2 text-[10px] font-bold text-slate-300 hover:bg-white/10"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Adatta
          </Button>
        </div>
      </div>

      {layout.length ? (
        <div
          className={`relative h-[560px] touch-none overflow-hidden bg-[radial-gradient(circle_at_50%_46%,rgba(30,41,59,0.52),transparent_34%),radial-gradient(circle_at_52%_48%,rgba(124,58,237,0.16),transparent_28%),linear-gradient(180deg,#05070d,#03050a_62%,#020309)] sm:h-[680px] ${
            dragState ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handleGraphPointerDown}
          onPointerMove={handleGraphPointerMove}
          onPointerUp={handleGraphPointerUp}
          onPointerCancel={handleGraphPointerUp}
          onPointerOver={handleGraphPointerHover}
          onPointerLeave={() => {
            if (!dragState) setHoveredNodeId(null)
          }}
          onWheel={(event) => {
            event.preventDefault()
            setZoom((current) => clampGraphZoom(current + (event.deltaY > 0 ? -0.12 : 0.12)))
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Anteprima dinamica della graph memory Optima" />
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-md border border-white/10 bg-[#070912]/72 px-3 py-2 text-[11px] leading-5 text-slate-500 backdrop-blur">
            <span className="font-semibold text-slate-300">Anteprima Optima</span> · per la vista esatta usa Apri Obsidian; qui puoi solo ispezionare rapidamente il grafo in app.
          </div>
          {focusLayoutNode ? (
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md border border-white/10 bg-[#0b0d16]/92 p-3 text-xs leading-5 text-slate-300 shadow-2xl shadow-black/30 backdrop-blur sm:max-w-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#a78bfa]">Local graph</p>
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: focusLayoutNode.visual.fill, border: `1px solid ${focusLayoutNode.visual.stroke}` }}
                />
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{focusLayoutNode.node.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {focusLayoutNode.visual.label} · {focusLayoutNode.degree} backlink · {graphConfidenceCopy[focusLayoutNode.node.confidence] ?? focusLayoutNode.node.confidence}
                  </p>
                  {focusLayoutNode.node.summary ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-300">{focusLayoutNode.node.summary}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md border border-white/10 bg-[#0b0d16]/88 p-3 text-xs leading-5 text-slate-300 shadow-2xl shadow-black/30 backdrop-blur sm:max-w-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a78bfa]">Global graph</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Preview interna della graph memory. La vista Obsidian reale si apre dal vault esportato.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-sm leading-6 text-slate-500">
          Nessun nodo visualizzabile. Usa "Sincronizza grafo" per creare o aggiornare i riferimenti agentici iniziali senza cancellare dati esistenti.
        </div>
      )}

      <details className="border-t border-white/10 px-3 py-2">
        <summary className="cursor-pointer select-none text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Legenda grafo
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(graphNodeTypeVisual).map(([type, visual]) => (
            <span key={type} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: visual.fill, border: `1px solid ${visual.stroke}` }} />
              {visual.label}
            </span>
          ))}
          {Object.entries(graphConfidenceCopy).map(([confidence, label]) => (
            <span key={confidence} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: graphConfidenceStroke[confidence] ?? "#64748b" }}
              />
              {label}
            </span>
          ))}
        </div>
      </details>

      {isPartialMap ? (
        <div className="border-t border-white/10 px-3 py-2 text-[11px] leading-5 text-slate-500">
          Il grafo completo contiene {totalNodes} nodi e {totalEdges} collegamenti. La vista esatta di Obsidian non viene ricreata qui: si apre con "Apri Obsidian" sul vault esportato.
        </div>
      ) : null}
    </div>
  )
}

function parseServerDate(value: string | null) {
  if (!value) return NaN
  const normalized = /Z$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : NaN
}

function formatRelativeTime(value: string | null) {
  if (!value) return "mai"
  const timestamp = parseServerDate(value)
  if (!Number.isFinite(timestamp)) return "data non valida"
  const diffMs = Date.now() - timestamp
  const absMs = Math.abs(diffMs)
  if (absMs < 60_000) return "ora"
  const minutes = Math.round(absMs / 60_000)
  if (minutes < 60) return `${minutes} min fa`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h fa`
  const days = Math.round(hours / 24)
  return `${days} g fa`
}

function formatDateTime(value: string | null) {
  if (!value) return "n/d"
  const timestamp = parseServerDate(value)
  if (!Number.isFinite(timestamp)) return "data non valida"
  return new Date(timestamp).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asNumber(value: unknown): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function formatBytes(value: unknown) {
  const bytes = asNumber(value)
  if (bytes === null) return "n/d"
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let amount = bytes / 1024
  let unitIndex = 0
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024
    unitIndex += 1
  }
  const precision = amount >= 10 ? 0 : 1
  return `${amount.toFixed(precision)} ${units[unitIndex]}`
}

function formatUptime(value: unknown) {
  const seconds = asNumber(value)
  if (seconds === null) return "n/d"
  const hours = Math.floor(seconds / 3600)
  const days = Math.floor(hours / 24)
  if (days >= 1) return `${days} g ${hours % 24} h`
  if (hours >= 1) return `${hours} h`
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

function runnerHostSnapshot(runner: AgentRunnerHeartbeat | null) {
  const host = asRecord(runner?.metadata?.host)
  if (!host) return null
  const memory = asRecord(host.memory)
  const storage = asRecord(host.storage)
  const root = asRecord(storage?.root)
  const workRootSize = asRecord(storage?.workRootSize)
  const guard = asRecord(host.guard)
  const guardSize = asRecord(guard?.size)

  return {
    hostname: typeof host.hostname === "string" ? host.hostname : runner?.id ?? "runner",
    platform: typeof host.platform === "string" ? host.platform : null,
    uptime: formatUptime(host.uptimeSec),
    sampledAt: typeof host.sampledAt === "string" ? host.sampledAt : null,
    memoryUsedPercent: asNumber(memory?.usedPercent),
    rootUsedPercent: asNumber(root?.usedPercent),
    rootAvailable: formatBytes(root?.availableBytes),
    workRootSize: formatBytes(workRootSize?.bytes),
    guardPath: typeof guard?.path === "string" ? guard.path : null,
    guardSize: formatBytes(guardSize?.bytes),
    guardTimerActive: asBoolean(guard?.timerActive),
  }
}

export function AgentJobsClient({
  initialJobs,
  initialRunners,
  initialRunnerControl,
}: {
  initialJobs: AgentJob[]
  initialRunners: AgentRunnerHeartbeat[]
  initialRunnerControl: AgentRunnerControlState
}) {
  const [jobs, setJobs] = useState(initialJobs)
  const [runners, setRunners] = useState(initialRunners)
  const [runnerControl, setRunnerControl] = useState(initialRunnerControl)
  const [form, setForm] = useState(initialForm)
  const [showRepositoryOverride, setShowRepositoryOverride] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [busyJobId, setBusyJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewJobId, setReviewJobId] = useState<string | null>(null)
  const [reviewDetails, setReviewDetails] = useState<AgentJobDetails | null>(null)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [revisionMessage, setRevisionMessage] = useState("")
  const [mobilePanel, setMobilePanel] = useState<"jobs" | "create" | "stack">("jobs")
  const [stackSection, setStackSection] = useState<"overview" | "providers" | "graph" | "sources">("overview")
  const [jobFilter, setJobFilter] = useState<JobFilter>("active")
  const [lastControlPlaneRefreshAt, setLastControlPlaneRefreshAt] = useState(() => new Date().toISOString())
  const [capabilities, setCapabilities] = useState<AgenticCapabilities | null>(null)
  const [graphMemory, setGraphMemory] = useState<AgenticGraphSnapshot | null>(null)
  const [productionReadiness, setProductionReadiness] = useState<AgenticProductionReadiness | null>(null)
  const [selfImprovement, setSelfImprovement] = useState<SelfImprovementSnapshot | null>(null)
  const [agenticRecovery, setAgenticRecovery] = useState<AgenticRecoverySnapshot | null>(null)
  const [isCreatingSelfImprovement, setIsCreatingSelfImprovement] = useState(false)
  const [isCreatingAgenticRecovery, setIsCreatingAgenticRecovery] = useState(false)
  const [isSeedingGraph, setIsSeedingGraph] = useState(false)
  const [graphQuery, setGraphQuery] = useState("")
  const [graphNodeTypeFilter, setGraphNodeTypeFilter] = useState("")
  const [graphSourceFilter, setGraphSourceFilter] = useState("")
  const [graphSearchNodes, setGraphSearchNodes] = useState<AgenticGraphNode[] | null>(null)
  const [isSearchingGraph, setIsSearchingGraph] = useState(false)
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null)
  const [graphNodeDetail, setGraphNodeDetail] = useState<AgenticGraphNodeDetail | null>(null)
  const [isLoadingGraphNode, setIsLoadingGraphNode] = useState(false)
  const [manualGraphNodeForm, setManualGraphNodeForm] = useState(initialManualGraphNodeForm)
  const [isSavingGraphNode, setIsSavingGraphNode] = useState(false)
  const [capabilityAction, setCapabilityAction] = useState<string | null>(null)
  const [setupAction, setSetupAction] = useState<string | null>(null)
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [browserPairingAction, setBrowserPairingAction] = useState<string | null>(null)
  const [browserPairingSession, setBrowserPairingSession] = useState<BrowserMcpSession | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/agentic-capabilities")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setCapabilities(data)
      })
      .catch(() => {
        if (active) setCapabilities(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/agentic-graph")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setGraphMemory(data)
      })
      .catch(() => {
        if (active) setGraphMemory(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/agentic-readiness")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setProductionReadiness(data)
      })
      .catch(() => {
        if (active) setProductionReadiness(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/agentic-improvements", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setSelfImprovement(data)
      })
      .catch(() => {
        if (active) setSelfImprovement(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch("/api/agentic-recovery", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setAgenticRecovery(data)
      })
      .catch(() => {
        if (active) setAgenticRecovery(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const hasFilter = graphQuery.trim() || graphNodeTypeFilter || graphSourceFilter
    if (!hasFilter) {
      setGraphSearchNodes(null)
      setIsSearchingGraph(false)
      return
    }

    let active = true
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams()
      if (graphQuery.trim()) params.set("q", graphQuery.trim())
      if (graphNodeTypeFilter) params.set("nodeType", graphNodeTypeFilter)
      if (graphSourceFilter) params.set("sourceType", graphSourceFilter)
      params.set("limit", "240")
      setIsSearchingGraph(true)
      fetch(`/api/agentic-graph?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (active) setGraphSearchNodes(Array.isArray(data?.nodes) ? data.nodes : [])
        })
        .catch(() => {
          if (active) setGraphSearchNodes([])
        })
        .finally(() => {
          if (active) setIsSearchingGraph(false)
        })
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [graphQuery, graphNodeTypeFilter, graphSourceFilter])

  const stats = useMemo(() => {
    return {
      queued: jobs.filter((job) => job.status === "queued").length,
      running: jobs.filter((job) => job.status === "running").length,
      review: jobs.filter((job) => job.status === "needs_review").length,
      failed: jobs.filter((job) => job.status === "failed").length,
      done: jobs.filter((job) => terminalJobStatuses.has(job.status)).length,
      active: jobs.filter((job) => !terminalJobStatuses.has(job.status)).length,
    }
  }, [jobs])

  const runnerHealth = useMemo(() => {
    if (!runnerControl.enabled) {
      return {
        latest: runners[0] ?? null,
        label: "Runner sospeso",
        detail: runnerControl.reason ?? "Il claim dei job e sospeso lato server.",
        tone: "suspended" as const,
        isOnline: false,
      }
    }

    const latest = runners[0] ?? null
    if (!latest) {
      return {
        latest,
        label: "Runner mai visto",
        detail: "Nessun heartbeat ricevuto dal VPS.",
        tone: "offline" as const,
        isOnline: false,
      }
    }

    const lastSeenMs = parseServerDate(latest.lastSeenAt)
    const ageMs = Date.now() - lastSeenMs
    const fresh = Number.isFinite(ageMs) && ageMs < 90_000
    const stale = Number.isFinite(ageMs) && ageMs >= 90_000 && ageMs < 300_000

    if (latest.status === "error") {
      return {
        latest,
        label: "Runner in errore",
        detail: latest.lastErrorMessage ?? `Errore segnalato ${formatRelativeTime(latest.lastErrorAt)}`,
        tone: "error" as const,
        isOnline: false,
      }
    }

    if (fresh && latest.status !== "offline") {
      return {
        latest,
        label: latest.status === "running" ? "Runner al lavoro" : "Runner online",
        detail: `${latest.id} · ${latest.status} · visto ${formatRelativeTime(latest.lastSeenAt)}`,
        tone: "online" as const,
        isOnline: true,
      }
    }

    if (stale) {
      return {
        latest,
        label: "Runner in ritardo",
        detail: `${latest.id} non aggiorna da ${formatRelativeTime(latest.lastSeenAt)}.`,
        tone: "stale" as const,
        isOnline: false,
      }
    }

    return {
      latest,
      label: "Runner offline",
      detail: `${latest.id} non aggiorna da ${formatRelativeTime(latest.lastSeenAt)}.`,
      tone: "offline" as const,
      isOnline: false,
    }
  }, [runnerControl, runners])

  const runnerHost = useMemo(() => runnerHostSnapshot(runnerHealth.latest), [runnerHealth.latest])

  async function refreshJobs() {
    const response = await fetch("/api/agent-jobs")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Errore refresh job")
    setJobs(data.jobs ?? [])
  }

  async function refreshRunners() {
    const response = await fetch("/api/agent-jobs/runners")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Errore refresh runner")
    setRunners(data.runners ?? [])
    if (data.runnerControl) setRunnerControl(data.runnerControl)
  }

  async function refreshControlPlane() {
    const readinessRequest = fetch("/api/agentic-readiness")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setProductionReadiness(data)
      })
      .catch(() => null)
    await Promise.all([refreshJobs(), refreshRunners(), readinessRequest])
    setLastControlPlaneRefreshAt(new Date().toISOString())
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      refreshControlPlane().catch((err) => {
        console.warn("Agent control plane auto-refresh failed:", err)
      })
    }, 20_000)

    return () => window.clearInterval(interval)
    // refreshControlPlane intentionally uses current component state setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function mutateCapabilities(body: Record<string, unknown>, actionKey: string) {
    try {
      setCapabilityAction(actionKey)
      setError(null)
      const response = await fetch("/api/agentic-capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore aggiornamento capability")
      setCapabilities(data)
      return true
    } catch (err: any) {
      setError(err?.message ?? "Errore aggiornamento capability")
      return false
    } finally {
      setCapabilityAction(null)
    }
  }

  function getProviderInstallBody(provider: AgenticCapabilities["providerCatalog"][number]) {
    return {
      action: "install_provider",
      providerId: provider.id,
      installState: "guide_required",
      tenantPolicy: {
        dataScope: "tenant",
        requiresReview: true,
        allowedLane: provider.lane,
        notes: provider.notes,
      },
      config: {
        installPattern: provider.installPattern,
        requiredSecrets: provider.requiredSecrets,
        recommendedMcpConnectors: provider.recommendedMcpConnectors,
        defaultModel: provider.defaultModel,
      },
    }
  }

  function getConnectorInstallBody(connector: AgenticCapabilities["mcpConnectorCatalog"][number]) {
    const authMethod = connector.authMethod ?? (connector.requiredEnv.length ? "api_key_secret" : "external_oauth")
    return {
      action: "install_connector",
      connectorId: connector.id,
      installState: "guide_required",
      authMethod,
      scopes: connector.graphUse,
      config: {
        category: connector.category,
        requiredEnv: connector.requiredEnv,
        optionalEnv: connector.optionalEnv ?? [],
        setupSteps: connector.setupSteps ?? [],
        healthCheck: connector.healthCheck ?? null,
        purpose: connector.purpose,
        notes: connector.notes,
        hermesPattern: {
          catalog: "auth type dichiarato nel catalogo, installazione esplicita e health-check separato",
          oauthManager: "token reload/reauth e 401 deduplication restano responsabilita del runtime autorizzato",
          secretBoundary: "Optima salva secret_ref/stato, non token OAuth o API key in chiaro",
        },
      },
    }
  }

  function connectorAuthLabel(method?: string) {
    if (method === "oauth_pkce") return "OAuth / PKCE"
    if (method === "github_app") return "GitHub App / owner"
    if (method === "runner_env") return "Runner env"
    if (method === "service_account") return "Service account"
    if (method === "external_oauth") return "OAuth esterno"
    if (method === "browser_session_oauth") return "Browser session / OAuth"
    return "API key / secret"
  }

  function connectorPrimaryActionLabel(connector: AgenticCapabilities["mcpConnectorCatalog"][number]) {
    if (connector.id === "github") return "Apri policy GitHub"
    if (connector.id === "browser") return "Configura Browser"
    if (connector.authMethod === "oauth_pkce" || connector.authMethod === "external_oauth") return "Configura OAuth"
    if (connector.authMethod === "runner_env") return "Configura runtime"
    return "Configura secret"
  }

  function connectorSetupHint(connector: AgenticCapabilities["mcpConnectorCatalog"][number]) {
    if (connector.id === "github") {
      return "GitHub e owner-scoped: solo Axel autorizza repository, commit, PR e deploy. Optima registra policy e health-check, non condivide l'account."
    }
    if (connector.id === "browser") {
      return "Browser MCP usa Chromium/Playwright con profilo isolato per tenant. Da mobile puoi avviare un pairing/QR o login assistito, ma Optima salva solo secret_ref del profilo e audit: niente cookie o token in D1."
    }
    if (connector.authMethod === "oauth_pkce" || connector.authMethod === "external_oauth") {
      return "Il flusso OAuth deve aprire una installazione guidata con state/PKCE. Finche non esiste callback verificata, Optima puo salvare solo checklist e stato."
    }
    if (connector.authMethod === "runner_env") {
      return "Runtime self-hosted: configurazione su VPS/runner, heartbeat e dry-run prima di dichiararlo operativo."
    }
    return "Secret gestito fuori da D1: qui salviamo stato, policy e reference; la chiave reale resta nel runtime autorizzato."
  }

  async function configureConnector(connector: AgenticCapabilities["mcpConnectorCatalog"][number]) {
    const saved = await mutateCapabilities(getConnectorInstallBody(connector), `connector-config:${connector.id}`)
    if (saved) {
      toast.success("Checklist connector salvata", {
        description: `${connector.label}: nessun login eseguito. Servono pairing/OAuth o secret nel runtime, poi health-check prima della produzione.`,
      })
    }
  }

  async function configureProvider(provider: AgenticCapabilities["providerCatalog"][number]) {
    const saved = await mutateCapabilities(getProviderInstallBody(provider), `provider-config:${provider.id}`)
    if (saved) {
      toast.success("Checklist provider salvata", {
        description: `${provider.label}: non e stato fatto nessun accesso. Collega login/secret nel runtime e verifica con health-check.`,
      })
    }
  }

  async function startBrowserMcpLogin(target: "chatgpt" | "nanobanana" | "perplexity" | "claude") {
    try {
      setBrowserPairingAction(target)
      setError(null)
      const response = await fetch("/api/mcp/browser-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore avvio login Browser MCP")
      setBrowserPairingSession(data.session)
      if (data.capabilities) setCapabilities(data.capabilities)

      if (data.session?.gatewayUrl) {
        toast.success("Sessione Browser MCP preparata", {
          description: "Verifica prima il gateway VPS, poi apri il login remoto.",
        })
      } else {
        toast.warning("Gateway Browser MCP da configurare", {
          description: "Optima ha creato il pairing, ma manca BROWSER_MCP_GATEWAY_URL sul runtime.",
        })
      }
    } catch (err: any) {
      setError(err?.message ?? "Errore avvio Browser MCP")
      toast.error("Login Browser MCP non avviato", {
        description: err?.message ?? "Controlla gateway e permessi.",
      })
    } finally {
      setBrowserPairingAction(null)
    }
  }

  async function copyBrowserPairingCommand(command: string) {
    try {
      await navigator.clipboard.writeText(command)
      toast.success("Comando copiato", {
        description: "Usalo sul runner/VPS Optima quando serve completare il setup.",
      })
    } catch {
      toast.error("Copia non riuscita")
    }
  }

  async function createCapabilitySetupJob(input: {
    actionKey: string
    title: string
    contextSummary: string
    brief: string
    priority?: number
    metadata?: Record<string, unknown>
  }) {
    try {
      const hermesBlueprint = capabilities?.hermesBlueprint
      const hermesPatterns = hermesBlueprint?.patterns ?? []
      setSetupAction(input.actionKey)
      setError(null)
      const response = await fetch("/api/agent-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          jobType: "codex_patch",
          priority: input.priority ?? 2,
          repoUrl: OPTIMA_REPOSITORY_URL,
          repoBranch: OPTIMA_REPOSITORY_BRANCH,
          contextSummary: input.contextSummary,
          brief: [
            input.brief,
            "Repository operativo: Optima. Lavora in modo conservativo, produci patch o piano revisionabile e non fare deploy automatico.",
          ].join("\n\n"),
          input: {
            requestedOutput: ["setup-plan", "health-check", "implementation-patch", "review-report"],
            hermesPattern: {
              source: "hermes-reference-audit",
              repository: hermesBlueprint?.reference.repository ?? "https://github.com/NousResearch/hermes-agent",
              referenceClone: hermesBlueprint?.reference.localClone ?? "/Users/axel/Documents/Codex/reference-sources/hermes-agent",
              referenceRevision: hermesBlueprint?.reference.auditedRevision ?? "a85627612",
              referenceTag: hermesBlueprint?.reference.auditedTag ?? "v2026.6.5-816-ga85627612",
              license: hermesBlueprint?.reference.license ?? "MIT",
              relevantPatterns: hermesPatterns.length
                ? hermesPatterns.map((pattern) => ({
                    id: pattern.id,
                    lane: pattern.lane,
                    label: pattern.label,
                    status: pattern.status,
                    hermesFiles: pattern.hermesFiles,
                    optimaSurface: pattern.optimaSurface,
                    guardrails: pattern.guardrails,
                  }))
                : [
                    "tools/mcp_tool.py: MCP server lifecycle, stderr isolation, reconnect, timeouts",
                    "tools/mcp_oauth_manager.py: token reload, OAuth metadata, 401 deduplication",
                    "tools/managed_tool_gateway.py: managed vendor gateway and token refresh boundary",
                  ],
              integrationRule:
                hermesBlueprint?.reference.integrationRule ??
                "Portare i pattern della repo ufficiale nel control plane Optima, non riusare il servizio Hermes attivo ne' i suoi token.",
            },
            hermesRighelloDataPolicy: {
              source: "VPS Hermes esistente",
              vpsReadOnlyPath: "/home/hermes/.hermes",
              allowedDirs: ["memories", "skills", "kanban", "sessions"],
              forbiddenDirs: ["secrets"],
              importRule: "Solo indice redatto in graph memory: titoli, sommari, tag, confidence e source_id. Nessun token, nessun dump integrale.",
            },
            guardrails: [
              "non fermare, riavviare o modificare servizi Hermes esistenti sul VPS",
              "non scrivere token o segreti in D1, log, job brief o output",
              "non eseguire docker prune o pulizie VPS senza approvazione esplicita",
              "produrre patch Optima e piano di setup revisionabile prima di qualunque deploy",
              "mantenere ogni capability tenant-scoped con audit e human review",
            ],
            ...(input.metadata ?? {}),
          },
          context: {
            source: "agentic-stack-setup",
            createdFrom: "agenti-stack-control-room",
            vpsDiskState: "known_full_do_not_write_without_space_recovery",
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore creazione job setup")
      setJobs((current) => [data.job, ...current])
      setJobFilter("active")
      setMobilePanel("jobs")
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione job setup")
    } finally {
      setSetupAction(null)
    }
  }

  async function createProviderSetupJob(provider: AgenticCapabilities["providerCatalog"][number]) {
    await createCapabilitySetupJob({
      actionKey: `provider-setup:${provider.id}`,
      title: `Setup provider ${provider.label}`,
      contextSummary: `Provider ${provider.lane} / ${provider.authMethod}`,
      brief: [
        `Configura in Optima il provider ${provider.label} per la lane ${provider.lane}, usando pattern agentici nativi e auditati senza dipendere da servizi agentici esterni.`,
        `Default model: ${provider.defaultModel}. Auth: ${provider.authMethod}.`,
        `Segreti richiesti: ${provider.requiredSecrets.length ? provider.requiredSecrets.join(", ") : "nessuno"}.`,
        `MCP consigliati: ${provider.recommendedMcpConnectors.length ? provider.recommendedMcpConnectors.join(", ") : "nessuno"}.`,
        "Output richiesto: piano setup, env/secret_ref da configurare, health check, patch Optima necessaria e stato review. Non dichiarare operativo finche il runtime non e verificato.",
      ].join("\n\n"),
      metadata: {
        provider,
        installBody: getProviderInstallBody(provider),
      },
    })
  }

  async function createConnectorSetupJob(connector: AgenticCapabilities["mcpConnectorCatalog"][number]) {
    await createCapabilitySetupJob({
      actionKey: `connector-setup:${connector.id}`,
      title: `Setup MCP ${connector.label}`,
      contextSummary: `MCP ${connector.category}`,
      brief: [
        `Configura in Optima il connector MCP ${connector.label} come capability tenant-scoped del core agentico nativo di Optima.`,
        `Scopo: ${connector.purpose}`,
        `Scope grafo: ${connector.graphUse.join(", ") || "nessuno"}.`,
        `Env richieste: ${connector.requiredEnv.length ? connector.requiredEnv.join(", ") : "OAuth/reference senza env obbligatorie"}.`,
        `Env opzionali: ${connector.optionalEnv?.length ? connector.optionalEnv.join(", ") : "nessuna"}.`,
        "Output richiesto: schema installazione guidata, OAuth/secret_ref, health check, errori da mostrare in UI e patch necessaria. Non salvare token in chiaro.",
      ].join("\n\n"),
      metadata: {
        connector,
        installBody: getConnectorInstallBody(connector),
      },
    })
  }

  async function createStackSetupJob(kind: "providers" | "connectors" | "runtime" | "full") {
    const selectedProviders = capabilities?.providerCatalog.filter((provider) => priorityProviderIds.includes(provider.id)) ?? []
    const selectedConnectors = capabilities?.mcpConnectorCatalog.filter((connector) => priorityConnectorIds.includes(connector.id)) ?? []
    const label =
      kind === "providers"
        ? "provider AI base"
        : kind === "connectors"
          ? "MCP prioritari"
          : kind === "runtime"
            ? "runtime hosted"
            : "core agentico completo"
    await createCapabilitySetupJob({
      actionKey: `stack-setup:${kind}`,
      title: `Piano setup ${label}`,
      contextSummary: "Optima Agentic OS / native MCP core",
      brief: [
        `Produci un piano operativo e le patch necessarie per rendere realmente funzionante lo stack ${label} di Optima.`,
        "Optima deve copiare/assorbire le funzioni utili di Hermes come funzioni native: MCP server lifecycle, OAuth token reload, 401 deduplication, managed tool gateway, skill/memory loop, scheduler, subagenti e isolamento tool.",
        "Hermes resta solo sorgente di audit codice: non collegare Optima al servizio Hermes attivo sul VPS e non usare token Hermes. Qualunque intervento su Hostinger deve restare confinato al runner Optima o a recovery approvata.",
        `Provider prioritari: ${selectedProviders.map((provider) => `${provider.id}:${provider.authMethod}`).join(", ") || "nessuno"}.`,
        `MCP prioritari: ${selectedConnectors.map((connector) => `${connector.id}:${connector.status}`).join(", ") || "nessuno"}.`,
        "Output richiesto: matrice capability, setup guidato OAuth/secret_ref, health check per ogni connector, patch UI/API necessarie e ordine di esecuzione senza rischiare servizi esistenti.",
      ].join("\n\n"),
      metadata: {
        setupKind: kind,
        providers: selectedProviders,
        connectors: selectedConnectors,
      },
    })
  }

  async function createProductionGapJob(gap: AgenticReadinessGap) {
    await createCapabilitySetupJob({
      actionKey: `readiness-gap:${gap.id}`,
      title: gap.jobHint?.title ?? `Completa readiness: ${gap.label}`,
      contextSummary: `Production readiness / ${gap.area}`,
      brief: [
        gap.jobHint?.brief ?? `Risolvi il gap production-ready "${gap.label}" in Optima con patch e verifiche reali.`,
        `Stato attuale: ${gap.current}`,
        `Target: ${gap.target}`,
        `Prossime azioni richieste:\n${gap.nextActions.map((action) => `- ${action}`).join("\n")}`,
        "Output richiesto: piano, patch implementabile, health check, rischi, dati da non toccare e risultato revisionabile. Non dichiarare pronto cio che non viene verificato.",
      ].join("\n\n"),
      priority: gap.severity === "critical" ? 1 : gap.severity === "high" ? 2 : 3,
      metadata: {
        setupKind: "production-readiness-gap",
        gap,
      },
    })
  }

  async function createHermesDataImportJob() {
    await createCapabilitySetupJob({
      actionKey: "stack-setup:hermes-data",
      title: "Import read-only dati Hermes Righello nel grafo Optima",
      contextSummary: "Hermes VPS data / Graphify import",
      brief: [
        "Crea un piano e una patch per alimentare la graph memory Optima con i dati Righello presenti nell'installazione Hermes esistente sul VPS.",
        "Il servizio Hermes sul VPS appartiene a un'altra installazione: usalo solo come sorgente dati in sola lettura. Non modificare file, servizi, processi, systemd, env, token o cartelle secrets.",
        "Sorgenti consentite: /home/hermes/.hermes/memories, /home/hermes/.hermes/skills, /home/hermes/.hermes/kanban e metadati redatti di /home/hermes/.hermes/sessions. Sorgente vietata: /home/hermes/.hermes/secrets.",
        "Importa nel grafo solo indici redatti: titolo, sommario breve, tipo sorgente, source_id stabile, tag, confidence, dimensioni e timestamp. Non salvare conversazioni complete o contenuti sensibili.",
        "Usa i pattern Graphify per distinguere extracted, inferred e ambiguous. Le relazioni ambigue devono restare revisionabili prima di influenzare task, persone o clienti.",
        "Output richiesto: script di import sicuro, comando di esecuzione, limiti privacy, piano rollback/idempotenza e report dei nodi/archi creati.",
      ].join("\n\n"),
      metadata: {
        setupKind: "hermes-data-import",
        suggestedScript: "scripts/import-hermes-graph-source.mjs",
        readOnlySource: "/home/hermes/.hermes",
        excludedPaths: ["/home/hermes/.hermes/secrets"],
      },
    })
  }

  async function createNotionDataImportJob() {
    await createCapabilitySetupJob({
      actionKey: "stack-setup:notion-data",
      title: "Import read-only Notion Righello nel grafo Optima",
      contextSummary: "Notion Righello / Graphify import",
      brief: [
        "Crea un piano e una patch per indicizzare in Optima i database Notion aziendali Righello usando una pipeline Graphify-safe e tenant-scoped.",
        "Sorgenti allowlistate scoperte: RIG_CLIENTI RIGHELLO collection://28132473-a5fc-8035-803f-000b76e5cbf3; RIG_WORK collection://27f32473-a5fc-818d-8448-000b562dd5cf.",
        "Importa solo indici operativi: clienti, codici cliente, stato/tipo, task/lavori, stato task, tipologie, priorita, deadline, minute/durate, relazioni cliente-task, sorgente Notion e timestamp.",
        "Escludi sempre CREDENZIALI RIGHELLO, ACCESSI RIGHELLO, token, password, segreti, allegati pesanti, file OneDrive scaricati in locale, dati fiscali non necessari e transcript/dump integrali.",
        "PII come email/telefono/P.IVA/CF va omessa, hashata o mantenuta come secret_ref/field protetto solo se serve a un workflow approvato. Per default non salvarla nei nodi grafo.",
        "Output richiesto: script import idempotente, dry-run, report nodi/archi, mappa campi Notion->Optima, health check Notion, rollback e lista record scartati per policy.",
      ].join("\n\n"),
      metadata: {
        setupKind: "notion-data-import",
        suggestedScript: "scripts/import-notion-graph-source.mjs",
        sourcePolicy: "allowlist_only_redacted_index",
        allowlistedDataSources: {
          clients: "collection://28132473-a5fc-8035-803f-000b76e5cbf3",
          work: "collection://27f32473-a5fc-818d-8448-000b562dd5cf",
        },
        excludedPages: ["CREDENZIALI RIGHELLO", "ACCESSI RIGHELLO"],
        excludedFields: ["EMAIL", "TELEFONO", "PEC", "Partita IVA", "Codice Fiscale", "Codice Destinatario", "ALLEGATI", "LINK ONEDRIVE"],
      },
    })
  }

  async function createObsidianVaultJob() {
    await createCapabilitySetupJob({
      actionKey: "stack-setup:obsidian-vault",
      title: "Aggiorna Obsidian Vault da graph memory Optima",
      contextSummary: "Obsidian Vault / Graph memory",
      brief: [
        "Prepara ed esegui in modo revisionabile l'aggiornamento del vault Obsidian di Optima dalla graph memory aziendale.",
        "Usa lo script scripts/export-agentic-graph-obsidian-vault.mjs e produci un report con numero di note, archi, sorgenti escluse e percorso del vault.",
        "Il vault target e /Users/axel/Documents/Optima Obsidian Vault. Non importare allegati pesanti, video, credenziali, token o dump integrali di conversazioni.",
        "Le note Obsidian possono rientrare in Optima solo come obsidian_note revisionate: frontmatter chiaro, source_id stabile, summary breve, tag e confidence. Nessuna scrittura automatica su dati business senza review.",
        "Output richiesto: comando esatto, eventuale patch necessaria, health check del vault, istruzioni per aprire Obsidian e piano per importare note revisionate nel grafo.",
      ].join("\n\n"),
      metadata: {
        setupKind: "obsidian-vault",
        exportScript: "scripts/export-agentic-graph-obsidian-vault.mjs",
        vaultDir: "/Users/axel/Documents/Optima Obsidian Vault",
        sourcePolicy: "markdown_frontmatter_index_only_no_binary_assets_no_secrets",
      },
    })
  }

  async function createSelfImprovementJob() {
    try {
      setIsCreatingSelfImprovement(true)
      setError(null)
      const response = await fetch("/api/agentic-improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: selfImprovement?.windowDays ?? 7 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore creazione auto-miglioramento")
      setSelfImprovement(data)
      if (data.job) {
        setJobs((current) => (current.some((job) => job.id === data.job.id) ? current : [data.job, ...current]))
        setJobFilter("active")
        setMobilePanel("jobs")
      }
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione auto-miglioramento")
    } finally {
      setIsCreatingSelfImprovement(false)
    }
  }

  async function createAgenticRecoveryJob() {
    try {
      setIsCreatingAgenticRecovery(true)
      setError(null)
      const response = await fetch("/api/agentic-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore creazione recovery agentico")
      setAgenticRecovery(data)
      if (data.job) {
        setJobs((current) => (current.some((job) => job.id === data.job.id) ? current : [data.job, ...current]))
        setJobFilter("active")
        setMobilePanel("jobs")
      }
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione recovery agentico")
    } finally {
      setIsCreatingAgenticRecovery(false)
    }
  }

  async function loadGraphNode(node: AgenticGraphNode) {
    setSelectedGraphNodeId(node.id)
    setGraphNodeDetail(null)
    setIsLoadingGraphNode(true)
    setError(null)
    try {
      const response = await fetch(`/api/agentic-graph?nodeId=${encodeURIComponent(node.id)}&limit=80`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore caricamento nodo")
      setGraphNodeDetail(data)
    } catch (err: any) {
      setError(err?.message ?? "Errore caricamento nodo")
    } finally {
      setIsLoadingGraphNode(false)
    }
  }

  async function createGraphNodeJob(detail: AgenticGraphNodeDetail) {
    const connected = detail.connectedNodes.slice(0, 8)
    await createCapabilitySetupJob({
      actionKey: `graph-node-job:${detail.node.id}`,
      title: `Analizza nodo grafo: ${detail.node.title}`,
      contextSummary: `${detail.node.nodeType} / ${detail.node.sourceType}`,
      brief: [
        `Usa questo nodo della graph memory Optima come contesto operativo e produci un output revisionabile.`,
        `Nodo: ${detail.node.title}`,
        `Tipo: ${detail.node.nodeType}. Sorgente: ${graphSourceCopy[detail.node.sourceType] ?? detail.node.sourceType}. Confidence: ${graphConfidenceCopy[detail.node.confidence] ?? detail.node.confidence}.`,
        detail.node.summary ? `Sommario: ${detail.node.summary}` : "Sommario non disponibile.",
        connected.length
          ? `Collegamenti principali: ${connected.map((node) => `${node.title} (${node.nodeType})`).join("; ")}.`
          : "Nessun collegamento principale trovato.",
        "Determina se il nodo deve diventare task, capability, subagente, connector, memoria aziendale o semplice riferimento. Non inventare dati mancanti e non modificare produzione senza review.",
      ].join("\n\n"),
      metadata: {
        graphNode: detail.node,
        connectedNodes: connected,
        edgeCount: detail.edges.length,
      },
    })
    setSelectedGraphNodeId(null)
    setGraphNodeDetail(null)
  }

  async function createRecommendedSubagent(template: (typeof recommendedSubagents)[number]) {
    await mutateCapabilities(
      {
        action: "create_subagent",
        ...template,
      },
      `subagent:${template.slug}`,
    )
  }

  async function createRecommendedSubagents() {
    try {
      setCapabilityAction("subagents:base")
      setError(null)
      let latest: AgenticCapabilities | null = null
      for (const template of recommendedSubagents) {
        const response = await fetch("/api/agentic-capabilities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_subagent", ...template }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error ?? `Errore creazione ${template.name}`)
        latest = data
      }
      if (latest) setCapabilities(latest)
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione subagenti")
    } finally {
      setCapabilityAction(null)
    }
  }

  async function bootstrapTenantAgenticStack() {
    await mutateCapabilities(
      {
        action: "bootstrap_tenant_agentic_stack",
      },
      "tenant:bootstrap",
    )
  }

  async function createJob() {
    setError(null)
    setIsCreating(true)
    try {
      const response = await fetch("/api/agent-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          input: {
            requestedOutput: getRequestedOutput(form.jobType),
            guardrails: [
              "non eseguire deploy senza approvazione admin",
              "non stampare secret",
              "mantenere worktree isolato",
              form.jobType === "task_update"
                ? "per aggiornamento task usa GitHub come fonte multi-repository e produci output idempotente revisionabile"
                : "rispetta il repository risolto dal grafo o indicato manualmente",
            ],
          },
          context: {
            source: "optima-ai-ops",
            createdFrom: "admin-control-room",
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore creazione job")
      setJobs((current) => [data.job, ...current])
      setForm(initialForm)
      setShowRepositoryOverride(false)
    } catch (err: any) {
      setError(err?.message ?? "Errore creazione job")
    } finally {
      setIsCreating(false)
    }
  }

  async function loadReview(job: AgentJob) {
    setReviewJobId(job.id)
    setReviewDetails(null)
    setRevisionMessage("")
    setIsLoadingReview(true)
    setError(null)
    try {
      const response = await fetch(`/api/agent-jobs/${job.id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore caricamento revisione")
      setReviewDetails(data)
    } catch (err: any) {
      setError(err?.message ?? "Errore caricamento revisione")
    } finally {
      setIsLoadingReview(false)
    }
  }

  async function mutateJob(id: string, action: "approve" | "reject" | "cancel" | "revise", message?: string) {
    setBusyJobId(id)
    setError(null)
    try {
      const response = await fetch(`/api/agent-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Errore aggiornamento job")
      setJobs((current) => current.map((job) => (job.id === id ? data.job : job)))
      if (reviewJobId === id) {
        if (action === "revise") {
          setReviewJobId(null)
          setReviewDetails(null)
          setRevisionMessage("")
        } else {
          await loadReview(data.job)
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Errore aggiornamento job")
    } finally {
      setBusyJobId(null)
    }
  }

  const activeReviewJob = reviewDetails?.job ?? jobs.find((job) => job.id === reviewJobId) ?? null
  const providerInstallationsById = new Map((capabilities?.providerInstallations ?? []).map((item) => [item.providerId, item]))
  const connectorInstallationsById = new Map((capabilities?.connectorInstallations ?? []).map((item) => [item.connectorId, item]))
  const selectedConnector =
    (capabilities?.mcpConnectorCatalog ?? []).find((connector) => connector.id === selectedConnectorId) ?? null
  const selectedConnectorInstallation = selectedConnector ? connectorInstallationsById.get(selectedConnector.id) ?? null : null
  const selectedBrowserPairingSession =
    selectedConnector?.id === "browser"
      ? browserPairingSession ?? (asRecord(selectedConnectorInstallation?.config?.activePairingSession) as BrowserMcpSession | null)
      : null
  const selectedProvider =
    (capabilities?.providerCatalog ?? []).find((provider) => provider.id === selectedProviderId) ?? null
  const selectedProviderInstallation = selectedProvider ? providerInstallationsById.get(selectedProvider.id) ?? null : null
  const subagentsBySlug = new Map((capabilities?.subagents ?? []).map((item) => [item.slug, item]))
  const graphTypes = Object.entries(graphMemory?.stats.byType ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 8)
  const graphTypeOptions = Object.keys(graphMemory?.stats.byType ?? {}).sort((a, b) => a.localeCompare(b))
  const graphSourceOptions = Array.from(
    new Set([
      ...(graphMemory?.nodes ?? []).map((node) => node.sourceType).filter(Boolean),
      "internal",
      "notion_righello",
      "hermes_readonly",
      "codex_knowhow",
      "open_source_reference",
      "product_pattern",
    ]),
  ).sort((a, b) => (graphSourceCopy[a] ?? a).localeCompare(graphSourceCopy[b] ?? b))
  const visibleGraphNodes = graphSearchNodes ?? graphMemory?.nodes ?? []
  const visibleGraphNodeIds = new Set(visibleGraphNodes.map((node) => node.id))
  const visibleGraphEdges = (graphMemory?.edges ?? []).filter(
    (edge) => visibleGraphNodeIds.has(edge.fromNodeId) && visibleGraphNodeIds.has(edge.toNodeId),
  )
  const displayGraphMemory = graphMemory
    ? {
        ...graphMemory,
        nodes: visibleGraphNodes,
        edges: visibleGraphEdges,
      }
    : null
  const graphHasActiveFilter = Boolean(graphQuery.trim() || graphNodeTypeFilter || graphSourceFilter)
  const readyRuntimeCount = capabilities?.modelRuntime?.hosts.filter((host) => host.runtimeStatus === "ready").length ?? 0
  const configuredProviderCount = capabilities?.providerInstallations.filter((item) => item.installState !== "not_installed").length ?? 0
  const operationalMcpConnectors = (capabilities?.mcpConnectorCatalog ?? []).filter((connector) => connector.id !== "hermes-agent")
  const configuredConnectorCount =
    capabilities?.connectorInstallations.filter((item) => item.connectorId !== "hermes-agent" && item.installState !== "not_installed").length ?? 0
  const verifiedExternalConnectorCount =
    capabilities?.connectorInstallations.filter((item) =>
      item.connectorId !== "hermes-agent" &&
      (item.installState === "configured" || item.installState === "healthy") &&
      Boolean(item.secretRef || item.oauthSubject || item.lastHealthStatus === "ok"),
    ).length ?? 0
  const mcpAuthMode = productionReadiness?.metrics?.mcpAuthMode ?? "unknown"
  const mcpOAuthConfigured = Boolean(productionReadiness?.metrics?.mcpOAuthAuthorizationCodeConfigured)
  const mcpServiceTokenConfigured = Boolean(productionReadiness?.metrics?.mcpServiceTokenConfigured)
  const priorityProviderConfiguredCount =
    capabilities?.providerInstallations.filter((item) => priorityProviderIds.includes(item.providerId) && item.installState !== "not_installed").length ?? 0
  const priorityConnectorConfiguredCount =
    capabilities?.connectorInstallations.filter((item) => priorityConnectorIds.includes(item.connectorId) && item.installState !== "not_installed").length ?? 0
  const recommendedSubagentConfiguredCount = recommendedSubagents.filter((template) =>
    capabilities?.subagents.some((subagent) => subagent.slug === template.slug),
  ).length
  const knowhowCatalogNodeCount = Number(graphMemory?.stats.byType?.development_knowhow ?? 0)
  const knowhowFileNodeCount = Number(graphMemory?.stats.byType?.knowledge_file ?? 0)
  const codexSkillNodeCount = Number(graphMemory?.stats.byType?.codex_skill ?? 0)
  const knowledgeBaseNodeCount = Number(graphMemory?.stats.byType?.knowledge_base ?? 0)
  const knowhowNodeCount = knowhowCatalogNodeCount + knowhowFileNodeCount + codexSkillNodeCount + knowledgeBaseNodeCount
  const graphReady = Boolean(graphMemory?.stats.nodes)
  const filteredJobs = jobs.filter((job) => {
    if (jobFilter === "all") return true
    if (jobFilter === "active") return !terminalJobStatuses.has(job.status)
    if (jobFilter === "review") return job.status === "needs_review" || job.status === "failed"
    if (jobFilter === "running") return job.status === "queued" || job.status === "running"
    return terminalJobStatuses.has(job.status)
  })
  const nextActionCopy = stats.review
    ? `${stats.review} job da valutare in review room`
    : stats.running
      ? "Runner al lavoro: monitora heartbeat e output"
      : stats.queued
        ? runnerControl.enabled
          ? "Job in coda: il runner li prendera in polling"
          : "Job in coda ma claim sospeso lato server"
        : "Nessun blocco operativo nella coda"
  const jobFilters: Array<{ key: JobFilter; label: string; count: number; helper: string }> = [
    {
      key: "active",
      label: "Aperti",
      count: stats.active,
      helper: "Tutti i job non chiusi: in coda, in esecuzione, in review o in errore.",
    },
    {
      key: "review",
      label: "Review",
      count: stats.review + stats.failed,
      helper: "Output da approvare, respingere o rimandare al runner con istruzioni precise.",
    },
    {
      key: "running",
      label: "Coda/Run",
      count: stats.queued + stats.running,
      helper: "Solo job operativi: quelli in coda e quelli effettivamente presi dal runner.",
    },
    {
      key: "done",
      label: "Storico",
      count: stats.done,
      helper: "Job chiusi: approvati, respinti, annullati o completati.",
    },
    {
      key: "all",
      label: "Tutti",
      count: jobs.length,
      helper: "Vista completa della coda, utile per audit e diagnosi.",
    },
  ]
  const selectedJobFilter = jobFilters.find((filter) => filter.key === jobFilter) ?? jobFilters[0]
  const operationalActions = [
    {
      title: "Tenant OS",
      detail: capabilities?.tenantIsolation?.organizationId ? "scoped" : "da inizializzare",
      body: "Inizializza route modello e subagenti standard solo per l'organizzazione corrente.",
      action: "Bootstrap tenant",
      busyKey: "tenant:bootstrap",
      onClick: bootstrapTenantAgenticStack,
      complete: recommendedSubagentConfiguredCount >= recommendedSubagents.length && Boolean(capabilities?.modelRuntime?.routes.length),
    },
    {
      title: "Provider base",
      detail: `${priorityProviderConfiguredCount}/${priorityProviderIds.length} pronti`,
      body: "Apri i wizard per Codex, OpenAI, Qwen, Gemma hosted e MiniMax. I job servono solo come health-check dopo la configurazione.",
      action: "Apri provider",
      busyKey: "stack-section:providers",
      onClick: () => setStackSection("providers"),
      complete: priorityProviderConfiguredCount >= priorityProviderIds.length,
    },
    {
      title: "MCP prioritari",
      detail: `${priorityConnectorConfiguredCount}/${priorityConnectorIds.length} collegati`,
      body: "Configura MCP con OAuth/secret_ref o Browser MCP. GitHub resta owner-scoped su Axel.",
      action: "Apri MCP",
      busyKey: "stack-section:providers",
      onClick: () => setStackSection("providers"),
      complete: priorityConnectorConfiguredCount >= priorityConnectorIds.length,
    },
    {
      title: "Runtime hosted",
      detail: `${readyRuntimeCount}/${capabilities?.modelRuntime?.hosts.length ?? 0} ready`,
      body: "Crea un job setup per route tenant e health dei runtime Qwen, Gemma, MiniMax e OpenAI.",
      action: "Job runtime",
      busyKey: "stack-setup:runtime",
      onClick: () => createStackSetupJob("runtime"),
      complete: readyRuntimeCount > 0,
    },
    {
      title: "Subagenti",
      detail: `${recommendedSubagentConfiguredCount}/${recommendedSubagents.length} attivi`,
      body: "Profili Codex Engineer, Research Analyst, Media Operator e Office Ops.",
      action: "Crea set base",
      busyKey: "subagents:base",
      onClick: createRecommendedSubagents,
      complete: recommendedSubagentConfiguredCount >= recommendedSubagents.length,
    },
    {
      title: "Graph memory",
      detail: graphReady ? `${graphMemory?.stats.nodes ?? 0} nodi` : "da sincronizzare",
      body: "Nodi aziendali, connector, repository, know-how e sorgenti agentiche.",
      action: "Sincronizza grafo",
      busyKey: "graph:seed",
      onClick: seedGraphReferences,
      complete: graphReady,
    },
    {
      title: "Auto-miglioramento",
      detail: selfImprovement ? `${selfImprovement.score}/100` : "analisi uso",
      body:
        selfImprovement?.summary ??
        "Legge usage, feedback, job agentici e workspace per creare un job Codex revisionabile.",
      action: "Crea job",
      busyKey: "self-improvement:create",
      onClick: createSelfImprovementJob,
      complete: Boolean(selfImprovement && selfImprovement.signals.length === 0),
    },
    {
      title: "Recovery agentico",
      detail: agenticRecovery ? `${agenticRecovery.score}/100` : "da valutare",
      body:
        agenticRecovery?.headline ??
        "Ricompone runner, MCP/OAuth, grafo, runtime, Obsidian e superfici aziendali in un piano Codex unico.",
      action: agenticRecovery?.metrics.recoveryJobActive ? "Apri coda" : "Crea recovery",
      busyKey: "agentic-recovery:create",
      onClick: createAgenticRecoveryJob,
      complete: Boolean(agenticRecovery && agenticRecovery.score >= 85),
    },
    {
      title: "Obsidian Vault",
      detail: `${Number(graphMemory?.stats.byType?.graph_workspace ?? 0)} workspace`,
      body: "Esporta il grafo Optima in un vault Obsidian con note, wikilink, backlink e frontmatter revisionabile.",
      action: "Job vault",
      busyKey: "stack-setup:obsidian-vault",
      onClick: createObsidianVaultJob,
      complete: Number(graphMemory?.stats.byType?.graph_workspace ?? 0) > 0 || Number(graphMemory?.stats.byType?.obsidian_note ?? 0) > 0,
    },
    {
      title: "Dati Hermes Righello",
      detail: "read-only",
      body: "Crea un job import Graphify-safe da memories, skills, kanban e sessioni redatte. Secrets esclusi.",
      action: "Job import",
      busyKey: "stack-setup:hermes-data",
      onClick: createHermesDataImportJob,
      complete: Number(graphMemory?.stats.byType?.hermes_memory ?? 0) > 0 || Number(graphMemory?.stats.byType?.hermes_skill ?? 0) > 0,
    },
    {
      title: "Dati Notion Righello",
      detail: "allowlist",
      body: "Import Graphify-safe da RIG_CLIENTI e RIG_WORK. Credenziali, accessi, PII e allegati esclusi di default.",
      action: "Job Notion",
      busyKey: "stack-setup:notion-data",
      onClick: createNotionDataImportJob,
      complete: Number(graphMemory?.stats.byType?.notion_database ?? 0) > 0 || Number(graphMemory?.stats.byType?.notion_task ?? 0) > 0,
    },
  ]

  async function seedGraphReferences() {
    try {
      setIsSeedingGraph(true)
      setError(null)
      const response = await fetch("/api/agentic-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_references" }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore sincronizzazione grafo")
      setGraphMemory(data)
    } catch (err: any) {
      setError(err?.message ?? "Errore sincronizzazione grafo")
    } finally {
      setIsSeedingGraph(false)
    }
  }

  async function createManualGraphNode() {
    const title = manualGraphNodeForm.title.trim()
    if (!title) {
      setError("Inserisci un titolo per il nodo grafo.")
      return
    }

    try {
      setIsSavingGraphNode(true)
      setError(null)
      const response = await fetch("/api/agentic-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_node",
          nodeType: manualGraphNodeForm.nodeType,
          title,
          summary: manualGraphNodeForm.summary,
          sourceType: manualGraphNodeForm.sourceType,
          sourceUrl: manualGraphNodeForm.sourceUrl || null,
          confidence: manualGraphNodeForm.confidence,
          tags: manualGraphNodeForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          properties: {
            insertedFrom: "agenti-manual-graph-form",
            manualReview: true,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Errore salvataggio nodo grafo")

      const snapshotResponse = await fetch("/api/agentic-graph", { cache: "no-store" })
      const snapshot = await snapshotResponse.json()
      if (snapshotResponse.ok) setGraphMemory(snapshot)
      setGraphQuery(title)
      setManualGraphNodeForm(initialManualGraphNodeForm)
    } catch (err: any) {
      setError(err?.message ?? "Errore salvataggio nodo grafo")
    } finally {
      setIsSavingGraphNode(false)
    }
  }

  function applyQuickTemplate(template: (typeof quickJobTemplates)[number]) {
    setForm((current) => ({
      ...current,
      title: template.title,
      jobType: template.jobType,
      priority: template.priority,
      contextSummary: template.contextSummary,
      brief: template.brief,
    }))
  }

  const mobileTabClass = (panel: typeof mobilePanel) =>
    `h-11 min-w-0 gap-1 rounded-md px-1 text-xs font-black !whitespace-normal min-[390px]:gap-1.5 min-[390px]:text-sm ${
      mobilePanel === panel ? "bg-righello-pink text-white" : "text-slate-300 hover:bg-white/10"
    }`

  const stackSectionClass = (section: typeof stackSection) =>
    `h-10 min-w-0 rounded-md px-3 text-xs font-black transition ${
      stackSection === section
        ? "border border-cyan-300/35 bg-cyan-300/15 text-cyan-50 shadow-lg shadow-cyan-950/20"
        : "border border-white/10 bg-[#060a15] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
    }`

  const approvalCreatesPublishJob = (job: AgentJob) =>
    Boolean(
      job.repoUrl &&
        !job.input?.approvalFollowUpJobId &&
        (job.jobType === "codex_patch" || (job.jobType === "deploy" && job.input?.approvalStage !== "execution")),
    )

  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] lg:gap-6">
      <div className="sticky top-0 z-20 grid min-w-0 grid-cols-3 gap-1 rounded-lg border border-white/10 bg-[#080d19]/95 p-1 shadow-lg shadow-black/20 backdrop-blur lg:hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobilePanel("jobs")}
          className={mobileTabClass("jobs")}
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Coda</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobilePanel("create")}
          className={mobileTabClass("create")}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Crea</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobilePanel("stack")}
          className={mobileTabClass("stack")}
        >
          <Network className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Grafo</span>
        </Button>
      </div>

      <div
        className={`min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-5 lg:order-1 ${
          mobilePanel === "create" ? "block" : "hidden"
        } lg:block`}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-righello-pink/30 bg-righello-pink/15 text-righello-pink sm:h-11 sm:w-11">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-righello-pink">AI Ops</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Crea job operativo</h2>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Scrivi l'obiettivo, non la procedura. Optima risolve grafo, repository, subagente e runtime; il runner produce output revisionabile.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
          <div className="grid gap-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Template briefing</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {quickJobTemplates.map((template) => (
                <Button
                  key={template.label}
                  type="button"
                  variant="outline"
                  onClick={() => applyQuickTemplate(template)}
                  className="h-10 min-w-0 rounded-lg border-white/10 bg-[#060a15] px-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  <FileSearch className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{template.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-sm font-bold text-white">
            Titolo
            <input
              className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={getTitlePlaceholder(form.jobType)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-white">
              Tipo job
              <select
                className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                value={form.jobType}
                onChange={(event) => setForm((current) => ({ ...current, jobType: event.target.value }))}
              >
                <option value="task_update">Aggiorna task da GitHub</option>
                <option value="codex_patch">Codex patch/PR</option>
                <option value="quote_pdf">Preventivo PDF</option>
                <option value="research">Ricerca operativa</option>
                <option value="deploy">Deploy controllato</option>
                <option value="general">Generale</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-white">
              Priorità
              <select
                className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))}
              >
                <option value={1}>1 - urgente</option>
                <option value={2}>2 - alta</option>
                <option value={3}>3 - normale</option>
                <option value={4}>4 - bassa</option>
                <option value={5}>5 - backlog</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-3 sm:p-4">
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {form.jobType === "task_update" ? "Fonte GitHub multi-repository" : "Repository automatico"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {jobTypesRequiringRepository.has(form.jobType)
                      ? "Per patch e deploy serve un repository. Optima prova a risolverlo dal grafo; se non basta puoi forzarlo qui."
                      : form.jobType === "task_update"
                        ? "Non serve scegliere un repository: il runner usa le attivita GitHub e il grafo clienti/progetti per preparare task e time entry."
                        : "Per questo job il repository resta opzionale e viene usato solo se il grafo lo suggerisce."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRepositoryOverride((current) => !current)}
                className="h-9 w-full shrink-0 rounded-lg border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 min-[420px]:w-auto"
              >
                {showRepositoryOverride ? "Nascondi override" : "Forza repository"}
              </Button>
            </div>
          </div>

          {showRepositoryOverride ? (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="grid gap-2 text-sm font-bold text-white">
                Repository override
                <input
                  className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                  value={form.repoUrl}
                  onChange={(event) => setForm((current) => ({ ...current, repoUrl: event.target.value }))}
                  placeholder="https://github.com/axelfleureau/..."
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white">
                Branch
                <input
                  className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                  value={form.repoBranch}
                  onChange={(event) => setForm((current) => ({ ...current, repoBranch: event.target.value }))}
                  placeholder="Auto / main"
                />
              </label>
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-bold text-white">
            Contesto breve
            <input
              className="rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
              value={form.contextSummary}
              onChange={(event) => setForm((current) => ({ ...current, contextSummary: event.target.value }))}
              placeholder="Cliente, feature o area"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-white">
            Brief operativo
            <textarea
              className="min-h-36 rounded-lg border border-white/10 bg-[#060a15] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/70 sm:min-h-44"
              value={form.brief}
              onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
              placeholder={getBriefPlaceholder(form.jobType)}
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={createJob}
            disabled={isCreating}
            className="h-12 rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90"
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Crea job agentico
          </Button>
        </div>
      </div>

      <div
        className={`min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-5 lg:order-3 ${
          mobilePanel === "stack" ? "block" : "hidden"
        } lg:col-span-2 lg:block`}
      >
        <div className="flex min-w-0 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Agentic OS</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Stack agentico</h2>
            <p className="mt-2 break-words text-sm leading-6 text-slate-400">
              Provider, MCP, subagenti, runtime e memoria a grafo. Ogni capability e tenant-scoped; Optima salva policy e secret_ref, non token in chiaro.
            </p>
          </div>
          <span className="w-fit max-w-full rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
            multi-tenant
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <button type="button" onClick={() => setStackSection("overview")} className={stackSectionClass("overview")}>
            Sintesi
          </button>
          <button type="button" onClick={() => setStackSection("providers")} className={stackSectionClass("providers")}>
            Provider e MCP
          </button>
          <button type="button" onClick={() => setStackSection("graph")} className={stackSectionClass("graph")}>
            Grafo
          </button>
          <button type="button" onClick={() => setStackSection("sources")} className={stackSectionClass("sources")}>
            Sorgenti
          </button>
        </div>

        <div className={stackSection === "overview" ? "grid gap-4" : "hidden"}>
        <div className="mt-4 rounded-lg border border-violet-300/25 bg-[radial-gradient(circle_at_18%_0%,rgba(124,58,237,0.2),transparent_34%),linear-gradient(135deg,rgba(23,20,38,0.96),rgba(7,9,18,0.96))] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Vault Obsidian</p>
              <h3 className="mt-1 text-lg font-black text-white">Graph View nativa</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Vault locale Mac: <span className="font-bold text-violet-50">{OBSIDIAN_VAULT_PATH}</span>. Da iPhone usa il grafo interno; Dashboard e Indice funzionano solo se il vault Obsidian e aperto sul Mac o sincronizzato anche su questo dispositivo.
              </p>
              <div className="mt-3 rounded-lg border border-violet-200/15 bg-black/20 px-3 py-2 text-xs leading-5 text-violet-100">
                Operazione corretta: dal Mac premi Aggiorna vault, apri Obsidian e seleziona il vault "{OBSIDIAN_VAULT_NAME}". Da mobile resta su Grafo interno, oppure sincronizza il vault con Obsidian Sync/iCloud e registralo nell'app Obsidian.
              </div>
            </div>
            <div className="grid w-full shrink-0 gap-2 min-[460px]:grid-cols-2 lg:grid-cols-4 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={createObsidianVaultJob}
                disabled={setupAction === "stack-setup:obsidian-vault"}
                className="h-11 rounded-lg border-violet-300/25 bg-violet-300/10 px-3 text-xs font-bold text-violet-50 hover:bg-violet-300/15"
              >
                {setupAction === "stack-setup:obsidian-vault" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1.5 h-3.5 w-3.5" />}
                Aggiorna vault
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStackSection("graph")}
                className="h-11 rounded-lg border-violet-300/25 bg-violet-300/20 px-3 text-xs font-black text-white hover:bg-violet-300/30"
              >
                Grafo interno
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openObsidianUri(OBSIDIAN_AGENTIC_DASHBOARD_URI, "Dashboard Obsidian")}
                className="h-11 rounded-lg border-violet-300/25 bg-[#171426] px-3 text-xs font-black text-violet-50 hover:bg-violet-300/20"
              >
                Dashboard Mac
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openObsidianUri(OBSIDIAN_GRAPH_INDEX_URI, "Indice grafo Obsidian")}
                className="h-11 rounded-lg border-violet-300/25 bg-[#171426] px-3 text-xs font-black text-violet-50 hover:bg-violet-300/20"
              >
                Indice Mac
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ["Policy provider", configuredProviderCount, `${capabilities?.providerCatalog.length ?? 0} catalogo`],
            ["Runtime ready", readyRuntimeCount, `${capabilities?.modelRuntime?.hosts.length ?? 0} host`],
            ["Subagenti", capabilities?.subagents.length ?? 0, "tenant"],
            ["Scibile", knowhowNodeCount, `${knowhowFileNodeCount} file · ${knowhowCatalogNodeCount} note · ${codexSkillNodeCount} skill`],
          ].map(([label, value, detail]) => (
            <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-3">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black text-white">{value}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-fuchsia-300/20 bg-[radial-gradient(circle_at_16%_0%,rgba(219,39,119,0.18),transparent_34%),linear-gradient(135deg,rgba(31,11,28,0.86),rgba(7,9,18,0.96))] p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-righello-pink">Autonomia agentica</p>
              <h3 className="mt-1 text-lg font-black text-white">Cosa impedisce a Optima di lavorare da sola</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {agenticRecovery?.headline ??
                  "Diagnostica runner, MCP/OAuth, Graphify, Obsidian, runtime AI, subagenti e pagine core per capire cosa manca prima di affidare lavoro produttivo a Optima."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={createAgenticRecoveryJob}
              disabled={isCreatingAgenticRecovery}
              className="h-11 w-full shrink-0 rounded-lg border-righello-pink/25 bg-righello-pink/15 px-3 text-xs font-black text-white hover:bg-righello-pink/25 sm:w-auto"
            >
              {isCreatingAgenticRecovery ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bot className="mr-1.5 h-3.5 w-3.5" />}
              {agenticRecovery?.metrics.recoveryJobActive ? "Job recovery in coda" : "Crea job di recupero"}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
            {[
              ["Autonomia", agenticRecovery?.score ?? "--", "/100"],
              ["Readiness", agenticRecovery?.metrics.readinessScore ?? "--", "/100"],
              ["Grafo", agenticRecovery?.metrics.graphNodes ?? graphMemory?.stats.nodes ?? "--", "nodi"],
              ["Scibile", agenticRecovery?.metrics.knowhowNodes ?? knowhowNodeCount, "nodi"],
              ["MCP", agenticRecovery ? `${agenticRecovery.metrics.connectorConfigured}/${agenticRecovery.metrics.connectorTotal}` : "--", "connector"],
            ].map(([label, value, detail]) => (
              <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 truncate text-xl font-black text-white">{value}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
          {agenticRecovery?.nextAction ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-300">
              <span className="font-black text-white">Prossima azione concreta: </span>
              {agenticRecovery.nextAction}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {(agenticRecovery?.phases ?? []).slice(0, 4).map((phase) => (
              <div key={phase.id} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{phase.label}</p>
                    <p className={`mt-1 text-xs font-black ${readinessSeverityTone[phase.severity]}`}>{phase.score}/100</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                      phase.status === "healthy"
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        : phase.status === "recovering"
                          ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                          : "border-red-300/25 bg-red-300/10 text-red-100"
                    }`}
                  >
                    {phase.status === "healthy" ? "ok" : phase.status === "recovering" ? "da completare" : "da sbloccare"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{phase.current}</p>
                <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs leading-5 text-slate-300">
                  <span className="font-black text-white">Per arrivare al 90%: </span>
                  {phase.actions[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-righello-pink/20 bg-righello-pink/[0.055] p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-black text-white">Readiness reale</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                {productionReadiness?.summary.headline ??
                  "Caricamento dello stato reale: MCP, OAuth, grafo, provider, subagenti, VPS e workflow produttivi."}
              </p>
            </div>
            <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto">
              <div className="rounded-lg border border-white/10 bg-[#060a15]/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Score</p>
                <p className="mt-1 text-xl font-black text-white">{productionReadiness?.summary.score ?? "--"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#060a15]/80 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Agentic</p>
                <p className="mt-1 text-sm font-black text-white">
                  {productionReadiness?.summary.agenticReady ? "acceso" : productionReadiness ? "parziale" : "--"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {productionReadiness ? (
              [
                ["Pronti", productionReadiness.summary.readyCount, "ready"],
                ["Parziali", productionReadiness.summary.partialCount, "partial"],
                ["Da sbloccare", productionReadiness.summary.blockedCount, "blocked"],
                ["Da configurare", productionReadiness.summary.missingCount, "missing"],
              ].map(([label, count, status]) => (
                <span
                  key={String(label)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${readinessStatusTone[status as AgenticReadinessGap["status"]]}`}
                >
                  {label}: {count}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-400">
                Stato in caricamento
              </span>
            )}
          </div>

          {productionReadiness?.summary.nextCriticalAction ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-[#060a15]/80 p-3 text-sm leading-6 text-slate-300">
              <span className="font-black text-white">Prossima azione: </span>
              {productionReadiness.summary.nextCriticalAction}
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {(productionReadiness?.gaps ?? []).filter((gap) => gap.status !== "ready").slice(0, 4).map((gap) => {
              const busy = setupAction === `readiness-gap:${gap.id}`
              return (
                <div key={gap.id} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{gap.label}</p>
                      <p className={`mt-1 truncate text-xs font-bold ${readinessSeverityTone[gap.severity]}`}>
                        {gap.area} · {gap.severity}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${readinessStatusTone[gap.status]}`}>
                      {readinessStatusCopy[gap.status]}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2 text-xs leading-5 text-slate-400">
                    <p>
                      <span className="font-black text-slate-200">Ora: </span>
                      {gap.current}
                    </p>
                    <p>
                      <span className="font-black text-slate-200">Target: </span>
                      {gap.target}
                    </p>
                    <p className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-slate-300">
                      <span className="font-black text-white">Prossimo passo: </span>
                      {gap.nextActions[0]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => createProductionGapJob(gap)}
                    disabled={busy}
                    className="mt-3 h-8 w-full rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10"
                  >
                    {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="mr-1.5 h-3.5 w-3.5" />}
                    Crea job
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.045] p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-black text-cyan-50">Checklist operativa</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                Porta lo stack in stato usabile: provider, MCP, runtime, subagenti e grafo. I bottoni provider/MCP/runtime creano job di setup revisionabili, non fingono installazioni.
              </p>
            </div>
            <span className="w-fit shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
              {operationalActions.filter((item) => item.complete).length}/{operationalActions.length} ok
            </span>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-5">
            {operationalActions.map((item) => {
              const busy =
                item.busyKey === "graph:seed"
                  ? isSeedingGraph
                  : item.busyKey === "self-improvement:create"
                    ? isCreatingSelfImprovement
                    : item.busyKey === "agentic-recovery:create"
                      ? isCreatingAgenticRecovery
                      : capabilityAction === item.busyKey || setupAction === item.busyKey
              return (
                <div key={item.title} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{item.title}</p>
                      <p className="mt-1 truncate text-xs font-bold text-cyan-100">{item.detail}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                      item.complete ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    }`}>
                      {item.complete ? "ok" : "setup"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{item.body}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => item.onClick()}
                    disabled={busy || !capabilities}
                    className="mt-3 h-8 w-full rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10"
                  >
                    {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                    {item.action}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-black text-emerald-50">Isolamento multi-tenant</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                Ogni provider, MCP, subagente, grafo e job opera dentro l'organizzazione attiva. Optima salva solo `secret_ref`, mai token o API key in chiaro.
              </p>
            </div>
            <span className="w-fit max-w-full truncate rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-black text-emerald-100">
              {capabilities?.tenantIsolation?.organizationId ?? "tenant"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Dati", capabilities?.tenantIsolation?.dataBoundary ?? "organization_id"],
              ["Segreti", capabilities?.tenantIsolation?.secretBoundary ?? "secret_ref_only"],
              ["Runner", capabilities?.tenantIsolation?.runnerBoundary ?? "job_payload_scoped"],
              ["Grafo", capabilities?.tenantIsolation?.graphBoundary ?? "tenant_scoped"],
              ["Review", capabilities?.tenantIsolation?.reviewBoundary ?? "required"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          {capabilities?.tenantIsolation?.warnings?.length ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {capabilities.tenantIsolation.warnings.map((warning) => (
                <div key={warning} className="rounded-lg border border-amber-300/15 bg-amber-300/[0.055] p-3 text-xs leading-5 text-amber-50">
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        </div>

        <div
          className={`mt-4 grid min-w-0 gap-4 ${
            stackSection === "overview"
              ? "hidden"
              : stackSection === "providers"
                ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
                : "lg:grid-cols-1"
          }`}
        >
          <div className="grid min-w-0 gap-3">
            <div className={stackSection === "providers" ? "grid min-w-0 gap-3" : "hidden"}>
            <div className="min-w-0 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.055] p-3 sm:p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-cyan-50">Stato reale MCP</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Il server MCP di Optima risponde per automazioni interne, ma i connector esterni non sono OAuth-installati finche non esiste un soggetto OAuth, un secret_ref o un health check reale.
                  </p>
                </div>
                <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${
                  mcpOAuthConfigured
                    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                    : mcpServiceTokenConfigured
                      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                      : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                }`}>
                  {mcpOAuthConfigured ? "OAuth utente attivo" : mcpServiceTokenConfigured ? "service token" : "setup richiesto"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ["Auth MCP", mcpAuthMode, mcpOAuthConfigured ? "OAuth/PKCE configurato" : "non e OAuth utente"],
                  ["Connector verificati", `${verifiedExternalConnectorCount}/${operationalMcpConnectors.length}`, "GitHub, Notion, Cloudflare, SendGrid..."],
                  ["Setup salvati", `${configuredConnectorCount}/${operationalMcpConnectors.length}`, "include guide/policy non ancora operative"],
                ].map(([label, value, detail]) => (
                  <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-slate-300">
                Nota operativa: io ho predisposto catalogo, tabelle, policy, service-token runtime e job di setup. Non ho configurato OAuth GitHub/Notion/Cloudflare al posto tuo: quello deve passare da installazione guidata o secret_ref approvato da Axel.
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-white">Provider AI operativi</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-400">
                    Ogni provider si configura con wizard: secret_ref, OAuth quando esiste, runtime e policy tenant. Il job e solo health-check, non il modo per inserire credenziali.
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-50">
                <p className="font-black text-amber-100">Come si configura davvero</p>
                <p className="mt-1">
                  Il pulsante apre una dialog di setup. Optima non salva token in chiaro: registra policy, secret_ref e stato; poi puoi eseguire un health-check revisionabile. Per strumenti web senza API usa Browser MCP con sessione autorizzata e allowlist.
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {(capabilities?.providerCatalog ?? []).map((provider) => {
                  const installation = providerInstallationsById.get(provider.id)
                  const state = installation?.installState ?? "not_installed"
                  const saving = capabilityAction === `provider-config:${provider.id}`
                  return (
                    <div key={provider.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{provider.label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {provider.lane} · {provider.authMethod}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${installTone(state)}`}>
                          {installLabel(state)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs font-bold text-cyan-100">{provider.defaultModel}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{provider.tenantUse}</p>
                      <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] leading-5 text-slate-300">
                        {providerSetupHint(provider)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {provider.requiredSecrets.length ? (
                          provider.requiredSecrets.slice(0, 2).map((secret) => (
                            <span key={secret} className="max-w-full truncate rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                              {secret}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                            no secret
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProviderId(provider.id)}
                        disabled={saving}
                        className="mt-3 h-8 w-full rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10"
                      >
                        {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                        {providerPrimaryActionLabel(provider)}
                      </Button>
                    </div>
                  )
                })}
              </div>
              {!capabilities ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-[#060a15] p-3 text-sm text-slate-400">
                  Caricamento stack agentico...
                </div>
              ) : null}
            </div>

            <div className="min-w-0 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-emerald-50">Runtime modelli hosted</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                    Route tenant per Qwen, Gemma, OpenAI e MiniMax. Prima si crea il job setup/health; poi si salvano le route quando il runtime e verificato.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => createStackSetupJob("runtime")}
                  disabled={setupAction === "stack-setup:runtime"}
                  className="h-8 w-full shrink-0 rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10 min-[460px]:w-auto"
                >
                  {setupAction === "stack-setup:runtime" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Radio className="mr-1.5 h-3.5 w-3.5" />}
                  Job runtime
                </Button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(capabilities?.modelRuntime?.lanePlan ?? []).map((route) => (
                  <div key={`${route.lane}-${route.providerId}-${route.model}`} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/70 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{route.lane}</p>
                        <p className="mt-1 truncate text-xs font-bold text-cyan-100">{route.providerId} · {route.model}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${runtimeTone(route.runtimeStatus)}`}>
                        {route.runtimeStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {route.mode} · {route.source === "tenant_route" ? "route tenant" : "default"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                {(capabilities?.modelRuntime?.hosts ?? []).map((host) => (
                  <div key={host.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{host.label}</p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {host.apiKeyEnv || host.endpointEnv || "no env"} · {host.runtimeDetail}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${runtimeTone(host.runtimeStatus)}`}>
                        {host.runtimeStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] p-3 sm:p-4">
              <p className="font-black text-cyan-50">OAuth e installazioni guidate</p>
              <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                {capabilities?.oauthGuidance.pattern ??
                  "Authorization Code + PKCE per installazioni utente, GitHub App per repository, secret_ref per API key e local_install per runner self-hosted."}
              </p>
            </div>

            <div className="min-w-0 rounded-lg border border-sky-300/15 bg-sky-300/[0.045] p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-sky-50">Policy runtime nativa</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                    Optima risolve toolset, connector e review dal control plane. Ogni contesto parte da una allowlist minima e le capability esterne restano subordinate alla policy tenant.
                  </p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[11px] font-black text-sky-100">
                  {capabilities?.runtimePolicy?.source === "optima_native_hermes_derived" ? "native" : "policy"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(capabilities?.runtimePolicy?.contexts ?? []).map((context) => (
                  <div key={context.id} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                    <p className="truncate text-sm font-black text-white">{context.label}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{context.notes}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {context.allowedToolsets.slice(0, 3).map((toolset) => (
                        <span key={toolset} className="max-w-full truncate rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                          {toolset}
                        </span>
                      ))}
                      {context.blockedToolsets.slice(0, 2).map((toolset) => (
                        <span key={toolset} className="max-w-full truncate rounded-full border border-red-300/20 bg-red-300/10 px-2 py-0.5 text-[10px] font-bold text-red-100">
                          no {toolset}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 truncate text-[11px] font-bold text-amber-100">
                      Review: {context.requiredReview.slice(0, 3).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 min-[540px]:grid-cols-2 xl:grid-cols-3">
                {(capabilities?.runtimePolicy?.lanePolicies ?? []).map((lane) => (
                  <div key={lane.lane} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{lane.lane}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {lane.defaultProviderId}{lane.fallbackProviderId ? ` -> ${lane.fallbackProviderId}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {lane.allowedConnectors.length} tool
                      </span>
                    </div>
                    <p className="mt-2 truncate text-xs text-cyan-100">{lane.allowedConnectors.join(", ") || "nessun connector"}</p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-red-100/80">Blocca: {lane.blockedActions.slice(0, 2).join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-teal-300/15 bg-teal-300/[0.05] p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-start min-[520px]:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-white">Core agentico nativo Optima</p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                    {capabilities?.hermesBlueprint?.reference.integrationRule ??
                      "Optima assorbe pattern agentici auditati come capability native: gateway, memoria, skill, MCP, provider routing e subagenti governati dal control plane aziendale."}
                  </p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-teal-300/25 bg-teal-300/10 px-2.5 py-1 text-[11px] font-black text-teal-100">
                  {capabilities?.hermesBlueprint?.reference.auditedRevision ?? "ab0a6270c"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[
                  ["Pattern", capabilities?.hermesBlueprint?.stats.total ?? 0],
                  ["Recepiti", capabilities?.hermesBlueprint?.stats.implementedOrPartial ?? 0],
                  ["Parziali", capabilities?.hermesBlueprint?.stats.byStatus?.partial ?? 0],
                  ["Pianificati", capabilities?.hermesBlueprint?.stats.byStatus?.planned ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-[#060a15]/70 p-2">
                    <p className="truncate text-[11px] text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                {(capabilities?.hermesBlueprint?.patterns ?? []).slice(0, 4).map((pattern) => (
                  <div key={pattern.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{pattern.label}</p>
                        <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                          {pattern.lane} · {pattern.optimaSurface.slice(0, 3).join(", ")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {pattern.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            </div>

            <div className={stackSection === "graph" ? "min-w-0 rounded-lg border border-fuchsia-300/15 bg-fuchsia-300/[0.055] p-3 sm:p-4" : "hidden"}>
              <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-white">Graph memory aziendale</p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                    Nodi, archi e sessioni collegano persone, task, repo, clienti, subagenti e sorgenti. Le relazioni hanno confidence esplicita: manual, extracted, inferred o ambiguous.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={seedGraphReferences}
                  disabled={isSeedingGraph}
                  className="h-9 w-full shrink-0 rounded-lg border-white/15 bg-transparent px-3 text-xs text-white hover:bg-white/10 min-[460px]:w-auto"
                  title="Crea o aggiorna i nodi base della graph memory. Non cancella dati esistenti."
                >
                  {isSeedingGraph ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                  Sincronizza grafo
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Nodi", graphMemory?.stats.nodes ?? 0],
                  ["Archi", graphMemory?.stats.edges ?? 0],
                  ["Sessioni", graphMemory?.stats.sessions ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-[#060a15]/70 p-2">
                    <p className="truncate text-[11px] text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-teal-300/20 bg-teal-300/[0.055] p-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-teal-300/25 bg-teal-300/10 text-teal-100">
                    <Network className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">Graphify come motore, Optima come sistema operativo</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Graphify fornisce pipeline e MCP query del grafo; Optima conserva nodi, archi, tenant, permessi, review e dati aziendali.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-violet-300/20 bg-violet-300/[0.06] p-3">
                <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">Obsidian come workspace visuale del grafo</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Optima resta sorgente autoritativa. Obsidian serve per esplorare e curare note/backlink; il rientro in Optima avviene solo con note revisionate.
                    </p>
                  </div>
                  <div className="grid gap-2 min-[420px]:grid-cols-3 min-[560px]:shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={createObsidianVaultJob}
                      disabled={setupAction === "stack-setup:obsidian-vault"}
                      className="h-9 rounded-lg border-violet-300/25 bg-violet-300/10 px-3 text-xs font-bold text-violet-50 hover:bg-violet-300/15"
                    >
                      {setupAction === "stack-setup:obsidian-vault" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1.5 h-3.5 w-3.5" />}
                      Aggiorna vault
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openObsidianUri(OBSIDIAN_AGENTIC_DASHBOARD_URI, "Dashboard Obsidian")}
                      className="h-9 rounded-lg border-violet-300/25 bg-[#171426] px-3 text-xs font-bold text-violet-50 hover:bg-violet-300/15"
                    >
                      Dashboard
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openObsidianUri(OBSIDIAN_GRAPH_INDEX_URI, "Indice grafo Obsidian")}
                      className="h-9 rounded-lg border-violet-300/25 bg-[#171426] px-3 text-xs font-bold text-violet-50 hover:bg-violet-300/15"
                    >
                      Indice
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ["Workspace", Number(graphMemory?.stats.byType?.graph_workspace ?? 0)],
                    ["Note", Number(graphMemory?.stats.byType?.obsidian_note ?? 0)],
                    ["Know-how", knowhowNodeCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-violet-300/15 bg-[#0b0914]/70 p-2">
                      <p className="truncate text-[11px] text-slate-500">{label}</p>
                      <p className="mt-1 text-lg font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-[#060a15]/80 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">Inserimento manuale memoria</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Usa questo canale per aggiungere conoscenza verificata: dati da Notion, cliente, processo, skill, repo o decisione. Le relazioni si raffinano poi dal dettaglio nodo o con un job agentico.
                    </p>
                  </div>
                  <span className="w-fit shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                    manual · review
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                    Tipo
                    <select
                      className="h-10 rounded-lg border border-white/10 bg-[#050914] px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                      value={manualGraphNodeForm.nodeType}
                      onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, nodeType: event.target.value }))}
                    >
                      <option value="knowledge_base">Knowledge base</option>
                      <option value="client">Cliente</option>
                      <option value="project">Progetto</option>
                      <option value="repository">Repository</option>
                      <option value="person">Persona</option>
                      <option value="workflow">Workflow</option>
                      <option value="policy">Policy</option>
                      <option value="notion_database">Database Notion</option>
                      <option value="notion_task">Task Notion</option>
                      <option value="hermes_memory">Memoria Hermes</option>
                      <option value="hermes_skill">Skill Hermes</option>
                      <option value="obsidian_note">Nota Obsidian</option>
                      <option value="capability">Capability</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                    Titolo nodo
                    <input
                      className="h-10 rounded-lg border border-white/10 bg-[#050914] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
                      value={manualGraphNodeForm.title}
                      onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Es. Cliente DICO, Workflow rapportini, Skill SEO locale..."
                    />
                  </label>
                </div>

                <label className="mt-2 grid gap-1.5 text-xs font-bold text-slate-300">
                  Sommario
                  <textarea
                    className="min-h-24 rounded-lg border border-white/10 bg-[#050914] px-3 py-2 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
                    value={manualGraphNodeForm.summary}
                    onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Descrivi solo informazione utile e verificabile. Non inserire password, token, dati sensibili inutili o transcript integrali."
                  />
                </label>

                <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                  <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                    Tag
                    <input
                      className="h-10 rounded-lg border border-white/10 bg-[#050914] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
                      value={manualGraphNodeForm.tags}
                      onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, tags: event.target.value }))}
                      placeholder="notion, cliente, seo..."
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                    Sorgente
                    <select
                      className="h-10 rounded-lg border border-white/10 bg-[#050914] px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                      value={manualGraphNodeForm.sourceType}
                      onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, sourceType: event.target.value }))}
                    >
                      <option value="manual">Manuale</option>
                      <option value="notion_righello">Notion Righello</option>
                      <option value="hermes_readonly">Hermes read-only</option>
                      <option value="obsidian_vault">Obsidian Vault</option>
                      <option value="codex_knowhow">Know-how Codex</option>
                      <option value="internal">Optima</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                    Confidence
                    <select
                      className="h-10 rounded-lg border border-white/10 bg-[#050914] px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                      value={manualGraphNodeForm.confidence}
                      onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, confidence: event.target.value }))}
                    >
                      <option value="manual">Manuale</option>
                      <option value="extracted">Estratto</option>
                      <option value="inferred">Inferito</option>
                      <option value="ambiguous">Da verificare</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className="h-10 rounded-lg border border-white/10 bg-[#050914] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
                    value={manualGraphNodeForm.sourceUrl}
                    onChange={(event) => setManualGraphNodeForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                    placeholder="URL sorgente opzionale"
                  />
                  <Button
                    type="button"
                    onClick={createManualGraphNode}
                    disabled={isSavingGraphNode}
                    className="h-10 rounded-lg bg-righello-pink px-4 text-white hover:bg-righello-pink/90"
                  >
                    {isSavingGraphNode ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                    Salva nodo
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_12rem]">
                <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                  Cerca memoria
                  <input
                    className="h-10 rounded-lg border border-white/10 bg-[#060a15] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
                    value={graphQuery}
                    onChange={(event) => setGraphQuery(event.target.value)}
                    placeholder="cliente, skill, repo, progetto..."
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                  Tipo
                  <select
                    className="h-10 rounded-lg border border-white/10 bg-[#060a15] px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                    value={graphNodeTypeFilter}
                    onChange={(event) => setGraphNodeTypeFilter(event.target.value)}
                  >
                    <option value="">Tutti</option>
                    {graphTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {graphNodeTypeVisual[type]?.label ?? type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                  Sorgente
                  <select
                    className="h-10 rounded-lg border border-white/10 bg-[#060a15] px-3 text-sm text-white outline-none transition focus:border-cyan-300/70"
                    value={graphSourceFilter}
                    onChange={(event) => setGraphSourceFilter(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {graphSourceOptions.map((sourceType) => (
                      <option key={sourceType} value={sourceType}>
                        {graphSourceCopy[sourceType] ?? sourceType}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {graphHasActiveFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setGraphQuery("")
                      setGraphNodeTypeFilter("")
                      setGraphSourceFilter("")
                    }}
                    className="h-8 rounded-lg border-white/10 bg-transparent px-3 text-xs text-white hover:bg-white/10"
                  >
                    Pulisci filtri
                  </Button>
                ) : null}
                <span className="text-xs text-slate-500">
                  {isSearchingGraph
                    ? "Ricerca nel grafo..."
                    : graphHasActiveFilter
                      ? `${visibleGraphNodes.length} nodi trovati`
                      : "Vista centrale del grafo operativo"}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-violet-300/25 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.2),transparent_34%),linear-gradient(135deg,rgba(23,20,38,0.96),rgba(7,9,18,0.96))] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Obsidian reale</p>
                    <h3 className="mt-1 text-lg font-black text-white">Apri la Graph View nativa</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      La vista esatta di Obsidian non viene ricreata in React: Optima esporta un vault Markdown con wikilink e lo apre nell'app Obsidian, dove hai la mappa sinaptica nativa, drag, zoom, filtri, gruppi e forze originali.
                    </p>
                  </div>
                  <div className="grid w-full shrink-0 gap-2 min-[460px]:grid-cols-3 sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={createObsidianVaultJob}
                      disabled={setupAction === "stack-setup:obsidian-vault"}
                      className="h-10 rounded-lg border-violet-300/25 bg-violet-300/10 px-3 text-xs font-bold text-violet-50 hover:bg-violet-300/15"
                    >
                      {setupAction === "stack-setup:obsidian-vault" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1.5 h-3.5 w-3.5" />}
                      Aggiorna vault
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openObsidianUri(OBSIDIAN_VAULT_URI, "Vault Obsidian")}
                      className="h-10 rounded-lg border-violet-300/25 bg-violet-300/20 px-3 text-xs font-black text-white hover:bg-violet-300/30"
                    >
                      Apri vault
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openObsidianUri(OBSIDIAN_AGENTIC_DASHBOARD_URI, "Dashboard Obsidian")}
                      className="h-10 rounded-lg border-violet-300/25 bg-violet-300/20 px-3 text-xs font-black text-white hover:bg-violet-300/30"
                    >
                      Dashboard OS
                    </Button>
                  </div>
                </div>
                <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-slate-400">
                  Anteprima sotto = controllo rapido dentro Optima. Graph View esatta = Obsidian aperto dal vault esportato.
                </p>
              </div>

              <GraphMemoryMap
                graphMemory={displayGraphMemory}
                selectedNodeId={selectedGraphNodeId}
                filtered={graphHasActiveFilter}
                onSelectNode={loadGraphNode}
              />

              {visibleGraphNodes.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleGraphNodes.slice(0, 6).map((node) => (
                    <button
                      key={`graph-node-card-${node.id}`}
                      type="button"
                      onClick={() => loadGraphNode(node)}
                      className={`min-w-0 rounded-lg border p-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06] ${
                        selectedGraphNodeId === node.id ? "border-cyan-300/50 bg-cyan-300/[0.08]" : "border-white/10 bg-[#060a15]/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{node.title}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {graphNodeTypeVisual[node.nodeType]?.label ?? node.nodeType} · {graphSourceCopy[node.sourceType] ?? node.sourceType}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 shrink-0 text-cyan-100" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{node.summary || "Nessun sommario disponibile."}</p>
                    </button>
                  ))}
                </div>
              ) : graphHasActiveFilter && !isSearchingGraph ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-[#060a15]/70 p-3 text-sm text-slate-400">
                  Nessun nodo trovato con questi filtri.
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Auto-miglioramento controllato</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  {selfImprovement?.summary ??
                    "Optima puo leggere dati d'uso, feedback, job falliti e superfici attive per proporre patch Codex revisionabili."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={createSelfImprovementJob}
                disabled={isCreatingSelfImprovement}
                className="h-9 w-full shrink-0 rounded-lg border-emerald-300/25 bg-emerald-300/10 px-3 text-xs font-bold text-emerald-50 hover:bg-emerald-300/15 sm:w-auto"
              >
                {isCreatingSelfImprovement ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bot className="mr-1.5 h-3.5 w-3.5" />}
                Crea job Codex
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Score", selfImprovement?.score ?? "--"],
                ["Feedback -", selfImprovement?.metrics.negativeFeedback ?? "--"],
                ["Job falliti", selfImprovement?.metrics.failedJobs ?? "--"],
                ["AI calls", selfImprovement?.metrics.aiCalls ?? "--"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-[#060a15]/70 p-2">
                  <p className="truncate text-[11px] text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-black text-white">{value}</p>
                </div>
              ))}
            </div>
            {selfImprovement?.signals.length ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {selfImprovement.signals.slice(0, 4).map((signal) => (
                  <div key={signal.id} className="rounded-lg border border-white/10 bg-[#060a15]/75 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-black text-white">{signal.label}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${readinessSeverityTone[signal.severity]}`}>
                        {signal.severity}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{signal.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
                {graphTypes.length ? (
                  graphTypes.map(([type, count]) => (
                    <span key={type} className="max-w-full truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {type}: {count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Nessun nodo ancora indicizzato.</span>
                )}
              </div>
            </div>
          </div>

          <div className={stackSection === "graph" ? "hidden" : "grid min-w-0 gap-3"}>
            <div className={stackSection === "providers" ? "grid min-w-0 gap-3" : "hidden"}>
            <div className="min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-white">Subagenti</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-400">
                    Profili operativi con provider, connector e permessi espliciti.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={createRecommendedSubagents}
                  disabled={capabilityAction === "subagents:base"}
                  className="h-8 w-full shrink-0 rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10 min-[460px]:w-auto"
                >
                  {capabilityAction === "subagents:base" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bot className="mr-1.5 h-3.5 w-3.5" />}
                  Crea set base
                </Button>
              </div>
              <div className="mt-3 grid gap-2">
                {recommendedSubagents.map((template) => {
                  const subagent = subagentsBySlug.get(template.slug)
                  const busy = capabilityAction === `subagent:${template.slug}`
                  return (
                    <div key={template.slug} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-black text-white">{subagent?.name ?? template.name}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${subagent ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-400"}`}>
                          {subagent ? "attivo" : "da creare"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {(subagent?.primaryProviderId ?? template.primaryProviderId)} · {(subagent?.connectorIds ?? template.connectorIds).join(", ")}
                      </p>
                      <div className="mt-2 grid min-w-0 grid-cols-1 items-center gap-2 min-[380px]:grid-cols-[minmax(0,1fr)_auto]">
                        <p className="truncate text-xs text-slate-400">{template.lane} · {template.modelHint}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => createRecommendedSubagent(template)}
                          disabled={busy}
                          className="h-7 w-full rounded-lg border-white/10 bg-transparent px-2 text-[11px] text-white hover:bg-white/10 min-[380px]:w-auto"
                        >
                          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                          {subagent ? "Aggiorna" : "Crea"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 grid gap-2">
                {(capabilities?.subagents ?? []).slice(0, 5).map((subagent) => (
                  <div key={subagent.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black text-white">{subagent.name}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {subagent.lane}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {subagent.primaryProviderId} · {subagent.connectorIds.join(", ") || "nessun connector"}
                    </p>
                  </div>
                ))}
                {capabilities && capabilities.subagents.length === 0 ? (
                  <p className="text-sm text-slate-500">Nessun subagente configurato per questo tenant.</p>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-white">MCP strategici</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-400">
                    Prima configura OAuth, secret o runtime. I job agentici servono solo per health-check, audit o patch tecniche revisionabili.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                  {configuredConnectorCount}/{operationalMcpConnectors.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {operationalMcpConnectors.map((connector) => {
                  const installation = connectorInstallationsById.get(connector.id)
                  const state = installation?.installState ?? (connector.status === "enabled" ? "healthy" : "not_installed")
                  const busy = setupAction === `connector-setup:${connector.id}`
                  return (
                    <div key={connector.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{connector.label}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {connector.category} · {connectorAuthLabel(connector.authMethod)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${installTone(state)}`}>
                          {installLabel(state)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{connector.purpose}</p>
                      <p className="mt-2 line-clamp-2 rounded-md border border-white/10 bg-black/20 p-2 text-[11px] leading-5 text-slate-400">
                        {connectorSetupHint(connector)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {connector.graphUse.slice(0, 4).map((scope) => (
                          <span key={scope} className="max-w-full truncate rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                            {scope}
                          </span>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setSelectedConnectorId(connector.id)}
                        className="mt-3 h-8 w-full rounded-lg bg-cyan-300/15 text-xs font-black text-cyan-50 hover:bg-cyan-300/25"
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        {connectorPrimaryActionLabel(connector)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => createConnectorSetupJob(connector)}
                        disabled={busy}
                        className="mt-3 h-8 w-full rounded-lg border-white/10 bg-transparent text-xs text-white hover:bg-white/10"
                      >
                        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1.5 h-3.5 w-3.5" />}
                        Job health-check
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>

            <div className={stackSection === "sources" ? "min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4" : "hidden"}>
              <p className="font-black text-white">Sorgenti agentiche</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Pattern e know-how che alimentano il grafo senza saturare il prompt.
              </p>
              <div className="mt-3 grid gap-2">
                {(graphMemory?.referenceSources ?? []).map((source) => (
                  <div key={source.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black text-white">{source.label}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {source.sourceType}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{source.importPolicy}</p>
                  </div>
                ))}
                {!graphMemory ? (
                  <p className="text-sm text-slate-500">Caricamento graph memory...</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 sm:p-5 lg:order-2 ${
          mobilePanel === "jobs" ? "block" : "hidden"
        } lg:block`}
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Control plane</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Coda e review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Stato dei job, heartbeat runner e decisioni ancora aperte.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshControlPlane().catch((err) => setError(err?.message ?? "Errore refresh"))}
            className="w-full rounded-lg border-white/15 bg-transparent text-white hover:bg-white/10 sm:w-auto"
          >
            Aggiorna
          </Button>
        </div>

        <div className="mt-4 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.055] p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />
            <div className="min-w-0">
              <p className="text-sm font-black text-cyan-50">Prossima azione</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-300">{nextActionCopy}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[
            { label: "Aperti", value: stats.active, detail: "non chiusi" },
            { label: "In run", value: stats.running, detail: `${stats.queued} in coda` },
            { label: "Da decidere", value: stats.review + stats.failed, detail: `${stats.failed} errori` },
            {
              label: "Stato VPS",
              value: runnerControl.enabled
                ? runnerHealth.isOnline
                  ? "Online"
                  : runnerHealth.tone === "stale"
                    ? "Stale"
                    : "Offline"
                : "Sospeso",
              detail: runnerHealth.latest?.lastSeenAt ? formatRelativeTime(runnerHealth.latest.lastSeenAt) : "heartbeat",
            },
          ].map(({ label, value, detail }) => (
            <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#060a15] p-2.5 sm:p-3">
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">{label}</p>
              <p className="mt-1 truncate text-base font-black text-white sm:text-xl">{value}</p>
              <p className="mt-1 truncate text-[11px] text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        {stats.queued > 0 && !runnerControl.enabled ? (
          <div className="mt-4 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ci sono job in coda, ma il claim e sospeso da configurazione server. Imposta AGENT_RUNNER_ENABLED=true solo quando vuoi riattivare il VPS.
              </p>
            </div>
          </div>
        ) : stats.queued > 0 && !runnerHealth.isOnline ? (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ci sono job in coda, ma il runner VPS non risulta online. Il lavoro resta fermo finche il servizio sul VPS non torna a fare polling.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-white/10 bg-[#060a15] p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-lg border ${
                  runnerHealth.isOnline
                    ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-300/30 bg-amber-300/10 text-amber-100"
                }`}
              >
                {runnerHealth.isOnline ? <Radio className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-white">{runnerHealth.label}</h3>
                <p className="mt-1 break-words text-sm leading-6 text-slate-400">{runnerHealth.detail}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
              {runnerHealth.latest?.mode ?? "no runner"}
            </span>
          </div>

          {runnerHost ? (
            <div className="mt-4 min-w-0 rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Host VPS · {runnerHost.hostname}
                </p>
                <span className="text-[11px] font-bold text-slate-500">
                  uptime {runnerHost.uptime}
                  {runnerHost.sampledAt ? ` · sample ${formatRelativeTime(runnerHost.sampledAt)}` : ""}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 min-[520px]:grid-cols-4">
                {[
                  {
                    label: "Disco VPS",
                    value:
                      runnerHost.rootUsedPercent === null
                        ? "n/d"
                        : `${runnerHost.rootUsedPercent}%`,
                    detail: `${runnerHost.rootAvailable} liberi`,
                    tone:
                      runnerHost.rootUsedPercent !== null && runnerHost.rootUsedPercent >= 85
                        ? "text-red-200"
                        : runnerHost.rootUsedPercent !== null && runnerHost.rootUsedPercent >= 70
                          ? "text-amber-100"
                          : "text-emerald-100",
                  },
                  {
                    label: "Memoria",
                    value:
                      runnerHost.memoryUsedPercent === null
                        ? "n/d"
                        : `${runnerHost.memoryUsedPercent}%`,
                    detail: runnerHost.platform ?? "host",
                    tone:
                      runnerHost.memoryUsedPercent !== null && runnerHost.memoryUsedPercent >= 85
                        ? "text-red-200"
                        : "text-slate-100",
                  },
                  {
                    label: "Workspace",
                    value: runnerHost.workRootSize,
                    detail: "runner jobs",
                    tone: "text-slate-100",
                  },
                  {
                    label: "Guard OneDrive",
                    value:
                      runnerHost.guardTimerActive === null
                        ? "n/d"
                        : runnerHost.guardTimerActive
                          ? "Attiva"
                          : "Off",
                    detail: runnerHost.guardSize,
                    tone: runnerHost.guardTimerActive ? "text-emerald-100" : "text-amber-100",
                  },
                ].map((metric) => (
                  <div key={metric.label} className="min-w-0 rounded-lg border border-white/10 bg-[#050914] p-2">
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{metric.label}</p>
                    <p className={`mt-1 truncate text-sm font-black ${metric.tone}`}>{metric.value}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{metric.detail}</p>
                  </div>
                ))}
              </div>
              {runnerHost.rootUsedPercent !== null && runnerHost.rootUsedPercent >= 85 ? (
                <div className="mt-3 rounded-lg border border-red-300/25 bg-red-300/10 p-2 text-xs leading-5 text-red-100">
                  Disco VPS oltre soglia: evitare job pesanti e controllare cache/media prima di procedere.
                </div>
              ) : null}
            </div>
          ) : null}

          {runners.length > 0 ? (
            <div className="mt-4 space-y-2">
              {runners.slice(0, 3).map((runner) => (
                <div
                  key={runner.id}
                  className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 min-[420px]:flex min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3"
                >
                  <span className="break-all font-bold text-white">{runner.id}</span>
                  <span>
                    {runner.status} · {formatRelativeTime(runner.lastSeenAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2">
          <div className="grid grid-cols-5 gap-1 rounded-lg border border-white/10 bg-[#060a15] p-1">
            {jobFilters.map(({ key, label, count, helper }) => (
              <button
                key={key}
                type="button"
                aria-pressed={jobFilter === key}
                aria-label={`${label}: ${helper}`}
                title={helper}
                onClick={() => setJobFilter(key)}
                className={`min-w-0 rounded-md px-1.5 py-2 text-center text-[11px] font-black transition min-[420px]:text-xs ${
                  jobFilter === key ? "bg-righello-pink text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="block truncate">{label}</span>
                <span className="mt-0.5 block text-[10px] opacity-75">{count}</span>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-xs leading-5 text-slate-400">
            <p>
              <span className="font-black text-white">{selectedJobFilter.label}</span>: {selectedJobFilter.helper}
            </p>
            <p className="mt-1 text-slate-500">
              Monitor: {stats.queued} in coda · {stats.running} in esecuzione · {stats.review} in review · {stats.failed} errori · {stats.done} chiusi · sync {formatRelativeTime(lastControlPlaneRefreshAt)}.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:max-h-[720px] lg:overflow-y-auto lg:pr-1">
          {filteredJobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
              Nessun job in questa vista.
            </div>
          ) : (
            filteredJobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-white/10 bg-[#070c19] p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[job.status]}`}>
                        {statusCopy[job.status] ?? job.status}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        P{job.priority}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        {job.jobType}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-black leading-snug text-white sm:text-lg">{job.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{job.brief}</p>
                    {job.status === "needs_review" ? (
                      <p className="mt-2 text-xs font-bold text-righello-pink">
                        {approvalCreatesPublishJob(job)
                          ? "Esito pronto: se approvi come owner GitHub autorizzato crei il job GitHub/deploy controllato."
                          : "Esito pronto: apri la review room per approvare o chiedere modifiche."}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 min-[520px]:flex sm:justify-end">
                    {["needs_review", "approved", "rejected", "failed"].includes(job.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadReview(job)}
                        className="rounded-lg border-cyan-300/30 bg-cyan-300/5 text-cyan-50 hover:bg-cyan-300/10"
                      >
                        <Eye className="mr-1.5 h-4 w-4" />
                        Revisiona
                      </Button>
                    ) : null}
                    {job.status === "needs_review" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => mutateJob(job.id, "approve")}
                          disabled={busyJobId === job.id}
                          className="rounded-lg bg-emerald-500 text-white hover:bg-emerald-400"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          {approvalCreatesPublishJob(job) ? "Approva e pubblica" : "Approva"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => mutateJob(job.id, "reject")}
                          disabled={busyJobId === job.id}
                          className="rounded-lg border-red-400/30 bg-transparent text-red-100 hover:bg-red-500/10"
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Respingi
                        </Button>
                      </>
                    ) : null}
                    {["queued", "running"].includes(job.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => mutateJob(job.id, "cancel")}
                        disabled={busyJobId === job.id}
                        className="rounded-lg border-white/15 bg-transparent text-slate-200 hover:bg-white/10"
                      >
                        Annulla
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p className="flex min-w-0 items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {job.repoUrl ? `${job.repoUrl.replace("https://github.com/", "")} · ${job.repoBranch ?? "main"}` : "Repo non indicata"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{new Date(parseServerDate(job.createdAt)).toLocaleString("it-IT")}</span>
                  </p>
                </div>

                {job.resultSummary ? (
                  <div className="mt-4 max-h-36 overflow-hidden break-words rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-3 text-sm leading-6 text-cyan-50 sm:max-h-44">
                    {compactJobCardOutput(job.resultSummary)}
                  </div>
                ) : null}

                {job.errorMessage ? (
                  <div className="mt-4 rounded-lg border border-red-300/20 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
                    {compactJobCardOutput(job.errorMessage)}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <Dialog
          open={Boolean(selectedProvider)}
          onOpenChange={(open) => {
            if (!open) setSelectedProviderId(null)
          }}
        >
          <DialogContent className="max-h-[92svh] w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto border-white/10 bg-[#080d19] p-4 text-white sm:max-w-3xl sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl font-black sm:text-2xl">
                Checklist provider {selectedProvider?.label ?? ""}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Guida tenant-scoped. Questo salvataggio registra policy e requisiti: non esegue login, non crea sessioni e non salva token.
              </DialogDescription>
            </DialogHeader>

            {selectedProvider ? (
              <div className="grid min-w-0 gap-4">
                <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-50">
                      {providerAuthLabel(selectedProvider.authMethod)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${installTone(selectedProviderInstallation?.installState ?? "not_installed")}`}>
                      {installLabel(selectedProviderInstallation?.installState ?? "not_installed")}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {selectedProvider.lane} · {selectedProvider.defaultModel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{selectedProvider.tenantUse}</p>
                  <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm leading-6 text-amber-50">
                    {providerWizardNotice(selectedProvider)}
                  </p>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                  <p className="font-black text-white">Modalita disponibili</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {providerSetupModes(selectedProvider).map((mode) => (
                      <div key={mode.label} className={`rounded-lg border p-3 ${setupModeClass(mode.tone)}`}>
                        <p className="text-sm font-black">{mode.label}</p>
                        <p className="mt-2 text-xs leading-5 opacity-85">{mode.body}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                  <p className="font-black text-white">Percorso consigliato</p>
                  <div className="mt-3 grid gap-2">
                    {providerInstallSteps(selectedProvider).map((step, index) => (
                      <div key={`${selectedProvider.id}-provider-step-${index}`} className="flex gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-righello-pink text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <p className="min-w-0 break-words">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Credenziali eventuali / fallback</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedProvider.requiredSecrets.length ? (
                        selectedProvider.requiredSecrets.map((secret) => (
                          <span key={secret} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-100">
                            {secret} · {providerCredentialLabel(secret)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Nessuna credenziale obbligatoria: usa login, OAuth, Browser MCP o runtime locale.</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">MCP consigliati</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedProvider.recommendedMcpConnectors.length ? (
                        selectedProvider.recommendedMcpConnectors.map((connectorId) => (
                          <button
                            key={connectorId}
                            type="button"
                            onClick={() => {
                              setSelectedProviderId(null)
                              setSelectedConnectorId(connectorId)
                            }}
                            className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-[11px] font-bold text-cyan-100 hover:bg-cyan-300/20"
                          >
                            {connectorId}
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Nessun MCP obbligatorio.</span>
                      )}
                    </div>
                  </div>
                </section>

                {selectedProvider.id === "openai" || selectedProvider.id === "codex" ? (
                  <section className="rounded-lg border border-purple-300/20 bg-purple-300/[0.07] p-3 sm:p-4">
                    <p className="font-black text-purple-50">
                      {selectedProvider.id === "codex" ? "Vuoi login/pairing invece di API key?" : "Vuoi ChatGPT o strumenti web senza API?"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-purple-100">
                      Usa Browser MCP: apre un browser controllato, fai login tu o con pairing/QR su profilo isolato, e Optima usa solo siti allowlist con audit e review. Per Codex CLI, sul VPS la strada preferita resta device auth/login del CLI; Browser MCP serve per account e strumenti web.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedProviderId(null)
                        setSelectedConnectorId("browser")
                      }}
                      className="mt-3 w-full rounded-lg border-purple-200/20 bg-transparent text-purple-50 hover:bg-purple-300/10 sm:w-auto"
                    >
                      <Network className="mr-1.5 h-4 w-4" />
                      Configura Browser MCP
                    </Button>
                  </section>
                ) : null}

                <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => createProviderSetupJob(selectedProvider)}
                    disabled={setupAction === `provider-setup:${selectedProvider.id}`}
                    className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                  >
                    {setupAction === `provider-setup:${selectedProvider.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Network className="mr-1.5 h-4 w-4" />}
                    Job health-check
                  </Button>
                  <Button
                    type="button"
                    onClick={() => configureProvider(selectedProvider)}
                    disabled={capabilityAction === `provider-config:${selectedProvider.id}`}
                    className="rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90"
                  >
                    {capabilityAction === `provider-config:${selectedProvider.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
                    Salva checklist
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedConnector)}
          onOpenChange={(open) => {
            if (!open) setSelectedConnectorId(null)
          }}
        >
          <DialogContent className="max-h-[92svh] w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto border-white/10 bg-[#080d19] p-4 text-white sm:max-w-3xl sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl font-black sm:text-2xl">
                Checklist MCP {selectedConnector?.label ?? ""}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Guida connector tenant-scoped. Questo salvataggio non autorizza account: login, pairing/OAuth e secret restano nel runtime autorizzato.
              </DialogDescription>
            </DialogHeader>

            {selectedConnector ? (
              <div className="grid min-w-0 gap-4">
                <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-50">
                      {connectorAuthLabel(selectedConnector.authMethod)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${installTone(selectedConnectorInstallation?.installState ?? (selectedConnector.status === "enabled" ? "healthy" : "not_installed"))}`}>
                      {installLabel(selectedConnectorInstallation?.installState ?? (selectedConnector.status === "enabled" ? "healthy" : "not_installed"))}
                    </span>
                    {selectedConnectorInstallation?.lastHealthStatus ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                        health: {selectedConnectorInstallation.lastHealthStatus}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{selectedConnector.purpose}</p>
                  <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm leading-6 text-amber-50">
                    {connectorSetupHint(selectedConnector)}
                  </p>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Secret richiesti</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedConnector.requiredEnv.length ? (
                        selectedConnector.requiredEnv.map((env) => (
                          <span key={env} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-100">
                            {env}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Nessun env obbligatorio.</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Scope grafo</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedConnector.graphUse.map((scope) => (
                        <span key={scope} className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-[11px] font-bold text-cyan-100">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                  <p className="font-black text-white">Installazione reale</p>
                  <div className="mt-3 grid gap-2">
                    {(selectedConnector.setupSteps?.length
                      ? selectedConnector.setupSteps
                      : ["Definire credenziali nel runtime autorizzato.", "Salvare in Optima solo stato e secret_ref.", "Eseguire health-check prima di usare il connector."]
                    ).map((step, index) => (
                      <div key={`${selectedConnector.id}-step-${index}`} className="flex gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-righello-pink text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <p className="min-w-0 break-words">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] p-3 sm:p-4">
                  <p className="font-black text-emerald-50">Health-check prima della produzione</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    {selectedConnector.healthCheck ?? "Verifica credenziali, permessi minimi e audit log prima di dichiarare il connector operativo."}
                  </p>
                </section>

                {selectedConnector.id === "browser" ? (
                  <section className="rounded-lg border border-purple-300/20 bg-purple-300/[0.07] p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-purple-50">Wizard Browser MCP</p>
                        <p className="mt-2 text-sm leading-6 text-purple-100">
                          Per ChatGPT, Nano Banana e strumenti web non usiamo API key come prima scelta. Optima prepara una sessione e apre un Chrome remoto controllabile via gateway VPS; poi serve health-check.
                        </p>
                      </div>
                      {selectedBrowserPairingSession ? (
                        <span className="rounded-full border border-purple-200/20 bg-purple-300/10 px-2.5 py-1 text-xs font-black text-purple-50">
                          {selectedBrowserPairingSession.status}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      {([
                        ["chatgpt", "ChatGPT"],
                        ["nanobanana", "Nano Banana"],
                        ["perplexity", "Perplexity"],
                        ["claude", "Claude"],
                      ] as const).map(([target, label]) => (
                        <Button
                          key={target}
                          type="button"
                          variant="outline"
                          onClick={() => startBrowserMcpLogin(target)}
                          disabled={Boolean(browserPairingAction)}
                          className="rounded-lg border-purple-200/20 bg-black/20 text-purple-50 hover:bg-purple-300/10"
                        >
                          {browserPairingAction === target ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
                          Prepara {label}
                        </Button>
                      ))}
                    </div>
                    {selectedBrowserPairingSession ? (
                      <div className="mt-4 grid min-w-0 gap-3 overflow-hidden rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="min-w-0 rounded-lg border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm leading-6 text-amber-50">
                          <p className="font-black">Prima verifica il gateway VPS</p>
                          <p className="mt-1 min-w-0 break-words">
                            Se il test non risponde, il servizio Browser MCP sul VPS non e attivo o il dispositivo non raggiunge Tailscale. Non e un errore OAuth e non serve inserire API key.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="min-w-0 rounded-lg border border-white/10 bg-black/15 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pairing code</p>
                            <p className="mt-1 font-mono text-lg font-black text-white">{selectedBrowserPairingSession.pairingCode}</p>
                          </div>
                          <div className="min-w-0 rounded-lg border border-white/10 bg-black/15 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Target</p>
                            <p className="mt-1 break-words text-sm font-bold text-slate-200">{selectedBrowserPairingSession.startUrl}</p>
                          </div>
                          <div className="min-w-0 rounded-lg border border-white/10 bg-black/15 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Scadenza</p>
                            <p className="mt-1 text-sm font-bold text-slate-200">{formatDateTime(selectedBrowserPairingSession.expiresAt)}</p>
                          </div>
                        </div>
                        {selectedBrowserPairingSession.gatewayUrl ? (
                          <div className="grid min-w-0 gap-3">
                            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm leading-6 text-cyan-50">
                              <p className="font-black">Flusso rapido</p>
                              <p className="mt-1">
                                Apri il login controllabile: quello e il posto giusto dove digitare credenziali e completare eventuali QR/passkey. Il test gateway resta disponibile solo se il link non si apre.
                              </p>
                              <p className="mt-1 text-cyan-100/80">
                                Se Safari dice che non trova il server: questo dispositivo non sta raggiungendo Tailscale/MagicDNS oppure il servizio VPS e spento. In quel caso prova dal Mac collegato a Tailscale o usa il fallback IP.
                              </p>
                              <p className="mt-1 text-cyan-100/80">
                                Se il login apre DevTools invece del browser controllabile, chiudi e crea una nuova sessione. DevTools resta solo un fallback tecnico, non il flusso di login umano.
                              </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {(() => {
                                const primaryHealthUrl =
                                  selectedBrowserPairingSession.fallbackGatewayHealthUrl ||
                                  selectedBrowserPairingSession.gatewayHealthUrl ||
                                  selectedBrowserPairingSession.gatewayUrl!
                                const primaryLoginUrl =
                                  selectedBrowserPairingSession.fallbackGatewayUrl ||
                                  selectedBrowserPairingSession.gatewayUrl!
                                const secondaryHealthUrl =
                                  selectedBrowserPairingSession.fallbackGatewayHealthUrl
                                    ? selectedBrowserPairingSession.gatewayHealthUrl
                                    : null
                                return (
                                  <>
                              <Button
                                type="button"
                                onClick={() => window.open(primaryLoginUrl, "_blank", "noopener,noreferrer")}
                                className="min-h-12 w-full justify-center rounded-lg bg-purple-500 px-3 text-center text-sm font-black text-white hover:bg-purple-500/90 sm:col-span-2"
                              >
                                <Network className="mr-1.5 h-4 w-4 shrink-0" />
                                Apri login controllabile
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.open(primaryHealthUrl, "_blank", "noopener,noreferrer")}
                                className="min-h-12 w-full justify-center rounded-lg border-emerald-200/20 bg-emerald-300/10 px-3 text-center text-sm font-black text-emerald-50 hover:bg-emerald-300/15"
                              >
                                <CheckCircle2 className="mr-1.5 h-4 w-4 shrink-0" />
                                Test gateway
                              </Button>
                              {secondaryHealthUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => window.open(secondaryHealthUrl, "_blank", "noopener,noreferrer")}
                                  className="min-h-10 w-full justify-center rounded-lg border-white/10 bg-transparent px-3 text-center text-xs font-bold text-slate-200 hover:bg-white/10 sm:col-span-3"
                                >
                                  Test alternativo MagicDNS
                                </Button>
                              ) : null}
                                  </>
                                )
                              })()}
                            </div>
                            <div className="grid min-w-0 gap-2 rounded-lg border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-300">
                              <p className="font-bold text-slate-200">Gateway consigliato da qualunque dispositivo collegato a Tailscale: http://100.100.39.96:8789</p>
                              <p className="text-slate-400">Usa sempre URL completi con <span className="font-mono">http://</span>. MagicDNS resta alternativo: <span className="font-mono">http://padel-vps.tailcd2fda.ts.net:8789</span>.</p>
                              <div className="grid gap-2 sm:grid-cols-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    copyBrowserPairingCommand(
                                      selectedBrowserPairingSession.fallbackGatewayHealthUrl ||
                                        selectedBrowserPairingSession.gatewayHealthUrl ||
                                        `${selectedBrowserPairingSession.gatewayUrl!.split("/pair")[0]}/health`,
                                    )
                                  }
                                  className="min-h-10 rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                                >
                                  <ClipboardList className="mr-1.5 h-4 w-4" />
                                  Copia health URL
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    copyBrowserPairingCommand(
                                      selectedBrowserPairingSession.fallbackGatewayUrl || selectedBrowserPairingSession.gatewayUrl!,
                                    )
                                  }
                                  className="min-h-10 rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                                >
                                  <ClipboardList className="mr-1.5 h-4 w-4" />
                                  Copia login URL
                                </Button>
                                {selectedBrowserPairingSession.fallbackGatewayHealthUrl ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.open(selectedBrowserPairingSession.fallbackGatewayHealthUrl!, "_blank", "noopener,noreferrer")}
                                    className="min-h-10 rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                                  >
                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                    Test gateway
                                  </Button>
                                ) : null}
                                {selectedBrowserPairingSession.fallbackGatewayUrl ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.open(selectedBrowserPairingSession.fallbackGatewayUrl!, "_blank", "noopener,noreferrer")}
                                    className="min-h-10 rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                                  >
                                    <Network className="mr-1.5 h-4 w-4" />
                                    Login IP
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                            {selectedBrowserPairingSession.installCommand ? (
                              <div className="min-w-0 rounded-lg border border-slate-500/20 bg-slate-500/[0.06] p-3 text-sm leading-6 text-slate-200">
                                <p className="font-black text-white">Se il test gateway non risponde</p>
                                <p className="mt-1">Esegui da console Hostinger/VPS, solo in `/srv/optima-agent`:</p>
                                <code className="mt-2 block max-w-full overflow-x-auto whitespace-pre rounded-md bg-black/40 p-2 text-xs text-slate-100">
                                  {selectedBrowserPairingSession.installCommand}
                                </code>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => copyBrowserPairingCommand(selectedBrowserPairingSession.installCommand!)}
                                  className="mt-3 rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                                >
                                  <ClipboardList className="mr-1.5 h-4 w-4" />
                                  Copia setup VPS
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm leading-6 text-amber-50">
                            <p className="font-black">Gateway VPS non configurato</p>
                            <p className="mt-1">Manca: {selectedBrowserPairingSession.missingEnv.join(", ") || "BROWSER_MCP_GATEWAY_URL"}.</p>
                            <p className="mt-2">Da VPS Optima, usa questo comando quando il gateway Browser MCP e installato:</p>
                            <code className="mt-2 block max-w-full overflow-x-auto rounded-md bg-black/40 p-2 text-xs text-amber-100">
                              {selectedBrowserPairingSession.runnerCommand}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => copyBrowserPairingCommand(selectedBrowserPairingSession.runnerCommand)}
                              className="mt-3 rounded-lg border-amber-200/20 bg-transparent text-amber-50 hover:bg-amber-300/10"
                            >
                              <ClipboardList className="mr-1.5 h-4 w-4" />
                              Copia comando runner
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-2">
                          {selectedBrowserPairingSession.instructions.map((instruction, index) => (
                            <div key={`${selectedBrowserPairingSession.id}-instruction-${index}`} className="flex gap-2 text-sm leading-6 text-slate-300">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
                              <p className="min-w-0">{instruction}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  {selectedConnector.id === "github" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/settings"
                      }}
                      className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                    >
                      <GitBranch className="mr-1.5 h-4 w-4" />
                      Apri impostazioni GitHub
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => createConnectorSetupJob(selectedConnector)}
                    disabled={setupAction === `connector-setup:${selectedConnector.id}`}
                    className="rounded-lg border-white/10 bg-transparent text-white hover:bg-white/10"
                  >
                    {setupAction === `connector-setup:${selectedConnector.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Network className="mr-1.5 h-4 w-4" />}
                    Job health-check
                  </Button>
                  <Button
                    type="button"
                    onClick={() => configureConnector(selectedConnector)}
                    disabled={capabilityAction === `connector-config:${selectedConnector.id}`}
                    className="rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90"
                  >
                    {capabilityAction === `connector-config:${selectedConnector.id}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
                    Salva checklist
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedGraphNodeId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGraphNodeId(null)
              setGraphNodeDetail(null)
            }
          }}
        >
          <DialogContent className="max-h-[92svh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-[#080d19] p-4 text-white sm:max-w-3xl sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl font-black sm:text-2xl">Nodo graph memory</DialogTitle>
              <DialogDescription className="text-slate-400">
                Dettaglio operativo del nodo selezionato: sorgente, confidence, connessioni e azione agentica.
              </DialogDescription>
            </DialogHeader>

            {isLoadingGraphNode || !graphNodeDetail ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento nodo...
              </div>
            ) : (
              <div className="grid gap-4">
                <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.045] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-100">
                      {graphNodeTypeVisual[graphNodeDetail.node.nodeType]?.label ?? graphNodeDetail.node.nodeType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {graphSourceCopy[graphNodeDetail.node.sourceType] ?? graphNodeDetail.node.sourceType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {graphConfidenceCopy[graphNodeDetail.node.confidence] ?? graphNodeDetail.node.confidence}
                    </span>
                  </div>
                  <h3 className="mt-3 break-words text-xl font-black leading-tight text-white">
                    {graphNodeDetail.node.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                    {graphNodeDetail.node.summary || "Nessun sommario disponibile."}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <p className="min-w-0 truncate">source_id: {graphNodeDetail.node.sourceId || "n/d"}</p>
                    <p className="min-w-0 truncate">collegamenti: {graphNodeDetail.edges.length}</p>
                  </div>
                  {graphNodeDetail.node.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {graphNodeDetail.node.tags.slice(0, 10).map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border border-white/10 bg-[#050914] p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-black text-white">Connessioni</h4>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-400">
                      {graphNodeDetail.connectedNodes.length} nodi
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {graphNodeDetail.connectedNodes.length ? (
                      graphNodeDetail.connectedNodes.slice(0, 8).map((node) => {
                        const edge = graphNodeDetail.edges.find((item) => item.fromNodeId === node.id || item.toNodeId === node.id)
                        return (
                          <button
                            key={`connected-${node.id}`}
                            type="button"
                            onClick={() => loadGraphNode(node)}
                            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-white">{node.title}</p>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {graphNodeTypeVisual[node.nodeType]?.label ?? node.nodeType} · {edge?.edgeType ?? "collegato"}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                {edge ? graphConfidenceCopy[edge.confidence] ?? edge.confidence : "n/d"}
                              </span>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Nessuna connessione indicizzata per questo nodo.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-righello-pink/20 bg-righello-pink/[0.055] p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-white">Azione agentica</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Crea un job che usa questo nodo e i suoi collegamenti come contesto. Il runner produce un risultato revisionabile prima di qualsiasi modifica.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => createGraphNodeJob(graphNodeDetail)}
                      disabled={setupAction === `graph-node-job:${graphNodeDetail.node.id}`}
                      className="h-10 w-full shrink-0 rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90 sm:w-auto"
                    >
                      {setupAction === `graph-node-job:${graphNodeDetail.node.id}` ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-4 w-4" />
                      )}
                      Crea job dal nodo
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(reviewJobId)}
          onOpenChange={(open) => {
            if (!open) {
              setReviewJobId(null)
              setReviewDetails(null)
              setRevisionMessage("")
            }
          }}
        >
          <DialogContent className="max-h-[94svh] w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto border-white/10 bg-[#080d19] p-4 text-white sm:max-w-4xl sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl font-black sm:text-2xl">Revisione job agentico</DialogTitle>
              <DialogDescription className="text-slate-400">
                Leggi output e audit, poi approva, respingi o rimanda al runner con istruzioni precise.
              </DialogDescription>
            </DialogHeader>

            {isLoadingReview || !activeReviewJob ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento revisione...
              </div>
            ) : (
              <div className="grid min-w-0 gap-4">
                <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[activeReviewJob.status]}`}>
                      {statusCopy[activeReviewJob.status] ?? activeReviewJob.status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      {activeReviewJob.jobType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      P{activeReviewJob.priority}
                    </span>
                  </div>
                  <h3 className="mt-3 break-words text-lg font-black leading-tight sm:text-xl">{activeReviewJob.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{activeReviewJob.brief}</p>
                  {activeReviewJob.status === "needs_review" && approvalCreatesPublishJob(activeReviewJob) ? (
                    <div className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] p-3 text-sm leading-6 text-emerald-50">
                      Se l'approvante e owner GitHub autorizzato, Optima crea automaticamente un job successivo di pubblicazione: applicazione output approvato, commit, push GitHub e deploy Cloudflare solo se build e controlli passano. Gli altri ruoli possono approvare l'esito, ma non usare GitHub di Axel.
                    </div>
                  ) : null}
                </div>

                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="grid min-w-0 gap-4">
                    <section className="min-w-0 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-3 sm:p-4">
                      <div className="flex items-center gap-2 text-cyan-50">
                        <FileText className="h-4 w-4" />
                        <h4 className="font-black">Output runner</h4>
                      </div>
                      <div className="mt-3 max-h-72 min-w-0 overflow-y-auto whitespace-pre-wrap break-all text-sm leading-6 text-slate-200 sm:max-h-96">
                        {activeReviewJob.resultSummary || activeReviewJob.errorMessage || "Nessun output ancora disponibile."}
                      </div>
                    </section>

                    <section className="min-w-0 rounded-lg border border-white/10 bg-[#050914] p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-righello-pink" />
                        <h4 className="font-black">Richiedi modifiche al runner</h4>
                      </div>
                      <Textarea
                        className="mt-3 min-h-32 border-white/10 bg-[#080d19] text-sm leading-6 text-white"
                        value={revisionMessage}
                        onChange={(event) => setRevisionMessage(event.target.value)}
                        placeholder="Es. Ricrea lo script usando le tabelle canoniche tasks/time_entries, non staging. Non inventare durate: lascia actual_minutes=0 e tag needs-duration. Aggiungi dettaglio per righello-site solo se verificato."
                      />
                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <Button
                          type="button"
                          onClick={() => mutateJob(activeReviewJob.id, "revise", revisionMessage)}
                          disabled={busyJobId === activeReviewJob.id || revisionMessage.trim().length < 12}
                          className="rounded-lg bg-righello-pink text-white hover:bg-righello-pink/90"
                        >
                          <RefreshCw className="mr-1.5 h-4 w-4" />
                          Rimanda in revisione
                        </Button>
                        {activeReviewJob.status === "needs_review" ? (
                          <>
                            <Button
                              type="button"
                              onClick={() => mutateJob(activeReviewJob.id, "approve", "Approvato dalla review room.")}
                              disabled={busyJobId === activeReviewJob.id}
                              className="rounded-lg bg-emerald-500 text-white hover:bg-emerald-400"
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              {approvalCreatesPublishJob(activeReviewJob) ? "Approva e pubblica" : "Approva"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => mutateJob(activeReviewJob.id, "reject", revisionMessage || "Risultato respinto dalla review room.")}
                              disabled={busyJobId === activeReviewJob.id}
                              className="rounded-lg border-red-400/30 bg-transparent text-red-100 hover:bg-red-500/10"
                            >
                              <XCircle className="mr-1.5 h-4 w-4" />
                              Respingi
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </section>
                  </div>

                  <aside className="grid min-w-0 content-start gap-4">
                    <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                      <h4 className="font-black">Artefatti</h4>
                      <div className="mt-3 grid gap-2">
                        {reviewDetails?.artifacts?.length ? (
                          reviewDetails.artifacts.map((artifact) => (
                            <div key={artifact.id} className="min-w-0 rounded-lg border border-white/10 bg-[#050914] p-3 text-xs leading-5 text-slate-300">
                              <p className="break-words font-bold text-white">{artifact.label}</p>
                              <p className="mt-1">{artifact.artifactType}</p>
                              {artifact.r2Key ? <p className="mt-1 break-all text-slate-500">{artifact.r2Key}</p> : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Nessun artefatto indicizzato.</p>
                        )}
                      </div>
                    </section>

                    <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                      <h4 className="font-black">Timeline audit</h4>
                      <div className="mt-3 grid max-h-72 min-w-0 gap-2 overflow-y-auto pr-1">
                        {reviewDetails?.events?.length ? (
                          reviewDetails.events.map((event) => (
                            <div key={event.id} className="min-w-0 rounded-lg border border-white/10 bg-[#050914] p-3 text-xs leading-5 text-slate-300">
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <p className="min-w-0 truncate font-bold text-white">{event.eventType}</p>
                                <span className="shrink-0 text-slate-500">{formatRelativeTime(event.createdAt)}</span>
                              </div>
                              {event.message ? <p className="mt-1 whitespace-pre-wrap break-all text-slate-400">{event.message}</p> : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Nessun evento registrato.</p>
                        )}
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-300/15 bg-emerald-300/5 p-4 text-sm leading-6 text-emerald-50">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <p>
            Il runner non riceve privilegi di deploy automatico: produce output, PR o report e rimanda il risultato a Óptima per approvazione.
          </p>
        </div>
      </div>
    </section>
  )
}
