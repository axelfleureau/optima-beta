import { getCloudflareContext } from "@opennextjs/cloudflare"

export type MagnificTaskKind = "image" | "video"

export type MagnificTask = {
  task_id: string
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | string
  generated?: string[]
}

export type MagnificResponse<T = MagnificTask | MagnificTask[]> = {
  data: T
}

export const MAGNIFIC_IMAGE_MODEL = "nano-banana-pro"
export const MAGNIFIC_VIDEO_MODEL = "kling-v2-6-pro"

const MAGNIFIC_BASE_URL = "https://api.magnific.com"
const IMAGE_ENDPOINT = "/v1/ai/text-to-image/nano-banana-pro"
const VIDEO_ENDPOINT = "/v1/ai/image-to-video/kling-v2-6-pro"

const IMAGE_ASPECT_RATIOS = new Set(["1:1", "2:3", "3:2", "4:3", "3:4", "5:4", "4:5", "16:9", "9:16", "21:9"])
const IMAGE_RESOLUTIONS = new Set(["1K", "2K", "4K", "low", "medium", "high"])
const VIDEO_ASPECT_RATIOS = new Set(["widescreen_16_9", "social_story_9_16"])
const VIDEO_DURATIONS = new Set(["5", "10"])

type ReferenceImage = {
  image: string
  text?: string
  mime_type: "image/png" | "image/jpeg" | "image/webp"
}

export type CreateMagnificImageInput = {
  prompt: string
  aspect_ratio?: string
  resolution?: string
  reference_images?: ReferenceImage[]
  webhook_url?: string
}

export type CreateMagnificVideoInput = {
  prompt?: string
  image?: string
  duration: string
  aspect_ratio?: string
  negative_prompt?: string
  cfg_scale?: number
  generate_audio?: boolean
  webhook_url?: string
}

async function getRuntimeValue(name: string) {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (env as Record<string, string | undefined>)[name] || process.env[name] || ""
  } catch {
    return process.env[name] || ""
  }
}

async function getMagnificApiKey() {
  const key = await getRuntimeValue("MAGNIFIC_API_KEY")
  if (!key.trim()) {
    throw new Error("MAGNIFIC_API_KEY non configurata")
  }
  return key.trim()
}

async function magnificFetch<T>(path: string, init: RequestInit = {}): Promise<MagnificResponse<T>> {
  const apiKey = await getMagnificApiKey()
  const baseUrl = (await getRuntimeValue("MAGNIFIC_API_BASE_URL")) || MAGNIFIC_BASE_URL
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-magnific-api-key": apiKey,
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  let payload: any = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { message: text }
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.problem?.message || `Magnific API error ${response.status}`
    const error = new Error(message) as Error & { status?: number; details?: unknown }
    error.status = response.status
    error.details = payload
    throw error
  }

  return payload as MagnificResponse<T>
}

function normalizePrompt(prompt: unknown) {
  const normalized = String(prompt || "").replace(/\s+/g, " ").trim()
  if (normalized.length < 2) {
    throw new Error("Prompt Magnific troppo corto")
  }
  if (normalized.length > 3000) {
    throw new Error("Prompt Magnific troppo lungo: massimo 3000 caratteri")
  }
  return normalized
}

export function normalizeImagePayload(input: Partial<CreateMagnificImageInput>): CreateMagnificImageInput {
  const aspectRatio = input.aspect_ratio || "16:9"
  const resolution = input.resolution || "2K"

  if (!IMAGE_ASPECT_RATIOS.has(aspectRatio)) {
    throw new Error("Aspect ratio immagine non valido")
  }

  if (!IMAGE_RESOLUTIONS.has(resolution)) {
    throw new Error("Risoluzione immagine non valida")
  }

  const referenceImages = Array.isArray(input.reference_images) ? input.reference_images.slice(0, 3) : undefined

  return {
    prompt: normalizePrompt(input.prompt),
    aspect_ratio: aspectRatio,
    resolution,
    ...(referenceImages?.length ? { reference_images: referenceImages } : {}),
    ...(input.webhook_url ? { webhook_url: input.webhook_url } : {}),
  }
}

export function normalizeVideoPayload(input: Partial<CreateMagnificVideoInput>): CreateMagnificVideoInput {
  const duration = String(input.duration || "5")
  const aspectRatio = input.aspect_ratio || "widescreen_16_9"
  const prompt = input.prompt ? normalizePrompt(input.prompt) : undefined
  const image = input.image ? String(input.image).trim() : undefined

  if (!prompt && !image) {
    throw new Error("Per generare un video serve un prompt oppure una immagine di partenza")
  }

  if (!VIDEO_DURATIONS.has(duration)) {
    throw new Error("Durata video non valida")
  }

  if (!VIDEO_ASPECT_RATIOS.has(aspectRatio)) {
    throw new Error("Aspect ratio video non valido")
  }

  return {
    ...(prompt ? { prompt } : {}),
    ...(image ? { image } : {}),
    duration,
    aspect_ratio: aspectRatio,
    ...(input.negative_prompt ? { negative_prompt: String(input.negative_prompt).trim() } : {}),
    ...(typeof input.cfg_scale === "number" ? { cfg_scale: Math.min(1, Math.max(0, input.cfg_scale)) } : {}),
    ...(typeof input.generate_audio === "boolean" ? { generate_audio: input.generate_audio } : {}),
    ...(input.webhook_url ? { webhook_url: input.webhook_url } : {}),
  }
}

export async function createMagnificImage(input: CreateMagnificImageInput) {
  return magnificFetch<MagnificTask>(IMAGE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createMagnificVideo(input: CreateMagnificVideoInput) {
  return magnificFetch<MagnificTask>(VIDEO_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function getMagnificTaskStatus(kind: MagnificTaskKind, taskId: string) {
  const endpoint = kind === "video" ? VIDEO_ENDPOINT : IMAGE_ENDPOINT
  const normalizedTaskId = taskId.trim()

  if (!normalizedTaskId) {
    throw new Error("taskId Magnific mancante")
  }

  try {
    return await magnificFetch<MagnificTask>(`${endpoint}/${encodeURIComponent(normalizedTaskId)}`, { method: "GET" })
  } catch (error) {
    const status = (error as Error & { status?: number }).status
    if (status !== 404 && status !== 405) {
      throw error
    }

    const tasks = await magnificFetch<MagnificTask[]>(endpoint, { method: "GET" })
    const task = tasks.data.find((item) => item.task_id === normalizedTaskId)
    if (!task) {
      throw error
    }
    return { data: task }
  }
}
