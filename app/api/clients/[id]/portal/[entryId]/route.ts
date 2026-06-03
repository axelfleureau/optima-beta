import { NextRequest, NextResponse } from "next/server"
import { encryptClientPortalSecret } from "@/lib/client-portal-crypto"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { hasPermission, type UserRole } from "@/lib/role-hierarchy"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>
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

async function getEditableContext(clientId: string, entryId: string) {
  const user = await requireClerkUser()
  if (!user) {
    return { response: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) }
  }

  const db = await getCloudflareDb()
  if (!db) {
    return { response: NextResponse.json({ error: "Database non configurato" }, { status: 500 }) }
  }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!hasPermission(principal.role as UserRole, "canEditClients")) {
    return { response: NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 }) }
  }

  const entry = await db
    .prepare(
      `SELECT id
       FROM client_knowledge_entries
       WHERE id = ? AND client_id = ? AND organization_id = ?
       LIMIT 1`,
    )
    .bind(entryId, clientId, principal.organizationId)
    .first()

  if (!entry?.id) {
    return { response: NextResponse.json({ error: "Elemento non trovato" }, { status: 404 }) }
  }

  return { db, principal }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: clientId, entryId } = await context.params
  const editableContext = await getEditableContext(clientId, entryId)
  if ("response" in editableContext) return editableContext.response

  const { db, principal } = editableContext
  const payload = await request.json().catch(() => ({}))
  const category = VALID_CATEGORIES.has(String(payload.category)) ? String(payload.category) : "note"
  const title = String(payload.title || "").trim()
  if (title.length < 2) {
    return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 })
  }

  const encryptedSecret = await encryptClientPortalSecret(String(payload.secretValue || "").trim())

  await db
    .prepare(
      `UPDATE client_knowledge_entries
       SET category = ?,
           title = ?,
           body = ?,
           url = ?,
           username = ?,
           secret_value = ?,
           is_sensitive = ?,
           tags_json = ?,
           updated_by_member_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND client_id = ? AND organization_id = ?`,
    )
    .bind(
      category,
      title,
      String(payload.body || "").trim() || null,
      String(payload.url || "").trim() || null,
      String(payload.username || "").trim() || null,
      encryptedSecret || null,
      payload.isSensitive || category === "credentials" ? 1 : 0,
      JSON.stringify(parseTags(payload.tags)),
      principal.memberId,
      entryId,
      clientId,
      principal.organizationId,
    )
    .run()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id: clientId, entryId } = await context.params
  const editableContext = await getEditableContext(clientId, entryId)
  if ("response" in editableContext) return editableContext.response

  const { db, principal } = editableContext
  await db
    .prepare(
      `UPDATE client_knowledge_entries
       SET status = 'archived',
           updated_by_member_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND client_id = ? AND organization_id = ?`,
    )
    .bind(principal.memberId, entryId, clientId, principal.organizationId)
    .run()

  return NextResponse.json({ ok: true })
}
