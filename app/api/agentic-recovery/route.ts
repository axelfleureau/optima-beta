import { AGENT_ADMIN_ROLES, listAgentRunnerHeartbeats } from "@/lib/agent-jobs"
import { getAgentRunnerControlState } from "@/lib/agent-runner-control"
import { getAgenticCapabilitySnapshot } from "@/lib/agentic-capabilities"
import { getAgenticGraphSnapshot } from "@/lib/agentic-graph"
import {
  buildAgenticRecoverySnapshot,
  createAgenticRecoveryJob,
  findActiveAgenticRecoveryJob,
} from "@/lib/agentic-recovery"
import { buildAgenticProductionReadinessSnapshot } from "@/lib/agentic-production-readiness"
import { getSelfImprovementSnapshot } from "@/lib/agentic-self-improvement"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { getTaskMediaBucket } from "@/lib/cloudflare-r2"
import { getMcpAuthReadiness } from "@/lib/mcp-auth"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono usare il recovery agentico.", status: 403 as const }
  }

  return { db, principal }
}

function getClerkMode(publishableKey: string) {
  if (publishableKey.startsWith("pk_live_")) return "live"
  if (publishableKey.startsWith("pk_test_")) return "test"
  if (publishableKey) return "unknown"
  return "missing"
}

async function buildSnapshot(db: any, principal: Awaited<ReturnType<typeof ensureWorkspacePrincipal>>) {
  const runnerControl = getAgentRunnerControlState()
  const mcpAuth = getMcpAuthReadiness()
  const [capabilities, graph, runners, selfImprovement, activeRecoveryJob] = await Promise.all([
    getAgenticCapabilitySnapshot(db, principal),
    getAgenticGraphSnapshot(db, principal),
    listAgentRunnerHeartbeats(db).catch(() => []),
    getSelfImprovementSnapshot(db, principal.organizationId, 7).catch(() => null),
    findActiveAgenticRecoveryJob(db, principal.organizationId).catch(() => null),
  ])

  let taskMediaBucketConfigured = false
  try {
    taskMediaBucketConfigured = Boolean(await getTaskMediaBucket())
  } catch {
    taskMediaBucketConfigured = false
  }

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""
  const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || "unknown"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  const coreReady = appEnv === "production" && Boolean(siteUrl) && getClerkMode(publishableKey) === "live"
  const configuredProviders = capabilities.providerInstallations.filter((item) => item.installState !== "not_installed")
  const configuredConnectors = capabilities.connectorInstallations.filter((item) => item.installState !== "not_installed")
  const readyRuntimeHosts = capabilities.modelRuntime.hosts.filter((host) => host.runtimeStatus === "ready")
  const agenticReady =
    coreReady &&
    taskMediaBucketConfigured &&
    runnerControl.enabled &&
    mcpAuth.configured &&
    graph.stats.nodes > 0
  const readiness = buildAgenticProductionReadinessSnapshot({
    coreReady,
    agenticReady,
    runnerEnabled: runnerControl.enabled,
    runnerStatus: runnerControl.status,
    latestRunnerSeenAt: runners[0]?.lastSeenAt ?? null,
    mcpAuthMode: mcpAuth.mode,
    mcpAuthorizationConfigured: mcpAuth.configured,
    mcpOAuthAuthorizationCodeConfigured: mcpAuth.authorizationCodeConfigured,
    mcpJwtBearerConfigured: mcpAuth.jwtBearerConfigured,
    mcpServiceTokenConfigured: mcpAuth.serviceTokenConfigured,
    graphNodes: graph.stats.nodes,
    graphEdges: graph.stats.edges,
    graphSessions: graph.stats.sessions,
    providerConfiguredCount: configuredProviders.length,
    providerTotalCount: capabilities.providerCatalog.length,
    connectorConfiguredCount: configuredConnectors.length,
    connectorTotalCount: capabilities.mcpConnectorCatalog.filter((connector) => connector.id !== "hermes-agent").length,
    subagentCount: capabilities.subagents.length,
    hostedRuntimeReadyCount: readyRuntimeHosts.length,
    hostedRuntimeTotalCount: capabilities.modelRuntime.hosts.length,
  })

  return buildAgenticRecoverySnapshot({
    readiness,
    capabilities,
    graph,
    selfImprovement,
    runnerEnabled: runnerControl.enabled,
    runnerStatus: runnerControl.status,
    latestRunnerSeenAt: runners[0]?.lastSeenAt ?? null,
    activeRecoveryJob,
  })
}

export async function GET() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })
    const snapshot = await buildSnapshot(auth.db, auth.principal)
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Error loading agentic recovery:", error)
    return Response.json({ error: "Errore nel caricamento recovery agentico." }, { status: 500 })
  }
}

export async function POST() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })
    const snapshot = await buildSnapshot(auth.db, auth.principal)
    const result = await createAgenticRecoveryJob(auth.db, auth.principal, snapshot)
    return Response.json({ ...snapshot, job: result.job, reused: result.reused }, { status: result.reused ? 200 : 201 })
  } catch (error: any) {
    console.error("Error creating agentic recovery job:", error)
    return Response.json(
      { error: error?.message ?? "Errore nella creazione del job recovery agentico." },
      { status: 400 },
    )
  }
}
