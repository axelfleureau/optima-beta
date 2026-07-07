export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { resolveEmailBrand } from "@/lib/email-branding";
import { sendOperationalReportChangesRequestedEmail } from "@/lib/email";
import { requireClerkUser } from "@/lib/server-clerk";
import { canManageTime } from "@/lib/time-tracking";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

const REVIEW_ACTIONS = new Set(["approved", "changes_requested"]);

function normalizeWorkDayIds(body: Record<string, unknown>) {
  const rawIds = Array.isArray(body.workDayIds)
    ? body.workDayIds
    : body.workDayId
      ? [body.workDayId]
      : [];

  return Array.from(
    new Set(
      rawIds
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .slice(0, 100),
    ),
  );
}

function formatName(row: any) {
  return (
    [row?.first_name ?? row?.firstName, row?.last_name ?? row?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    row?.email ||
    "Utente"
  );
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function isDeliverableEmail(value: unknown) {
  const email = String(value || "").trim();
  return Boolean(
    email && email.includes("@") && !email.endsWith("@no-email.optima.local"),
  );
}

export async function POST(request: NextRequest) {
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
    if (!canManageTime(principal)) {
      return Response.json(
        {
          error: "Solo responsabili e direzione possono revisionare rapportini",
        },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const workDayIds = normalizeWorkDayIds(body);
    const action = String(body.action || "");
    const notes = String(body.notes || "").trim();

    if (!workDayIds.length || !REVIEW_ACTIONS.has(action)) {
      return Response.json(
        { error: "Richiesta revisione non valida" },
        { status: 400 },
      );
    }

    let updated = 0;
    let emailSent = 0;
    let emailRequested = 0;
    const brand =
      action === "changes_requested"
        ? await resolveEmailBrand(db, principal.organizationId)
        : null;

    for (const workDayId of workDayIds) {
      const report =
        action === "changes_requested"
          ? await db
              .prepare(
                `SELECT wd.id,
                        wd.entry_date,
                        m.email,
                        m.first_name,
                        m.last_name
                 FROM work_days wd
                 JOIN members m ON m.id = wd.member_id AND m.organization_id = wd.organization_id
                 WHERE wd.organization_id = ?
                   AND wd.id = ?
                   AND wd.review_status = 'submitted'
                 LIMIT 1`,
              )
              .bind(principal.organizationId, workDayId)
              .first()
          : null;

      const result = await db
        .prepare(
          `UPDATE work_days
           SET review_status = ?,
               reviewed_at = CURRENT_TIMESTAMP,
               reviewed_by_member_id = ?,
               review_notes = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ? AND review_status = 'submitted'`,
        )
        .bind(
          action,
          principal.memberId,
          notes || null,
          principal.organizationId,
          workDayId,
        )
        .run();

      updated += result.meta?.changes ?? 0;

      if (
        action === "changes_requested" &&
        result.meta?.changes &&
        report &&
        isDeliverableEmail(report.email)
      ) {
        emailRequested += 1;
        try {
          const sent = await sendOperationalReportChangesRequestedEmail({
            brand: brand || undefined,
            to: String(report.email),
            recipientName: formatName(report),
            reviewerName: formatName(principal),
            dateLabel: formatDateLabel(String(report.entry_date)),
            notes,
          });
          if (sent) emailSent += 1;
        } catch (emailError) {
          console.error("Time tracking review email error:", emailError);
        }
      }
    }

    if (updated < 1) {
      return Response.json(
        { error: "Rapportino non trovato o gia revisionato" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      reviewStatus: action,
      updated,
      requested: workDayIds.length,
      emailSent,
      emailRequested,
    });
  } catch (error) {
    console.error("Time tracking review error:", error);
    return Response.json(
      { error: "Errore durante la revisione del rapportino" },
      { status: 500 },
    );
  }
}
