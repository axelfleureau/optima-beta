import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function getTaskMediaBucket(): Promise<any | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (env as any).TASK_MEDIA || null
  } catch {
    return null
  }
}
