import { NextRequest } from "next/server"

import {
  createSubagent,
  getAgenticCapabilitySnapshot,
  upsertConnectorInstallation,
  upsertProviderInstallation,
} from "@/lib/agentic-capabilities"
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
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
    return { error: "Solo direzione e admin possono configurare capability agentiche.", status: 403 as const }
  }

  return { db, principal }
}

export async function GET() {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const snapshot = await getAgenticCapabilitySnapshot(auth.db, auth.principal)
    return Response.json(snapshot)
  } catch (error) {
    console.error("Error loading agentic capabilities:", error)
    return Response.json({ error: "Errore nel caricamento capability agentiche." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPrincipal()
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "")

    if (action === "install_provider") {
      await upsertProviderInstallation(auth.db, auth.principal, {
        providerId: String(body.providerId || ""),
        installState: body.installState,
        config: body.config,
        tenantPolicy: body.tenantPolicy,
        secretRef: body.secretRef,
      })
    } else if (action === "install_connector") {
      await upsertConnectorInstallation(auth.db, auth.principal, {
        connectorId: String(body.connectorId || ""),
        installState: body.installState,
        authMethod: body.authMethod,
        scopes: body.scopes,
        config: body.config,
        secretRef: body.secretRef,
        oauthSubject: body.oauthSubject,
      })
    } else if (action === "create_subagent") {
      await createSubagent(auth.db, auth.principal, {
        name: String(body.name || ""),
        slug: String(body.slug || ""),
        lane: String(body.lane || "operations"),
        primaryProviderId: String(body.primaryProviderId || "openai"),
        modelHint: body.modelHint,
        connectorIds: body.connectorIds,
        systemPrompt: String(body.systemPrompt || ""),
        permissions: body.permissions,
        handoffPolicy: body.handoffPolicy,
      })
    } else {
      return Response.json({ error: "Azione capability non supportata." }, { status: 400 })
    }

    const snapshot = await getAgenticCapabilitySnapshot(auth.db, auth.principal)
    return Response.json(snapshot)
  } catch (error: any) {
    console.error("Error updating agentic capabilities:", error)
    return Response.json(
      { error: error?.message ?? "Errore aggiornamento capability agentiche." },
      { status: 400 },
    )
  }
}
