export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { sendInviteEmail } from "@/lib/email";
import { canManageUser, type UserRole } from "@/lib/role-hierarchy";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const INVITABLE_ROLES = new Set([
  "admin",
  "direzione",
  "capo-reparto",
  "junior",
  "freelance",
  "client",
]);
const INVITER_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
  "capo-reparto",
]);

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isInternalPlaceholderEmail(email: unknown) {
  return String(email || "").endsWith("@no-email.optima.local");
}

function parseAssignedClientIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 200),
    ),
  ];
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://optima-beta-staging.axel-15d.workers.dev"
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (!INVITER_ROLES.has(principal.role)) {
      return Response.json(
        { error: "Non hai i permessi per invitare utenti" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const memberId = String(body.memberId || "").trim();
    let email = normalizeEmail(body.email);
    let firstName = String(body.firstName || "").trim();
    let lastName = String(body.lastName || "").trim();
    let role = String(body.role || "").trim();
    let assignedClientIds =
      role === "freelance"
        ? parseAssignedClientIds(body.assignedClientIds)
        : [];

    if (memberId) {
      const existingMember: any = await db
        .prepare(
          `SELECT id, email, first_name, last_name, role, status
           FROM members
           WHERE organization_id = ? AND id = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, memberId)
        .first();

      if (!existingMember) {
        return Response.json({ error: "Membro non trovato" }, { status: 404 });
      }

      if (existingMember.status === "active") {
        return Response.json(
          { error: "Questo membro ha già accesso alla piattaforma" },
          { status: 409 },
        );
      }

      email = normalizeEmail(existingMember.email);
      firstName = String(existingMember.first_name || firstName).trim();
      lastName = String(existingMember.last_name || lastName).trim();
      role = String(existingMember.role || role).trim();
      assignedClientIds =
        role === "freelance"
          ? parseAssignedClientIds(body.assignedClientIds)
          : [];

      if (isInternalPlaceholderEmail(email)) {
        return Response.json(
          { error: "Completa l'email del membro prima di invitarlo" },
          { status: 400 },
        );
      }
    }

    if (!email || !firstName || !lastName || !role) {
      return Response.json(
        { error: "Campi obbligatori mancanti" },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Inserisci un indirizzo email valido" },
        { status: 400 },
      );
    }

    if (!INVITABLE_ROLES.has(role)) {
      return Response.json({ error: "Ruolo non valido" }, { status: 400 });
    }

    if (!canManageUser(principal.role as UserRole, role as UserRole)) {
      return Response.json(
        { error: "Non puoi invitare utenti con questo ruolo" },
        { status: 403 },
      );
    }

    const loginUrl = `${appUrl()}/login?email=${encodeURIComponent(email)}`;
    const inviterName =
      `${user.firstName} ${user.lastName}`.trim() || user.email;
    const newMemberSuffix = crypto.randomUUID().replace(/-/g, "");
    const invitedMemberId = memberId || `mem_${newMemberSuffix}`;
    const invitedClerkUserId = `invite:${email}`;
    const inviteAcceptUrl = `${appUrl()}/register?email=${encodeURIComponent(email)}&invite=${encodeURIComponent(invitedMemberId)}`;
    const organization = await db
      .prepare(`SELECT name FROM organizations WHERE id = ? LIMIT 1`)
      .bind(principal.organizationId)
      .first();

    if (!memberId) {
      const existingMember = await db
        .prepare(
          `SELECT id
           FROM members
           WHERE organization_id = ? AND lower(email) = lower(?)
           LIMIT 1`,
        )
        .bind(principal.organizationId, email)
        .first();

      if (existingMember) {
        return Response.json(
          { error: "Un utente con questa email esiste già nel team" },
          { status: 409 },
        );
      }
    }

    await sendInviteEmail({
      to: email,
      firstName,
      lastName,
      inviterName,
      inviterEmail: user.email,
      role,
      resetLink: inviteAcceptUrl,
      loginLink: loginUrl,
      organizationName: String(organization?.name || "Righello"),
      customMessage: body.message,
    });

    if (memberId) {
      await db
        .prepare(
          `UPDATE members
           SET clerk_user_id = ?, status = 'invited', updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(invitedClerkUserId, principal.organizationId, memberId)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO members
           (id, organization_id, clerk_user_id, email, first_name, last_name, role, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'invited')`,
        )
        .bind(
          invitedMemberId,
          principal.organizationId,
          invitedClerkUserId,
          email,
          firstName,
          lastName,
          role,
        )
        .run();
    }

    if (role === "freelance") {
      await db
        .prepare(
          `DELETE FROM member_client_assignments
           WHERE organization_id = ? AND member_id = ?`,
        )
        .bind(principal.organizationId, invitedMemberId)
        .run();

      for (const clientId of assignedClientIds) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO member_client_assignments
             (id, organization_id, member_id, client_id, assigned_by_member_id)
             SELECT ?, ?, ?, id, ?
             FROM clients
             WHERE organization_id = ? AND id = ?`,
          )
          .bind(
            `mca_${crypto.randomUUID().replace(/-/g, "")}`,
            principal.organizationId,
            invitedMemberId,
            principal.memberId,
            principal.organizationId,
            clientId,
          )
          .run();
      }
    }

    return Response.json({
      success: true,
      message: memberId
        ? "Invito inviato al membro del team"
        : "Invito inviato e membro aggiunto al team",
      recipient: email,
      user: {
        id: invitedMemberId,
        clerkUserId: invitedClerkUserId,
        email,
        firstName,
        lastName,
        role,
        tenantId: principal.organizationId,
        assignedClientIds,
        status: "invited",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Team invite error:", error);
    return Response.json(
      { error: "Errore durante l'invio dell'invito" },
      { status: 500 },
    );
  }
}
