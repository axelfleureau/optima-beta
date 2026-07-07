export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createId, getCloudflareDb } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { isWorkspaceClient } from "@/lib/workspace-permissions";

const CREDIT_MANAGER_ROLES = new Set(["super-admin", "admin", "direzione"]);
const MAX_RECEIPT_SIZE = 12 * 1024 * 1024;
const RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function normalizeDate(value: unknown) {
  const raw = String(value || "").trim();
  const parsed = raw ? new Date(`${raw.slice(0, 10)}T00:00:00.000Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function statementMonth(date: string) {
  return date.slice(0, 7);
}

function normalizeAmountCents(value: unknown) {
  const raw = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

function sanitizeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 120) || "scontrino"
  );
}

function canManageCredits(role: string) {
  return CREDIT_MANAGER_ROLES.has(role);
}

async function canAccessClient(
  db: any,
  organizationId: string,
  memberId: string,
  email: string,
  role: string,
  clientId: string,
) {
  if (canManageCredits(role)) return true;

  const row = await db
    .prepare(
      `SELECT 1
       FROM clients c
       WHERE c.organization_id = ?
         AND c.id = ?
         AND (
           lower(COALESCE(c.email, '')) = lower(?)
           OR EXISTS (
             SELECT 1
             FROM projects p
             JOIN project_members pm
               ON pm.project_id = p.id
              AND pm.organization_id = p.organization_id
             WHERE p.organization_id = c.organization_id
               AND p.client_id = c.id
               AND pm.member_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM tasks t
             LEFT JOIN projects tp
               ON tp.id = t.project_id
              AND tp.organization_id = t.organization_id
             WHERE t.organization_id = c.organization_id
               AND (t.client_id = c.id OR tp.client_id = c.id)
               AND (
                 t.assignee_member_id = ?
                 OR t.created_by_member_id = ?
                 OR EXISTS (
                   SELECT 1
                   FROM project_members tpm
                   WHERE tpm.organization_id = t.organization_id
                     AND tpm.project_id = t.project_id
                     AND tpm.member_id = ?
                 )
               )
           )
         )
       LIMIT 1`,
    )
    .bind(
      organizationId,
      clientId,
      email,
      memberId,
      memberId,
      memberId,
      memberId,
    )
    .first();

  return Boolean(row);
}

async function visibleClients(
  db: any,
  principal: {
    organizationId: string;
    memberId: string;
    role: string;
    email: string;
  },
) {
  if (canManageCredits(principal.role)) {
    const result = await db
      .prepare(
        `SELECT id, name, company, email
         FROM clients
         WHERE organization_id = ?
           AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         ORDER BY name ASC`,
      )
      .bind(principal.organizationId)
      .all();
    return result.results || [];
  }

  const result = await db
    .prepare(
      `SELECT DISTINCT c.id, c.name, c.company, c.email
       FROM clients c
       WHERE c.organization_id = ?
         AND COALESCE(c.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         AND (
           lower(COALESCE(c.email, '')) = lower(?)
           OR EXISTS (
             SELECT 1
             FROM projects p
             JOIN project_members pm
               ON pm.project_id = p.id
              AND pm.organization_id = p.organization_id
             WHERE p.organization_id = c.organization_id
               AND p.client_id = c.id
               AND pm.member_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM tasks t
             LEFT JOIN projects tp
               ON tp.id = t.project_id
              AND tp.organization_id = t.organization_id
             WHERE t.organization_id = c.organization_id
               AND (t.client_id = c.id OR tp.client_id = c.id)
               AND (
                 t.assignee_member_id = ?
                 OR t.created_by_member_id = ?
                 OR EXISTS (
                   SELECT 1
                   FROM project_members tpm
                   WHERE tpm.organization_id = t.organization_id
                     AND tpm.project_id = t.project_id
                     AND tpm.member_id = ?
                 )
               )
           )
         )
       ORDER BY c.name ASC`,
    )
    .bind(
      principal.organizationId,
      principal.email,
      principal.memberId,
      principal.memberId,
      principal.memberId,
      principal.memberId,
    )
    .all();

  return result.results || [];
}

function rowToTransaction(row: any) {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    type: row.type === "credit" ? "credit" : "debit",
    amountCents: Number(row.amount_cents || 0),
    currency: String(row.currency || "EUR"),
    description: String(row.description || ""),
    statementMonth: String(row.statement_month || ""),
    occurredOn: String(row.occurred_on || ""),
    status: String(row.status || "approved"),
    receipt: row.receipt_r2_key
      ? {
          name: String(row.receipt_file_name || "scontrino"),
          type: String(row.receipt_content_type || "application/octet-stream"),
          size: Number(row.receipt_size || 0),
          url: `/api/client-credits/${row.id}/receipt`,
        }
      : null,
    createdBy: {
      id: row.created_by_member_id || null,
      role: row.created_by_role || "",
      name:
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        row.member_email ||
        "",
    },
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (
      !canManageCredits(principal.role) &&
      !isWorkspaceClient(principal.role)
    ) {
      return Response.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    const clients = await visibleClients(db, principal);
    const requestedClientId = new URL(request.url).searchParams.get("clientId");
    const selectedClient =
      clients.find((client: any) => String(client.id) === requestedClientId) ||
      clients[0] ||
      null;

    const balancesResult =
      clients.length > 0
        ? await db
            .prepare(
              `SELECT client_id,
                      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount_cents ELSE -amount_cents END), 0) AS balance_cents,
                      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount_cents ELSE 0 END), 0) AS credited_cents,
                      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount_cents ELSE 0 END), 0) AS spent_cents
               FROM client_credit_transactions
               WHERE organization_id = ?
               GROUP BY client_id`,
            )
            .bind(principal.organizationId)
            .all()
        : { results: [] };

    const balances = new Map(
      (balancesResult.results || []).map((row: any) => [
        String(row.client_id),
        {
          balanceCents: Number(row.balance_cents || 0),
          creditedCents: Number(row.credited_cents || 0),
          spentCents: Number(row.spent_cents || 0),
        },
      ]),
    );

    const transactions = selectedClient
      ? await db
          .prepare(
            `SELECT cct.*, m.first_name, m.last_name, m.email AS member_email
             FROM client_credit_transactions cct
             LEFT JOIN members m
               ON m.id = cct.created_by_member_id
              AND m.organization_id = cct.organization_id
             WHERE cct.organization_id = ?
               AND cct.client_id = ?
             ORDER BY date(cct.occurred_on) DESC, datetime(cct.created_at) DESC
             LIMIT 120`,
          )
          .bind(principal.organizationId, selectedClient.id)
          .all()
      : { results: [] };

    return Response.json({
      canManageCredits: canManageCredits(principal.role),
      clients: clients.map((client: any) => ({
        id: String(client.id),
        name: String(client.name || ""),
        company: String(client.company || client.name || ""),
        email: String(client.email || ""),
        ...(balances.get(String(client.id)) || {
          balanceCents: 0,
          creditedCents: 0,
          spentCents: 0,
        }),
      })),
      selectedClientId: selectedClient ? String(selectedClient.id) : "",
      transactions: (transactions.results || []).map(rowToTransaction),
    });
  } catch (error) {
    console.error("Client credits GET error:", error);
    return Response.json(
      { error: "Errore nel caricamento crediti cliente" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getCloudflareDb();
    const bucket = await getTaskMediaBucket();
    if (!db || !bucket) {
      return Response.json(
        { error: "Database o storage Cloudflare non configurato" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (
      !canManageCredits(principal.role) &&
      !isWorkspaceClient(principal.role)
    ) {
      return Response.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const clientId = String(formData.get("clientId") || "").trim();
    const type = String(formData.get("type") || "debit").trim();
    const amountCents = normalizeAmountCents(formData.get("amount"));
    const occurredOn = normalizeDate(formData.get("occurredOn"));
    const description = String(formData.get("description") || "").trim();
    const receipt = formData.get("receipt");

    if (!clientId) {
      return Response.json({ error: "Cliente obbligatorio" }, { status: 400 });
    }

    if (type !== "credit" && type !== "debit") {
      return Response.json(
        { error: "Tipo movimento non valido" },
        { status: 400 },
      );
    }

    if (type === "credit" && !canManageCredits(principal.role)) {
      return Response.json(
        { error: "Solo admin e direzione possono aggiungere credito" },
        { status: 403 },
      );
    }

    if (amountCents <= 0) {
      return Response.json({ error: "Importo non valido" }, { status: 400 });
    }

    const allowed = await canAccessClient(
      db,
      principal.organizationId,
      principal.memberId,
      principal.email,
      principal.role,
      clientId,
    );
    if (!allowed) {
      return Response.json(
        { error: "Non puoi operare su questo cliente" },
        { status: 403 },
      );
    }

    let receiptMeta: {
      key: string | null;
      name: string | null;
      type: string | null;
      size: number;
    } = { key: null, name: null, type: null, size: 0 };

    if (type === "debit") {
      if (!(receipt instanceof File) || receipt.size <= 0) {
        return Response.json(
          { error: "Carica la foto o il PDF dello scontrino" },
          { status: 400 },
        );
      }

      if (receipt.size > MAX_RECEIPT_SIZE) {
        return Response.json(
          { error: "La prova supera il limite di 12 MB" },
          { status: 400 },
        );
      }

      const contentType = receipt.type || "application/octet-stream";
      if (!RECEIPT_TYPES.has(contentType)) {
        return Response.json(
          { error: "Formato prova non supportato. Usa immagine o PDF." },
          { status: 400 },
        );
      }

      const safeName = sanitizeFileName(receipt.name || "scontrino");
      const transactionId = createId("ccr");
      const key = `${principal.organizationId}/client-credits/${clientId}/${transactionId}-${safeName}`;
      await bucket.put(key, receipt.stream(), {
        httpMetadata: { contentType },
        customMetadata: {
          clientId,
          transactionId,
          uploadedBy: principal.memberId,
          originalName: receipt.name || safeName,
        },
      });
      receiptMeta = {
        key,
        name: receipt.name || safeName,
        type: contentType,
        size: receipt.size,
      };

      await db
        .prepare(
          `INSERT INTO client_credit_transactions
           (id, organization_id, client_id, type, amount_cents, currency, description,
            statement_month, occurred_on, receipt_r2_key, receipt_file_name,
            receipt_content_type, receipt_size, created_by_member_id, created_by_role)
           VALUES (?, ?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          transactionId,
          principal.organizationId,
          clientId,
          type,
          amountCents,
          description || "Scontrino cliente",
          statementMonth(occurredOn),
          occurredOn,
          receiptMeta.key,
          receiptMeta.name,
          receiptMeta.type,
          receiptMeta.size,
          principal.memberId,
          principal.role,
        )
        .run();

      return Response.json({ ok: true, id: transactionId }, { status: 201 });
    }

    const transactionId = createId("ccr");
    await db
      .prepare(
        `INSERT INTO client_credit_transactions
         (id, organization_id, client_id, type, amount_cents, currency, description,
          statement_month, occurred_on, created_by_member_id, created_by_role)
         VALUES (?, ?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?)`,
      )
      .bind(
        transactionId,
        principal.organizationId,
        clientId,
        type,
        amountCents,
        description || "Credito mensile",
        statementMonth(occurredOn),
        occurredOn,
        principal.memberId,
        principal.role,
      )
      .run();

    return Response.json({ ok: true, id: transactionId }, { status: 201 });
  } catch (error) {
    console.error("Client credits POST error:", error);
    return Response.json(
      { error: "Errore durante il salvataggio del movimento" },
      { status: 500 },
    );
  }
}
