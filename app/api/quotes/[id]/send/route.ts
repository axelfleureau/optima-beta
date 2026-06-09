export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { generateShareToken } from "@/lib/quote-utils"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function getPublicOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return request.headers.get("origin") || new URL(request.url).origin
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Sessione non valida o scaduta" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "Database Cloudflare non disponibile" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)

    const { id: quoteId } = await params
    if (!quoteId) {
      return Response.json({ error: "Quote ID mancante" }, { status: 400 })
    }

    const quote = await db
      .prepare(
        `SELECT id, share_token
         FROM quotes
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, quoteId)
      .first()

    if (!quote?.id) {
      return Response.json({ error: "Preventivo non trovato" }, { status: 404 })
    }

    const shareToken = String(quote.share_token || "") || generateShareToken()

    await db
      .prepare(
        `UPDATE quotes
         SET share_token = ?,
             status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
             sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ? AND id = ?`,
      )
      .bind(shareToken, principal.organizationId, quoteId)
      .run()

    const publicUrl = `${getPublicOrigin(request)}/quotes/public/${shareToken}`

    return Response.json({
      success: true,
      publicUrl,
      shareToken,
    })
  } catch (error) {
    console.error("Error sending quote:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Errore nell'invio del preventivo" },
      { status: 500 }
    )
  }
}
