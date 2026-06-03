import { getCloudflareContext } from "@opennextjs/cloudflare"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function getPortalSecret() {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (
      (env as Record<string, string | undefined>).CLIENT_PORTAL_ENCRYPTION_KEY ||
      (env as Record<string, string | undefined>).SESSION_SECRET ||
      process.env.CLIENT_PORTAL_ENCRYPTION_KEY ||
      process.env.SESSION_SECRET ||
      ""
    )
  } catch {
    return process.env.CLIENT_PORTAL_ENCRYPTION_KEY || process.env.SESSION_SECRET || ""
  }
}

async function getAesKey() {
  const secret = await getPortalSecret()
  if (!secret) return null

  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret))
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"])
}

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  return Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString("base64")
}

function fromBase64(value: string) {
  return Uint8Array.from(Buffer.from(value, "base64"))
}

export async function encryptClientPortalSecret(value: string) {
  if (!value) return ""

  const key = await getAesKey()
  if (!key) return value

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value))
  return `v1:${toBase64(iv)}:${toBase64(encrypted)}`
}

export async function decryptClientPortalSecret(value: string) {
  if (!value || !value.startsWith("v1:")) return value || ""

  const key = await getAesKey()
  if (!key) return ""

  const [, ivValue, encryptedValue] = value.split(":")
  if (!ivValue || !encryptedValue) return ""

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivValue) },
      key,
      fromBase64(encryptedValue),
    )
    return decoder.decode(decrypted)
  } catch {
    return ""
  }
}
