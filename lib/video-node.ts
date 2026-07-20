/**
 * Nodo video (Mac Studio): serve solo i BYTE dei file su NAS/T5.
 * Optima FIRMA gli URL (storage_key + scadenza) e il nodo verifica l'HMAC.
 * Schema firma (deve combaciare con lib/signing.js del nodo):
 *   k       = base64url(utf8(storage_key))
 *   payload = `${k}.${exp}`
 *   sig     = HMAC-SHA256(secret, payload) in hex
 */

const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://appbeta.wearerighello.com"
  ).replace(/\/$/, "");
}

export function isR2VideoKey(storageKey: string | null | undefined) {
  return String(storageKey || "").startsWith("r2://");
}

export function r2VideoObjectKey(storageKey: string) {
  return storageKey.replace(/^r2:\/\//, "");
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function videoNodeUrl() {
  return (
    process.env.VIDEO_NODE_URL || "https://video.wearerighello.com"
  ).replace(/\/$/, "");
}

export function videoNodeUploadUrl() {
  return (process.env.VIDEO_NODE_UPLOAD_URL || videoNodeUrl()).replace(
    /\/$/,
    "",
  );
}

export function videoNodeReady() {
  return Boolean(process.env.VIDEO_NODE_SIGNING_SECRET);
}

async function signQuery(storageKey: string, ttlSeconds: number) {
  const secret = process.env.VIDEO_NODE_SIGNING_SECRET || "";
  if (!secret) return null;
  const k = b64url(enc.encode(storageKey));
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacHex(secret, `${k}.${exp}`);
  return new URLSearchParams({ k, exp: String(exp), sig });
}

/** URL firmato per streaming (o download con `download: true`). Null se non configurato. */
export async function signedByteUrl(
  storageKey: string | null | undefined,
  opts: { download?: boolean; ttlSeconds?: number } = {},
): Promise<string | null> {
  if (!storageKey) return null;
  const qs = await signQuery(storageKey, opts.ttlSeconds ?? 21600); // 6h
  if (!qs) return null;
  if (opts.download) qs.set("dl", "1");
  if (isR2VideoKey(storageKey)) {
    return `${appBaseUrl()}/api/video-review/media?${qs.toString()}`;
  }
  return `${videoNodeUrl()}/v/stream?${qs.toString()}`;
}

/** URL firmato della thumbnail (JPG) di un video. */
export async function signedThumbUrl(
  storageKey: string | null | undefined,
  ttlSeconds = 21600,
): Promise<string | null> {
  if (!storageKey) return null;
  if (isR2VideoKey(storageKey)) return null;
  const qs = await signQuery(storageKey, ttlSeconds);
  return qs ? `${videoNodeUrl()}/v/thumb?${qs.toString()}` : null;
}

/** URL firmato per un'operazione di EDITING (trim/reframe) sul nodo. */
export async function signedEditUrl(
  job: {
    src: string;
    dst: string;
    op: string;
    params?: Record<string, unknown>;
  },
  ttlSeconds = 3600,
): Promise<string | null> {
  const qs = await signQuery(JSON.stringify(job), ttlSeconds);
  return qs ? `${videoNodeUrl()}/v/edit?${qs.toString()}` : null;
}

/**
 * URL firmato dove il BROWSER carica i byte (PUT diretto al nodo).
 * I byte non passano dal Worker: Cloudflare ha limiti di dimensione sulle
 * richieste, un video li sfonderebbe.
 */
export async function signedUploadUrl(
  storageKey: string,
  ttlSeconds = 3600,
): Promise<string | null> {
  const qs = await signQuery(storageKey, ttlSeconds);
  return qs ? `${videoNodeUploadUrl()}/v/upload?${qs.toString()}` : null;
}
