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
  authMethod: "api_key_secret" | "oauth_pkce" | "github_app" | "runner_env" | "service_account" | "external_oauth"
  setupSteps: string[]
  healthCheck: string
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
    authMethod: "api_key_secret",
    setupSteps: [
      "Creare una API key SendGrid con scope Mail Send e statistiche minime.",
      "Salvare la chiave come secret del runtime autorizzato, non nel database Optima.",
      "Configurare mittente verificato e fallback di errore visibile in Optima.",
    ],
    healthCheck: "Invio dry-run o email di test verso un indirizzo interno autorizzato, con log di esito.",
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
    authMethod: "api_key_secret",
    setupSteps: [
      "Creare o collegare il bot Telegram e salvare il token come secret runtime.",
      "Definire allowlist chat/user e mappa Telegram -> membro Optima.",
      "Attivare webhook firmato e salvare ogni messaggio nella conversazione Optima.",
    ],
    healthCheck: "Messaggio test da utente autorizzato, risposta asincrona e riga audit nella conversazione.",
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
    authMethod: "runner_env",
    setupSteps: [
      "Configurare env del runner VPS con API key dedicata e AGENT_RUNNER_ENABLED=true solo quando si vuole eseguire.",
      "Verificare heartbeat, workdir isolata e accesso al repository consentito.",
      "Eseguire un job dry-run che produce artefatto revisionabile, senza deploy automatico.",
    ],
    healthCheck: "Heartbeat recente, claim job dry-run, artefatto prodotto e stato review aggiornato.",
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
    authMethod: "api_key_secret",
    setupSteps: [
      "Creare credenziali Cloudinary tenant-scoped o folder-scoped dove possibile.",
      "Salvare CLOUDINARY_URL come secret runtime e definire naming/folder per clienti e campagne.",
      "Collegare asset importati ai nodi cliente/progetto/task nel grafo.",
    ],
    healthCheck: "Lookup account, upload o trasformazione test su asset non sensibile e salvataggio source_id.",
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
    authMethod: "github_app",
    setupSteps: [
      "Autorizzare GitHub solo da owner Axel o GitHub App con repository allowlist.",
      "Salvare token/installation id fuori da D1 e registrare in Optima solo secret_ref e policy.",
      "Separare lettura repository, creazione branch/PR e deploy approval come permessi distinti.",
    ],
    healthCheck: "Lettura repository allowlist, dry-run branch/PR non distruttivo e audit owner-scoped.",
    notes: "Connector owner-scoped: l'account GitHub aziendale personale di Axel non e condiviso. Commit, push e deploy richiedono owner GitHub esplicito.",
  },
  {
    id: "notion",
    label: "Notion",
    category: "cloud",
    purpose: "Knowledge base e database storici Righello: clienti, lavori, task, portali e documenti operativi da indicizzare in Optima.",
    graphUse: ["clienti", "task", "progetti", "knowledge_base", "notion_pages", "notion_databases"],
    requiredEnv: ["NOTION_API_KEY"],
    optionalEnv: ["NOTION_RIGHELLO_CLIENTS_SOURCE", "NOTION_RIGHELLO_WORK_SOURCE", "NOTION_IMPORT_ALLOWLIST"],
    authMethod: "oauth_pkce",
    setupSteps: [
      "Autorizzare Notion con OAuth/PKCE o integrazione interna su database allowlist.",
      "Limitare import a RIG_CLIENTI, RIG_WORK, preventivi e fonti esplicitamente approvate.",
      "Importare in Optima dati redatti e source_id, non credenziali o dump integrali.",
    ],
    healthCheck: "Query allowlist su database atteso, conteggio record e report import redatto.",
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
    authMethod: "service_account",
    setupSteps: [
      "Configurare token Cloudflare con scope minimi per Worker, D1, R2 e secrets necessari.",
      "Separare deploy production da preview e mantenere audit dei comandi eseguiti.",
      "Verificare cron, D1 e artifact storage prima di dichiarare operativo.",
    ],
    healthCheck: "Ping Worker, query D1 read-only, accesso R2 artifact e deploy dry-run o preview.",
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
    authMethod: "external_oauth",
    setupSteps: [
      "Collegare Vercel via OAuth/token tenant-scoped e progetto/team allowlist.",
      "Registrare in Optima solo secret_ref e mapping progetti, non token in chiaro.",
      "Usare il connector per diagnostica deploy e log, non per deploy ciechi.",
    ],
    healthCheck: "Lista deployment del progetto allowlist e lettura log di build recente.",
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
    authMethod: "api_key_secret",
    setupSteps: [
      "Salvare token Hostinger/Tailscale/SSH solo nel runtime autorizzato.",
      "Definire area Optima sul VPS e vietare scritture su installazioni Hermes o soci senza consenso.",
      "Monitorare disco, RAM, systemd e heartbeat runner in Optima.",
    ],
    healthCheck: "Check Tailscale/SSH read-only, spazio disco, servizio runner e heartbeat recente.",
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
        `- auth: ${connector.authMethod}`,
        `- scopo: ${connector.purpose}`,
        `- grafo: ${connector.graphUse.join(", ")}`,
        `- env richieste: ${required}`,
        `- health check: ${connector.healthCheck}`,
        `- note: ${connector.notes}`,
      ].join("\n")
    })
    .join("\n\n")
}
