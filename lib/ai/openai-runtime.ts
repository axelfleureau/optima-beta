import { createOpenAI } from "@ai-sdk/openai"
import { getCloudflareContext } from "@opennextjs/cloudflare"

type RuntimeEnv = Record<string, string | undefined>

export async function getRuntimeSecret(name: string): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const value = (env as RuntimeEnv)[name] ?? process.env[name]
    return typeof value === "string" ? value : ""
  } catch {
    return process.env[name] ?? ""
  }
}

export async function getOpenAIApiKey(): Promise<string> {
  const primary = (await getRuntimeSecret("OPENAI_API_KEY")).trim()
  if (primary) return primary

  return (await getRuntimeSecret("OPENAI_FALLBACK_API_KEY")).trim()
}

export async function hasOpenAIApiKey(): Promise<boolean> {
  return Boolean(await getOpenAIApiKey())
}

export async function requireOpenAIApiKey(): Promise<string> {
  const apiKey = await getOpenAIApiKey()
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured")
  }

  return apiKey
}

export async function createRuntimeOpenAI() {
  const apiKey = await requireOpenAIApiKey()
  return createOpenAI({ apiKey })
}
