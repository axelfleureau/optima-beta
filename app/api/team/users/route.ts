export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { canManageUser, type UserRole } from "@/lib/role-hierarchy";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const CREATABLE_ROLES = new Set([
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

export async function GET() {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (
      !["super-admin", "admin", "direzione", "capo-reparto"].includes(
        principal.role,
      )
    ) {
      return Response.json({ users: [] });
    }

    const [result, assignmentsResult] = await Promise.all([
      db
        .prepare(
          `SELECT id, clerk_user_id, email, first_name, last_name, role, status, last_login_at, created_at, updated_at
           FROM members
           WHERE organization_id = ? AND status IN ('active', 'invited', 'inactive', 'suspended')
           ORDER BY created_at ASC`,
        )
        .bind(principal.organizationId)
        .all(),
      db
        .prepare(
          `SELECT member_id, client_id
           FROM member_client_assignments
           WHERE organization_id = ?`,
        )
        .bind(principal.organizationId)
        .all(),
    ]);

    const assignedClientIdsByMember = new Map<string, string[]>();
    for (const row of (assignmentsResult.results || []) as any[]) {
      const memberId = String(row.member_id || "");
      const clientId = String(row.client_id || "");
      if (!memberId || !clientId) continue;
      assignedClientIdsByMember.set(memberId, [
        ...(assignedClientIdsByMember.get(memberId) || []),
        clientId,
      ]);
    }

    return Response.json({
      users: (result.results || []).map((member: any) => ({
        id: member.id,
        clerkUserId: member.clerk_user_id,
        email: isInternalPlaceholderEmail(member.email) ? "" : member.email,
        emailMissing: isInternalPlaceholderEmail(member.email),
        firstName: member.first_name || member.email?.split("@")[0] || "Utente",
        lastName: member.last_name || "",
        role: member.role || "junior",
        tenantId: principal.organizationId,
        status: member.status || "active",
        assignedClientIds:
          assignedClientIdsByMember.get(String(member.id)) || [],
        lastLoginAt: member.last_login_at
          ? new Date(member.last_login_at)
          : null,
        createdAt: member.created_at ? new Date(member.created_at) : new Date(),
        updatedAt: member.updated_at ? new Date(member.updated_at) : new Date(),
      })),
    });
  } catch (error) {
    console.error("Team users GET error:", error);
    return Response.json(
      { error: "Errore nel caricamento utenti" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
        { error: "Non hai i permessi per aggiungere membri al team" },
        { status: 403 },
      );
    }

    const body = await request.json();
    let email = normalizeEmail(body.email);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const role = String(body.role || "junior").trim();
    const assignedClientIds =
      role === "freelance"
        ? parseAssignedClientIds(body.assignedClientIds)
        : [];

    if (!firstName || !lastName || !role) {
      return Response.json(
        { error: "Campi obbligatori mancanti" },
        { status: 400 },
      );
    }

    if (email && !isValidEmail(email)) {
      return Response.json(
        { error: "Inserisci un indirizzo email valido" },
        { status: 400 },
      );
    }

    if (!CREATABLE_ROLES.has(role)) {
      return Response.json({ error: "Ruolo non valido" }, { status: 400 });
    }

    if (!canManageUser(principal.role as UserRole, role as UserRole)) {
      return Response.json(
        { error: "Non puoi aggiungere utenti con questo ruolo" },
        { status: 403 },
      );
    }

    const existingMember = email
      ? await db
          .prepare(
            `SELECT id
             FROM members
             WHERE organization_id = ? AND lower(email) = lower(?)
             LIMIT 1`,
          )
          .bind(principal.organizationId, email)
          .first()
      : null;

    if (existingMember) {
      return Response.json(
        { error: "Un membro con questa email esiste già nel team" },
        { status: 409 },
      );
    }

    const memberId = `mem_${crypto.randomUUID().replace(/-/g, "")}`;
    const emailMissing = !email;
    email = email || `${memberId}@no-email.optima.local`;
    const placeholderClerkUserId = emailMissing
      ? `placeholder:${memberId}`
      : `placeholder:${email}`;
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO members
         (id, organization_id, clerk_user_id, email, first_name, last_name, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'inactive')`,
      )
      .bind(
        memberId,
        principal.organizationId,
        placeholderClerkUserId,
        email,
        firstName,
        lastName,
        role,
      )
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
      message:
        role === "junior"
          ? "Junior aggiunto al team. Potrai invitarlo quando vuoi."
          : "Membro aggiunto al team. Potrai invitarlo quando vuoi.",
      user: {
        id: memberId,
        clerkUserId: placeholderClerkUserId,
        email: emailMissing ? "" : email,
        emailMissing,
        firstName,
        lastName,
        role,
        tenantId: principal.organizationId,
        assignedClientIds,
        status: "inactive",
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error("Team users POST error:", error);
    return Response.json(
      { error: "Errore durante la creazione del membro" },
      { status: 500 },
    );
  }
}
