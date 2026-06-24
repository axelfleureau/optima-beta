export type StrategicMcpConnectorStatus = "enabled" | "partial" | "missing" | "external"

export type StrategicMcpConnector = {
  id: string
  label: string
  status: StrategicMcpConnectorStatus
  category:
    | "ai"
    | "code"
    | "cloud"
    | "media"
    | "email"
    | "hosting"
    | "messaging"
    | "browser"
    | "local_seo"
    | "social"
    | "calendar"
  purpose: string
  graphUse: string[]
  requiredEnv: string[]
  optionalEnv?: string[]
  authMethod: "api_key_secret" | "oauth_pkce" | "github_app" | "runner_env" | "service_account" | "external_oauth" | "browser_session_oauth" | "device_flow"
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
      "1) `wrangler secret put SENDGRID_API_KEY` sul runtime autorizzato. 2) Redeploy. 3) `npm run connector:status sendgrid` per verificare.",
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
      "1) BotFather → /newbot → copia token. 2) `wrangler secret put TELEGRAM_BOT_TOKEN` + imposta TELEGRAM_DEFAULT_MEMBER_EMAIL. 3) Redeploy. 4) `npm run connector:status telegram`.",
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
    requiredEnv: ["AGENT_RUNNER_API_KEY", "AGENT_RUNNER_ENABLED", "CODEX_HOME"],
    optionalEnv: ["OPENAI_API_KEY", "OPENAI_FALLBACK_API_KEY"],
    authMethod: "runner_env",
    setupSteps: [
      "1) `wrangler secret put AGENT_RUNNER_API_KEY` (token interno Optima-runner). 2) Imposta AGENT_RUNNER_ENABLED=true + CODEX_HOME=/root/.codex-chatgpt. 3) Redeploy. 4) `npm run connector:status codex`.",
    ],
    healthCheck: "Heartbeat recente, codex-chatgpt login status ChatGPT, doctor senza API key, claim job dry-run, artefatto prodotto e stato review aggiornato.",
    notes: "Il runner deve fare polling verso Optima. AGENT_RUNNER_API_KEY e solo token interno; OPENAI_API_KEY e fallback a consumo, non percorso principale. I risultati tornano in review prima di diventare operativi.",
  },
  {
    id: "browser",
    label: "Browser MCP",
    category: "browser",
    purpose: "Automazione browser controllata per strumenti web senza API conveniente o affidabile: login utente nel browser isolato, ricerche operative, QA visuale, backoffice e siti autorizzati.",
    graphUse: ["browser_sessions", "agent_jobs", "audit", "screenshots", "qa", "external_tools"],
    requiredEnv: ["BROWSER_MCP_GATEWAY_URL"],
    optionalEnv: ["BROWSER_PROFILE_SECRET_REF", "BROWSER_ALLOWED_ORIGINS", "BROWSER_HEADLESS", "BROWSER_RECORDING_BUCKET"],
    authMethod: "browser_session_oauth",
    setupSteps: [
      "Installare un Browser MCP server controllato dal runner, preferibilmente Playwright/Chromium con profilo persistente isolato per tenant.",
      "Autorizzare manualmente solo account e siti consentiti, poi salvare in Optima un secret_ref del profilo/sessione, non cookie o token in D1.",
      "Definire allowlist domini e policy azioni: leggere, compilare bozze, screenshot e QA; invii, acquisti, deploy o modifiche esterne richiedono review.",
      "Usare il browser per strumenti senza API o per verifica visuale, non come scraping non autorizzato o aggiramento di termini/costi.",
    ],
    healthCheck: "Apre una pagina allowlist in Chromium, verifica che il profilo/sessione sia controllabile, produce screenshot redatto e registra audit senza eseguire azioni irreversibili.",
    notes: "Questo e il ponte per l'agente mini-dipendente: puo usare interfacce web autorizzate quando non esiste API conveniente, ma resta fragile e governato da allowlist, review e sessioni isolate.",
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
      "1) Cloudinary Dashboard → Account Details → copia `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`. 2) `wrangler secret put CLOUDINARY_URL`. 3) Redeploy.",
    ],
    healthCheck: "Lookup account, upload o trasformazione test su asset non sensibile e salvataggio source_id.",
    notes: "Da usare come nodo media del grafo, con asset collegati a clienti, campagne e deliverable.",
  },
  {
    id: "google-business-profile",
    label: "Google Business Profile",
    category: "local_seo",
    purpose: "Gestione schede locali cliente: orari, chiusure straordinarie, servizi, post locali, foto e QA informazioni pubbliche.",
    graphUse: [
      "clienti",
      "sedi",
      "local_seo",
      "orari_attivita",
      "servizi",
      "calendario_editoriale",
      "approvazioni_cliente",
    ],
    requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET_REF"],
    optionalEnv: ["GOOGLE_BUSINESS_PROFILE_SCOPES", "GOOGLE_OAUTH_REDIRECT_URI"],
    authMethod: "oauth_pkce",
    setupSteps: [
      "Creare una OAuth app Google Cloud con redirect allowlist verso Optima.",
      "Richiedere scope minimi per Business Profile e collegare solo le location del cliente autorizzato.",
      "Mappare location_id, sede, cliente e progetto nel grafo Optima.",
      "Le modifiche pubbliche AI-driven devono partire come proposta: preview, diff, approvazione responsabile/cliente e poi pubblicazione.",
    ],
    healthCheck: "OAuth installato, lista location leggibile, lettura orari corrente e simulazione update senza pubblicazione.",
    notes:
      "Questo deve essere un OAuth standard, non Browser MCP. Browser MCP resta fallback solo per QA visuale o casi non coperti dall'API ufficiale.",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    category: "calendar",
    purpose: "Sincronizzare scadenze, riunioni, finestre editoriali e milestone cliente con calendario e task Optima.",
    graphUse: ["calendario_editoriale", "task", "progetti", "approvazioni_cliente", "milestone", "meeting"],
    requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET_REF"],
    optionalEnv: ["GOOGLE_CALENDAR_SCOPES", "GOOGLE_OAUTH_REDIRECT_URI"],
    authMethod: "oauth_pkce",
    setupSteps: [
      "Usare OAuth Google con scope calendario minimi e consenso per il singolo account/tenant.",
      "Collegare calendari a cliente/progetto e definire direzione del sync: Optima fonte, Calendar vista esterna o sync bidirezionale controllato.",
      "Creare eventi solo da task, approvazioni o post editoriali con source_id stabile.",
      "Evitare duplicati usando external_id e finestra di deduplica.",
    ],
    healthCheck: "Lista calendari allowlist, creazione evento test in calendario sandbox e cancellazione controllata.",
    notes:
      "Serve per fare apparire deliverable, pubblicazioni e approvazioni nel calendario reale senza perdere il legame con task/progetto.",
  },
  {
    id: "meta-business-suite",
    label: "Meta Business Suite",
    category: "social",
    purpose: "Pubblicazione e insight Facebook/Instagram collegati al calendario editoriale, con flusso approvazione cliente.",
    graphUse: [
      "calendario_editoriale",
      "asset",
      "clienti",
      "campagne",
      "task",
      "approvazioni_cliente",
      "deliverable",
      "social_posts",
    ],
    requiredEnv: ["META_APP_ID", "META_APP_SECRET_REF"],
    optionalEnv: ["META_OAUTH_REDIRECT_URI", "META_REQUIRED_SCOPES"],
    authMethod: "oauth_pkce",
    setupSteps: [
      "Configurare Meta app e Business Login con pagine/account Instagram autorizzati dal cliente.",
      "Collegare page_id, instagram_business_account_id, cliente e canale nel grafo.",
      "Il calendario editoriale deve creare bozze con asset, copy, stato approvazione e task collegate.",
      "La pubblicazione richiede approvazione esplicita se il post e customer-facing.",
    ],
    healthCheck: "OAuth valido, lettura pagine/IG account allowlist, creazione draft interno e dry-run pubblicazione non distruttivo.",
    notes:
      "Il social connector e il cuore del flusso contenuti: task -> asset -> approvazione -> calendario -> pubblicazione -> insight -> retroazione nel grafo.",
  },
  {
    id: "linkedin-pages",
    label: "LinkedIn Pages",
    category: "social",
    purpose: "Pubblicazione e reportistica LinkedIn per pagine aziendali cliente collegate a campagne B2B e calendario editoriale.",
    graphUse: ["calendario_editoriale", "clienti", "campagne", "task", "approvazioni_cliente", "deliverable"],
    requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET_REF"],
    optionalEnv: ["LINKEDIN_OAUTH_REDIRECT_URI", "LINKEDIN_REQUIRED_SCOPES"],
    authMethod: "oauth_pkce",
    setupSteps: [
      "Configurare OAuth LinkedIn con scope minimi per organization/page consentite.",
      "Mappare organization urn al cliente e al calendario editoriale.",
      "Creare bozze e publish job separati, con approvazione cliente prima della pubblicazione.",
    ],
    healthCheck: "OAuth valido, lettura organizzazioni allowlist e dry-run creazione contenuto non pubblicato.",
    notes: "Utile per clienti B2B e contenuti corporate; non deve pubblicare direttamente da task non approvate.",
  },
  {
    id: "google-drive",
    label: "Google Drive",
    category: "cloud",
    purpose: "Archiviazione e reperimento deliverable cliente, materiali approvati, allegati task e pacchetti finali di progetto.",
    graphUse: ["deliverable", "task", "progetti", "clienti", "asset", "approvazioni_cliente"],
    requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET_REF"],
    optionalEnv: ["GOOGLE_DRIVE_SCOPES", "GOOGLE_OAUTH_REDIRECT_URI"],
    authMethod: "oauth_pkce",
    setupSteps: [
      "Autorizzare Drive con scope limitati a cartelle/app-folder o cartelle cliente allowlist.",
      "Collegare folder_id a cliente/progetto e salvare solo metadata/source_id in Optima.",
      "Ogni deliverable finale deve avere task/progetto, versione, stato approvazione e link sorgente.",
    ],
    healthCheck: "Lettura cartella sandbox, upload file test redatto, recupero metadata e cancellazione controllata.",
    notes:
      "Serve a rendere i deliverable facili da reperire da progetto, card task e calendario editoriale senza duplicare file dentro Optima.",
  },
  {
    id: "github",
    label: "GitHub",
    category: "code",
    purpose: "Repository, branch, pull request, commit, audit tecnico e collegamento codice-progetto.",
    graphUse: ["repository_links", "agent_jobs", "progetti", "task", "audit"],
    requiredEnv: ["GITHUB_OAUTH_CLIENT_ID"],
    optionalEnv: ["GITHUB_TOKEN", "GITHUB_APP_ID", "GITHUB_INSTALLATION_ID"],
    authMethod: "device_flow",
    setupSteps: [
      "Clicca 'Apri GitHub' in Optima: apri la pagina verification, inserisci il user_code, e il token arriva in automatico.",
      "Per flusso programmatico (CI) o se preferisci GitHub App: salva GITHUB_TOKEN come secret runtime.",
    ],
    healthCheck: "Lettura repository allowlist via user autenticato, dry-run branch/PR non distruttivo e audit owner-scoped.",
    notes: "1-click OAuth Device Flow (RFC 8628), stile npx wrangler login. Per App server-to-server mantenere GITHUB_TOKEN.",
  },
  {
    id: "notion",
    label: "Notion",
    category: "cloud",
    purpose: "Knowledge base e database storici Righello: clienti, lavori, task, portali e documenti operativi da indicizzare in Optima.",
    graphUse: ["clienti", "task", "progetti", "knowledge_base", "notion_pages", "notion_databases"],
    requiredEnv: ["NOTION_OAUTH_CLIENT_ID"],
    optionalEnv: [
      "NOTION_OAUTH_CLIENT_SECRET_REF",
      "NOTION_REQUIRED_SCOPES",
      "NOTION_RIGHELLO_CLIENTS_SOURCE",
      "NOTION_RIGHELLO_WORK_SOURCE",
      "NOTION_IMPORT_ALLOWLIST",
      "NOTION_API_KEY",
    ],
    authMethod: "external_oauth",
    setupSteps: [
      "Configurare Notion OAuth con redirect allowlist verso Optima e workspace/database esplicitamente autorizzati.",
      "Usare integrazione interna o NOTION_API_KEY solo come fallback runtime/server-side, non come percorso UX primario.",
      "Limitare import a RIG_CLIENTI, RIG_WORK, preventivi e fonti esplicitamente approvate.",
      "Importare in Optima dati redatti e source_id, non credenziali o dump integrali.",
    ],
    healthCheck: "OAuth installato o secret_ref fallback valido, query allowlist su database atteso, conteggio record e report import redatto.",
    notes: "Import solo da allowlist: RIG_CLIENTI, RIG_WORK e preventivi prima di tutto. Escludere sempre credenziali, accessi, token, file segreti e dump integrali.",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    category: "cloud",
    purpose: "Runtime Optima, D1, R2, Workers, secret, cron, deploy e osservabilita.",
    graphUse: ["runtime", "database", "artifacts", "agent_jobs", "health"],
    requiredEnv: ["CLOUDFLARE_OAUTH_CLIENT_ID"],
    optionalEnv: ["APP_ENV", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL", "CLOUDFLARE_API_TOKEN"],
    authMethod: "device_flow",
    setupSteps: [
      "Clicca 'Apri Cloudflare' in Optima: apri la pagina verification, inserisci il user_code, e Optima ottiene i permessi automaticamente.",
      "Per uso programmatico (CI/script) puoi anche salvare CLOUDFLARE_API_TOKEN come secret runtime.",
    ],
    healthCheck: "Ping Worker, query D1 read-only, accesso R2 artifact e deploy dry-run o preview.",
    notes: "1-click OAuth Device Flow (RFC 8628), stile npx wrangler login. Il client_id OAuth pubblico deve solo essere configurato in Cloudflare.",
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
      "1) `wrangler secret put HOSTINGER_API_TOKEN`. 2) Redeploy. 3) `npm run connector:status hostinger` per verificare health-check.",
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
