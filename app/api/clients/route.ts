export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const CLIENT_MANAGER_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"])

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
    const canViewAllClients = CLIENT_MANAGER_ROLES.has(principal.role)
    const result = await db
      .prepare(
        `SELECT id, name, email, company, status, created_at, updated_at,
                code, type, source, contact_name, phone, pec, vat_number,
                fiscal_code, sdi_code, address, city, postal_code, work_type,
                notes, onedrive_folder, onedrive_remote_path, notion_url,
                (
                  SELECT COUNT(*)
                  FROM projects p
                  WHERE p.organization_id = clients.organization_id
                    AND p.client_id = clients.id
                ) AS projects_count,
                (
                  SELECT COUNT(DISTINCT t.id)
                  FROM tasks t
                  LEFT JOIN projects tp
                    ON tp.id = t.project_id
                   AND tp.organization_id = t.organization_id
                  WHERE t.organization_id = clients.organization_id
                    AND (t.client_id = clients.id OR tp.client_id = clients.id)
                    AND COALESCE(t.column_id, t.status) IN (
                      'to-do', 'todo', 'urgenze', 'in-corso', 'in-progress',
                      'active', 'validation', 'review', 'backlog', 'planning'
                    )
                ) AS active_tasks_count,
                (
                  SELECT COUNT(DISTINCT t.id)
                  FROM tasks t
                  LEFT JOIN projects tp
                    ON tp.id = t.project_id
                   AND tp.organization_id = t.organization_id
                  WHERE t.organization_id = clients.organization_id
                    AND (t.client_id = clients.id OR tp.client_id = clients.id)
                    AND COALESCE(t.column_id, t.status) IN ('done', 'completed')
                ) AS completed_tasks_count,
                (
                  SELECT COALESCE(SUM(COALESCE(p.budget_cents, 0)), 0)
                  FROM projects p
                  WHERE p.organization_id = clients.organization_id
                    AND p.client_id = clients.id
                ) AS total_value_cents,
                MAX(
                  clients.updated_at,
                  COALESCE((
                    SELECT MAX(p.updated_at)
                    FROM projects p
                    WHERE p.organization_id = clients.organization_id
                      AND p.client_id = clients.id
                  ), clients.updated_at),
                  COALESCE((
                    SELECT MAX(t.updated_at)
                    FROM tasks t
                    LEFT JOIN projects tp
                      ON tp.id = t.project_id
                     AND tp.organization_id = t.organization_id
                    WHERE t.organization_id = clients.organization_id
                      AND (t.client_id = clients.id OR tp.client_id = clients.id)
                  ), clients.updated_at)
                ) AS last_activity_at
         FROM clients
         WHERE organization_id = ?
           AND (
             ? = 1
             OR EXISTS (
               SELECT 1
               FROM tasks vt
               LEFT JOIN projects vtp
                 ON vtp.id = vt.project_id
                AND vtp.organization_id = vt.organization_id
               WHERE vt.organization_id = clients.organization_id
                 AND vt.assignee_member_id = ?
                 AND (vt.client_id = clients.id OR vtp.client_id = clients.id)
             )
             OR EXISTS (
               SELECT 1
               FROM projects vp
               JOIN project_members vpm
                 ON vpm.project_id = vp.id
                AND vpm.organization_id = vp.organization_id
               WHERE vp.organization_id = clients.organization_id
                 AND vp.client_id = clients.id
                 AND vpm.member_id = ?
             )
           )
         ORDER BY updated_at DESC`,
      )
      .bind(principal.organizationId, canViewAllClients ? 1 : 0, principal.memberId, principal.memberId)
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
        projectsCount: Number(client.projects_count || 0),
        activeTasksCount: Number(client.active_tasks_count || 0),
        completedTasksCount: Number(client.completed_tasks_count || 0),
        totalValue: Number(client.total_value_cents || 0) / 100,
        lastActivity: client.last_activity_at ? new Date(client.last_activity_at) : null,
        createdAt: client.created_at ? new Date(client.created_at) : new Date(),
        updatedAt: client.updated_at ? new Date(client.updated_at) : new Date(),
      })),
    })
  } catch (error) {
    console.error("Clients GET error:", error)
    return Response.json({ error: "Errore nel caricamento dei clienti" }, { status: 500 })
  }
}
