export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export async function GET() {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const result = await db
      .prepare(
        `SELECT id, name, email, company, status, created_at, updated_at
         FROM clients
         WHERE organization_id = ?
         ORDER BY updated_at DESC`,
      )
      .bind(principal.organizationId)
      .all()

    return Response.json({
      clients: (result.results || []).map((client: any) => ({
        id: client.id,
        name: client.name,
        email: client.email || "",
        contactEmail: client.email || "",
        company: client.company || client.name,
        tenantId: principal.organizationId,
        status: client.status || "active",
        color: "bg-gradient-to-br from-righello-pink to-righello-cyan",
        createdAt: client.created_at ? new Date(client.created_at) : new Date(),
        updatedAt: client.updated_at ? new Date(client.updated_at) : new Date(),
      })),
    })
  } catch (error) {
    console.error("Clients GET error:", error)
    return Response.json({ error: "Errore nel caricamento dei clienti" }, { status: 500 })
  }
}
