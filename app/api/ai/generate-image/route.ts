export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { createMagnificImage, MAGNIFIC_IMAGE_MODEL, normalizeImagePayload } from "@/lib/magnific"
import { logMagnificCreation } from "@/lib/magnific-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function aspectRatioForPlatform(value: unknown) {
  if (value === "story" || value === "reel" || value === "tiktok") return "9:16"
  if (value === "landscape" || value === "linkedin" || value === "facebook") return "16:9"
  if (value === "portrait") return "4:5"
  return "1:1"
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""

    if (!prompt) {
      return Response.json({ success: false, error: "Prompt is required" }, { status: 400 })
    }

    const payload = normalizeImagePayload({
      prompt,
      aspect_ratio: body.aspect_ratio || body.aspectRatio || aspectRatioForPlatform(body.platform || body.format),
      resolution: body.resolution || (body.quality === "high" ? "4K" : "2K"),
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
      success: true,
      provider: "magnific",
      model: MAGNIFIC_IMAGE_MODEL,
      taskId: result.data.task_id,
      status: result.data.status,
      imageUrl: result.data.generated?.[0] || null,
      images: result.data.generated || [],
      data: result.data,
    })
  } catch (error) {
    const err = error as Error & { status?: number; details?: unknown }
    console.error("Image generation error:", err)
    return Response.json(
      {
        success: false,
        error: err.message || "Errore durante la generazione immagine",
        details: err.details || null,
      },
      { status: err.status || 500 },
    )
  }
}
