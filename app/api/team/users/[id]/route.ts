export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { canManageUser, type UserRole } from "@/lib/role-hierarchy";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const EDITABLE_ROLES = new Set([
  "admin",
  "direzione",
  "capo-reparto",
  "junior",
  "freelance",
  "client",
]);
const MANAGER_ROLES = new Set([
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

function deriveClerkUserId(
  currentClerkUserId: string,
  status: string,
  email: string,
  fallbackMemberId: string,
) {
  if (currentClerkUserId.startsWith("invite:")) return `invite:${email}`;
  if (currentClerkUserId.startsWith("placeholder:")) {
    return email ? `placeholder:${email}` : `placeholder:${fallbackMemberId}`;
  }
  if (status === "invited") return `invite:${email}`;
  return currentClerkUserId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    if (!MANAGER_ROLES.has(principal.role)) {
      return Response.json(
        { error: "Non hai i permessi per modificare utenti" },
        { status: 403 },
      );
    }

    const { id: memberId } = await params;
    const currentMember: any = await db
      .prepare(
        `SELECT id, clerk_user_id, email, first_name, last_name, role, status
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId)
      .first();

    if (!currentMember) {
      return Response.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (
      !canManageUser(principal.role as UserRole, currentMember.role as UserRole)
    ) {
      return Response.json(
        { error: "Non hai i permessi per modificare questo utente" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const role = String(body.role || "").trim();
    const assignedClientIds =
      role === "freelance"
        ? parseAssignedClientIds(body.assignedClientIds)
        : [];
    const requestedEmail = normalizeEmail(body.email);
    const status = body.isSuspended
      ? "suspended"
      : currentMember.status === "suspended"
        ? "active"
        : currentMember.status;

    if (!firstName || !lastName || !role) {
      return Response.json(
        { error: "Campi obbligatori mancanti" },
        { status: 400 },
      );
    }

    if (!EDITABLE_ROLES.has(role)) {
      return Response.json({ error: "Ruolo non valido" }, { status: 400 });
    }

    if (!canManageUser(principal.role as UserRole, role as UserRole)) {
      return Response.json(
        { error: "Non puoi assegnare questo ruolo" },
        { status: 403 },
      );
    }

    if (requestedEmail && !isValidEmail(requestedEmail)) {
      return Response.json(
        { error: "Inserisci un indirizzo email valido" },
        { status: 400 },
      );
    }

    const email =
      requestedEmail ||
      (isInternalPlaceholderEmail(currentMember.email)
        ? String(currentMember.email)
        : normalizeEmail(currentMember.email));

    if (
      requestedEmail &&
      requestedEmail !== normalizeEmail(currentMember.email)
    ) {
      const existingMember = await db
        .prepare(
          `SELECT id
           FROM members
           WHERE organization_id = ? AND lower(email) = lower(?) AND id <> ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, requestedEmail, memberId)
        .first();

      if (existingMember) {
        return Response.json(
          { error: "Email già in uso da un altro membro" },
          { status: 409 },
        );
      }
    }

    const clerkUserId = deriveClerkUserId(
      String(currentMember.clerk_user_id),
      status,
      email,
      memberId,
    );

    await db
      .prepare(
        `UPDATE members
         SET email = ?, first_name = ?, last_name = ?, role = ?, status = ?, clerk_user_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ? AND id = ?`,
      )
      .bind(
        email,
        firstName,
        lastName,
        role,
        status,
        clerkUserId,
        principal.organizationId,
        memberId,
      )
      .run();

    await db
      .prepare(
        `DELETE FROM member_client_assignments
         WHERE organization_id = ? AND member_id = ?`,
      )
      .bind(principal.organizationId, memberId)
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
          memberId,
          principal.memberId,
          principal.organizationId,
          clientId,
        )
        .run();
    }

    return Response.json({
      success: true,
      message: "Utente aggiornato con successo",
    });
  } catch (error) {
    console.error("Team user PATCH error:", error);
    return Response.json(
      { error: "Errore interno del server" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    if (!["super-admin", "admin"].includes(principal.role)) {
      return Response.json(
        { error: "Non hai i permessi per rimuovere utenti" },
        { status: 403 },
      );
    }

    const { id: memberId } = await params;
    if (memberId === principal.memberId) {
      return Response.json(
        { error: "Non puoi eliminare il tuo account" },
        { status: 400 },
      );
    }

    const currentMember: any = await db
      .prepare(
        `SELECT id, role
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, memberId)
      .first();

    if (!currentMember) {
      return Response.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (
      !canManageUser(principal.role as UserRole, currentMember.role as UserRole)
    ) {
      return Response.json(
        { error: "Non hai i permessi per eliminare questo utente" },
        { status: 403 },
      );
    }

    await db
      .prepare(
        `UPDATE members
         SET status = 'removed',
             clerk_user_id = 'removed:' || id || ':' || clerk_user_id,
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = ? AND id = ?`,
      )
      .bind(principal.organizationId, memberId)
      .run();

    return Response.json({
      success: true,
      message:
        "Utente rimosso dal team. Lo storico operativo resta conservato.",
    });
  } catch (error) {
    console.error("Team user DELETE error:", error);
    return Response.json(
      { error: "Errore interno del server" },
      { status: 500 },
    );
  }
}
