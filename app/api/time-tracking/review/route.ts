export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { resolveEmailBrand } from "@/lib/email-branding";
import { sendOperationalReportChangesRequestedEmail } from "@/lib/email";
import { requireClerkUser } from "@/lib/server-clerk";
import { refreshWorkDayReviewStatus } from "@/lib/time-entry-review";
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

function normalizeEntryIds(body: Record<string, unknown>) {
  const rawIds = Array.isArray(body.entryIds)
    ? body.entryIds
    : body.entryId
      ? [body.entryId]
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

function placeholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
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
    const requestedEntryIds = normalizeEntryIds(body);
    const action = String(body.action || "");
    const notes = String(body.notes || "").trim();

    if (
      (!workDayIds.length && !requestedEntryIds.length) ||
      !REVIEW_ACTIONS.has(action)
    ) {
      return Response.json(
        { error: "Richiesta revisione non valida" },
        { status: 400 },
      );
    }

    if (action === "changes_requested" && notes.length < 6) {
      return Response.json(
        { error: "Scrivi un messaggio chiaro per il dipendente" },
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

    const entryIds = [...requestedEntryIds];

    if (workDayIds.length) {
      const workDayPlaceholders = placeholders(workDayIds.length);
      const dayEntries = await db
        .prepare(
          `SELECT te.id
           FROM time_entries te
           JOIN work_days wd
             ON wd.organization_id = te.organization_id
            AND wd.member_id = te.member_id
            AND wd.entry_date = te.entry_date
           WHERE te.organization_id = ?
             AND wd.id IN (${workDayPlaceholders})
             AND te.review_status IN ('submitted', 'changes_requested')`,
        )
        .bind(principal.organizationId, ...workDayIds)
        .all();

      for (const row of dayEntries.results || []) {
        const entryId = String((row as any).id || "");
        if (entryId && !entryIds.includes(entryId)) entryIds.push(entryId);
      }
    }

    if (!entryIds.length) {
      return Response.json(
        { error: "Nessuna attività in attesa di revisione" },
        { status: 404 },
      );
    }

    const entryPlaceholders = placeholders(entryIds.length);
    const targetEntries = await db
      .prepare(
        `SELECT te.id,
                te.member_id,
                te.entry_date,
                te.review_status,
                m.email,
                m.first_name,
                m.last_name
         FROM time_entries te
         JOIN members m ON m.id = te.member_id AND m.organization_id = te.organization_id
         WHERE te.organization_id = ?
           AND te.id IN (${entryPlaceholders})
           AND te.review_status IN ('submitted', 'changes_requested')`,
      )
      .bind(principal.organizationId, ...entryIds)
      .all();

    const rows = (targetEntries.results || []) as any[];
    if (!rows.length) {
      return Response.json(
        { error: "Attività non trovata o già revisionata" },
        { status: 404 },
      );
    }

    const validEntryIds = rows.map((row) => String(row.id));
    const validPlaceholders = placeholders(validEntryIds.length);
    const result = await db
      .prepare(
        action === "approved"
          ? `UPDATE time_entries
             SET review_status = 'approved',
                 reviewed_at = CURRENT_TIMESTAMP,
                 reviewed_by_member_id = ?,
                 review_notes = NULL,
                 approved_at = CURRENT_TIMESTAMP,
                 approved_by_member_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ?
               AND id IN (${validPlaceholders})
               AND review_status IN ('submitted', 'changes_requested')`
          : `UPDATE time_entries
             SET review_status = 'changes_requested',
                 reviewed_at = CURRENT_TIMESTAMP,
                 reviewed_by_member_id = ?,
                 review_notes = ?,
                 approved_at = NULL,
                 approved_by_member_id = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = ?
               AND id IN (${validPlaceholders})
               AND review_status IN ('submitted', 'changes_requested')`,
      )
      .bind(
        ...(action === "approved"
          ? [principal.memberId, principal.memberId, principal.organizationId]
          : [principal.memberId, notes, principal.organizationId]),
        ...validEntryIds,
      )
      .run();

    updated += result.meta?.changes ?? 0;

    const touchedDays = new Map<
      string,
      { memberId: string; entryDate: string }
    >();
    const emailGroups = new Map<string, any>();
    for (const row of rows) {
      const memberId = String(row.member_id);
      const entryDate = String(row.entry_date);
      const key = `${memberId}:${entryDate}`;
      touchedDays.set(key, { memberId, entryDate });
      if (action === "changes_requested") {
        emailGroups.set(key, row);
      }
    }

    for (const day of touchedDays.values()) {
      await refreshWorkDayReviewStatus(
        db,
        principal.organizationId,
        day.memberId,
        day.entryDate,
        principal.memberId,
      );
    }

    if (action === "changes_requested") {
      for (const report of emailGroups.values()) {
        if (!isDeliverableEmail(report.email)) continue;
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
        { error: "Rapportino non trovato o già revisionato" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      reviewStatus: action,
      updated,
      requested: entryIds.length,
      workDayIds,
      entryIds: validEntryIds,
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
