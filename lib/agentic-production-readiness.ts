export type AgenticReadinessStatus = "ready" | "partial" | "blocked" | "missing"
export type AgenticReadinessSeverity = "critical" | "high" | "medium" | "low"

export interface AgenticReadinessRuntimeInput {
  coreReady?: boolean
  agenticReady?: boolean
  runnerEnabled?: boolean
  runnerStatus?: string
  latestRunnerSeenAt?: string | null
  mcpAuthMode?: string
  mcpAuthorizationConfigured?: boolean
  mcpOAuthAuthorizationCodeConfigured?: boolean
  mcpJwtBearerConfigured?: boolean
  mcpServiceTokenConfigured?: boolean
  graphNodes?: number
  graphEdges?: number
  graphSessions?: number
  providerConfiguredCount?: number
  providerTotalCount?: number
  connectorConfiguredCount?: number
  connectorTotalCount?: number
  subagentCount?: number
  hostedRuntimeReadyCount?: number
  hostedRuntimeTotalCount?: number
}

export interface AgenticProductionGap {
  id: string
  area: string
  label: string
  status: AgenticReadinessStatus
  severity: AgenticReadinessSeverity
  current: string
  target: string
  nextActions: string[]
  jobHint?: {
    title: string
    brief: string
  }
}

export interface AgenticProductionReadinessSnapshot {
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
  metrics: AgenticReadinessRuntimeInput
  gaps: AgenticProductionGap[]
}

function countStatus(gaps: AgenticProductionGap[], status: AgenticReadinessStatus) {
  return gaps.filter((gap) => gap.status === status).length
}

function scoreFromGaps(gaps: AgenticProductionGap[]) {
  if (!gaps.length) return 0
  const weights: Record<AgenticReadinessStatus, number> = {
    ready: 1,
    partial: 0.55,
    blocked: 0.2,
    missing: 0,
  }
  const total = gaps.reduce((sum, gap) => sum + weights[gap.status], 0)
  return Math.round((total / gaps.length) * 100)
}

function firstAction(gaps: AgenticProductionGap[]) {
  const priority: Record<AgenticReadinessSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }
  const gap = [...gaps]
    .filter((item) => item.status !== "ready")
    .sort((a, b) => priority[a.severity] - priority[b.severity])[0]
  return gap?.nextActions[0] ?? "Mantenere monitoraggio runner, MCP e grafo."
}

export function buildAgenticProductionReadinessSnapshot(
  input: AgenticReadinessRuntimeInput = {},
): AgenticProductionReadinessSnapshot {
  const providerConfiguredCount = input.providerConfiguredCount ?? 0
  const providerTotalCount = input.providerTotalCount ?? 0
  const connectorConfiguredCount = input.connectorConfiguredCount ?? 0
  const connectorTotalCount = input.connectorTotalCount ?? 0
  const hostedRuntimeReadyCount = input.hostedRuntimeReadyCount ?? 0
  const hostedRuntimeTotalCount = input.hostedRuntimeTotalCount ?? 0
  const graphNodes = input.graphNodes ?? 0
  const graphEdges = input.graphEdges ?? 0
  const subagentCount = input.subagentCount ?? 0

  const mcpStatus: AgenticReadinessStatus = input.mcpOAuthAuthorizationCodeConfigured
    ? "ready"
    : input.mcpAuthorizationConfigured
      ? "partial"
      : "missing"
  const connectorStatus: AgenticReadinessStatus =
    connectorTotalCount > 0 && connectorConfiguredCount >= connectorTotalCount
      ? "ready"
      : connectorConfiguredCount > 0
        ? "partial"
        : "missing"

  const gaps: AgenticProductionGap[] = [
    {
      id: "mcp-auth-install",
      area: "MCP/OAuth",
      label: "Autorizzazione MCP e installazioni",
      status: mcpStatus,
      severity: mcpStatus === "missing" ? "critical" : mcpStatus === "partial" ? "high" : "low",
      current: input.mcpAuthMode
        ? `Modo attivo: ${input.mcpAuthMode}. Service token e' sufficiente per server-to-server, ma non e' ancora un flusso OAuth utente completo.`
        : "Nessuna modalita MCP rilevata.",
      target: "Authorization Code + PKCE per installazioni utente, JWT/service token per runtime interni e secret_ref per tenant.",
      nextActions: [
        "Completare schermata di installazione OAuth per connector esterni e client MCP utente.",
        "Aggiungere health check per token endpoint, scopes e principal risolto.",
        "Mostrare per ogni tenant quali connector sono installati e quali richiedono intervento.",
      ],
      jobHint: {
        title: "Completa installazioni OAuth MCP Optima",
        brief: "Implementa flusso guidato OAuth/PKCE per connector MCP esterni, mantenendo service token solo per automazioni server-to-server.",
      },
    },
    {
      id: "notion-import",
      area: "Knowledge Graph",
      label: "Import dati Notion Righello",
      status: "partial",
      severity: "medium",
      current:
        "Il canale SQL Notion non e' affidabile in questa installazione, ma Optima ha gia' un percorso operativo con search/fetch, import D1 redatto e nodi grafo verificabili.",
      target: "Importer Optima-side idempotente, allowlistato e redatto per clienti, lavori, preventivi, call e case study, con dry-run e report scarti.",
      nextActions: [
        "Sostituire il fallback manuale con un importer Optima-side su Notion OAuth/API token o connector corretto quando disponibile.",
        "Importare solo indice operativo: clienti, lavori, preventivi, relazioni e source_id; niente credenziali o allegati pesanti.",
        "Collegare l'import al grafo con confidence extracted/inferred/ambiguous.",
      ],
      jobHint: {
        title: "Import Notion Righello redatto nel grafo Optima",
        brief: "Crea importer Notion allowlist-only per clienti, lavori e preventivi, con dry-run, no PII inutile e nessun allegato scaricato in locale.",
      },
    },
    {
      id: "connector-health",
      area: "MCP Connector",
      label: "Connector strategici operativi",
      status: connectorStatus,
      severity: connectorStatus === "ready" ? "low" : "high",
      current: `${connectorConfiguredCount}/${connectorTotalCount} connector prioritari hanno una configurazione tenant non vuota.`,
      target: "GitHub, Notion, Cloudflare, SendGrid, Telegram, Cloudinary, Hostinger e Codex con setup, scopes, health check e retry visibili.",
      nextActions: [
        "Trasformare i job setup in installazioni guidate con test reale per connector.",
        "Mostrare stato per tenant: non configurato, policy salvata, env rilevata, errore.",
        "Impedire azioni distruttive o deploy senza review umana.",
      ],
    },
    {
      id: "provider-runtime",
      area: "AI Runtime",
      label: "Provider AI e modelli hosted",
      status:
        hostedRuntimeTotalCount > 0 && hostedRuntimeReadyCount > 0
          ? providerConfiguredCount > 0
            ? "partial"
            : "missing"
          : "missing",
      severity: "high",
      current: `${hostedRuntimeReadyCount}/${hostedRuntimeTotalCount} runtime hosted pronti; ${providerConfiguredCount}/${providerTotalCount} provider configurati.`,
      target: "Route tenant per Codex, OpenAI, Qwen, Gemma hosted e MiniMax, con health check e fallback espliciti.",
      nextActions: [
        "Aggiungere adapter OpenAI-compatible per Qwen/Gemma/Minimax dove possibile.",
        "Salvare route tenant e fallback per lane code, chat, research, media e operations.",
        "Mostrare l'ultimo health check del modello prima di usarlo in chat o job.",
      ],
    },
    {
      id: "subagent-runtime",
      area: "Subagenti",
      label: "Subagenti e handoff",
      status: subagentCount >= 4 ? "partial" : subagentCount > 0 ? "partial" : "missing",
      severity: subagentCount > 0 ? "medium" : "high",
      current: `${subagentCount} subagenti tenant configurati.`,
      target: "Codex Engineer, Research Analyst, Media Operator e Office Ops con allowlist tool, memoria e handoff verificabili.",
      nextActions: [
        "Persistenza policy per subagente con connector concessi e azioni bloccate.",
        "Handoff tracciato tra Codex e MiniMax/Cloudinary per asset media.",
        "Audit log per ogni tool call agente rilevante.",
      ],
    },
    {
      id: "graph-memory",
      area: "Graph Memory",
      label: "Grafo aziendale operativo",
      status: graphNodes > 120 && graphEdges > 100 ? "partial" : graphNodes > 0 ? "partial" : "missing",
      severity: graphNodes > 0 ? "medium" : "high",
      current: `${graphNodes} nodi, ${graphEdges} archi, ${input.graphSessions ?? 0} sessioni.`,
      target: "Graphify-style knowledge graph con nodi business, sorgenti, confidence, relazioni revisionabili e viste dinamiche per area.",
      nextActions: [
        "Completare import Notion/Hermes read-only e know-how globale con deduplica.",
        "Aggiungere dettaglio nodo con azioni: crea task, collega cliente, collega repository, crea job.",
        "Aggiungere ricerca semantica e ranking per centralita, freshness e confidence.",
      ],
    },
    {
      id: "vps-observability",
      area: "VPS Runner",
      label: "Runner e osservabilita VPS",
      status: input.runnerEnabled ? "partial" : "blocked",
      severity: input.runnerEnabled ? "medium" : "critical",
      current: `Runner ${input.runnerStatus ?? "unknown"}; ultimo heartbeat ${input.latestRunnerSeenAt ?? "non disponibile"}.`,
      target: "Heartbeat, disk, RAM, job workspace e claim guard visibili senza toccare servizi Hermes o dati di terzi.",
      nextActions: [
        "Aggiungere health VPS a Optima: spazio, RAM, runner workspace, stale job e ultimo errore.",
        "Tenere AGENT_RUNNER_ENABLED come guardrail: senza true il runner non reclama job.",
        "Confinare scritture del runner in /srv/optima-agent.",
      ],
    },
    {
      id: "quote-operating-system",
      area: "Preventivi",
      label: "Preventivi Righello data-driven",
      status: "partial",
      severity: "high",
      current: "Prompt e modello operativo Righello sono arricchiti da pattern Notion redatti, ma il configuratore non e' ancora un workflow fully data-driven.",
      target: "Preventivi basati su servizi Righello, benchmark storici, domande discovery, margini, allegati e generazione PDF robusta mobile.",
      nextActions: [
        "Rimodellare catalogo servizi e prezzi dal know-how/preventivi storici.",
        "Rendere il flusso mobile senza blocchi di scroll e con stato generazione chiaro.",
        "Salvare preventivo, revisioni e sorgenti nel grafo cliente/progetto.",
      ],
    },
    {
      id: "team-client-access",
      area: "Access Control",
      label: "Accesso clienti per team",
      status: "missing",
      severity: "high",
      current: "La gestione team non espone ancora assegnazioni cliente per dipendente con policy chiara.",
      target: "Accesso a clienti per ruolo e assegnazioni: direzione tutto, dipendenti solo clienti assegnati salvo override.",
      nextActions: [
        "Aggiungere tabella member_client_assignments o policy equivalente.",
        "Filtrare clienti, task, chat e grafo in base al ruolo/assegnazione.",
        "Aggiungere UI team per assegnare clienti e audit.",
      ],
    },
    {
      id: "report-review",
      area: "Rapportini",
      label: "Review rapportini responsabili",
      status: "partial",
      severity: "medium",
      current: "Esistono stati review/submit e tool MCP, ma manca una review room completa e dedicata per responsabili.",
      target: "Schermata responsabili con rapportini inviati, task del giorno, anomalie, note e mail amministrazione.",
      nextActions: [
        "Rendere la coda rapportini revisionabile da UI dedicata.",
        "Inviare riepilogo ordinato a amministrazione@wearerighello.com quando invia un non-direzione.",
        "Mostrare differenze tra giornata prevista, task e ore consuntivate.",
      ],
    },
  ]

  const readyCount = countStatus(gaps, "ready")
  const partialCount = countStatus(gaps, "partial")
  const blockedCount = countStatus(gaps, "blocked")
  const missingCount = countStatus(gaps, "missing")
  const score = scoreFromGaps(gaps)
  const agenticReady = Boolean(input.agenticReady)

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      coreReady: Boolean(input.coreReady),
      agenticReady,
      readyCount,
      partialCount,
      blockedCount,
      missingCount,
      score,
      headline: agenticReady
        ? "Base agentica accesa: ora mancano installazioni guidate, import dati e workflow completi."
        : "Base agentica non ancora pronta: completare i blocchi critici prima di affidarle lavoro produttivo.",
      nextCriticalAction: firstAction(gaps),
    },
    metrics: input,
    gaps,
  }
}

export function formatAgenticProductionReadiness(snapshot: AgenticProductionReadinessSnapshot) {
  return [
    "# Optima Agentic Production Readiness",
    "",
    `- coreReady: ${snapshot.summary.coreReady}`,
    `- agenticReady: ${snapshot.summary.agenticReady}`,
    `- score: ${snapshot.summary.score}/100`,
    `- gap: ${snapshot.summary.readyCount} ready, ${snapshot.summary.partialCount} parziali, ${snapshot.summary.blockedCount} bloccati, ${snapshot.summary.missingCount} mancanti`,
    `- prossima azione: ${snapshot.summary.nextCriticalAction}`,
    "",
    ...snapshot.gaps.map((gap) =>
      [
        `## ${gap.label}`,
        `- area: ${gap.area}`,
        `- stato: ${gap.status}`,
        `- severita: ${gap.severity}`,
        `- situazione: ${gap.current}`,
        `- target: ${gap.target}`,
        ...gap.nextActions.map((action) => `- next: ${action}`),
      ].join("\n"),
    ),
  ].join("\n\n")
}
