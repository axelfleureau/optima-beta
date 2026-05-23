export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { sendClientWelcomeEmail } from "@/lib/email"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"

const ALLOWED_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"])

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AUTH")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Non autenticato" }, { status: 401 })
    }

    if (!ALLOWED_ROLES.has(user.role)) {
      return Response.json({ error: "Permessi insufficienti" }, { status: 403 })
    }

    const { clientName, clientEmail, password, agencyName } = await request.json()

    if (!clientName || !clientEmail || !agencyName) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    await sendClientWelcomeEmail({
      clientName,
      clientEmail,
      password,
      agencyName,
    })

    return Response.json({
      success: true,
      message: "Welcome email sent successfully",
    })
  } catch (error) {
    console.error("Send welcome email error:", error)
    return Response.json(
      {
        success: false,
        message: "Failed to send welcome email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
