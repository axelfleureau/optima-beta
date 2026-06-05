import { AGENT_ADMIN_ROLES, createAgentJob } from "@/lib/agent-jobs"
import { createId } from "@/lib/cloudflare-db"
import {
  buildOperationalContextSnapshot,
  inferRepositoryForAgentJob,
  safeAll,
} from "@/lib/operational-context"
import {
  canUseManagerMcpTools,
  mcpResourceUrl,
  requireMcpPrincipal,
} from "@/lib/mcp-auth"

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
  ]
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
      ],
    })
  }

  if (method === "resources/read") {
    if (params?.uri !== "optima://context/snapshot") {
      return jsonRpcError(id, -32602, "Risorsa MCP non supportata.")
    }
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
