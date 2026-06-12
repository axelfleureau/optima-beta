import { NextRequest } from "next/server"

import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import {
  getGitHubOwnerPolicy,
  isGitHubOwnerPrincipal,
} from "@/lib/agentic-owner-policy"
import { upsertConnectorInstallation } from "@/lib/agentic-capabilities"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

async function getPrincipal() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()
  if (!user) return { error: "Non autenticato.", status: 401 as const }
  if (!db) return { error: "Database Cloudflare non disponibile.", status: 500 as const }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return { error: "Solo direzione e admin possono leggere la policy GitHub.", status: 403 as const }
  }

  return { db, principal }
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== "string") return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function parseJsonArray(value: unknown) {
  if (!value || typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function getExistingGitHubConnector(db: any, organizationId: string) {
  return db
    .prepare(
      `SELECT scopes_json, config_json, secret_ref, oauth_subject
       FROM mcp_connector_installations
       WHERE organization_id = ? AND connector_id = 'github'
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()
}

export async function GET() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const policy = await getGitHubOwnerPolicy(auth.db, auth.principal.organizationId)
    return Response.json({
      policy,
      canEdit: isGitHubOwnerPrincipal(auth.principal, policy),
      currentUserEmail: auth.principal.email,
    })
  } catch (error) {
    console.error("Error loading GitHub owner policy:", error)
    return Response.json({ error: "Errore caricamento policy GitHub." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const currentPolicy = await getGitHubOwnerPolicy(auth.db, auth.principal.organizationId)
    if (!isGitHubOwnerPrincipal(auth.principal, currentPolicy)) {
      return Response.json(
        { error: "Solo l'owner GitHub autorizzato può modificare questa policy." },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const ownerEmails = normalizeList(body.ownerEmails).map((email) => email.toLowerCase())
    const allowedRepositoryPatterns = normalizeList(body.allowedRepositoryPatterns).map((pattern) =>
      pattern.toLowerCase(),
    )

    if (!ownerEmails.length || ownerEmails.some((email) => !email.includes("@"))) {
      return Response.json({ error: "Inserisci almeno una email owner valida." }, { status: 400 })
    }

    if (!allowedRepositoryPatterns.length) {
      return Response.json({ error: "Inserisci almeno uno scope repository GitHub." }, { status: 400 })
    }

    const existing = await getExistingGitHubConnector(auth.db, auth.principal.organizationId)
    const existingConfig = parseJsonObject(existing?.config_json)
    const existingScopes = normalizeList(parseJsonArray(existing?.scopes_json))
    const scopes = existingScopes.length ? existingScopes : ["repo", "workflow", "read:org"]

    await upsertConnectorInstallation(auth.db, auth.principal, {
      connectorId: "github",
      installState: "configured",
      authMethod: "github_app",
      scopes,
      secretRef: existing?.secret_ref ? String(existing.secret_ref) : null,
      oauthSubject: existing?.oauth_subject ? String(existing.oauth_subject) : auth.principal.email,
      config: {
        ...existingConfig,
        ownerPolicy: {
          mode: "owner_scoped",
          ownerEmails,
          allowedRepositoryPatterns,
          commitPushEnabled: body.commitPushEnabled !== false,
          deployEnabled: body.deployEnabled !== false,
          updatedByMemberId: auth.principal.memberId,
          updatedAt: new Date().toISOString(),
        },
      },
    })

    const policy = await getGitHubOwnerPolicy(auth.db, auth.principal.organizationId)
    return Response.json({
      policy,
      canEdit: isGitHubOwnerPrincipal(auth.principal, policy),
      currentUserEmail: auth.principal.email,
    })
  } catch (error) {
    console.error("Error updating GitHub owner policy:", error)
    return Response.json({ error: "Errore aggiornamento policy GitHub." }, { status: 500 })
  }
}
