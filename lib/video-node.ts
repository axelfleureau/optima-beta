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
  return (process.env.VIDEO_NODE_URL || "https://video.wearerighello.com").replace(/\/$/, "");
}

export function videoNodeReady() {
  return Boolean(process.env.VIDEO_NODE_SIGNING_SECRET);
}

/** URL firmato per streaming (o download con `download: true`). Null se non configurato. */
export async function signedByteUrl(
  storageKey: string | null | undefined,
  opts: { download?: boolean; ttlSeconds?: number } = {},
): Promise<string | null> {
  const secret = process.env.VIDEO_NODE_SIGNING_SECRET || "";
  if (!secret || !storageKey) return null;
  const k = b64url(enc.encode(storageKey));
  const exp = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 21600); // 6h
  const sig = await hmacHex(secret, `${k}.${exp}`);
  const qs = new URLSearchParams({ k, exp: String(exp), sig });
  if (opts.download) qs.set("dl", "1");
  return `${videoNodeUrl()}/v/stream?${qs.toString()}`;
}
