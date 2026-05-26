export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"

function getClerkMode(publishableKey: string) {
  if (publishableKey.startsWith("pk_live_")) return "live"
  if (publishableKey.startsWith("pk_test_")) return "test"
  if (publishableKey) return "unknown"
  return "missing"
}

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""
  const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || "unknown"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ""

  let dbStatus: "ok" | "missing" | "error" = "missing"
  try {
    const db = await getCloudflareDb()
    if (db) {
      await db.prepare("SELECT 1 AS ok").first()
      dbStatus = "ok"
    }
  } catch {
    dbStatus = "error"
  }

  const clerkMode = getClerkMode(publishableKey)
  const checks = {
    appEnv,
    siteUrlConfigured: Boolean(siteUrl),
    clerkMode,
    dbStatus,
  }

  const ready =
    appEnv === "production" &&
    checks.siteUrlConfigured &&
    clerkMode === "live" &&
    dbStatus === "ok"

  return Response.json(
    {
      ok: ready,
      service: "optima",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
