export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { updateMagnificGenerationStatus } from "@/lib/magnific-db"
import { getMagnificTaskStatus, type MagnificTaskKind } from "@/lib/magnific"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function normalizeKind(value: string | null): MagnificTaskKind {
  return value === "video" ? "video" : "image"
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const kind = normalizeKind(url.searchParams.get("kind"))
    const taskId = url.searchParams.get("taskId") || ""

    const result = await getMagnificTaskStatus(kind, taskId)
    const db = await getCloudflareDb()

    if (db) {
      const principal = await ensureWorkspacePrincipal(db, user)
      await updateMagnificGenerationStatus(
        db,
        principal,
        result.data.task_id,
        result.data.status,
        result.data.generated || [],
      )
    }

    return Response.json({
      provider: "magnific",
      kind,
      ...result,
    })
  } catch (error) {
    const err = error as Error & { status?: number; details?: unknown }
    console.error("Magnific status error:", err)
    return Response.json(
      {
        error: err.message || "Errore durante la verifica dello stato Magnific",
        details: err.details || null,
      },
      { status: err.status || 500 },
    )
  }
}
