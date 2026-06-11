import { getAgentRunnerControlState } from "@/lib/agent-runner-control"
import { AGENT_ADMIN_ROLES, createAgentJob, listAgentRunnerHeartbeats } from "@/lib/agent-jobs"
import { getAgenticCapabilitySnapshot } from "@/lib/agentic-capabilities"
import {
  AGENTIC_REFERENCE_SOURCES,
  formatAgenticGraphSnapshot,
  getAgenticGraphSnapshot,
  listAgenticGraphNodes,
  seedAgenticReferenceGraph,
  upsertAgenticGraphEdge,
  upsertAgenticGraphNode,
} from "@/lib/agentic-graph"
import { createId } from "@/lib/cloudflare-db"
import {
  buildOperationalContextSnapshot,
  inferRepositoryForAgentJob,
  safeAll,
} from "@/lib/operational-context"
import {
  buildAgenticProductionReadinessSnapshot,
  formatAgenticProductionReadiness,
} from "@/lib/agentic-production-readiness"
import {
  canUseManagerMcpTools,
  getMcpAuthReadiness,
  mcpResourceUrl,
  requireMcpPrincipal,
} from "@/lib/mcp-auth"
import {
  formatStrategicMcpConnectors,
  getStrategicMcpConnectors,
} from "@/lib/mcp-connectors"
import { formatHermesBlueprint, getHermesBlueprint } from "@/lib/hermes-reference"

export const dynamic = "force-dynamic"

const PROTOCOL_VERSION = "2025-11-25"

type JsonRpcRequest = {
  jsonrpc?: "2.0"
  id?: string | number | null
  method?: string
  params?: any
}

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result })
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } })
}

function textContent(text: string) {
  return [{ type: "text", text }]
}

function toolResult(text: string, structuredContent?: unknown) {
  return {
    content: textContent(text),
    structuredContent,
  }
}

function toolsList() {
  return [
    {
      name: "optima_context_snapshot",
      title: "Optima operational context snapshot",
      description: "Legge il grafo operativo visibile all'utente MCP: task, clienti, progetti, presenze, repository e review.",
      inputSchema: {
        type: "object",
        properties: {
          includeGraph: { type: "boolean", description: "Include anche dati strutturati compatti del grafo." },
        },
      },
    },
    {
      name: "optima_agent_job_create",
      title: "Create Optima agent job",
      description: "Crea un job agentico in Optima con inferenza repository da task, progetto o cliente.",
      inputSchema: {
        type: "object",
        required: ["title", "brief"],
        properties: {
          title: { type: "string" },
          brief: { type: "string" },
          jobType: {
            type: "string",
            enum: ["general", "codex_patch", "quote_pdf", "research", "deploy", "task_update"],
          },
          priority: { type: "number", minimum: 1, maximum: 5 },
          taskId: { type: "string" },
          projectId: { type: "string" },
          clientId: { type: "string" },
          repoUrl: { type: "string" },
          repoBranch: { type: "string" },
          workspaceHint: { type: "string" },
        },
      },
    },
    {
      name: "optima_repository_links_list",
      title: "List repository links",
      description: "Lista i repository collegati al grafo operativo Optima.",
      inputSchema: {
        type: "object",
        properties: {
          targetType: { type: "string", enum: ["organization", "client", "project", "task"] },
          targetId: { type: "string" },
        },
      },
    },
    {
      name: "optima_repository_link_upsert",
      title: "Upsert repository link",
      description: "Collega un repository GitHub a organizzazione, cliente, progetto o task.",
      inputSchema: {
        type: "object",
        required: ["targetType", "targetId", "repoUrl"],
        properties: {
          targetType: { type: "string", enum: ["organization", "client", "project", "task"] },
          targetId: { type: "string" },
          repoUrl: { type: "string" },
          repoBranch: { type: "string" },
          workspaceHint: { type: "string" },
        },
      },
    },
    {
      name: "optima_report_review_list",
      title: "List reports awaiting review",
      description: "Lista i rapportini inviati e ancora in attesa di revisione responsabile.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", minimum: 1, maximum: 50 },
        },
      },
    },
    {
      name: "optima_connector_catalog",
      title: "Optima strategic MCP connector catalog",
      description: "Mostra i connettori strategici dell'OS agentico: SendGrid, Codex, Cloudinary, GitHub, Cloudflare, Vercel e Hostinger.",
      inputSchema: {
        type: "object",
        properties: {
          includeMissing: {
            type: "boolean",
            description: "Include anche capability non ancora configurate via env/runtime.",
          },
        },
      },
    },
    {
      name: "optima_agentic_capability_catalog",
      title: "Optima tenant agentic capability catalog",
      description: "Mostra provider AI/code, connector MCP, regole OAuth/installazione e stato configurazione del tenant.",
      inputSchema: {
        type: "object",
        properties: {
          includeInstallations: {
            type: "boolean",
            description: "Include installazioni tenant e subagenti oltre al catalogo statico.",
          },
        },
      },
    },
    {
      name: "optima_agentic_production_readiness",
      title: "Optima agentic production readiness",
      description: "Mostra cosa manca davvero per rendere Optima un sistema operativo agentico production-ready.",
      inputSchema: {
        type: "object",
        properties: {
          includeStructured: {
            type: "boolean",
            description: "Include gap, metriche e summary in forma strutturata.",
          },
        },
      },
    },
    {
      name: "optima_subagent_roster",
      title: "Optima subagent roster",
      description: "Lista i subagenti configurati per il tenant: lane, provider primario, connector concessi e policy handoff.",
      inputSchema: {
        type: "object",
        properties: {
          lane: { type: "string", description: "Filtra per lane: code, research, media, operations, chat." },
        },
      },
    },
    {
      name: "optima_graph_memory_snapshot",
      title: "Optima agentic graph memory snapshot",
      description: "Legge la memoria a grafo agentica del tenant: nodi, archi, sessioni e sorgenti. Graphify e trattato come motore/pattern di estrazione e query, non come nodo business.",
      inputSchema: {
        type: "object",
        properties: {
          includeStructured: { type: "boolean", description: "Include anche nodi, archi e sessioni in forma strutturata." },
        },
      },
    },
    {
      name: "optima_graph_memory_search",
      title: "Search Optima graph memory",
      description: "Cerca nodi nel grafo aziendale/agentico senza leggere tutto il database.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          nodeType: { type: "string" },
          limit: { type: "number", minimum: 1, maximum: 100 },
        },
      },
    },
    {
      name: "optima_graph_memory_upsert",
      title: "Upsert Optima graph memory node",
      description: "Inserisce o aggiorna un nodo del grafo con source e confidence espliciti.",
      inputSchema: {
        type: "object",
        required: ["nodeType", "title"],
        properties: {
          nodeType: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          sourceType: { type: "string" },
          sourceId: { type: "string" },
          sourceUrl: { type: "string" },
          confidence: { type: "string", enum: ["manual", "extracted", "inferred", "ambiguous"] },
          tags: { type: "array", items: { type: "string" } },
          properties: { type: "object" },
        },
      },
    },
    {
      name: "optima_graph_edge_upsert",
      title: "Upsert Optima graph memory edge",
      description: "Inserisce o aggiorna un arco tra due nodi del grafo con tipo relazione, peso e confidence.",
      inputSchema: {
        type: "object",
        required: ["fromNodeId", "toNodeId", "edgeType"],
        properties: {
          fromNodeId: { type: "string" },
          toNodeId: { type: "string" },
          edgeType: { type: "string" },
          confidence: { type: "string", enum: ["manual", "extracted", "inferred", "ambiguous"] },
          weight: { type: "number" },
          properties: { type: "object" },
        },
      },
    },
    {
      name: "optima_agentic_reference_sources",
      title: "Optima agentic reference sources",
      description: "Mostra le sorgenti usate come riferimento architetturale: core agentico derivato da audit Hermes, Graphify engine reference e pattern Perplexity Computer.",
      inputSchema: {
        type: "object",
        properties: {
          seedGraph: { type: "boolean", description: "Se true, inizializza nel grafo i nodi sorgente/pattern." },
        },
      },
    },
    {
      name: "optima_agentic_core_blueprint",
      title: "Optima fused agentic core blueprint",
      description: "Mostra il blueprint auditato del core agentico assorbito in Optima: memoria, skill, MCP/OAuth, provider routing, gateway, subagenti e runtime.",
      inputSchema: {
        type: "object",
        properties: {
          includeStructured: { type: "boolean", description: "Include pattern, file Hermes, superfici Optima e guardrail in forma strutturata." },
        },
      },
    },
  ]
}

function formatCapabilitySnapshot(snapshot: Awaited<ReturnType<typeof getAgenticCapabilitySnapshot>>) {
  const providers = snapshot.providerCatalog
    .map((provider) => {
      return [
        `## ${provider.label}`,
        `- id: ${provider.id}`,
        `- lane: ${provider.lane}`,
        `- auth: ${provider.authMethod}`,
        `- installazione: ${provider.installPattern}`,
        `- uso tenant: ${provider.tenantUse}`,
        `- MCP consigliati: ${provider.recommendedMcpConnectors.join(", ") || "nessuno"}`,
      ].join("\n")
    })
    .join("\n\n")
  const modelPlan = snapshot.modelRuntime.lanePlan
    .map((route) => `- ${route.lane}: ${route.providerId} / ${route.model} (${route.mode}, ${route.runtimeStatus})`)
    .join("\n")

  return [
    "# Optima Agentic Capabilities",
    "",
    "## Tenant isolation",
    `- organization: ${snapshot.tenantIsolation.organizationId}`,
    `- data: ${snapshot.tenantIsolation.dataBoundary}`,
    `- secrets: ${snapshot.tenantIsolation.secretBoundary}`,
    `- runner: ${snapshot.tenantIsolation.runnerBoundary}`,
    `- graph: ${snapshot.tenantIsolation.graphBoundary}`,
    `- review: ${snapshot.tenantIsolation.reviewBoundary}`,
    ...snapshot.tenantIsolation.warnings.map((warning) => `- warning: ${warning}`),
    "",
    "## Regola OAuth/install",
    snapshot.oauthGuidance.pattern,
    "",
    ...snapshot.oauthGuidance.rules.map((rule) => `- ${rule}`),
    "",
    "## Policy runtime nativa",
    `- source: ${snapshot.runtimePolicy.source}`,
    ...snapshot.runtimePolicy.contexts.map(
      (context) =>
        `- ${context.label}: allow ${context.allowedToolsets.join(", ")}; block ${context.blockedToolsets.join(", ")}; review ${context.requiredReview.join(", ")}`,
    ),
    "",
    "## Provider",
    providers,
    "",
    "## Runtime modelli",
    modelPlan || "Nessuna route modello configurata.",
    "",
    "## Collaborazione subagenti",
    "- Codex Engineer gestisce codice, patch e PR.",
    "- Media Operator usa MiniMax e Cloudinary quando Codex richiede asset media.",
    "- Research Analyst usa Qwen per contesto lungo e fonti.",
    "- Office Ops usa Gemma per triage operativo quando configurato.",
    "",
    "## Core agentico fuso",
    `- revision: ${snapshot.hermesBlueprint.reference.auditedRevision} (${snapshot.hermesBlueprint.reference.auditedTag})`,
    `- licenza: ${snapshot.hermesBlueprint.reference.license}`,
    `- pattern: ${snapshot.hermesBlueprint.stats.implementedOrPartial}/${snapshot.hermesBlueprint.stats.total} implementati o parziali`,
    `- regola: ${snapshot.hermesBlueprint.reference.integrationRule}`,
    "",
    `## Installazioni provider tenant: ${snapshot.providerInstallations.length}`,
    `## Installazioni MCP tenant: ${snapshot.connectorInstallations.length}`,
    `## Subagenti tenant: ${snapshot.subagents.length}`,
  ].join("\n")
}

async function getProductionReadinessSnapshot(db: any, principal: any) {
  const runnerControl = getAgentRunnerControlState()
  const mcpAuth = getMcpAuthReadiness()
  const [capabilities, graphMemory, runners] = await Promise.all([
    getAgenticCapabilitySnapshot(db, principal),
    getAgenticGraphSnapshot(db, principal),
    listAgentRunnerHeartbeats(db).catch(() => []),
  ])

  const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || "unknown"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  const coreReady = appEnv === "production" && Boolean(siteUrl)
  const configuredProviders = capabilities.providerInstallations.filter((item) => item.installState !== "not_installed")
  const configuredConnectors = capabilities.connectorInstallations.filter((item) => item.installState !== "not_installed")
  const readyRuntimeHosts = capabilities.modelRuntime.hosts.filter((host) => host.runtimeStatus === "ready")

  return buildAgenticProductionReadinessSnapshot({
    coreReady,
    agenticReady: coreReady && runnerControl.enabled && mcpAuth.configured && graphMemory.stats.nodes > 0,
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
}

async function callTool(name: string, args: any, db: any, principal: any) {
  switch (name) {
    case "optima_context_snapshot": {
      const snapshot = await buildOperationalContextSnapshot(db, principal)
      return toolResult(snapshot.text, args?.includeGraph ? snapshot.graph : { sources: snapshot.sources })
    }

    case "optima_agent_job_create": {
      if (!AGENT_ADMIN_ROLES.has(principal.role)) {
        return toolResult("Permesso negato: solo direzione/admin/capo-reparto possono creare job agentici.")
      }

      const context = {
        source: "mcp",
        taskId: args?.taskId || null,
        projectId: args?.projectId || null,
        clientId: args?.clientId || null,
      }
      const repository = await inferRepositoryForAgentJob(db, principal, {
        jobType: args?.jobType || "general",
        repoUrl: args?.repoUrl,
        repoBranch: args?.repoBranch,
        workspaceHint: args?.workspaceHint,
        context,
        input: args,
      })

      const job = await createAgentJob(db, principal, {
        title: String(args?.title || ""),
        brief: String(args?.brief || ""),
        jobType: args?.jobType || "general",
        priority: args?.priority || 3,
        repoUrl: repository.repoUrl,
        repoBranch: repository.repoBranch,
        workspaceHint: repository.workspaceHint,
        contextSummary: "Creato via Optima MCP",
        input: {
          ...args,
          context,
          repository,
        },
      })

      return toolResult(`Job agentico creato: ${job.title} (${job.id})`, { job })
    }

    case "optima_repository_links_list": {
      const targetFilter = args?.targetType && args?.targetId ? "AND target_type = ? AND target_id = ?" : ""
      const params =
        args?.targetType && args?.targetId
          ? [principal.organizationId, String(args.targetType), String(args.targetId)]
          : [principal.organizationId]
      const rows = await safeAll(
        db,
        `SELECT id, target_type, target_id, repo_url, repo_branch, workspace_hint, source, updated_at
         FROM repository_links
         WHERE organization_id = ? ${targetFilter}
         ORDER BY updated_at DESC
         LIMIT 50`,
        params,
      )
      return toolResult(`Repository links trovati: ${rows.length}`, { repositories: rows })
    }

    case "optima_repository_link_upsert": {
      if (!canUseManagerMcpTools(principal)) {
        return toolResult("Permesso negato: solo responsabili/direzione possono collegare repository.")
      }

      const id = createId("repo")
      const targetType = String(args?.targetType || "").trim()
      const targetId = String(args?.targetId || "").trim()
      const repoUrl = String(args?.repoUrl || "").trim()
      if (!targetType || !targetId || !repoUrl) {
        return toolResult("targetType, targetId e repoUrl sono obbligatori.")
      }

      await db
        .prepare(
          `INSERT INTO repository_links (
             id, organization_id, target_type, target_id, repo_url, repo_branch, workspace_hint, source
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, 'mcp')
           ON CONFLICT(organization_id, target_type, target_id, repo_url) DO UPDATE SET
             repo_branch = excluded.repo_branch,
             workspace_hint = excluded.workspace_hint,
             source = 'mcp',
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          id,
          principal.organizationId,
          targetType,
          targetId,
          repoUrl,
          String(args?.repoBranch || "main").trim() || "main",
          String(args?.workspaceHint || "").trim() || null,
        )
        .run()

      return toolResult(`Repository collegato a ${targetType}:${targetId}.`, {
        targetType,
        targetId,
        repoUrl,
        repoBranch: String(args?.repoBranch || "main").trim() || "main",
      })
    }

    case "optima_report_review_list": {
      if (!canUseManagerMcpTools(principal)) {
        return toolResult("Permesso negato: solo responsabili/direzione possono vedere la review rapportini.")
      }

      const limit = Math.min(50, Math.max(1, Number(args?.limit || 20)))
      const rows = await safeAll(
        db,
        `SELECT wd.id, wd.entry_date, wd.submitted_at, wd.review_status,
                m.id AS member_id, m.email, m.first_name, m.last_name, m.role
         FROM work_days wd
         JOIN members m ON m.id = wd.member_id AND m.organization_id = wd.organization_id
         WHERE wd.organization_id = ?
           AND wd.review_status = 'submitted'
         ORDER BY wd.submitted_at ASC
         LIMIT ?`,
        [principal.organizationId, limit],
      )

      return toolResult(`Rapportini in review: ${rows.length}`, { reports: rows })
    }

    case "optima_connector_catalog": {
      const connectors = getStrategicMcpConnectors().filter((connector) => {
        return args?.includeMissing ? true : connector.status !== "missing"
      })
      return toolResult(formatStrategicMcpConnectors(connectors), { connectors })
    }

    case "optima_agentic_capability_catalog": {
      const snapshot = await getAgenticCapabilitySnapshot(db, principal)
      const structuredContent = args?.includeInstallations
        ? snapshot
        : {
            providerCatalog: snapshot.providerCatalog,
            mcpConnectorCatalog: snapshot.mcpConnectorCatalog,
            modelRuntime: snapshot.modelRuntime,
            oauthGuidance: snapshot.oauthGuidance,
          }
      return toolResult(formatCapabilitySnapshot(snapshot), structuredContent)
    }

    case "optima_agentic_production_readiness": {
      const snapshot = await getProductionReadinessSnapshot(db, principal)
      return toolResult(
        formatAgenticProductionReadiness(snapshot),
        args?.includeStructured ? snapshot : { summary: snapshot.summary, metrics: snapshot.metrics },
      )
    }

    case "optima_subagent_roster": {
      const snapshot = await getAgenticCapabilitySnapshot(db, principal)
      const lane = String(args?.lane || "").trim()
      const subagents = lane
        ? snapshot.subagents.filter((subagent) => subagent.lane === lane)
        : snapshot.subagents
      const text = subagents.length
        ? subagents
            .map((subagent) =>
              [
                `## ${subagent.name}`,
                `- slug: ${subagent.slug}`,
                `- lane: ${subagent.lane}`,
                `- provider: ${subagent.primaryProviderId}${subagent.modelHint ? ` / ${subagent.modelHint}` : ""}`,
                `- connector: ${subagent.connectorIds.join(", ") || "nessuno"}`,
                `- stato: ${subagent.status}`,
              ].join("\n"),
            )
            .join("\n\n")
        : "Nessun subagente configurato per questo tenant."
      return toolResult(text, { subagents })
    }

    case "optima_graph_memory_snapshot": {
      const snapshot = await getAgenticGraphSnapshot(db, principal)
      return toolResult(
        formatAgenticGraphSnapshot(snapshot),
        args?.includeStructured ? snapshot : { stats: snapshot.stats, referenceSources: snapshot.referenceSources },
      )
    }

    case "optima_graph_memory_search": {
      const nodes = await listAgenticGraphNodes(db, principal, {
        query: String(args?.query || ""),
        nodeType: String(args?.nodeType || ""),
        limit: Number(args?.limit || 25),
      })
      const text = nodes.length
        ? nodes
            .map((node) => `- ${node.title} [${node.nodeType}/${node.confidence}] ${node.summary}`.trim())
            .join("\n")
        : "Nessun nodo trovato nella graph memory Optima."
      return toolResult(text, { nodes })
    }

    case "optima_graph_memory_upsert": {
      if (!canUseManagerMcpTools(principal)) {
        return toolResult("Permesso negato: solo responsabili/direzione possono scrivere nella graph memory.")
      }
      const node = await upsertAgenticGraphNode(db, principal, {
        nodeType: String(args?.nodeType || ""),
        title: String(args?.title || ""),
        summary: String(args?.summary || ""),
        sourceType: String(args?.sourceType || "mcp"),
        sourceId: args?.sourceId ? String(args.sourceId) : undefined,
        sourceUrl: args?.sourceUrl ? String(args.sourceUrl) : null,
        confidence: args?.confidence,
        tags: Array.isArray(args?.tags) ? args.tags.map((tag: unknown) => String(tag)) : [],
        properties: args?.properties,
      })
      return toolResult(`Nodo graph memory salvato: ${node?.title || args?.title}`, { node })
    }

    case "optima_graph_edge_upsert": {
      if (!canUseManagerMcpTools(principal)) {
        return toolResult("Permesso negato: solo responsabili/direzione possono scrivere nella graph memory.")
      }
      const edge = await upsertAgenticGraphEdge(db, principal, {
        fromNodeId: String(args?.fromNodeId || ""),
        toNodeId: String(args?.toNodeId || ""),
        edgeType: String(args?.edgeType || ""),
        confidence: args?.confidence,
        weight: Number(args?.weight || 1),
        properties: args?.properties,
      })
      return toolResult(`Arco graph memory salvato: ${edge?.edgeType || args?.edgeType}`, { edge })
    }

    case "optima_agentic_reference_sources": {
      if (args?.seedGraph && !canUseManagerMcpTools(principal)) {
        return toolResult("Permesso negato: solo responsabili/direzione possono inizializzare la graph memory.")
      }
      const snapshot = args?.seedGraph ? await seedAgenticReferenceGraph(db, principal) : null
      const text = AGENTIC_REFERENCE_SOURCES.map((source) => {
        return [
          `## ${source.label}`,
          `- tipo: ${source.sourceType}`,
          `- policy: ${source.importPolicy}`,
          `- url: ${source.url || "nessuna, pattern UX"}`,
          `- pattern: ${source.usefulPatterns.join(", ")}`,
        ].join("\n")
      }).join("\n\n")
      return toolResult(text, snapshot ? { sources: AGENTIC_REFERENCE_SOURCES, snapshot } : { sources: AGENTIC_REFERENCE_SOURCES })
    }

    case "optima_agentic_core_blueprint":
    case "optima_hermes_blueprint": {
      const blueprint = getHermesBlueprint()
      return toolResult(formatHermesBlueprint(), args?.includeStructured ? blueprint : { reference: blueprint.reference, stats: blueprint.stats })
    }

    default:
      return toolResult(`Tool MCP non supportato: ${name}`)
  }
}

async function handleRpc(requestBody: JsonRpcRequest, request: Request) {
  const { id, method, params } = requestBody

  if (!method) return jsonRpcError(id, -32600, "Metodo JSON-RPC mancante.")

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: "optima-agentic-os",
        title: "Optima Agentic Operating System",
        version: "0.1.0",
      },
      instructions:
        "Optima MCP espone il grafo operativo Righello: task, clienti, progetti, rapportini, repository e job agentici con approvazione umana.",
    })
  }

  if (!("id" in requestBody)) {
    return new Response(null, { status: 202 })
  }

  const auth = await requireMcpPrincipal(request)
  if (auth.error) return auth.error
  const db = auth.db
  const principal = auth.principal

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: toolsList() })
  }

  if (method === "tools/call") {
    const result = await callTool(String(params?.name || ""), params?.arguments || {}, db, principal)
    return jsonRpcResult(id, result)
  }

  if (method === "resources/list") {
    return jsonRpcResult(id, {
      resources: [
        {
          uri: "optima://context/snapshot",
          name: "Optima operational context",
          title: "Optima operational context snapshot",
          mimeType: "text/plain",
        },
        {
          uri: "optima://connectors/catalog",
          name: "Optima strategic connector catalog",
          title: "Optima MCP strategic connector catalog",
          mimeType: "text/plain",
        },
        {
          uri: "optima://agentic/capabilities",
          name: "Optima tenant agentic capabilities",
          title: "Optima tenant agentic capabilities",
          mimeType: "text/plain",
        },
        {
          uri: "optima://agentic/graph-memory",
          name: "Optima agentic graph memory",
          title: "Optima agentic graph memory",
          mimeType: "text/plain",
        },
        {
          uri: "optima://agentic/production-readiness",
          name: "Optima agentic production readiness",
          title: "Optima agentic production readiness",
          mimeType: "text/plain",
        },
        {
          uri: "optima://agentic/core-blueprint",
          name: "Optima fused agentic core blueprint",
          title: "Optima fused agentic core blueprint",
          mimeType: "text/plain",
        },
      ],
    })
  }

  if (method === "resources/read") {
    if (params?.uri === "optima://context/snapshot") {
      const snapshot = await buildOperationalContextSnapshot(db, principal)
      return jsonRpcResult(id, {
        contents: [
          {
            uri: "optima://context/snapshot",
            mimeType: "text/plain",
            text: snapshot.text,
          },
        ],
      })
    }

    if (params?.uri === "optima://connectors/catalog") {
      return jsonRpcResult(id, {
        contents: [
          {
            uri: "optima://connectors/catalog",
            mimeType: "text/plain",
            text: formatStrategicMcpConnectors(),
          },
        ],
      })
    }

    if (params?.uri === "optima://agentic/capabilities") {
      const snapshot = await getAgenticCapabilitySnapshot(db, principal)
      return jsonRpcResult(id, {
        contents: [
          {
            uri: "optima://agentic/capabilities",
            mimeType: "text/plain",
            text: formatCapabilitySnapshot(snapshot),
          },
        ],
      })
    }

    if (params?.uri === "optima://agentic/graph-memory") {
      const snapshot = await getAgenticGraphSnapshot(db, principal)
      return jsonRpcResult(id, {
        contents: [
          {
            uri: "optima://agentic/graph-memory",
            mimeType: "text/plain",
            text: formatAgenticGraphSnapshot(snapshot),
          },
        ],
      })
    }

    if (params?.uri === "optima://agentic/production-readiness") {
      const snapshot = await getProductionReadinessSnapshot(db, principal)
      return jsonRpcResult(id, {
        contents: [
          {
            uri: "optima://agentic/production-readiness",
            mimeType: "text/plain",
            text: formatAgenticProductionReadiness(snapshot),
          },
        ],
      })
    }

    if (params?.uri === "optima://agentic/core-blueprint" || params?.uri === "optima://agentic/hermes-blueprint") {
      return jsonRpcResult(id, {
        contents: [
          {
            uri: "optima://agentic/core-blueprint",
            mimeType: "text/plain",
            text: formatHermesBlueprint(),
          },
        ],
      })
    }

    return jsonRpcError(id, -32602, "Risorsa MCP non supportata.")
  }

  if (method === "prompts/list") {
    return jsonRpcResult(id, { prompts: [] })
  }

  return jsonRpcError(id, -32601, `Metodo MCP non supportato: ${method}`)
}

export async function GET(request: Request) {
  const auth = await requireMcpPrincipal(request)
  if (auth.error) return auth.error

  const body = [
    `data: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/message",
      params: {
        level: "info",
        data: `Optima MCP pronto: ${mcpResourceUrl(request)}`,
      },
    })}`,
    "",
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  })
}

export async function POST(request: Request) {
  let body: JsonRpcRequest | JsonRpcRequest[]
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, -32700, "Body JSON non valido.")
  }

  if (Array.isArray(body)) {
    const responses = []
    for (const item of body) {
      const response = await handleRpc(item, request)
      if (response.status !== 202) responses.push(await response.json())
    }
    return responses.length ? Response.json(responses) : new Response(null, { status: 202 })
  }

  return handleRpc(body, request)
}
