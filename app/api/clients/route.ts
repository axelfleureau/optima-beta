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
        `SELECT id, name, email, company, status, created_at, updated_at,
                code, type, source, contact_name, phone, pec, vat_number,
                fiscal_code, sdi_code, address, city, postal_code, work_type,
                notes, onedrive_folder, onedrive_remote_path, notion_url
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
        code: client.code || "",
        type: client.type || "",
        source: client.source || "",
        contactName: client.contact_name || "",
        phone: client.phone || "",
        pec: client.pec || "",
        vatNumber: client.vat_number || "",
        fiscalCode: client.fiscal_code || "",
        sdiCode: client.sdi_code || "",
        address: [client.address, client.city, client.postal_code].filter(Boolean).join(", "),
        city: client.city || "",
        postalCode: client.postal_code || "",
        industry: client.work_type || "",
        workType: client.work_type || "",
        notes: client.notes || "",
        oneDriveFolder: client.onedrive_folder || "",
        oneDriveRemotePath: client.onedrive_remote_path || "",
        notionUrl: client.notion_url || "",
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
