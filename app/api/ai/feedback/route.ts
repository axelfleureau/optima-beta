export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const { messageId, feedback, sessionId } = await req.json()

    if (!messageId || !feedback) {
      return Response.json({ error: "Missing required fields: messageId, feedback" }, { status: 400 })
    }

    if (feedback !== "positive" && feedback !== "negative") {
      return Response.json({ error: 'Feedback must be either "positive" or "negative"' }, { status: 400 })
    }

    await db
      .prepare(
        `INSERT INTO ai_feedback
         (id, organization_id, member_id, message_id, session_id, feedback, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId("fbk"),
        principal.organizationId,
        principal.memberId,
        String(messageId),
        sessionId ? String(sessionId) : null,
        feedback,
        req.headers.get("user-agent") || "unknown",
      )
      .run()

    return Response.json({ success: true, message: "Feedback received successfully" })
  } catch (error) {
    console.error("AI feedback error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
