export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import {
  canManageTime,
  currentPresenceMinutes,
  netPresenceMinutes,
  normalizeDate,
  tracksPresence,
  usesTaskOnlyWorkLog,
  workScheduleForMember,
} from "@/lib/time-tracking";
import { isExternalWorkspaceMember } from "@/lib/workspace-permissions";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

const ACTIVITY_CATEGORIES = [
  "Strategia e pianificazione",
  "Creatività e produzione",
  "Account e project management",
  "Digital e media",
  "PR e relazioni esterne",
  "Attività interna non fatturabile",
];

function parseActivityCategory(note: unknown) {
  const value = String(note || "");
  const match = value.match(/^\[([^\]]+)\]\s*/);
  if (!match) return "";
  const category = match[1]?.trim() || "";
  return ACTIVITY_CATEGORIES.includes(category) ? category : "";
}

function normalizeClientLabel(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeClientKey(value: unknown) {
  return normalizeClientLabel(value).toLowerCase();
}

function clientDisplayLabel(client: any) {
  const name = normalizeClientLabel(client.name);
  const company = normalizeClientLabel(client.company);
  if (!company || normalizeClientKey(company) === normalizeClientKey(name))
    return name;
  return `${name} · ${company}`;
}

function dedupeClientOptions(rows: any[] = []) {
  const seen = new Set<string>();
  const clients: Array<{
    id: string;
    label: string;
    name: string;
    company: string;
  }> = [];

  for (const client of rows) {
    const name = normalizeClientLabel(client.name);
    if (!name) continue;
    const company = normalizeClientLabel(client.company);
    const key = normalizeClientKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    clients.push({
      id: String(client.id),
      label: clientDisplayLabel(client),
      name,
      company: normalizeClientKey(company) === key ? "" : company,
    });
  }

  return clients;
}

function rowToMember(row: any) {
  return {
    id: String(row.id),
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email,
    email: row.email,
    role: row.role,
    tracksPresence: tracksPresence(row.role),
    workTrackingMode: usesTaskOnlyWorkLog(row.role) ? "task-only" : "presence",
  };
}

function rowToEntry(row: any) {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    projectId: row.project_id || null,
    taskId: row.task_id || null,
    clientId: row.client_id || null,
    date: row.entry_date,
    minutes: Number(row.minutes || 0),
    billable: Number(row.billable ?? 1) === 1,
    activityCategory: parseActivityCategory(row.note),
    note: row.note || "",
    workMode: row.work_mode === "remote" ? "remote" : "office",
    taskTitle: row.task_title || "",
    clientName: row.client_name || "",
    projectName:
      row.project_name || row.client_name || "Attività non collegata",
    createdAt: row.created_at,
  };
}

function parseSubItems(value: unknown) {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            id: String(item.id || ""),
            title: String(item.title || ""),
            completed: Boolean(item.completed),
            createdAt: item.createdAt || null,
          }))
          .filter((item) => item.id && item.title)
      : [];
  } catch {
    return [];
  }
}

function weekBounds(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const weekday = parsed.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const start = new Date(parsed);
  start.setUTCDate(parsed.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function monthBounds(date: string) {
  const [yearRaw, monthRaw] = date.split("-").map(Number);
  const year = Number.isInteger(yearRaw)
    ? yearRaw
    : new Date().getUTCFullYear();
  const month = Number.isInteger(monthRaw)
    ? monthRaw
    : new Date().getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getCloudflareDb();
    if (!db)
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );

    const principal = await ensureWorkspacePrincipal(db, user);
    const isManager = canManageTime(principal);
    const { searchParams } = new URL(request.url);
    const date = normalizeDate(searchParams.get("date"));
    const week = weekBounds(date);
    const month = monthBounds(date);
    const requestedMemberId = searchParams.get("memberId");
    const selectedMemberId =
      isManager && requestedMemberId ? requestedMemberId : principal.memberId;
    const shouldScopeOptions = isExternalWorkspaceMember(principal.role);

    const selectedMember = await db
      .prepare(
        `SELECT id, email, first_name, last_name, role
                , weekly_capacity_minutes
         FROM members
         WHERE organization_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, selectedMemberId)
      .first();

    if (!selectedMember) {
      return Response.json(
        { error: "Dipendente non trovato" },
        { status: 404 },
      );
    }

    const schedule = workScheduleForMember(
      (selectedMember as any).weekly_capacity_minutes,
    );
    const selectedMemberTracksPresence = tracksPresence(
      (selectedMember as any).role,
    );
    const selectedMemberWorkTrackingMode = usesTaskOnlyWorkLog(
      (selectedMember as any).role,
    )
      ? "task-only"
      : "presence";

    const membersResult = isManager
      ? await db
          .prepare(
            `SELECT id, email, first_name, last_name, role
             FROM members
             WHERE organization_id = ?
               AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
               AND role IN ('super-admin', 'admin', 'direzione', 'capo-reparto', 'junior', 'freelance', 'member', 'dipendente', 'employee')
             ORDER BY first_name, last_name, email`,
          )
          .bind(principal.organizationId)
          .all()
      : { results: [selectedMember] };

    const day =
      (await db
        .prepare(
          `SELECT *
           FROM work_days
           WHERE organization_id = ? AND member_id = ? AND entry_date = ?
           LIMIT 1`,
        )
        .bind(principal.organizationId, selectedMemberId, date)
        .first()) || null;

    const entries = await db
      .prepare(
        `SELECT te.*,
                t.title AS task_title,
                COALESCE(c.name, tc.name, pc.name, t.client_name) AS client_name,
                COALESCE(p.name, t.client_name, c.name, tc.name, pc.name) AS project_name
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id AND t.organization_id = te.organization_id
         LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
         LEFT JOIN clients c ON c.id = te.client_id AND c.organization_id = te.organization_id
         LEFT JOIN clients tc ON tc.id = t.client_id AND tc.organization_id = te.organization_id
         LEFT JOIN clients pc ON pc.id = p.client_id AND pc.organization_id = te.organization_id
         WHERE te.organization_id = ?
           AND te.member_id = ?
           AND te.entry_date = ?
         ORDER BY te.created_at DESC`,
      )
      .bind(principal.organizationId, selectedMemberId, date)
      .all();

    const [weekTotals, monthTotals] = await Promise.all([
      db
        .prepare(
          `SELECT
             COALESCE(SUM(te.minutes), 0) AS activity_minutes,
             COUNT(te.id) AS entry_count,
	             COALESCE((
	               SELECT ROUND(SUM(
	                 CASE
	                   WHEN wd.check_in_at IS NOT NULL AND wd.check_out_at IS NOT NULL AND wd.status != 'absent'
	                   THEN CASE
	                     WHEN ((julianday(wd.check_out_at) - julianday(wd.check_in_at)) * 1440) >= ?
	                     THEN ((julianday(wd.check_out_at) - julianday(wd.check_in_at)) * 1440) - ?
	                     ELSE (julianday(wd.check_out_at) - julianday(wd.check_in_at)) * 1440
	                   END
	                   ELSE 0
	                 END
	               ))
	               FROM work_days wd
	               WHERE wd.organization_id = ?
	                 AND wd.member_id = ?
	                 AND date(wd.entry_date) BETWEEN date(?) AND date(?)
	             ), 0) AS presence_minutes
           FROM time_entries te
           WHERE te.organization_id = ?
             AND te.member_id = ?
             AND date(te.entry_date) BETWEEN date(?) AND date(?)`,
        )
        .bind(
          schedule.lunchBreakMinutes * 6,
          schedule.lunchBreakMinutes,
          principal.organizationId,
          selectedMemberId,
          week.start,
          week.end,
          principal.organizationId,
          selectedMemberId,
          week.start,
          week.end,
        )
        .first(),
      db
        .prepare(
          `SELECT
             COALESCE(SUM(te.minutes), 0) AS activity_minutes,
             COUNT(te.id) AS entry_count,
	             COALESCE((
	               SELECT ROUND(SUM(
	                 CASE
	                   WHEN wd.check_in_at IS NOT NULL AND wd.check_out_at IS NOT NULL AND wd.status != 'absent'
	                   THEN CASE
	                     WHEN ((julianday(wd.check_out_at) - julianday(wd.check_in_at)) * 1440) >= ?
	                     THEN ((julianday(wd.check_out_at) - julianday(wd.check_in_at)) * 1440) - ?
	                     ELSE (julianday(wd.check_out_at) - julianday(wd.check_in_at)) * 1440
	                   END
	                   ELSE 0
	                 END
	               ))
	               FROM work_days wd
	               WHERE wd.organization_id = ?
	                 AND wd.member_id = ?
	                 AND date(wd.entry_date) BETWEEN date(?) AND date(?)
	             ), 0) AS presence_minutes
           FROM time_entries te
           WHERE te.organization_id = ?
             AND te.member_id = ?
             AND date(te.entry_date) BETWEEN date(?) AND date(?)`,
        )
        .bind(
          schedule.lunchBreakMinutes * 6,
          schedule.lunchBreakMinutes,
          principal.organizationId,
          selectedMemberId,
          month.start,
          month.end,
          principal.organizationId,
          selectedMemberId,
          month.start,
          month.end,
        )
        .first(),
    ]);

    const submittedReports = isManager
      ? await db
          .prepare(
            `SELECT wd.id,
                    wd.entry_date,
                    wd.review_status,
                    wd.submitted_at,
                    wd.review_notes,
                    m.id AS member_id,
                    m.email,
                    m.first_name,
                    m.last_name,
                    m.role,
                    COALESCE(te.activity_minutes, 0) AS activity_minutes,
                    COALESCE(te.entry_count, 0) AS entry_count
             FROM work_days wd
             JOIN members m ON m.id = wd.member_id AND m.organization_id = wd.organization_id
             LEFT JOIN (
               SELECT organization_id, member_id, entry_date, SUM(minutes) AS activity_minutes, COUNT(*) AS entry_count
               FROM time_entries
               WHERE organization_id = ?
               GROUP BY organization_id, member_id, entry_date
             ) te
               ON te.organization_id = wd.organization_id
              AND te.member_id = wd.member_id
              AND te.entry_date = wd.entry_date
             WHERE wd.organization_id = ?
               AND wd.review_status = 'submitted'
               AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled', 'inactive')
             ORDER BY date(wd.entry_date) DESC, wd.submitted_at ASC
             LIMIT 80`,
          )
          .bind(principal.organizationId, principal.organizationId)
          .all()
      : { results: [] };

    const taskOptions = await db
      .prepare(
        `SELECT t.id,
                t.title,
                t.client_id,
                COALESCE(c.name, t.client_name) AS client_name,
                t.project_id,
                t.status,
                t.column_id,
      t.priority,
      t.work_mode,
      t.due_at,
                t.sub_items_json,
                p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         LEFT JOIN clients c ON c.id = t.client_id AND c.organization_id = t.organization_id
         WHERE t.organization_id = ?
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
         ORDER BY t.updated_at DESC
         LIMIT 200`,
      )
      .bind(
        principal.organizationId,
        selectedMemberId,
        selectedMemberId,
        selectedMemberId,
      )
      .all();

    const projectOptions = await db
      .prepare(
        `SELECT p.id, p.name, p.client_id, c.name AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
         WHERE p.organization_id = ?
           AND (
             ? = 0
             OR EXISTS (
               SELECT 1
               FROM project_members pm
               WHERE pm.organization_id = p.organization_id
                 AND pm.project_id = p.id
                 AND pm.member_id = ?
             )
           )
         ORDER BY p.updated_at DESC
         LIMIT 100`,
      )
      .bind(
        principal.organizationId,
        shouldScopeOptions ? 1 : 0,
        selectedMemberId,
      )
      .all();

    const clientOptions = await db
      .prepare(
        `SELECT id, name, company
         FROM clients
         WHERE organization_id = ?
           AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
           AND (
             ? = 0
             OR EXISTS (
               SELECT 1
               FROM member_client_assignments mca
               WHERE mca.organization_id = clients.organization_id
                 AND mca.client_id = clients.id
                 AND mca.member_id = ?
             )
             OR EXISTS (
               SELECT 1
               FROM tasks vt
               LEFT JOIN projects vtp
                 ON vtp.id = vt.project_id
                AND vtp.organization_id = vt.organization_id
               WHERE vt.organization_id = clients.organization_id
                 AND (vt.client_id = clients.id OR vtp.client_id = clients.id)
                 AND (
                   vt.assignee_member_id = ?
                   OR vt.created_by_member_id = ?
                   OR EXISTS (
                     SELECT 1
                     FROM project_members vtpm
                     WHERE vtpm.organization_id = vt.organization_id
                       AND vtpm.project_id = vt.project_id
                       AND vtpm.member_id = ?
                   )
                 )
             )
             OR EXISTS (
               SELECT 1
               FROM projects vp
               JOIN project_members vpm
                 ON vpm.project_id = vp.id
                AND vpm.organization_id = vp.organization_id
               WHERE vp.organization_id = clients.organization_id
                 AND vp.client_id = clients.id
                 AND vpm.member_id = ?
             )
           )
         ORDER BY name ASC
         LIMIT 200`,
      )
      .bind(
        principal.organizationId,
        shouldScopeOptions ? 1 : 0,
        selectedMemberId,
        selectedMemberId,
        selectedMemberId,
        selectedMemberId,
        selectedMemberId,
      )
      .all();

    const mappedEntries: ReturnType<typeof rowToEntry>[] = (
      entries.results || []
    ).map(rowToEntry);
    const activityMinutes = mappedEntries.reduce(
      (sum: number, entry: ReturnType<typeof rowToEntry>) =>
        sum + entry.minutes,
      0,
    );
    const grossPresenceMinutes = currentPresenceMinutes(
      day?.check_in_at,
      day?.check_out_at,
    );
    const presenceMinutes = selectedMemberTracksPresence
      ? netPresenceMinutes(grossPresenceMinutes, schedule.lunchBreakMinutes)
      : 0;

    return Response.json(
      {
        role: principal.role,
        isManager,
        workTrackingMode: selectedMemberWorkTrackingMode,
        tracksPresence: selectedMemberTracksPresence,
        selectedMember: rowToMember(selectedMember),
        members: (membersResult.results || []).map(rowToMember),
        day: day
          ? {
              id: day.id,
              date: day.entry_date,
              checkInAt: day.check_in_at,
              checkOutAt: day.check_out_at,
              status: day.status,
              absenceReason: day.absence_reason,
              notes: day.notes || "",
              reviewStatus: day.review_status || "draft",
              submittedAt: day.submitted_at || null,
              reviewedAt: day.reviewed_at || null,
              reviewNotes: day.review_notes || "",
            }
          : null,
        entries: mappedEntries,
        submittedReports: (submittedReports.results || []).map(
          (report: any) => ({
            id: String(report.id),
            date: report.entry_date,
            reviewStatus: report.review_status || "submitted",
            submittedAt: report.submitted_at || null,
            memberId: String(report.member_id),
            memberName:
              `${report.first_name || ""} ${report.last_name || ""}`.trim() ||
              report.email,
            memberEmail: report.email || "",
            role: report.role || "",
            activityMinutes: Number(report.activity_minutes || 0),
            entryCount: Number(report.entry_count || 0),
            reviewNotes: report.review_notes || "",
          }),
        ),
        schedule: {
          workStartTime: schedule.workStartTime,
          expectedCheckOutTime: schedule.expectedCheckOutTime,
          expectedOfficeMinutes: schedule.expectedOfficeMinutes,
          lunchBreakMinutes: schedule.lunchBreakMinutes,
        },
        totals: {
          activityMinutes,
          presenceMinutes,
          grossPresenceMinutes,
          expectedOfficeMinutes: schedule.expectedOfficeMinutes,
          lunchBreakMinutes: schedule.lunchBreakMinutes,
          week: {
            start: week.start,
            end: week.end,
            activityMinutes: Number((weekTotals as any)?.activity_minutes || 0),
            presenceMinutes: selectedMemberTracksPresence
              ? Number((weekTotals as any)?.presence_minutes || 0)
              : 0,
            entryCount: Number((weekTotals as any)?.entry_count || 0),
          },
          month: {
            start: month.start,
            end: month.end,
            activityMinutes: Number(
              (monthTotals as any)?.activity_minutes || 0,
            ),
            presenceMinutes: selectedMemberTracksPresence
              ? Number((monthTotals as any)?.presence_minutes || 0)
              : 0,
            entryCount: Number((monthTotals as any)?.entry_count || 0),
          },
        },
        options: {
          tasks: (taskOptions.results || []).map((task: any) => ({
            id: task.id,
            label: `${task.client_name ? `${task.client_name}: ` : ""}${task.title}`,
            clientId: task.client_id || null,
            projectId: task.project_id || null,
            title: task.title || "",
            clientName: task.client_name || "",
            projectName: task.project_name || "",
            status: task.column_id || task.status || "to-do",
            priority: task.priority || "medium",
            workMode: task.work_mode === "remote" ? "remote" : "office",
            dueAt: task.due_at || null,
            subItems: parseSubItems(task.sub_items_json),
          })),
          projects: (projectOptions.results || []).map((project: any) => ({
            id: project.id,
            label: `${project.client_name ? `${project.client_name}: ` : ""}${project.name}`,
            clientId: project.client_id || null,
            name: project.name || "",
            clientName: project.client_name || "",
          })),
          clients: dedupeClientOptions(clientOptions.results || []),
        },
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Time tracking GET error:", error);
    return Response.json(
      { error: "Errore nel caricamento rapportino" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
