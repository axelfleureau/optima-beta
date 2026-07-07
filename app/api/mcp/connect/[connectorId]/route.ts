// app/api/mcp/connect/[connectorId]/route.ts
//
// Avvia installazione MCP. Tre modalità:
//
//   1. oauth_pkce       → redirect classico (Google, Notion, ecc.) — già esistente.
//   2. device_flow      → 1 click, stile `npx wrangler login`. Per Cloudflare, GitHub,
//                        e qualsiasi provider RFC 8628. Mostra user_code e fa polling
//                        server-side.
//   3. external_oauth   → variante di OAuth pkce (Vercel, GitHub App legacy).
//
// In tutti i casi, Optima restituisce un blocco `next` con istruzioni UI-friendly.
// Il client deve aprire il dialog del wizard, mostrare il prompt (browser o
// user_code) e fare polling su /api/mcp/oauth/device-poll/[connectorId] o
// ricevere il callback /api/mcp/oauth/callback/[connectorId].

import { NextRequest } from "next/server";

import { getStrategicMcpConnectors } from "@/lib/mcp-connectors";
import { upsertConnectorInstallation } from "@/lib/agentic-capabilities";
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";

type AuthMethod =
  | "oauth_pkce"
  | "device_flow"
  | "external_oauth"
  | "browser_session_oauth"
  | "github_app"
  | "runner_env"
  | "api_key_secret"
  | "service_account";

const OAUTH_DEFAULTS: Record<
  string,
  {
    prefix: string;
    authorizeUrl?: string;
    clientIdEnv?: string;
    scopeEnv?: string;
  }
> = {
  "google-business-profile": {
    prefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    scopeEnv: "GOOGLE_BUSINESS_PROFILE_SCOPES",
  },
  "google-calendar": {
    prefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    scopeEnv: "GOOGLE_CALENDAR_SCOPES",
  },
  "google-drive": {
    prefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    scopeEnv: "GOOGLE_DRIVE_SCOPES",
  },
  "meta-business-suite": {
    prefix: "META",
    authorizeUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    clientIdEnv: "META_APP_ID",
    scopeEnv: "META_REQUIRED_SCOPES",
  },
  "linkedin-pages": {
    prefix: "LINKEDIN",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    scopeEnv: "LINKEDIN_REQUIRED_SCOPES",
  },
  notion: {
    prefix: "NOTION",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    clientIdEnv: "NOTION_OAUTH_CLIENT_ID",
    scopeEnv: "NOTION_REQUIRED_SCOPES",
  },
  vercel: {
    prefix: "VERCEL",
    authorizeUrl: "https://vercel.com/oauth/authorize",
    clientIdEnv: "VERCEL_CLIENT_ID",
    scopeEnv: "VERCEL_REQUIRED_SCOPES",
  },
};

// 2026-06-24: aggiunto supporto OAuth Device Flow (RFC 8628) per i provider
// che lo supportano nativamente. Wrangler-style: 1 click, user_code, polling.
//
// GitHub:   POST https://github.com/login/device/code  → user_code, device_code
// Cloudflare: POST https://dash.cloudflare.com/oauth/device/code → idem
// Microsoft, Google (limitato), GitLab, Bitbucket supportano device flow
// in modo simile — aggiungere qui sotto quando serve.
const DEVICE_FLOW_DEFAULTS: Record<
  string,
  {
    deviceCodeUrl: string;
    tokenUrl: string;
    clientIdEnv: string;
    scopeEnv?: string;
    verificationUrl: string;
    brand?: string;
  }
> = {
  cloudflare: {
    deviceCodeUrl: "https://dash.cloudflare.com/oauth/device/code",
    tokenUrl: "https://dash.cloudflare.com/oauth/device/token",
    clientIdEnv: "CLOUDFLARE_OAUTH_CLIENT_ID",
    scopeEnv: "CLOUDFLARE_OAUTH_SCOPES",
    verificationUrl: "https://dash.cloudflare.com/profile/api-tokens",
    brand: "Cloudflare",
  },
  github: {
    deviceCodeUrl: "https://github.com/login/device/code",
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientIdEnv: "GITHUB_OAUTH_CLIENT_ID",
    scopeEnv: "GITHUB_OAUTH_SCOPES",
    verificationUrl: "https://github.com/login/device",
    brand: "GitHub",
  },
};

function appBaseUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.OPTIMA_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function oauthDefaults(connectorId: string) {
  return (
    OAUTH_DEFAULTS[connectorId] ?? {
      prefix: connectorId.replace(/-/g, "_").toUpperCase(),
    }
  );
}

function oauthEnv(connectorId: string) {
  const defaults = oauthDefaults(connectorId);
  const prefix = defaults.prefix;
  return {
    authorizeUrlEnv: `${prefix}_OAUTH_AUTHORIZE_URL`,
    authorizeUrl:
      envValue(`${prefix}_OAUTH_AUTHORIZE_URL`) || defaults.authorizeUrl || "",
    clientIdEnv: defaults.clientIdEnv || `${prefix}_OAUTH_CLIENT_ID`,
    clientId: envValue(defaults.clientIdEnv || `${prefix}_OAUTH_CLIENT_ID`),
    redirectUriEnv: `${prefix}_OAUTH_REDIRECT_URI`,
    redirectUri: envValue(`${prefix}_OAUTH_REDIRECT_URI`),
    scopeEnv: defaults.scopeEnv || `${prefix}_OAUTH_SCOPES`,
    scopes: envValue(defaults.scopeEnv || `${prefix}_OAUTH_SCOPES`),
  };
}

function randomBase64Url(bytes = 48) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Buffer.from(buffer).toString("base64url");
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}

function buildOAuthUrl(input: {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string;
  codeChallenge: string;
}) {
  const url = new URL(input.authorizeUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (input.scopes) url.searchParams.set("scope", input.scopes);
  return url.toString();
}

async function getPrincipal() {
  const user = await requireClerkUser();
  const db = await getCloudflareDb();
  if (!user) return { error: "Non autenticato.", status: 401 as const };
  if (!db)
    return {
      error: "Database Cloudflare non disponibile.",
      status: 500 as const,
    };

  const principal = await ensureWorkspacePrincipal(db, user);
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return {
      error: "Solo direzione e admin possono avviare installazioni MCP.",
      status: 403 as const,
    };
  }

  return { db, principal };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ connectorId: string }> },
) {
  try {
    const auth = await getPrincipal();
    if ("error" in auth)
      return Response.json({ error: auth.error }, { status: auth.status });

    const { connectorId } = await context.params;
    const connector = getStrategicMcpConnectors().find(
      (item) => item.id === connectorId,
    );
    if (!connector)
      return Response.json(
        { error: "Connector MCP non supportato." },
        { status: 404 },
      );

    // Branch device flow (wrangler-style)
    if (connector.authMethod === "device_flow") {
      return startDeviceFlow({ auth, connector });
    }

    // Codex CLI non usa OAuth redirect web di Optima: il login OAuth avviene
    // sul runner con `codex login --device-auth`.
    if (connector.id === "codex" && connector.authMethod === "runner_env") {
      return startCodexDeviceAuthGuide({ auth, connector });
    }

    // Branch OAuth PKCE classico
    if (
      connector.authMethod !== "oauth_pkce" &&
      connector.authMethod !== "external_oauth"
    ) {
      return Response.json(
        {
          error: "Questo connector non usa OAuth standard.",
          detail:
            "Usa Browser MCP, runtime env o secret_ref in base al tipo di connector.",
        },
        { status: 400 },
      );
    }

    return startOAuthPkce({ auth, connector, request });
  } catch (error: any) {
    console.error("Error starting MCP connector install:", error);
    return Response.json(
      { error: error?.message ?? "Errore avvio installazione MCP." },
      { status: 500 },
    );
  }
}

async function startCodexDeviceAuthGuide({
  auth,
  connector,
}: {
  auth: { db: any; principal: any };
  connector: any;
}) {
  const codeHome = process.env.CODEX_HOME || "/root/.codex-chatgpt";
  const codexBin = process.env.CODEX_CLI_BIN || "codex";

  await upsertConnectorInstallation(auth.db, auth.principal, {
    connectorId: connector.id,
    installState:
      connector.status === "enabled" ? "configured" : "guide_required",
    authMethod: connector.authMethod,
    scopes: connector.graphUse,
    oauthSubject: null,
    config: {
      codexCli: {
        flow: "manual_device_auth",
        codeHome,
        codexBin,
        authMode: "oauth_device",
        status:
          connector.status === "enabled" ? "runtime_configured" : "needs_login",
        startedAt: new Date().toISOString(),
        secretPolicy:
          "Non salvare auth.json, access token o OPENAI_API_KEY in D1. Optima conserva solo stato, policy e token interno runner.",
      },
    },
    secretRef: "codex:runner_internal_token",
  });

  return Response.json({
    connector: connector.label,
    flow: "manual_device_auth",
    status: connector.status === "enabled" ? "configured" : "needs_login",
    authMethod: "runner_env",
    redirectUri: null,
    verificationUrl: null,
    commands: [
      `export CODEX_HOME=${codeHome}`,
      "mkdir -p ~/.codex/auth-backups && if [ -f ~/.codex/auth.json ]; then cp ~/.codex/auth.json ~/.codex/auth-backups/auth-$(date -u +%Y%m%dT%H%M%SZ).json; fi",
      `CODEX_HOME=${codeHome} ${codexBin} logout || true`,
      `CODEX_HOME=${codeHome} ${codexBin} login --device-auth`,
      `printf 'Rispondi solo con: OK-CODEX-OAUTH\\n' | CODEX_HOME=${codeHome} ${codexBin} exec --sandbox workspace-write --skip-git-repo-check -`,
    ],
    env: {
      required: ["AGENT_RUNNER_ENABLED", "CODEX_HOME", "AGENT_RUNNER_API_KEY"],
      optional: ["CODEX_CLI_BIN", "CODEX_SANDBOX_MODE"],
    },
    note: "Codex CLI si collega con OAuth/device-auth sul runner. Non usare /api/mcp/oauth/callback/codex: non e un provider OAuth web con client_id/client_secret.",
  });
}

async function startOAuthPkce({
  auth,
  connector,
  request,
}: {
  auth: { db: any; principal: any };
  connector: any;
  request: NextRequest;
}) {
  const oauth = oauthEnv(connector.id);
  const redirectUri =
    oauth.redirectUri ||
    `${appBaseUrl(request)}/api/mcp/oauth/callback/${encodeURIComponent(connector.id)}`;
  const missingEnv = [
    oauth.authorizeUrl ? "" : oauth.authorizeUrlEnv,
    oauth.clientId ? "" : oauth.clientIdEnv,
  ].filter(Boolean);

  if (missingEnv.length) {
    return Response.json(
      {
        error: "OAuth app non configurata.",
        detail:
          "Crea prima la app developer del provider e configura client id, redirect allowlist e scope minimi nel runtime.",
        missingEnv,
        connector: connector.label,
        redirectUri,
      },
      { status: 409 },
    );
  }

  const state = crypto.randomUUID();
  const codeVerifier = randomBase64Url();
  const codeChallenge = await pkceChallenge(codeVerifier);
  await upsertConnectorInstallation(auth.db, auth.principal, {
    connectorId: connector.id,
    installState: "guide_required",
    authMethod: connector.authMethod,
    scopes: connector.graphUse,
    oauthSubject: null,
    config: {
      oauth: {
        state,
        redirectUri,
        scopeEnv: oauth.scopeEnv,
        pkce: true,
        codeVerifier,
        codeChallenge,
        startedAt: new Date().toISOString(),
        status: "authorization_started",
      },
    },
    secretRef: `${connector.id}:oauth_runtime_secret`,
  });

  return Response.json({
    connector: connector.label,
    authorizationUrl: buildOAuthUrl({
      authorizeUrl: oauth.authorizeUrl,
      clientId: oauth.clientId,
      redirectUri,
      state,
      scopes: oauth.scopes,
      codeChallenge,
    }),
    state,
    redirectUri,
    scopeEnv: oauth.scopeEnv,
    note: "Optima apre il consenso OAuth. Token e refresh restano nel runtime/secret vault, non in D1.",
  });
}

async function startDeviceFlow({
  auth,
  connector,
}: {
  auth: { db: any; principal: any };
  connector: any;
}) {
  const defaults = DEVICE_FLOW_DEFAULTS[connector.id];
  if (!defaults) {
    return Response.json(
      {
        error: `Device flow non configurato per ${connector.id}.`,
        detail:
          "Aggiungi il provider a DEVICE_FLOW_DEFAULTS in app/api/mcp/connect/[connectorId]/route.ts",
      },
      { status: 501 },
    );
  }
  const clientId = envValue(defaults.clientIdEnv);
  if (!clientId) {
    return Response.json(
      {
        error: "OAuth Device Flow non configurato lato Optima.",
        detail: `Configura ${defaults.clientIdEnv} (client_id pubblico) sul runtime autorizzato. Il client_secret non serve per device flow.`,
        missingEnv: [defaults.clientIdEnv],
      },
      { status: 409 },
    );
  }

  const scope =
    envValue(defaults.scopeEnv ?? "") || connector.graphUse?.join(" ") || "";
  const requestBody = new URLSearchParams();
  requestBody.set("client_id", clientId);
  if (scope) requestBody.set("scope", scope);

  const deviceResponse = await fetch(defaults.deviceCodeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: requestBody.toString(),
  });

  if (!deviceResponse.ok) {
    const detail = await deviceResponse.text().catch(() => "");
    return Response.json(
      {
        error: "Device flow non accettato dal provider.",
        detail: `${deviceResponse.status} ${deviceResponse.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
      },
      { status: 502 },
    );
  }

  const deviceData = (await deviceResponse.json().catch(() => ({}))) as {
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    verification_url?: string;
    expires_in?: number;
    interval?: number;
  };

  if (!deviceData.device_code || !deviceData.user_code) {
    return Response.json(
      {
        error: "Risposta device flow inattesa.",
        detail:
          "Il provider non ha restituito device_code e user_code. Riprova o controlla lo scope.",
        raw: deviceData,
      },
      { status: 502 },
    );
  }

  const verificationUrl =
    deviceData.verification_url ||
    deviceData.verification_uri ||
    defaults.verificationUrl;
  const interval = Math.max(5, Number(deviceData.interval ?? 5));

  await upsertConnectorInstallation(auth.db, auth.principal, {
    connectorId: connector.id,
    installState: "guide_required",
    authMethod: "device_flow",
    scopes: connector.graphUse,
    oauthSubject: null,
    config: {
      deviceFlow: {
        deviceCode: deviceData.device_code,
        userCode: deviceData.user_code,
        verificationUrl,
        clientId,
        scope,
        interval,
        expiresAt: new Date(
          Date.now() + Number(deviceData.expires_in ?? 900) * 1000,
        ).toISOString(),
        startedAt: new Date().toISOString(),
        status: "awaiting_user_code",
      },
    },
    secretRef: `${connector.id}:device_flow_token`,
  });

  return Response.json({
    connector: connector.label,
    flow: "device_flow",
    userCode: deviceData.user_code,
    verificationUrl,
    interval,
    expiresIn: deviceData.expires_in,
    pollPath: `/api/mcp/oauth/device-poll/${encodeURIComponent(connector.id)}`,
    note: `1. Apri ${verificationUrl}. 2. Inserisci ${deviceData.user_code}. 3. Torna qui: Optima fa polling e salva il token nel runtime.`,
  });
}
