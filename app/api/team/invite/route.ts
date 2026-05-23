export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { sendInviteEmail } from "@/lib/email"
import { canManageUser, type UserRole } from "@/lib/role-hierarchy"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

const INVITABLE_ROLES = new Set(["admin", "direzione", "capo-reparto", "junior", "client"])
const INVITER_ROLES = new Set(["super-admin", "admin", "direzione", "capo-reparto"])

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://optima-beta-staging.axel-15d.workers.dev"
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "D1 database binding missing" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    if (!INVITER_ROLES.has(principal.role)) {
      return Response.json({ error: "Non hai i permessi per invitare utenti" }, { status: 403 })
    }

    const body = await request.json()
    const email = normalizeEmail(body.email)
    const firstName = String(body.firstName || "").trim()
    const lastName = String(body.lastName || "").trim()
    const role = String(body.role || "").trim()

    if (!email || !firstName || !lastName || !role) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (!INVITABLE_ROLES.has(role)) {
      return Response.json({ error: "Ruolo non valido" }, { status: 400 })
    }

    if (!canManageUser(principal.role as UserRole, role as UserRole)) {
      return Response.json({ error: "Non puoi invitare utenti con questo ruolo" }, { status: 403 })
    }

    const existingMember = await db
      .prepare(
        `SELECT id
         FROM members
         WHERE organization_id = ? AND lower(email) = lower(?)
         LIMIT 1`,
      )
      .bind(principal.organizationId, email)
      .first()

    if (existingMember) {
      return Response.json({ error: "Un utente con questa email esiste già nel team" }, { status: 409 })
    }

    const inviteUrl = `${appUrl()}/register?email=${encodeURIComponent(email)}`
    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email
    const memberId = crypto.randomUUID().replace(/-/g, "")
    const invitedMemberId = `mem_${memberId}`
    const invitedClerkUserId = `invite:${email}`

    await sendInviteEmail({
      to: email,
      firstName,
      lastName,
      inviterName,
      inviterEmail: user.email,
      role,
      resetLink: inviteUrl,
      customMessage: body.message,
    })

    await db
      .prepare(
        `INSERT INTO members
         (id, organization_id, clerk_user_id, email, first_name, last_name, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'invited')`,
      )
      .bind(invitedMemberId, principal.organizationId, invitedClerkUserId, email, firstName, lastName, role)
      .run()

    return Response.json({
      success: true,
      message: "Invito inviato e membro aggiunto al team",
      recipient: email,
      user: {
        id: invitedMemberId,
        clerkUserId: invitedClerkUserId,
        email,
        firstName,
        lastName,
        role,
        tenantId: principal.organizationId,
        status: "invited",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Team invite error:", error)
    return Response.json({ error: "Errore durante l'invio dell'invito" }, { status: 500 })
  }
}
