// app/api/mcp/oauth/setup-info/[connectorId]/route.ts
//
// Istruzioni operative per creare le OAuth App dei provider MCP. Restituisce un
// set di step human-readable + scope minimi + URL di creazione. Quando l'utente
// clicca "Configura app OAuth" sul control room agentico, questa rotta è quella
// che popola il dialog con le istruzioni.
//
// 2026-06-25: nata per supportare device_flow (Cloudflare, GitHub) + oauth_pkce
// (Google, Meta, LinkedIn, Notion, Vercel) + external_oauth (Vercel legacy).

import { NextRequest } from "next/server"

import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { getStrategicMcpConnectors } from "@/lib/mcp-connectors"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

type AuthMethod =
  | "oauth_pkce"
  | "external_oauth"
  | "device_flow"
  | "browser_session_oauth"
  | "github_app"
  | "api_key_secret"
  | "service_account"
  | "runner_env"

interface SetupGuide {
  provider: string
  authMethod: AuthMethod
  redirectUri: string
  consentUrl: string | null
  setupSteps: string[]
  scopes: string[]
  envVars: { name: string; description: string; sensitive: boolean }[]
  oneClick: boolean
  notes: string
}

const REDIRECT_BASE = (request: Request) => {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.OPTIMA_PUBLIC_URL
  if (configured) return configured.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

function setupForGoogle(connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "Google Cloud Console",
    authMethod: "oauth_pkce",
    oneClick: false,
    redirectUri: `${base}/api/mcp/oauth/callback/${connectorId}`,
    consentUrl: "https://console.cloud.google.com/apis/credentials",
    scopes: [
      "openid",
      "email",
      "profile",
      connectorId === "google-business-profile"
        ? "https://www.googleapis.com/auth/business.manage"
        : "https://www.googleapis.com/auth/calendar",
    ],
    setupSteps: [
      `1. Vai su ${"https://console.cloud.google.com/apis/credentials"}`,
      `2. Crea un progetto (o seleziona esistente) e abilita la Google API giusta per ${connectorId}.`,
      `3. Configura il "OAuth consent screen" come External, aggiungi gli scope minimi sopra.`,
      `4. Crea un OAuth Client ID di tipo "Web application" con redirect URI: ${base}/api/mcp/oauth/callback/${connectorId}`,
      `5. Copia Client ID e Client Secret. Imposta come secret runtime:`,
      `   - wrangler secret put GOOGLE_OAUTH_CLIENT_ID=<il_tuo_client_id>`,
      `6. Redeploy del worker. Da Optima clicca "Apri OAuth provider".`,
    ],
    envVars: [
      { name: "GOOGLE_OAUTH_CLIENT_ID", description: "OAuth Client ID (pubblico)", sensitive: false },
      { name: "GOOGLE_OAUTH_CLIENT_SECRET", description: "OAuth Client Secret", sensitive: true },
      { name: "GOOGLE_OAUTH_REDIRECT_URI", description: "Override redirect URI (opzionale)", sensitive: false },
    ],
    notes:
      "Servono redirect URI esatti. Se cambi dominio Optima, aggiorna il Client ID.",
  }
}

function setupForMeta(connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "Meta for Developers",
    authMethod: "oauth_pkce",
    oneClick: false,
    redirectUri: `${base}/api/mcp/oauth/callback/${connectorId}`,
    consentUrl: "https://developers.facebook.com/apps/",
    scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish"],
    setupSteps: [
      "1. Vai su developers.facebook.com → My Apps → Create App (tipo Business).",
      "2. Aggiungi il prodotto 'Facebook Login for Business' e configura OAuth redirect:",
      `   ${base}/api/mcp/oauth/callback/${connectorId}`,
      "3. In Settings → Basic copia App ID e App Secret.",
      "4. Account pubblico e autorizzazioni: passa l'App Review Meta per gli scope pages_manage_posts, instagram_content_publish.",
      "5. Imposta come secret runtime:",
      "   - wrangler secret put META_APP_ID=<app_id>",
      "   - wrangler secret put META_APP_SECRET=<app_secret>",
      "6. Redeploy. Da Optima clicca 'Apri OAuth provider'.",
    ],
    envVars: [
      { name: "META_APP_ID", description: "Facebook App ID (pubblico)", sensitive: false },
      { name: "META_APP_SECRET", description: "Facebook App Secret", sensitive: true },
      { name: "META_OAUTH_REDIRECT_URI", description: "Override redirect URI (opzionale)", sensitive: false },
    ],
    notes: "Senza App Review Meta, i token hanno scope limitati e scadono in 60 giorni.",
  }
}

function setupForLinkedin(connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "LinkedIn Developers",
    authMethod: "oauth_pkce",
    oneClick: false,
    redirectUri: `${base}/api/mcp/oauth/callback/${connectorId}`,
    consentUrl: "https://www.linkedin.com/developers/apps",
    scopes: ["openid", "profile", "email", "w_member_social", "r_organization_social", "rw_organization_admin"],
    setupSteps: [
      "1. Crea un'app su LinkedIn Developers → Products → Richiedi 'Share on LinkedIn' e 'Sign In with LinkedIn'.",
      `2. Aggiungi redirect URI OAuth 2.0: ${base}/api/mcp/oauth/callback/${connectorId}`,
      "3. In Settings copia Client ID e Client Secret.",
      "4. wrangler secret put LINKEDIN_CLIENT_ID=<client_id>",
      "   wrangler secret put LINKEDIN_CLIENT_SECRET=<client_secret>",
      "5. Redeploy. Da Optima clicca 'Apri OAuth provider'.",
    ],
    envVars: [
      { name: "LINKEDIN_CLIENT_ID", description: "LinkedIn Client ID (pubblico)", sensitive: false },
      { name: "LINKEDIN_CLIENT_SECRET", description: "LinkedIn Client Secret", sensitive: true },
    ],
    notes: "Serve verifica LinkedIn Developer per pubblicare contenuti. Senza, hai solo lettura.",
  }
}

function setupForNotion(connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "Notion Integrations",
    authMethod: "oauth_pkce",
    oneClick: false,
    redirectUri: `${base}/api/mcp/oauth/callback/${connectorId}`,
    consentUrl: "https://www.notion.so/my-integrations",
    scopes: ["read_content", "update_content", "insert_content"],
    setupSteps: [
      "1. Vai su notion.so/my-integrations → New integration.",
      `2. Redirect URI: ${base}/api/mcp/oauth/callback/${connectorId}`,
      "3. Capabilities minime: Read content, Update content, Insert content. Niente user information senza motivo.",
      "4. wrangler secret put NOTION_OAUTH_CLIENT_ID=<integration_token>",
      "5. Redeploy. Da Optima clicca 'Apri OAuth provider'.",
    ],
    envVars: [
      { name: "NOTION_OAUTH_CLIENT_ID", description: "Notion integration token", sensitive: false },
      { name: "NOTION_OAUTH_CLIENT_SECRET", description: "Notion OAuth client secret", sensitive: true },
    ],
    notes:
      "Notion OAuth è pubblico (no App Review), ma i workspace autorizzati vanno aggiunti manualmente.",
  }
}

function setupForVercel(connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "Vercel",
    authMethod: "external_oauth",
    oneClick: false,
    redirectUri: `${base}/api/mcp/oauth/callback/${connectorId}`,
    consentUrl: "https://vercel.com/dashboard/integrations/create",
    scopes: ["user:read", "team:read", "project:read", "deployment:read", "deployment:list", "log:read"],
    setupSteps: [
      "1. Vai su vercel.com/dashboard/integrations/create.",
      `2. Redirect URL: ${base}/api/mcp/oauth/callback/${connectorId}`,
      "3. Scopes minimi: user:read, team:read, project:read, deployment:read.",
      "4. wrangler secret put VERCEL_CLIENT_ID=<client_id>",
      "   wrangler secret put VERCEL_CLIENT_SECRET=<client_secret>",
      "5. Redeploy. Da Optima clicca 'Apri OAuth provider'.",
    ],
    envVars: [
      { name: "VERCEL_CLIENT_ID", description: "Vercel OAuth Client ID (pubblico)", sensitive: false },
      { name: "VERCEL_CLIENT_SECRET", description: "Vercel OAuth Client Secret", sensitive: true },
    ],
    notes:
      "Per uso programmatico (CI), wrangler secret put VERCEL_TOKEN=... è più semplice ma meno sicuro.",
  }
}

function setupForCloudflare(_connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "Cloudflare",
    authMethod: "device_flow",
    oneClick: true,
    redirectUri: `${base}/api/mcp/oauth/device-poll/cloudflare`,
    consentUrl: "https://dash.cloudflare.com/profile/api-tokens",
    scopes: ["account:read", "workers:read", "workers:write", "d1:read", "d1:write", "r2:read", "r2:write", "pages:read", "pages:write"],
    setupSteps: [
      "1. Vai su dash.cloudflare.com → My Profile → API Tokens → Create Token.",
      "2. Usa template 'Create Custom Token'.",
      "3. Permissions minime: Account > Account Settings: Read, Account > Workers Scripts: Read+Edit, Account > D1: Read+Edit, Account > R2 Storage: Read+Edit, Account > Pages: Read+Edit, Account > Workers KV Storage: Read+Edit.",
      "4. Account Resources: includi il tuo account Righello.",
      "5. TTL: lascia vuoto per ora (token permanente, ma ruoteremo con device_flow).",
      "6. Create → copia il token. wrangler secret put CLOUDFLARE_API_TOKEN=<token>",
      "7. Per il **Device Flow vero (1-click)**, abilita OAuth Client su Cloudflare: contatta il supporto Cloudflare Business/Enterprise per ottenere un OAuth Client ID, poi wrangler secret put CLOUDFLARE_OAUTH_CLIENT_ID=<oauth_client_id>.",
      "8. Da Optima: clicca 'Connetti Cloudflare' → user_code → fatto.",
    ],
    envVars: [
      {
        name: "CLOUDFLARE_API_TOKEN",
        description: "API token (per uso programmatico / CI) — fallback",
        sensitive: true,
      },
      {
        name: "CLOUDFLARE_OAUTH_CLIENT_ID",
        description: "OAuth Client ID pubblico per Device Flow 1-click (richiede supporto Cloudflare)",
        sensitive: false,
      },
    ],
    notes:
      "Il vero OAuth Device Flow richiede un OAuth Client autorizzato da Cloudflare (disponibile solo per piani Business/Enterprise). Per il momento usa API Token + questo connector ricade su service_account.",
  }
}

function setupForGithub(_connectorId: string, request: Request): SetupGuide {
  const base = REDIRECT_BASE(request)
  return {
    provider: "GitHub",
    authMethod: "device_flow",
    oneClick: true,
    redirectUri: `${base}/api/mcp/oauth/device-poll/github`,
    consentUrl: "https://github.com/settings/developers",
    scopes: ["repo", "read:user", "user:email", "workflow", "admin:repo_hook"],
    setupSteps: [
      "1. Vai su github.com/settings/developers → OAuth Apps → New OAuth App.",
      "2. Application name: 'Optima MCP'. Homepage URL: https://appbeta.wearerighello.com",
      "3. Authorization callback URL: (vuoto per device flow, GitHub usa l'auto-verification tramite user code).",
      "4. Register application → copia il Client ID (formato 'Iv1.xxx').",
      "5. wrangler secret put GITHUB_OAUTH_CLIENT_ID=<il_tuo_client_id>",
      "6. Redeploy. Da Optima: clicca 'Connetti GitHub' → user_code 'ABCD-1234' → vai su github.com/login/device → incolla → fatto.",
    ],
    envVars: [
      { name: "GITHUB_OAUTH_CLIENT_ID", description: "GitHub OAuth App Client ID (pubblico)", sensitive: false },
      {
        name: "GITHUB_TOKEN",
        description: "Personal Access Token (fallback programmatico)",
        sensitive: true,
      },
    ],
    notes:
      "Device Flow OAuth è ufficiale su GitHub. NON serve Client Secret per device_flow. Crea un'app 'Public' (no client secret needed) o 'Confidential' (con secret) — entrambe funzionano per device flow.",
  }
}

function setupForBrowser(_connectorId: string, _request: Request): SetupGuide {
  return {
    provider: "Browser MCP",
    authMethod: "browser_session_oauth",
    oneClick: false,
    redirectUri: "",
    consentUrl: null,
    scopes: [],
    setupSteps: [
      "1. Sul VPS runner autorizzato, installa Playwright Chromium (apt-get o npx playwright install).",
      "2. wrangler secret put BROWSER_MCP_GATEWAY_URL=http://<vps-tailscale>:8789",
      "3. wrangler secret put BROWSER_PROFILE_SECRET_REF=<riferimento al profilo persistente>",
      "4. Definisci BROWSER_ALLOWED_ORIGINS come lista separata da virgola (es. 'https://appbeta.wearerighello.com,https://accounts.clerk.services').",
      "5. Redeploy. Da Optima: clicca 'Prepara ChatGPT' / 'Prepara Gemini' → apri login sul VPS → fatto.",
    ],
    envVars: [
      { name: "BROWSER_MCP_GATEWAY_URL", description: "URL del gateway Playwright/Chromium sul VPS", sensitive: false },
      { name: "BROWSER_PROFILE_SECRET_REF", description: "Riferimento al profilo persistente (no cookie/token in chiaro)", sensitive: true },
      { name: "BROWSER_ALLOWED_ORIGINS", description: "Lista origini consentite separate da virgola", sensitive: false },
    ],
    notes: "Il browser MCP è il fallback per servizi senza API o per QA visuale. Mai per scraping non autorizzato.",
  }
}

function setupForGeneric(connectorId: string, _request: Request): SetupGuide {
  return {
    provider: connectorId,
    authMethod: "service_account",
    oneClick: false,
    redirectUri: `${REDIRECT_BASE(_request)}/api/mcp/oauth/callback/${connectorId}`,
    consentUrl: null,
    scopes: [],
    setupSteps: [
      "Questo connector non usa OAuth utente. Configura il secret runtime e lancia la verifica.",
      "wrangler secret put <ENV_VAR>=<valore> (vedi sotto)",
      "Redeploy. Da Optima clicca 'Verifica runtime'.",
    ],
    envVars: [],
    notes: "Vedi lib/mcp-connectors.ts per la lista env richieste di questo connector.",
  }
}

const SETUP_BUILDERS: Record<string, (connectorId: string, request: Request) => SetupGuide> = {
  "google-business-profile": setupForGoogle,
  "google-calendar": setupForGoogle,
  "google-drive": setupForGoogle,
  "meta-business-suite": setupForMeta,
  "linkedin-pages": setupForLinkedin,
  notion: setupForNotion,
  vercel: setupForVercel,
  cloudflare: setupForCloudflare,
  github: setupForGithub,
  browser: setupForBrowser,
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ connectorId: string }> },
) {
  const auth = await (async () => {
    const user = await requireClerkUser()
    if (!user) return { error: "Non autenticato.", status: 401 as const }
    const db = await getCloudflareDb()
    if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }
    const principal = await ensureWorkspacePrincipal(db, user)
    if (!AGENT_ADMIN_ROLES.has(principal.role)) {
      return { error: "Solo direzione e admin possono consultare setup OAuth.", status: 403 as const }
    }
    return { principal }
  })()

  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

  const { connectorId } = await context.params
  const connector = getStrategicMcpConnectors().find((item) => item.id === connectorId)
  if (!connector) return Response.json({ error: "Connector MCP non supportato." }, { status: 404 })

  const builder = SETUP_BUILDERS[connectorId] ?? setupForGeneric
  const guide = builder(connectorId, request)

  return Response.json({
    connectorId: connector.id,
    connectorLabel: connector.label,
    category: connector.category,
    authMethod: connector.authMethod,
    setupSteps: connector.setupSteps,
    purpose: connector.purpose,
    notes: connector.notes,
    guide,
  })
}