export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { logMagnificCreation } from "@/lib/magnific-db"
import { createMagnificImage, MAGNIFIC_IMAGE_MODEL, normalizeImagePayload } from "@/lib/magnific"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const payload = normalizeImagePayload({
      prompt: body.prompt,
      aspect_ratio: body.aspect_ratio || body.aspectRatio,
      resolution: body.resolution,
      reference_images: body.reference_images || body.referenceImages,
      webhook_url: body.webhook_url || body.webhookUrl,
    })

    const result = await createMagnificImage(payload)
    const db = await getCloudflareDb()

    if (db) {
      const principal = await ensureWorkspacePrincipal(db, user)
      await logMagnificCreation(db, principal, {
        kind: "image",
        model: MAGNIFIC_IMAGE_MODEL,
        prompt: payload.prompt,
        taskId: result.data.task_id,
        status: result.data.status,
        generated: result.data.generated || [],
        request: payload,
      })
    }

    return Response.json({
      provider: "magnific",
      model: MAGNIFIC_IMAGE_MODEL,
      ...result,
    })
  } catch (error) {
    const err = error as Error & { status?: number; details?: unknown }
    console.error("Magnific image generation error:", err)
    return Response.json(
      {
        error: err.message || "Errore durante la generazione immagine con Magnific",
        details: err.details || null,
      },
      { status: err.status || 500 },
    )
  }
}
