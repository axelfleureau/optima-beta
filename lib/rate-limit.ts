import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

class InMemoryStore {
  private store = new Map<string, { count: number; resetAt: number }>()
  private operations = 0

  async limit(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    this.cleanupExpired(now)
    const record = this.store.get(key)

    if (!record || record.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + windowMs })
      return { success: true, remaining: limit - 1, reset: now + windowMs }
    }

    if (record.count >= limit) {
      return { success: false, remaining: 0, reset: record.resetAt }
    }

    record.count++
    this.store.set(key, record)
    return { success: true, remaining: limit - record.count, reset: record.resetAt }
  }

  private cleanupExpired(now: number) {
    this.operations += 1
    if (this.operations % 100 !== 0) return

    for (const [key, record] of this.store.entries()) {
      if (record.resetAt < now) {
        this.store.delete(key)
      }
    }
  }
}

const inMemoryStore = new InMemoryStore()

let upstashLimiters: Record<string, Ratelimit> | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    upstashLimiters = {
      AI: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "60 s"),
        analytics: true,
        prefix: "ratelimit:ai:",
      }),
      AUTH: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "300 s"),
        analytics: true,
        prefix: "ratelimit:auth:",
      }),
      STRIPE: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        analytics: true,
        prefix: "ratelimit:stripe:",
      }),
      DEFAULT: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "60 s"),
        analytics: true,
        prefix: "ratelimit:default:",
      }),
    }

    console.log("✅ Upstash rate limiting enabled with profile-specific limits")
  } catch (error) {
    console.warn("⚠️ Upstash initialization failed, using in-memory rate limiting:", error)
  }
}

export const RATE_LIMITS = {
  AI: { limit: 60, window: 60 * 1000 },
  AUTH: { limit: 5, window: 5 * 60 * 1000 },
  STRIPE: { limit: 10, window: 60 * 1000 },
  DEFAULT: { limit: 100, window: 60 * 1000 },
}

type RateLimitProfile = keyof typeof RATE_LIMITS

export async function rateLimit(
  request: Request,
  profile: RateLimitProfile = "DEFAULT"
) {
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "127.0.0.1"
  
  const url = new URL(request.url)
  const key = `${ip}:${url.pathname}`

  const { limit, window } = RATE_LIMITS[profile]

  if (upstashLimiters && upstashLimiters[profile]) {
    try {
      const result = await upstashLimiters[profile].limit(key)
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch (error) {
      console.error(`Upstash rate limit error (${profile}):`, error)
    }
  }

  return await inMemoryStore.limit(key, limit, window)
}

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  
  return new Response(
    JSON.stringify({
      error: "Troppe richieste. Riprova tra qualche istante.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    }
  )
}
