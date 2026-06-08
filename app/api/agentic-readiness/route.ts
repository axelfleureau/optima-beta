import { getAgentRunnerControlState } from "@/lib/agent-runner-control"
import { AGENT_ADMIN_ROLES, listAgentRunnerHeartbeats } from "@/lib/agent-jobs"
import { getAgenticCapabilitySnapshot } from "@/lib/agentic-capabilities"
import { getAgenticGraphSnapshot } from "@/lib/agentic-graph"
import {
  buildAgenticProductionReadinessSnapshot,
} from "@/lib/agentic-production-readiness"
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
    return { error: "Solo direzione e admin possono leggere la readiness agentica.", status: 403 as const }
  }

  return { db, principal }
}

function getClerkMode(publishableKey: string) {
  if (publishableKey.startsWith("pk_live_")) return "live"
  if (publishableKey.startsWith("pk_test_")) return "test"
  if (publishableKey) return "unknown"
  return "missing"
}

export async function GET() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const runnerControl = getAgentRunnerControlState()
    const mcpAuth = getMcpAuthReadiness()
    const [capabilities, graphMemory, runners] = await Promise.all([
      getAgenticCapabilitySnapshot(auth.db, auth.principal),
      getAgenticGraphSnapshot(auth.db, auth.principal),
      listAgentRunnerHeartbeats(auth.db).catch(() => []),
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
      graphMemory.stats.nodes > 0

    const snapshot = buildAgenticProductionReadinessSnapshot({
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
      graphNodes: graphMemory.stats.nodes,
      graphEdges: graphMemory.stats.edges,
      graphSessions: graphMemory.stats.sessions,
      providerConfiguredCount: configuredProviders.length,
      providerTotalCount: capabilities.providerCatalog.length,
      connectorConfiguredCount: configuredConnectors.length,
      connectorTotalCount: capabilities.mcpConnectorCatalog.filter((connector) => connector.id !== "hermes-agent").length,
      subagentCount: capabilities.subagents.length,
      hostedRuntimeReadyCount: readyRuntimeHosts.length,
      hostedRuntimeTotalCount: capabilities.modelRuntime.hosts.length,
    })

    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error loading agentic readiness:", error)
    return Response.json({ error: "Errore nel caricamento readiness agentica." }, { status: 500 })
  }
}
