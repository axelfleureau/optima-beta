import { createId } from "@/lib/cloudflare-db"
import { HERMES_ADAPTER_PATTERNS, HERMES_REFERENCE } from "@/lib/hermes-reference"
import { safeAll } from "@/lib/operational-context"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

export type AgenticGraphConfidence = "extracted" | "inferred" | "ambiguous" | "manual"

export interface AgenticGraphNode {
  id: string
  organizationId: string
  nodeType: string
  title: string
  summary: string
  sourceType: string
  sourceId: string
  sourceUrl: string | null
  confidence: AgenticGraphConfidence
  tags: string[]
  properties: Record<string, unknown>
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface AgenticGraphEdge {
  id: string
  organizationId: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
  confidence: AgenticGraphConfidence
  weight: number
  properties: Record<string, unknown>
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface AgenticGraphSession {
  id: string
  organizationId: string
  title: string
  objective: string
  status: string
  activeSubagentId: string | null
  conversationId: string | null
  taskId: string | null
  toolPlan: unknown[]
  trace: unknown[]
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface AgenticReferenceSource {
  id: string
  label: string
  sourceType: "open_source_reference" | "product_pattern" | "private_readonly_source"
  url: string | null
  importPolicy: string
  usefulPatterns: string[]
}

export interface AgenticGraphSnapshot {
  nodes: AgenticGraphNode[]
  edges: AgenticGraphEdge[]
  sessions: AgenticGraphSession[]
  stats: {
    nodes: number
    edges: number
    sessions: number
    byType: Record<string, number>
  }
  referenceSources: AgenticReferenceSource[]
}

export const AGENTIC_REFERENCE_SOURCES: AgenticReferenceSource[] = [
  {
    id: "codex-development-knowhow",
    label: "Codex Development Know-How",
    sourceType: "open_source_reference",
    url: null,
    importPolicy: "local_markdown_indexed_as_graph_nodes",
    usefulPatterns: [
      "skill e lezioni operative riutilizzabili tra progetti Codex",
      "mobile UX, SEO, performance, sicurezza, deploy e workflow agentici",
      "nodi development_knowhow sincronizzati da development/knowhow",
      "recupero contestuale invece di caricamento integrale nel prompt",
    ],
  },
  {
    id: "hermes-agent",
    label: "Blueprint agentico open-source assorbito",
    sourceType: "open_source_reference",
    url: HERMES_REFERENCE.repository,
    importPolicy: HERMES_REFERENCE.importPolicy,
    usefulPatterns: HERMES_ADAPTER_PATTERNS.map((pattern) => `${pattern.label} (${pattern.status})`),
  },
  {
    id: "hermes-righello-readonly",
    label: "Hermes Righello read-only data",
    sourceType: "private_readonly_source",
    url: null,
    importPolicy: "redacted_index_only_no_secrets_no_full_conversation_dump",
    usefulPatterns: [
      "memories, skills, kanban e sessioni Hermes indicizzabili come nodi redatti",
      "secrets e token esclusi sempre dall'import",
      "source_id stabile per ogni file importato",
      "sessioni marcate ambiguous finche non revisionate",
      "import idempotente tenant-scoped verso agentic_graph_nodes/edges",
    ],
  },
  {
    id: "notion-righello-readonly",
    label: "Notion Righello read-only data",
    sourceType: "private_readonly_source",
    url: null,
    importPolicy: "allowlisted_database_index_only_no_credentials_no_raw_dump",
    usefulPatterns: [
      "RIG_CLIENTI RIGHELLO: collection://28132473-a5fc-8035-803f-000b76e5cbf3",
      "RIG_WORK: collection://27f32473-a5fc-818d-8448-000b562dd5cf",
      "Configuratore preventivi Righello: documentazione step, servizi, PDF e dashboard amministrazione in RIG_WORK",
      "Preventivi storici: indicizzare solo titolo, macro-servizi, range economici redatti, stato e relazioni cliente/progetto",
      "importare clienti, task, stati, tipologie, relazioni e timestamp come nodi redatti",
      "escludere pagine credenziali, accessi, token, fiscali non necessari, allegati pesanti e dump integrali",
      "relazioni Notion cliente-task mappate come archi tenant-scoped revisionabili",
    ],
  },
  {
    id: "graphify",
    label: "Graphify official reference",
    sourceType: "open_source_reference",
    url: "https://github.com/safishamsi/graphify",
    importPolicy: "reference_only_graph_extraction_schema",
    usefulPatterns: [
      "pipeline detect/extract/build/analyze/export",
      "nodi e archi con confidence esplicita",
      "graph.json interrogabile da agenti",
      "MCP server per query sul grafo",
      "skill installabile per workflow agentici",
    ],
  },
  {
    id: "portopiccolo-avantio-guesty-sync",
    label: "Portopiccolo Avantio Guesty Sync",
    sourceType: "private_readonly_source",
    url: null,
    importPolicy: "skill_and_operational_index_only_no_credentials_no_runtime_dump",
    usefulPatterns: [
      "audit read-only prima di qualunque scrittura Guesty",
      "hard-ban OTA prima del push: Booking, Airbnb, Vrbo e HomeAway",
      "dedupe Guesty tramite originId=avantio:<id>",
      "runtime macOS LaunchAgent e report audit indicizzati solo come metadati/conteggi",
      "repo sync e dossier Portopiccolo collegati al grafo Optima per job agentici revisionabili",
    ],
  },
  {
    id: "perplexity-computer-pattern",
    label: "Perplexity Computer pattern",
    sourceType: "product_pattern",
    url: null,
    importPolicy: "ux_pattern_only_no_vendor_code",
    usefulPatterns: [
      "workspace conversazionale con obiettivo operativo",
      "risposte affiancate da azioni e fonti",
      "traccia visibile del lavoro svolto",
      "handoff umano quando l'azione e rischiosa",
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

function parseJsonArray(value: unknown): unknown[] {
  if (!value || typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).map((item) => String(item)).filter(Boolean)
}

function stringifyObject(value: unknown) {
  return JSON.stringify(value && typeof value === "object" && !Array.isArray(value) ? value : {})
}

function stringifyArray(value: unknown) {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

function normalizeConfidence(value: unknown): AgenticGraphConfidence {
  if (value === "extracted" || value === "inferred" || value === "ambiguous" || value === "manual") {
    return value
  }
  return "manual"
}

function mapNode(row: any): AgenticGraphNode {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    nodeType: String(row.node_type),
    title: String(row.title || ""),
    summary: String(row.summary || ""),
    sourceType: String(row.source_type || "manual"),
    sourceId: String(row.source_id || ""),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    confidence: normalizeConfidence(row.confidence),
    tags: parseStringArray(row.tags_json),
    properties: parseJsonObject(row.properties_json),
    createdByMemberId: row.created_by_member_id ? String(row.created_by_member_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapEdge(row: any): AgenticGraphEdge {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    fromNodeId: String(row.from_node_id),
    toNodeId: String(row.to_node_id),
    edgeType: String(row.edge_type),
    confidence: normalizeConfidence(row.confidence),
    weight: Number(row.weight || 1),
    properties: parseJsonObject(row.properties_json),
    createdByMemberId: row.created_by_member_id ? String(row.created_by_member_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapSession(row: any): AgenticGraphSession {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    title: String(row.title || ""),
    objective: String(row.objective || ""),
    status: String(row.status || "open"),
    activeSubagentId: row.active_subagent_id ? String(row.active_subagent_id) : null,
    conversationId: row.conversation_id ? String(row.conversation_id) : null,
    taskId: row.task_id ? String(row.task_id) : null,
    toolPlan: parseJsonArray(row.tool_plan_json),
    trace: parseJsonArray(row.trace_json),
    createdByMemberId: row.created_by_member_id ? String(row.created_by_member_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function listAgenticGraphNodes(
  db: any,
  principal: WorkspacePrincipal,
  input: { query?: string; nodeType?: string; sourceType?: string; limit?: number } = {},
) {
  const clauses = ["organization_id = ?"]
  const params: unknown[] = [principal.organizationId]
  const query = String(input.query || "").trim()
  const nodeType = String(input.nodeType || "").trim()
  const sourceType = String(input.sourceType || "").trim()
  const limit = Math.min(300, Math.max(1, Number(input.limit || 50)))

  if (nodeType) {
    clauses.push("node_type = ?")
    params.push(nodeType)
  }

  if (sourceType) {
    clauses.push("source_type = ?")
    params.push(sourceType)
  }

  if (query) {
    clauses.push("(title LIKE ? OR summary LIKE ? OR tags_json LIKE ? OR properties_json LIKE ?)")
    const like = `%${query}%`
    params.push(like, like, like, like)
  }

  params.push(limit)

  const rows = await safeAll(
    db,
    `SELECT *
     FROM agentic_graph_nodes
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT ?`,
    params,
  )
  return rows.map(mapNode)
}

export async function getAgenticGraphNodeDetail(
  db: any,
  principal: WorkspacePrincipal,
  nodeId: string,
  limit = 80,
) {
  const id = String(nodeId || "").trim()
  if (!id) return null

  const [nodeRow] = await safeAll(
    db,
    `SELECT *
     FROM agentic_graph_nodes
     WHERE organization_id = ? AND id = ?
     LIMIT 1`,
    [principal.organizationId, id],
  )
  if (!nodeRow) return null

  const edges = await listAgenticGraphEdges(db, principal, { nodeId: id, limit })
  const connectedIds = Array.from(
    new Set(
      edges
        .flatMap((edge) => [edge.fromNodeId, edge.toNodeId])
        .filter((connectedId) => connectedId && connectedId !== id),
    ),
  ).slice(0, Math.min(80, Math.max(1, Number(limit || 80))))

  let connectedNodes: AgenticGraphNode[] = []
  if (connectedIds.length) {
    const placeholders = connectedIds.map(() => "?").join(", ")
    const rows = await safeAll(
      db,
      `SELECT *
       FROM agentic_graph_nodes
       WHERE organization_id = ? AND id IN (${placeholders})
       ORDER BY updated_at DESC`,
      [principal.organizationId, ...connectedIds],
    )
    connectedNodes = rows.map(mapNode)
  }

  return {
    node: mapNode(nodeRow),
    edges,
    connectedNodes,
  }
}

export async function listAgenticGraphEdges(
  db: any,
  principal: WorkspacePrincipal,
  input: { nodeId?: string; limit?: number } = {},
) {
  const nodeId = String(input.nodeId || "").trim()
  const limit = Math.min(900, Math.max(1, Number(input.limit || 100)))
  const clauses = ["organization_id = ?"]
  const params: unknown[] = [principal.organizationId]

  if (nodeId) {
    clauses.push("(from_node_id = ? OR to_node_id = ?)")
    params.push(nodeId, nodeId)
  }

  params.push(limit)
  const rows = await safeAll(
    db,
    `SELECT *
     FROM agentic_graph_edges
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT ?`,
    params,
  )
  return rows.map(mapEdge)
}

export async function listAgenticGraphSessions(db: any, principal: WorkspacePrincipal, limit = 20) {
  const rows = await safeAll(
    db,
    `SELECT *
     FROM agentic_graph_sessions
     WHERE organization_id = ?
     ORDER BY updated_at DESC
     LIMIT ?`,
    [principal.organizationId, Math.min(50, Math.max(1, Number(limit || 20)))],
  )
  return rows.map(mapSession)
}

export async function upsertAgenticGraphNode(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    nodeType: string
    title: string
    summary?: string
    sourceType?: string
    sourceId?: string
    sourceUrl?: string | null
    confidence?: AgenticGraphConfidence
    tags?: string[]
    properties?: Record<string, unknown>
  },
) {
  const nodeType = input.nodeType.trim()
  const title = input.title.trim()
  if (!nodeType || !title) throw new Error("nodeType e title sono obbligatori.")

  const id = createId("agnode")
  const sourceType = String(input.sourceType || "manual").trim() || "manual"
  const sourceId = String(input.sourceId || id).trim() || id

  await db
    .prepare(
      `INSERT INTO agentic_graph_nodes (
        id, organization_id, node_type, title, summary, source_type, source_id,
        source_url, confidence, tags_json, properties_json, created_by_member_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, node_type, source_type, source_id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        source_url = excluded.source_url,
        confidence = excluded.confidence,
        tags_json = excluded.tags_json,
        properties_json = excluded.properties_json,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      id,
      principal.organizationId,
      nodeType,
      title,
      input.summary || "",
      sourceType,
      sourceId,
      input.sourceUrl || null,
      normalizeConfidence(input.confidence),
      stringifyArray(input.tags),
      stringifyObject(input.properties),
      principal.memberId,
    )
    .run()

  const rows = await safeAll(
    db,
    `SELECT *
     FROM agentic_graph_nodes
     WHERE organization_id = ? AND node_type = ? AND source_type = ? AND source_id = ?
     LIMIT 1`,
    [principal.organizationId, nodeType, sourceType, sourceId],
  )
  return rows[0] ? mapNode(rows[0]) : null
}

export async function upsertAgenticGraphEdge(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    fromNodeId: string
    toNodeId: string
    edgeType: string
    confidence?: AgenticGraphConfidence
    weight?: number
    properties?: Record<string, unknown>
  },
) {
  const fromNodeId = input.fromNodeId.trim()
  const toNodeId = input.toNodeId.trim()
  const edgeType = input.edgeType.trim()
  if (!fromNodeId || !toNodeId || !edgeType) {
    throw new Error("fromNodeId, toNodeId e edgeType sono obbligatori.")
  }

  await db
    .prepare(
      `INSERT INTO agentic_graph_edges (
        id, organization_id, from_node_id, to_node_id, edge_type,
        confidence, weight, properties_json, created_by_member_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
        confidence = excluded.confidence,
        weight = excluded.weight,
        properties_json = excluded.properties_json,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      createId("agedge"),
      principal.organizationId,
      fromNodeId,
      toNodeId,
      edgeType,
      normalizeConfidence(input.confidence),
      Number.isFinite(Number(input.weight)) ? Number(input.weight) : 1,
      stringifyObject(input.properties),
      principal.memberId,
    )
    .run()

  const rows = await safeAll(
    db,
    `SELECT *
     FROM agentic_graph_edges
     WHERE organization_id = ? AND from_node_id = ? AND to_node_id = ? AND edge_type = ?
     LIMIT 1`,
    [principal.organizationId, fromNodeId, toNodeId, edgeType],
  )
  return rows[0] ? mapEdge(rows[0]) : null
}

export async function createAgenticGraphSession(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    title: string
    objective?: string
    activeSubagentId?: string | null
    conversationId?: string | null
    taskId?: string | null
    toolPlan?: unknown[]
    trace?: unknown[]
  },
) {
  const title = input.title.trim()
  if (!title) throw new Error("title e obbligatorio.")

  await db
    .prepare(
      `INSERT INTO agentic_graph_sessions (
        id, organization_id, title, objective, active_subagent_id, conversation_id,
        task_id, tool_plan_json, trace_json, created_by_member_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      createId("agsess"),
      principal.organizationId,
      title,
      input.objective || "",
      input.activeSubagentId || null,
      input.conversationId || null,
      input.taskId || null,
      stringifyArray(input.toolPlan),
      stringifyArray(input.trace),
      principal.memberId,
    )
    .run()

  const [session] = await listAgenticGraphSessions(db, principal, 1)
  return session
}

export async function seedAgenticReferenceGraph(db: any, principal: WorkspacePrincipal) {
  const optima = await upsertAgenticGraphNode(db, principal, {
    nodeType: "system",
    title: "Optima Agentic Operating System",
    summary: "Control plane aziendale multi-tenant per agenti, MCP, graph memory, job review e audit.",
    sourceType: "internal",
    sourceId: "optima-agentic-os",
    confidence: "manual",
    tags: ["optima", "agentic-os", "mcp", "graph-memory"],
  })

  const graphMemory = await upsertAgenticGraphNode(db, principal, {
    nodeType: "capability",
    title: "Agentic graph memory",
    summary: "Memoria a grafo tenant-scoped con nodi, archi, confidence e sorgenti verificabili. Optima possiede il control plane e usa Graphify come motore/pattern di estrazione, analisi e query.",
    sourceType: "internal",
    sourceId: "agentic-graph-memory",
    confidence: "manual",
    tags: ["graph", "memory", "tenant"],
  })

  const graphEngine = await upsertAgenticGraphNode(db, principal, {
    nodeType: "graph_engine",
    title: "Graphify graph engine",
    summary: "Motore/pipeline per detect, extract, build, cluster, analyze, export e MCP query del grafo. Non e un nodo business: alimenta e interroga i nodi Optima.",
    sourceType: "internal",
    sourceId: "graphify-graph-engine",
    sourceUrl: "https://github.com/safishamsi/graphify",
    confidence: "manual",
    tags: ["graphify", "graph-engine", "mcp", "extraction", "query"],
    properties: {
      role: "graph_extraction_and_query_engine",
      ownsBusinessData: false,
      optimaStorage: "agentic_graph_nodes/agentic_graph_edges",
      pipeline: ["detect", "extract", "build", "cluster", "analyze", "export", "serve_mcp"],
    },
  })

  const mcpGateway = await upsertAgenticGraphNode(db, principal, {
    nodeType: "capability",
    title: "MCP tool gateway",
    summary: "Gateway OAuth/MCP per esporre strumenti Optima e connector strategici agli agenti.",
    sourceType: "internal",
    sourceId: "mcp-tool-gateway",
    confidence: "manual",
    tags: ["mcp", "oauth", "tools"],
  })

  const subagentLanes = await upsertAgenticGraphNode(db, principal, {
    nodeType: "capability",
    title: "Subagent lanes",
    summary: "Profili agentici con provider, connector e permessi dichiarati per code, research, media e operations.",
    sourceType: "internal",
    sourceId: "subagent-lanes",
    confidence: "manual",
    tags: ["subagents", "providers", "policy"],
  })

  const knowhowMemory = await upsertAgenticGraphNode(db, principal, {
    nodeType: "capability",
    title: "Development know-how graph",
    summary: "Indice agentico delle skill e lezioni operative salvate nella cartella globale development/knowhow.",
    sourceType: "internal",
    sourceId: "development-knowhow-graph",
    confidence: "manual",
    tags: ["knowhow", "skills", "codex", "graphify"],
  })

  const referenceNodes = []
  for (const source of AGENTIC_REFERENCE_SOURCES) {
    referenceNodes.push(
      await upsertAgenticGraphNode(db, principal, {
        nodeType: "reference_source",
        title: source.label,
        summary: source.usefulPatterns.join("; "),
        sourceType: source.sourceType,
        sourceId: source.id,
        sourceUrl: source.url,
        confidence: "manual",
        tags: ["agentic-reference", source.id],
        properties: {
          importPolicy: source.importPolicy,
          usefulPatterns: source.usefulPatterns,
        },
      }),
    )
  }

  const notionClients = await upsertAgenticGraphNode(db, principal, {
    nodeType: "notion_database",
    title: "Notion RIG_CLIENTI RIGHELLO",
    summary: "Database clienti Righello da indicizzare in forma redatta: nome cliente, codice, tipo, stato, sorgente, assegnazioni e relazioni lavori. PII/fiscali esclusi di default.",
    sourceType: "notion_righello",
    sourceId: "notion:collection:28132473-a5fc-8035-803f-000b76e5cbf3",
    sourceUrl: "collection://28132473-a5fc-8035-803f-000b76e5cbf3",
    confidence: "manual",
    tags: ["notion", "righello", "clients", "allowlist"],
    properties: {
      databaseId: "28132473-a5fc-80ed-b121-e2d11a2a4968",
      dataSourceUrl: "collection://28132473-a5fc-8035-803f-000b76e5cbf3",
      safeFields: ["Name", "NOME ATTIVITA'", "CODICE", "TIPO", "STATO", "SORGENTE", "TIPOLOGIA LAVORI", "Comune", "RIG_WORK"],
      excludedFields: ["EMAIL", "TELEFONO", "PEC", "Partita IVA", "Codice Fiscale", "Codice Destinatario", "Contratti & Preventivi"],
    },
  })

  const notionWork = await upsertAgenticGraphNode(db, principal, {
    nodeType: "notion_database",
    title: "Notion RIG_WORK",
    summary: "Database lavori/task Righello da indicizzare in forma redatta: task, cliente, stato, tipologia, priorita, deadline, minuti e relazioni. Allegati e link OneDrive non vanno scaricati.",
    sourceType: "notion_righello",
    sourceId: "notion:collection:27f32473-a5fc-818d-8448-000b562dd5cf",
    sourceUrl: "collection://27f32473-a5fc-818d-8448-000b562dd5cf",
    confidence: "manual",
    tags: ["notion", "righello", "work", "tasks", "allowlist"],
    properties: {
      databaseId: "27f32473-a5fc-81f5-90b7-cead9baa872b",
      dataSourceUrl: "collection://27f32473-a5fc-818d-8448-000b562dd5cf",
      safeFields: ["NOME TASK", "CLIENTE", "STATO", "TIPO", "PRIORITA'", "DEADLINE", "Minutes", "DESCRIZIONE", "CLIENTI RIGHELLO"],
      excludedFields: ["EMAIL CLIENTE", "EMAIL PERSONA", "ALLEGATI", "LINK ONEDRIVE", "Attachments", "COSTI", "GUADAGNI"],
    },
  })

  const quoteConfigurator = await upsertAgenticGraphNode(db, principal, {
    nodeType: "notion_quote_configurator",
    title: "Notion configuratore preventivi Righello",
    summary: "Fonte funzionale per flusso preventivi: pacchetto o custom, servizi, dati cliente, riepilogo, PDF, dashboard amministrazione e stile.",
    sourceType: "notion_righello",
    sourceId: "notion:page:27f32473-a5fc-8130-9985-c3d4b4728bf4",
    sourceUrl: "https://app.notion.com/p/27f32473a5fc81309985c3d4b4728bf4",
    confidence: "manual",
    tags: ["notion", "righello", "quotes", "configurator", "preventivi"],
    properties: {
      safeChildPages: [
        "SCEGLI UN PACCHETTO",
        "CONFIGURA I SERVIZI",
        "DATI CLIENTE",
        "RIEPILOGO",
        "PREVENTIVO",
        "DASHBOARD AMMINISTRAZIONE",
        "STILE",
      ],
      serviceAreas: ["sito web", "gestione annuale", "piano comunicazione", "foto e video", "seo", "advertising", "crm/sige", "extra"],
      importPolicy: "functional_spec_and_redacted_pricing_patterns_only",
    },
  })

  const quoteHistoricalPatterns = await upsertAgenticGraphNode(db, principal, {
    nodeType: "notion_quote_patterns",
    title: "Notion preventivi storici Righello",
    summary: "Pattern commerciali reali da usare come memoria redatta per migliorare precisione preventivi: sito base/Webflow, WhatsApp/API/AI annuale, Portopiccolo sito/front-end/back-end Guesty, task PREVENTIVO in RIG_WORK.",
    sourceType: "notion_righello",
    sourceId: "notion:rig_work:quote-patterns",
    sourceUrl: "collection://27f32473-a5fc-818d-8448-000b562dd5cf",
    confidence: "manual",
    tags: ["notion", "righello", "quotes", "pricing-patterns", "preventivi"],
    properties: {
      examples: [
        "CONTABILIZZARE TUBARO SITO: sito base, inserimento annunci, Webflow, pagamenti parziali",
        "PREVENTIVO WHATSAPP: opzioni annuali 18-22k, 10.5k/11.7k, 38.7k premium",
        "Portopiccolo Apartments front-end 5 pagine: 3.795 euro + IVA, booking esterno escluso",
        "Portopiccolo Apartments back-end + Guesty: 5.000 euro + IVA standard, 5.500 euro + IVA accelerata",
      ],
      excludedFields: ["EMAIL CLIENTE", "EMAIL PERSONA", "ALLEGATI", "LINK ONEDRIVE", "Attachments", "credenziali", "accessi"],
      importPolicy: "redacted_title_macroservice_range_status_only",
    },
  })

  const hermesPatternNodes = []
  for (const pattern of HERMES_ADAPTER_PATTERNS) {
    hermesPatternNodes.push(
      await upsertAgenticGraphNode(db, principal, {
        nodeType: "hermes_pattern",
        title: `Hermes pattern: ${pattern.label}`,
        summary: pattern.implementation,
        sourceType: "open_source_reference",
        sourceId: `hermes-pattern:${pattern.id}`,
        sourceUrl: HERMES_REFERENCE.repository,
        confidence: pattern.status === "implemented" ? "manual" : "inferred",
        tags: ["hermes", "adapter-pattern", pattern.lane, pattern.status],
        properties: {
          hermesRevision: HERMES_REFERENCE.auditedRevision,
          hermesFiles: pattern.hermesFiles,
          optimaSurface: pattern.optimaSurface,
          guardrails: pattern.guardrails,
          status: pattern.status,
        },
      }),
    )
  }

  const edgeInputs = [
    [optima?.id, graphMemory?.id, "has_capability", "manual"],
    [graphMemory?.id, graphEngine?.id, "uses_graph_engine", "manual"],
    [optima?.id, mcpGateway?.id, "has_capability", "manual"],
    [optima?.id, subagentLanes?.id, "has_capability", "manual"],
    [optima?.id, knowhowMemory?.id, "has_capability", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "codex-development-knowhow")?.id, knowhowMemory?.id, "feeds_knowledge", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "codex-development-knowhow")?.id, graphMemory?.id, "informs_pattern", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "hermes-agent")?.id, subagentLanes?.id, "absorbed_into_optima_pattern", "inferred"],
    [referenceNodes.find((node) => node?.sourceId === "hermes-agent")?.id, mcpGateway?.id, "absorbed_into_optima_pattern", "inferred"],
    [referenceNodes.find((node) => node?.sourceId === "hermes-righello-readonly")?.id, graphMemory?.id, "can_feed_knowledge", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "notion-righello-readonly")?.id, graphMemory?.id, "can_feed_business_graph", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "notion-righello-readonly")?.id, notionClients?.id, "allowlists_database", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "notion-righello-readonly")?.id, notionWork?.id, "allowlists_database", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "notion-righello-readonly")?.id, quoteConfigurator?.id, "allowlists_quote_source", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "notion-righello-readonly")?.id, quoteHistoricalPatterns?.id, "allowlists_quote_source", "manual"],
    [notionClients?.id, graphMemory?.id, "feeds_client_graph", "manual"],
    [notionWork?.id, graphMemory?.id, "feeds_task_graph", "manual"],
    [quoteConfigurator?.id, graphMemory?.id, "feeds_quote_workflow", "manual"],
    [quoteHistoricalPatterns?.id, graphMemory?.id, "feeds_quote_pricing_memory", "manual"],
    [notionWork?.id, quoteHistoricalPatterns?.id, "contains_quote_tasks", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "graphify")?.id, graphEngine?.id, "documents_engine_pattern", "manual"],
    [referenceNodes.find((node) => node?.sourceId === "graphify")?.id, graphMemory?.id, "informs_graph_schema", "inferred"],
    [referenceNodes.find((node) => node?.sourceId === "perplexity-computer-pattern")?.id, optima?.id, "informs_ux_pattern", "inferred"],
  ] as const

  for (const [fromNodeId, toNodeId, edgeType, confidence] of edgeInputs) {
    if (!fromNodeId || !toNodeId) continue
    await upsertAgenticGraphEdge(db, principal, {
      fromNodeId,
      toNodeId,
      edgeType,
      confidence,
      properties: { seededBy: "seedAgenticReferenceGraph" },
    })
  }

  const hermesReferenceNode = referenceNodes.find((node) => node?.sourceId === "hermes-agent")
  const targetByLane: Record<string, string | undefined> = {
    memory: graphMemory?.id,
    skills: knowhowMemory?.id,
    mcp: mcpGateway?.id,
    "provider-routing": subagentLanes?.id,
    messaging: mcpGateway?.id,
    scheduler: optima?.id,
    subagents: subagentLanes?.id,
    runtime: optima?.id,
  }

  for (const node of hermesPatternNodes) {
    if (!node) continue
    if (hermesReferenceNode?.id) {
      await upsertAgenticGraphEdge(db, principal, {
        fromNodeId: hermesReferenceNode.id,
        toNodeId: node.id,
        edgeType: "documents_adapter_pattern",
        confidence: "manual",
        properties: { seededBy: "seedAgenticReferenceGraph", hermesRevision: HERMES_REFERENCE.auditedRevision },
      })
    }

    const lane = Array.isArray(node.tags) ? node.tags.find((tag) => targetByLane[tag]) : null
    const targetId = lane ? targetByLane[lane] : optima?.id
    if (targetId) {
      await upsertAgenticGraphEdge(db, principal, {
        fromNodeId: node.id,
        toNodeId: targetId,
        edgeType: "maps_to_optima_surface",
        confidence: "inferred",
        properties: { seededBy: "seedAgenticReferenceGraph", hermesRevision: HERMES_REFERENCE.auditedRevision },
      })
    }
  }

  return getAgenticGraphSnapshot(db, principal)
}

export async function getAgenticGraphSnapshot(
  db: any,
  principal: WorkspacePrincipal,
): Promise<AgenticGraphSnapshot> {
  const [nodes, edges, sessions, nodeCountRows, edgeCountRows, sessionCountRows, typeRows] = await Promise.all([
    listAgenticGraphNodes(db, principal, { limit: 300 }),
    listAgenticGraphEdges(db, principal, { limit: 900 }),
    listAgenticGraphSessions(db, principal, 20),
    safeAll(db, `SELECT COUNT(*) AS count FROM agentic_graph_nodes WHERE organization_id = ?`, [principal.organizationId]),
    safeAll(db, `SELECT COUNT(*) AS count FROM agentic_graph_edges WHERE organization_id = ?`, [principal.organizationId]),
    safeAll(db, `SELECT COUNT(*) AS count FROM agentic_graph_sessions WHERE organization_id = ?`, [principal.organizationId]),
    safeAll(
      db,
      `SELECT node_type, COUNT(*) AS count
       FROM agentic_graph_nodes
       WHERE organization_id = ?
       GROUP BY node_type`,
      [principal.organizationId],
    ),
  ])

  const byType = typeRows.reduce<Record<string, number>>((acc, row) => {
    acc[String(row.node_type)] = Number(row.count || 0)
    return acc
  }, {})

  return {
    nodes,
    edges,
    sessions,
    stats: {
      nodes: Number(nodeCountRows[0]?.count || nodes.length),
      edges: Number(edgeCountRows[0]?.count || edges.length),
      sessions: Number(sessionCountRows[0]?.count || sessions.length),
      byType,
    },
    referenceSources: AGENTIC_REFERENCE_SOURCES,
  }
}

export function formatAgenticGraphSnapshot(snapshot: AgenticGraphSnapshot) {
  const typeLines = Object.entries(snapshot.stats.byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `- ${type}: ${count}`)

  const nodeLines = snapshot.nodes.slice(0, 12).map((node) => {
    const source = node.sourceUrl ? ` | fonte ${node.sourceUrl}` : ""
    return `- ${node.title} [${node.nodeType}/${node.confidence}]${source}`
  })

  const sourceLines = snapshot.referenceSources.map((source) => {
    return `- ${source.label}: ${source.importPolicy}${source.url ? ` (${source.url})` : ""}`
  })

  return [
    "# Optima Agentic Graph Memory",
    "",
    `Nodi: ${snapshot.stats.nodes}`,
    `Archi: ${snapshot.stats.edges}`,
    `Sessioni agentiche: ${snapshot.stats.sessions}`,
    "",
    "## Tipi nodo",
    ...(typeLines.length ? typeLines : ["- nessun nodo ancora indicizzato"]),
    "",
    "## Nodi recenti",
    ...(nodeLines.length ? nodeLines : ["- nessun nodo ancora indicizzato"]),
    "",
    "## Sorgenti/Pattern",
    ...sourceLines,
  ].join("\n")
}
