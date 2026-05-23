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
    if (!["super-admin", "admin", "direzione", "capo-reparto"].includes(principal.role)) {
      return Response.json({ users: [] })
    }

    const result = await db
      .prepare(
        `SELECT id, clerk_user_id, email, first_name, last_name, role, status, created_at, updated_at
         FROM members
         WHERE organization_id = ? AND status IN ('active', 'invited', 'inactive', 'suspended')
         ORDER BY created_at ASC`,
      )
      .bind(principal.organizationId)
      .all()

    return Response.json({
      users: (result.results || []).map((member: any) => ({
        id: member.id,
        clerkUserId: member.clerk_user_id,
        email: member.email,
        firstName: member.first_name || member.email?.split("@")[0] || "Utente",
        lastName: member.last_name || "",
        role: member.role || "junior",
        tenantId: principal.organizationId,
        status: member.status || "active",
        createdAt: member.created_at ? new Date(member.created_at) : new Date(),
        updatedAt: member.updated_at ? new Date(member.updated_at) : new Date(),
      })),
    })
  } catch (error) {
    console.error("Team users GET error:", error)
    return Response.json({ error: "Errore nel caricamento utenti" }, { status: 500 })
  }
}
