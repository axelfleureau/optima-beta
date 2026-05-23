export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "DEFAULT")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  const user = await requireClerkUser()
  if (!user) {
    return Response.json({ success: false, message: "Non autenticato" }, { status: 401 })
  }

  if (user.role !== "super-admin") {
    return Response.json(
      { success: false, message: "Accesso negato. Richiesti privilegi super-admin." },
      { status: 403 },
    )
  }

  return Response.json({
    success: false,
    message:
      "La pulizia Firestore legacy e' stata disattivata: Optima ora usa D1/Cloudflare. Le nuove routine admin vanno eseguite su D1.",
  })
}
