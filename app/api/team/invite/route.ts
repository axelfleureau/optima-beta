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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isInternalPlaceholderEmail(email: unknown) {
  return String(email || "").endsWith("@no-email.optima.local")
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
    const memberId = String(body.memberId || "").trim()
    let email = normalizeEmail(body.email)
    let firstName = String(body.firstName || "").trim()
    let lastName = String(body.lastName || "").trim()
    let role = String(body.role || "").trim()

    if (memberId) {
      const existingMember: any = await db
        .prepare(
          `SELECT id, email, first_name, last_name, role, status
           FROM members
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, memberId)
        .first()

      if (!existingMember) {
        return Response.json({ error: "Membro non trovato" }, { status: 404 })
      }

      if (existingMember.status === "active") {
        return Response.json({ error: "Questo membro ha già accesso alla piattaforma" }, { status: 409 })
      }

      email = normalizeEmail(existingMember.email)
      firstName = String(existingMember.first_name || firstName).trim()
      lastName = String(existingMember.last_name || lastName).trim()
      role = String(existingMember.role || role).trim()

      if (isInternalPlaceholderEmail(email)) {
        return Response.json({ error: "Completa l'email del membro prima di invitarlo" }, { status: 400 })
      }
    }

    if (!email || !firstName || !lastName || !role) {
      return Response.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: "Inserisci un indirizzo email valido" }, { status: 400 })
    }

    if (!INVITABLE_ROLES.has(role)) {
      return Response.json({ error: "Ruolo non valido" }, { status: 400 })
    }

    if (!canManageUser(principal.role as UserRole, role as UserRole)) {
      return Response.json({ error: "Non puoi invitare utenti con questo ruolo" }, { status: 403 })
    }

    const inviteUrl = `${appUrl()}/register?email=${encodeURIComponent(email)}`
    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email
    const newMemberSuffix = crypto.randomUUID().replace(/-/g, "")
    const invitedMemberId = memberId || `mem_${newMemberSuffix}`
    const invitedClerkUserId = `invite:${email}`

    if (!memberId) {
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
    }

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

    if (memberId) {
      await db
        .prepare(
          `UPDATE members
           SET clerk_user_id = ?, status = 'invited', updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(invitedClerkUserId, principal.organizationId, memberId)
        .run()
    } else {
      await db
        .prepare(
          `INSERT INTO members
           (id, organization_id, clerk_user_id, email, first_name, last_name, role, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'invited')`,
        )
        .bind(invitedMemberId, principal.organizationId, invitedClerkUserId, email, firstName, lastName, role)
        .run()
    }

    return Response.json({
      success: true,
      message: memberId ? "Invito inviato al membro del team" : "Invito inviato e membro aggiunto al team",
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
