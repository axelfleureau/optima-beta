export type StrategicMcpConnectorStatus = "enabled" | "partial" | "missing" | "external"

export type StrategicMcpConnector = {
  id: string
  label: string
  status: StrategicMcpConnectorStatus
  category: "ai" | "code" | "cloud" | "media" | "email" | "hosting" | "messaging"
  purpose: string
  graphUse: string[]
  requiredEnv: string[]
  optionalEnv?: string[]
  notes: string
}

type ConnectorSpec = Omit<StrategicMcpConnector, "status"> & {
  mode?: "env" | "external"
}

const CONNECTORS: ConnectorSpec[] = [
  {
    id: "sendgrid",
    label: "SendGrid",
    category: "email",
    purpose: "Email transazionali, riepiloghi rapportini, inviti team e notifiche operative.",
    graphUse: ["rapportini", "team", "clienti", "task", "notifiche"],
    requiredEnv: ["SENDGRID_API_KEY"],
    optionalEnv: ["SENDGRID_FROM_EMAIL", "SENDGRID_FROM_NAME"],
    notes: "Usato da Optima per invii ordinati e tracciabili, non come canale generico non governato.",
  },
  {
    id: "telegram",
    label: "Telegram",
    category: "messaging",
    purpose: "Canale conversazionale Optima: riceve indicazioni operative e risponde usando AI Assistant, memoria e grafo aziendale.",
    graphUse: ["conversazioni", "assistant_memories", "task", "clienti", "agent_jobs", "audit"],
    requiredEnv: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_DEFAULT_MEMBER_EMAIL"],
    optionalEnv: ["TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_ALLOWED_CHAT_IDS", "TELEGRAM_ALLOWED_USERNAMES", "TELEGRAM_MEMBER_EMAIL_MAP"],
    notes: "Il bot non bypassa Optima: ogni messaggio viene associato a un membro autorizzato e salvato nella cronologia AI Assistant.",
  },
  {
    id: "codex",
    label: "Codex Runner",
    category: "ai",
    purpose: "Esecuzione agentica controllata su VPS: patch, report, PR, analisi e task update.",
    graphUse: ["agent_jobs", "repository_links", "task", "progetti", "review"],
    requiredEnv: ["AGENT_RUNNER_API_KEY", "AGENT_RUNNER_ENABLED"],
    optionalEnv: ["OPENAI_API_KEY", "OPENAI_FALLBACK_API_KEY"],
    notes: "Il runner deve fare polling verso Optima. I risultati tornano in review prima di diventare operativi.",
  },
  {
    id: "cloudinary",
    label: "Cloudinary",
    category: "media",
    purpose: "Gestione asset visuali, trasformazioni immagini/video e libreria media collegata ai clienti.",
    graphUse: ["clienti", "campagne", "task", "allegati", "preventivi"],
    requiredEnv: ["CLOUDINARY_URL"],
    optionalEnv: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY"],
    notes: "Da usare come nodo media del grafo, con asset collegati a clienti, campagne e deliverable.",
  },
  {
    id: "github",
    label: "GitHub",
    category: "code",
    purpose: "Repository, branch, pull request, commit, audit tecnico e collegamento codice-progetto.",
    graphUse: ["repository_links", "agent_jobs", "progetti", "task", "audit"],
    requiredEnv: ["GITHUB_TOKEN"],
    optionalEnv: ["GITHUB_APP_ID", "GITHUB_INSTALLATION_ID"],
    notes: "GitHub non e il centro del gestionale: e il grafo codice collegato al grafo aziendale.",
  },
  {
    id: "notion",
    label: "Notion",
    category: "cloud",
    purpose: "Knowledge base e database storici Righello: clienti, lavori, task, portali e documenti operativi da indicizzare in Optima.",
    graphUse: ["clienti", "task", "progetti", "knowledge_base", "notion_pages", "notion_databases"],
    requiredEnv: ["NOTION_API_KEY"],
    optionalEnv: ["NOTION_RIGHELLO_CLIENTS_SOURCE", "NOTION_RIGHELLO_WORK_SOURCE", "NOTION_IMPORT_ALLOWLIST"],
    notes: "Import solo da allowlist: RIG_CLIENTI e RIG_WORK prima di tutto. Escludere sempre credenziali, accessi, token, file segreti e dump integrali.",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    category: "cloud",
    purpose: "Runtime Optima, D1, R2, Workers, secret, cron, deploy e osservabilita.",
    graphUse: ["runtime", "database", "artifacts", "agent_jobs", "health"],
    requiredEnv: ["APP_ENV"],
    optionalEnv: ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"],
    notes: "Cloudflare e il piano operativo applicativo: deploy e dati devono restare verificabili.",
  },
  {
    id: "vercel",
    label: "Vercel",
    category: "cloud",
    purpose: "Deploy e diagnostica per progetti web che restano o nascono su Vercel.",
    graphUse: ["clienti", "progetti", "deploy", "audit", "task"],
    requiredEnv: ["VERCEL_TOKEN"],
    optionalEnv: ["VERCEL_PROJECT_ID", "VERCEL_TEAM_ID", "VERCEL_URL"],
    notes: "Resta un connettore importante per progetti clienti e diagnostica, anche se Optima gira su Cloudflare.",
  },
  {
    id: "hostinger",
    label: "Hostinger VPS",
    category: "hosting",
    purpose: "VPS gestito per runner persistente e servizi che devono restare svegli senza pagina browser aperta.",
    graphUse: ["agent_jobs", "runner", "servizi", "health", "deploy"],
    requiredEnv: ["HOSTINGER_API_TOKEN"],
    optionalEnv: ["OPTIMA_VPS_TAILSCALE_HOST", "OPTIMA_VPS_TAILSCALE_IP"],
    notes: "Il VPS deve essere osservabile e gestito via servizio, non tramite sessione browser fragile.",
  },
]

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim())
}

function connectorStatus(connector: ConnectorSpec): StrategicMcpConnectorStatus {
  if (connector.mode === "external") return "external"
  const present = connector.requiredEnv.filter(hasEnv)
  if (present.length === connector.requiredEnv.length) return "enabled"
  if (present.length > 0) return "partial"
  return "missing"
}

export function getStrategicMcpConnectors(): StrategicMcpConnector[] {
  return CONNECTORS.map((connector) => ({
    ...connector,
    status: connectorStatus(connector),
  }))
}

export function formatStrategicMcpConnectors(connectors = getStrategicMcpConnectors()) {
  return connectors
    .map((connector) => {
      const required = connector.requiredEnv.length ? connector.requiredEnv.join(", ") : "nessuna"
      return [
        `## ${connector.label}`,
        `- stato: ${connector.status}`,
        `- categoria: ${connector.category}`,
        `- scopo: ${connector.purpose}`,
        `- grafo: ${connector.graphUse.join(", ")}`,
        `- env richieste: ${required}`,
        `- note: ${connector.notes}`,
      ].join("\n")
    })
    .join("\n\n")
}
