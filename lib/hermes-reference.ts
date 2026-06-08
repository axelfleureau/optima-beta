export const HERMES_REFERENCE = {
  id: "hermes-agent",
  label: "Hermes-derived agentic core",
  repository: "https://github.com/NousResearch/hermes-agent",
  localClone: "/Users/axel/Documents/Codex/reference-sources/hermes-agent",
  auditedRevision: "ab0a6270c",
  auditedTag: "v2026.6.5-208-gab0a6270c",
  license: "MIT",
  importPolicy:
    "Reference-only pattern import: Hermes is not an external connector to install. Optima absorbs compatible MIT patterns as TypeScript-native capabilities. Do not vendor the Python runtime, desktop app, secrets, or the active Hermes VPS service.",
  integrationRule:
    "Hermes is a source blueprint, not a linked service. Optima becomes the enterprise agentic OS: tenant scope, permissions, graph memory, jobs, audit, review and deploy approval stay in Optima while the useful Hermes patterns are reimplemented inside Optima.",
} as const

export type HermesAdapterLane =
  | "memory"
  | "skills"
  | "mcp"
  | "provider-routing"
  | "messaging"
  | "scheduler"
  | "subagents"
  | "runtime"

export type HermesAdapterStatus = "implemented" | "partial" | "planned" | "blocked"

export interface HermesAdapterPattern {
  id: string
  lane: HermesAdapterLane
  label: string
  status: HermesAdapterStatus
  hermesFiles: string[]
  optimaSurface: string[]
  implementation: string
  guardrails: string[]
}

export const HERMES_ADAPTER_PATTERNS: HermesAdapterPattern[] = [
  {
    id: "persistent-memory",
    lane: "memory",
    label: "Persistent memory + session search",
    status: "partial",
    hermesFiles: [
      "website/docs/user-guide/features/memory.md",
      "agent/memory_manager.py",
      "tools/memory_tool.py",
      "tests/agent/test_memory_session_switch.py",
    ],
    optimaSurface: ["assistant_memories", "chat_sessions", "chat_messages", "agentic_graph_nodes"],
    implementation:
      "Optima already stores conversation memory and graph nodes. Next step is bounded memory budgets per member/org, graph-backed session search and explicit memory consolidation actions.",
    guardrails: [
      "Never store raw secrets or full sensitive transcript dumps.",
      "Keep memory tenant-scoped and role-scoped.",
      "Differentiate durable business facts from session ephemera.",
    ],
  },
  {
    id: "skills-loop",
    lane: "skills",
    label: "Skills and know-how loop",
    status: "partial",
    hermesFiles: [
      "website/docs/user-guide/features/skills.md",
      "agent/skill_commands.py",
      "tools/skills_tool.py",
      "tools/skill_manager_tool.py",
    ],
    optimaSurface: ["development/knowhow", "scripts/sync-development-knowhow-graph.mjs", "agentic_graph_nodes"],
    implementation:
      "Optima indexes the global Codex know-how folder as graph nodes. Next step is skill discovery, skill usage audit and agent-suggested skill updates routed through review.",
    guardrails: [
      "Keep reusable lessons short and verifiable.",
      "Review generated skill edits before making them global.",
      "Do not mix project-private data into shared skills.",
    ],
  },
  {
    id: "mcp-oauth-catalog",
    lane: "mcp",
    label: "MCP catalog with OAuth/secret install states",
    status: "partial",
    hermesFiles: [
      "website/docs/user-guide/features/mcp.md",
      "hermes_cli/mcp_catalog.py",
      "tools/mcp_tool.py",
      "tools/mcp_oauth_manager.py",
    ],
    optimaSurface: ["/mcp", "mcp_connector_installations", "lib/mcp-connectors.ts"],
    implementation:
      "Optima exposes MCP tools/resources and connector installation state. Next step is guided install flows with per-connector health checks and tool allowlists.",
    guardrails: [
      "Never persist OAuth tokens in D1.",
      "Use PKCE/state and minimum scopes.",
      "Expose only allowlisted tools to subagents.",
    ],
  },
  {
    id: "provider-routing",
    lane: "provider-routing",
    label: "Model provider routing",
    status: "partial",
    hermesFiles: [
      "website/docs/developer-guide/model-provider-plugin.md",
      "providers/base.py",
      "providers/__init__.py",
      "hermes_cli/runtime_provider.py",
    ],
    optimaSurface: ["agentic_provider_installations", "agentic_model_routes", "lib/agentic-capabilities.ts"],
    implementation:
      "Optima has lanes for code, research, media, operations and chat. Next step is runtime health probes and provider-specific OpenAI-compatible adapters for Qwen, Gemma and MiniMax.",
    guardrails: [
      "Provider selection must honor tenant data policy.",
      "Use fallback routes rather than silent model substitution.",
      "Log provider/model attribution for audit.",
    ],
  },
  {
    id: "telegram-gateway",
    lane: "messaging",
    label: "Telegram operational gateway",
    status: "partial",
    hermesFiles: [
      "website/docs/user-guide/messaging/telegram.md",
      "gateway/platforms/telegram.py",
      "gateway/session.py",
      "gateway/stream_consumer.py",
    ],
    optimaSurface: ["/api/ai/telegram", "/ai-assistant", "chat_sessions", "agent_jobs"],
    implementation:
      "Optima has an AI Assistant and Telegram connector spec. Next step is webhook delivery with authorized user mapping, async replies and job creation from chat.",
    guardrails: [
      "Do not accept commands from unknown Telegram users.",
      "Group messages are context, not instructions, unless explicitly addressed.",
      "High-risk actions become reviewable Optima jobs.",
    ],
  },
  {
    id: "scheduler-cron",
    lane: "scheduler",
    label: "Scheduled automations",
    status: "planned",
    hermesFiles: [
      "README.md",
      "website/docs/user-guide/features/cron.md",
      "tests/cron/test_scheduler_mcp_init.py",
    ],
    optimaSurface: ["agent_jobs", "Cloudflare Cron", "work_days", "notifications"],
    implementation:
      "Optima should schedule recurring audits, digest emails, graph sync and runner health checks as visible jobs with review/audit.",
    guardrails: [
      "Cron jobs must be visible and cancellable.",
      "Automations must not mutate client-facing state without policy.",
      "Failures should notify responsible roles.",
    ],
  },
  {
    id: "subagent-handoff",
    lane: "subagents",
    label: "Subagents and handoff policies",
    status: "partial",
    hermesFiles: [
      "README.md",
      "tools/todo_tool.py",
      "hermes_cli/kanban_swarm.py",
      "tests/gateway/test_subagent_protection_30170.py",
    ],
    optimaSurface: ["agent_subagents", "agentic_graph_sessions", "agent_jobs"],
    implementation:
      "Optima supports subagent rosters. Next step is traceable handoff events, connector allowlists and lane-specific memory scopes.",
    guardrails: [
      "Subagents cannot receive all connectors by default.",
      "Handoff must preserve task/job trace.",
      "Human approval gates irreversible actions.",
    ],
  },
  {
    id: "managed-runtime",
    lane: "runtime",
    label: "Managed VPS/cloud runtime",
    status: "implemented",
    hermesFiles: [
      "README.md",
      "gateway/run.py",
      "hermes_cli/gateway.py",
      "website/docs/user-guide/docker.md",
    ],
    optimaSurface: ["runner/optima-agent-runner.mjs", "agent_runner_heartbeats", "/agenti"],
    implementation:
      "Optima runs a polling VPS runner with heartbeat, host metrics, R2 artifacts and review states. It does not expose runner ports publicly.",
    guardrails: [
      "Runner writes only inside its work root.",
      "Heartbeat must distinguish offline, stale, suspended and healthy.",
      "Deploy/commit/push remain explicit and audited.",
    ],
  },
]

export function getHermesBlueprint() {
  const byStatus = HERMES_ADAPTER_PATTERNS.reduce<Record<string, number>>((acc, pattern) => {
    acc[pattern.status] = (acc[pattern.status] || 0) + 1
    return acc
  }, {})

  return {
    reference: HERMES_REFERENCE,
    patterns: HERMES_ADAPTER_PATTERNS,
    stats: {
      total: HERMES_ADAPTER_PATTERNS.length,
      byStatus,
      implementedOrPartial: HERMES_ADAPTER_PATTERNS.filter((pattern) => pattern.status === "implemented" || pattern.status === "partial").length,
    },
  }
}

export function formatHermesBlueprint() {
  const blueprint = getHermesBlueprint()
  return [
    "# Optima fused agentic core blueprint",
    "",
    `Repository: ${blueprint.reference.repository}`,
    `Revision auditata: ${blueprint.reference.auditedRevision} (${blueprint.reference.auditedTag})`,
    `Licenza: ${blueprint.reference.license}`,
    `Policy: ${blueprint.reference.importPolicy}`,
    "",
    "## Regola di fusione",
    blueprint.reference.integrationRule,
    "",
    "## Pattern importabili",
    ...blueprint.patterns.map((pattern) =>
      [
        `### ${pattern.label}`,
        `- lane: ${pattern.lane}`,
        `- stato: ${pattern.status}`,
        `- Hermes: ${pattern.hermesFiles.join(", ")}`,
        `- Optima: ${pattern.optimaSurface.join(", ")}`,
        `- implementazione: ${pattern.implementation}`,
        `- guardrail: ${pattern.guardrails.join("; ")}`,
      ].join("\n"),
    ),
  ].join("\n")
}
