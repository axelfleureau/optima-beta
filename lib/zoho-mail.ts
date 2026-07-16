import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Integrazione Zoho Mail (org Righello) per la creazione di caselle
 * con dominio aziendale. Stessa logica della CLI zoho-admin:
 * refresh token -> access token (cache in-memory) -> API mail.zoho.{dc}.
 */

const ACCESS_TOKEN_SAFETY_MS = 120_000;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getRuntimeSecret(name: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (
      (env as Record<string, string | undefined>)[name] ||
      process.env[name] ||
      ""
    );
  } catch {
    return process.env[name] || "";
  }
}

async function getZohoConfig() {
  const [clientId, clientSecret, refreshToken, dc, zoid, domain] =
    await Promise.all([
      getRuntimeSecret("ZOHO_CLIENT_ID"),
      getRuntimeSecret("ZOHO_CLIENT_SECRET"),
      getRuntimeSecret("ZOHO_REFRESH_TOKEN"),
      getRuntimeSecret("ZOHO_DC"),
      getRuntimeSecret("ZOHO_ZOID"),
      getRuntimeSecret("ZOHO_MAIL_DOMAIN"),
    ]);

  if (!clientId || !clientSecret || !refreshToken || !zoid) {
    throw new Error(
      "Zoho Mail non configurato: servono ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN e ZOHO_ZOID",
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    dc: dc || "eu",
    zoid,
    domain: domain || "wearerighello.com",
  };
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const config = await getZohoConfig();
  const response = await fetch(
    `https://accounts.zoho.${config.dc}/oauth/v2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
      }),
    },
  );

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) {
    throw new Error(
      `Refresh del token Zoho fallito: ${data.error || "risposta senza access_token"}`,
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt:
      Date.now() + (data.expires_in || 3600) * 1000 - ACCESS_TOKEN_SAFETY_MS,
  };
  return cachedToken.value;
}

export function getCompanyMailDomain() {
  return getZohoConfig().then((config) => config.domain);
}

export function generateTempPassword() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `Righello-${hex}!7`;
}

export class ZohoMailError extends Error {
  status: number;
  moreInfo: string;

  constructor(status: number, message: string, moreInfo: string) {
    super(message);
    this.status = status;
    this.moreInfo = moreInfo;
  }
}

export async function createOrgMailbox(input: {
  localPart: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  const config = await getZohoConfig();
  const token = await getAccessToken();
  const primaryEmailAddress = `${input.localPart}@${config.domain}`;

  const response = await fetch(
    `https://mail.zoho.${config.dc}/api/organization/${config.zoid}/accounts`,
    {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        primaryEmailAddress,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        displayName: `${input.firstName} ${input.lastName}`.trim(),
        role: "member",
        oneTimePassword: true,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    status?: { code?: number; description?: string };
    data?: Record<string, unknown> & { moreInfo?: string };
  } | null;

  if (!response.ok || payload?.status?.code !== 201) {
    const moreInfo = String(payload?.data?.moreInfo || "");
    throw new ZohoMailError(
      response.status,
      payload?.status?.description || `Errore Zoho (HTTP ${response.status})`,
      moreInfo,
    );
  }

  return {
    email: primaryEmailAddress,
    zuid: String((payload.data as { zuid?: number | string })?.zuid ?? ""),
  };
}
