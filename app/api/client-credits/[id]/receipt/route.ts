export const dynamic = "force-dynamic";

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CREDIT_MANAGER_ROLES = new Set(["super-admin", "admin", "direzione"]);

function contentDisposition(filename: string) {
  return `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function canAccessReceipt(
  db: any,
  transaction: any,
  principal: {
    organizationId: string;
    memberId: string;
    role: string;
    email: string;
  },
) {
  if (CREDIT_MANAGER_ROLES.has(principal.role)) return true;

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
      principal.organizationId,
      transaction.client_id,
      principal.email,
      principal.memberId,
      principal.memberId,
      principal.memberId,
      principal.memberId,
    )
    .first();

  return Boolean(row);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireClerkUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getCloudflareDb();
    const bucket = await getTaskMediaBucket();
    if (!db || !bucket) {
      return Response.json(
        { error: "Storage Cloudflare non configurato" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    const { id } = await context.params;
    const transaction = await db
      .prepare(
        `SELECT id, organization_id, client_id, receipt_r2_key, receipt_file_name
         FROM client_credit_transactions
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, id)
      .first();

    if (!transaction?.id || !transaction.receipt_r2_key) {
      return Response.json({ error: "Ricevuta non trovata" }, { status: 404 });
    }

    const allowed = await canAccessReceipt(db, transaction, principal);
    if (!allowed) {
      return Response.json(
        { error: "Permessi insufficienti" },
        { status: 403 },
      );
    }

    const object = await bucket.get(transaction.receipt_r2_key);
    if (!object?.body) {
      return Response.json(
        { error: "File non trovato nello storage" },
        { status: 404 },
      );
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set(
      "content-disposition",
      contentDisposition(String(transaction.receipt_file_name || "scontrino")),
    );
    headers.set("cache-control", "private, max-age=300");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Client credit receipt download error:", error);
    return Response.json(
      { error: "Errore durante il download della ricevuta" },
      { status: 500 },
    );
  }
}
