import { NextRequest, NextResponse } from "next/server"
import { decryptClientPortalSecret, encryptClientPortalSecret } from "@/lib/client-portal-crypto"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { hasPermission, type UserRole } from "@/lib/role-hierarchy"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

const VALID_CATEGORIES = new Set([
  "note",
  "credentials",
  "document",
  "contract",
  "meeting",
  "persona",
  "strategy",
  "link",
])

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12)
  }

  return []
}

function canUseClientPortal(role: string) {
  return hasPermission(role as UserRole, "canViewAllClients")
}

function canEditClientPortal(role: string) {
  return hasPermission(role as UserRole, "canEditClients")
}

async function mapEntry(row: any) {
  return {
    id: String(row.id),
    category: String(row.category || "note"),
    title: String(row.title || ""),
    body: row.body || "",
    url: row.url || "",
    username: row.username || "",
    secretValue: await decryptClientPortalSecret(String(row.secret_value || "")),
    isSensitive: Boolean(row.is_sensitive),
    status: String(row.status || "active"),
    tags: (() => {
      try {
        return JSON.parse(String(row.tags_json || "[]"))
      } catch {
        return []
      }
    })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getPortalContext(clientId: string) {
  const user = await requireClerkUser()
  if (!user) {
    return { response: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) }
  }

  const db = await getCloudflareDb()
  if (!db) {
    return { response: NextResponse.json({ error: "Database non configurato" }, { status: 500 }) }
  }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!canUseClientPortal(principal.role)) {
    return { response: NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 }) }
  }

  const client = await db
    .prepare(
      `SELECT id, name, email, phone, company, address, status, notes, website, sector,
              onedrive_folder, notion_url, contact_name, contact_email, contact_phone,
              created_at, updated_at
       FROM clients
       WHERE id = ? AND organization_id = ?
       LIMIT 1`,
    )
    .bind(clientId, principal.organizationId)
    .first()

  if (!client?.id) {
    return { response: NextResponse.json({ error: "Cliente non trovato" }, { status: 404 }) }
  }

  return { db, principal, client }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params
  const portalContext = await getPortalContext(clientId)
  if ("response" in portalContext) return portalContext.response

  const { db, principal, client } = portalContext

  const [entriesResult, projectsResult, tasksResult] = await Promise.all([
    db
      .prepare(
        `SELECT *
         FROM client_knowledge_entries
         WHERE organization_id = ?
           AND client_id = ?
           AND COALESCE(status, 'active') = 'active'
         ORDER BY updated_at DESC, created_at DESC`,
      )
      .bind(principal.organizationId, clientId)
      .all(),
    db
      .prepare(
        `SELECT id, name, status, due_at, budget_cents, created_at, updated_at
         FROM projects
         WHERE organization_id = ? AND client_id = ?
         ORDER BY updated_at DESC
         LIMIT 24`,
      )
      .bind(principal.organizationId, clientId)
      .all(),
    db
      .prepare(
        `SELECT id, title, column_id, status, priority, due_at, assignee_name, updated_at
         FROM tasks
         WHERE organization_id = ? AND client_id = ?
         ORDER BY updated_at DESC
         LIMIT 32`,
      )
      .bind(principal.organizationId, clientId)
      .all(),
  ])

  return NextResponse.json({
    client,
    entries: await Promise.all((entriesResult.results || []).map(mapEntry)),
    projects: projectsResult.results || [],
    tasks: tasksResult.results || [],
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: clientId } = await context.params
  const portalContext = await getPortalContext(clientId)
  if ("response" in portalContext) return portalContext.response

  const { db, principal } = portalContext
  if (!canEditClientPortal(principal.role)) {
    return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 })
  }

  const payload = await request.json().catch(() => ({}))
  const category = VALID_CATEGORIES.has(String(payload.category)) ? String(payload.category) : "note"
  const title = String(payload.title || "").trim()
  if (title.length < 2) {
    return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 })
  }

  const entry = {
    id: createId("cke"),
    body: String(payload.body || "").trim(),
    url: String(payload.url || "").trim(),
    username: String(payload.username || "").trim(),
    secretValue: String(payload.secretValue || "").trim(),
    isSensitive: Boolean(payload.isSensitive || category === "credentials"),
    tags: parseTags(payload.tags),
  }

  const encryptedSecret = await encryptClientPortalSecret(entry.secretValue)

  await db
    .prepare(
      `INSERT INTO client_knowledge_entries
       (id, organization_id, client_id, category, title, body, url, username, secret_value,
        is_sensitive, status, tags_json, created_by_member_id, updated_by_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    )
    .bind(
      entry.id,
      principal.organizationId,
      clientId,
      category,
      title,
      entry.body || null,
      entry.url || null,
      entry.username || null,
      encryptedSecret || null,
      entry.isSensitive ? 1 : 0,
      JSON.stringify(entry.tags),
      principal.memberId,
      principal.memberId,
    )
    .run()

  const saved = await db
    .prepare(`SELECT * FROM client_knowledge_entries WHERE id = ? LIMIT 1`)
    .bind(entry.id)
    .first()

  return NextResponse.json({ entry: await mapEntry(saved) }, { status: 201 })
}
