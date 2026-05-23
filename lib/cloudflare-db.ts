import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function getCloudflareDb(): Promise<any | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (env as any).DB || null
  } catch {
    return null
  }
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`
}
