export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import {
  PRESENCE_GRACE_MINUTES,
  canManageTime,
  currentPresenceMinutes,
  hasAutomaticPresence,
  minutesSinceMidnightFromDate,
  netPresenceMinutes,
  nonWorkingDayReason,
  normalizeDate,
  timeToMinutes,
  tracksPresence,
  usesTaskOnlyWorkLog,
  workScheduleForMember,
} from "@/lib/time-tracking";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

function formatName(row: any) {
  return (
    `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
    row.email ||
    "Utente"
  );
}

function getPresenceStatus(row: any) {
  const entryDate =
    typeof row.entry_date === "string" ? row.entry_date.slice(0, 10) : "";
  if (row.day_status === "absent") return "absent";
  if (shouldAssumePresence(row, row.entry_date)) return "present";
  if (row.check_in_at && !row.check_out_at && isToday(entryDate))
    return "present";
  if (row.check_in_at && row.check_out_at) return "closed";
  if (shouldTreatAsNonWorkingDay(row, row.entry_date)) return "holiday";
  return "missing";
}

const CLOSED_TASK_STATES = new Set([
  "done",
  "completed",
  "validation",
  "archived",
  "archiviato",
  "suspended",
  "sospeso",
]);

function isPastOrToday(date: string) {
  return date <= currentRomeDate();
}

function isToday(date: string) {
  return date === currentRomeDate();
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function localDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function shouldAssumePresence(row: any, date?: string | null) {
  const entryDate = typeof date === "string" && date ? date.slice(0, 10) : "";
  return Boolean(
    entryDate &&
    isPastOrToday(entryDate) &&
    hasAutomaticPresence(row.role) &&
    !row.day_status &&
    !row.check_in_at &&
    !row.check_out_at,
  );
}

function shouldTreatAsNonWorkingDay(row: any, date?: string | null) {
  const entryDate = typeof date === "string" && date ? date.slice(0, 10) : "";
  return Boolean(
    entryDate &&
    nonWorkingDayReason(entryDate) &&
    !hasAutomaticPresence(row.role) &&
    !row.day_status &&
    !row.check_in_at &&
    !row.check_out_at &&
    Number(row.activity_minutes || 0) <= 0,
  );
}

function suppressPresenceTimingSignals(member: any) {
  return hasAutomaticPresence(member?.role) || !tracksPresence(member?.role);
}

function estimatedTaskMinutes(row: any) {
  const explicit = Number(row.estimated_minutes || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);

  switch (String(row.priority || "medium").toLowerCase()) {
    case "urgent":
      return 240;
    case "high":
      return 180;
    case "low":
      return 45;
    default:
      return 90;
  }
}

function sortOperationalTasks(a: any, b: any) {
  const priorityWeight: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const aDue = a.due_at
    ? new Date(a.due_at).getTime()
    : Number.POSITIVE_INFINITY;
  const bDue = b.due_at
    ? new Date(b.due_at).getTime()
    : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  return (
    (priorityWeight[String(a.priority || "medium").toLowerCase()] ?? 2) -
    (priorityWeight[String(b.priority || "medium").toLowerCase()] ?? 2)
  );
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
    monthStart: `${year}-${String(month).padStart(2, "0")}-01`,
    monthEnd: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    days: Array.from(
      { length: lastDay },
      (_, index) =>
        `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    ),
  };
}

function calendarKey(memberId: string, date: string) {
  return `${memberId}:${date}`;
}

function splitTaskTitles(value: unknown) {
  return typeof value === "string" && value
    ? value
        .split("|||")
        .map((title) => title.trim())
        .filter(Boolean)
    : [];
}

const CALENDAR_TASK_TITLE_PREFIX =
  /^(?:\d{4}-\d{2}-\d{2}\/\d{1,2}|\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+-\s+/;

function normalizedCalendarTaskBaseTitle(row: any) {
  const title = String(
    row.title || row.note || row.task_id || "Task senza titolo",
  ).trim();
  return title.replace(CALENDAR_TASK_TITLE_PREFIX, "").trim();
}

function calendarTaskTitle(row: any, entryDate?: string) {
  const title = normalizedCalendarTaskBaseTitle(row);
  if (!entryDate) return title;
  return `${entryDate} - ${title}`;
}

function createCalendarTaskAggregate(memberId: string, entryDate: string) {
  return {
    member_id: memberId,
    entry_date: entryDate,
    task_count: 0,
    task_minutes: 0,
    completed_task_count: 0,
    completed_task_minutes: 0,
    missing_duration_task_count: 0,
    task_titles: "",
    taskIds: new Set<string>(),
    titles: [] as string[],
  };
}

function addCalendarTask(
  aggregate: ReturnType<typeof createCalendarTaskAggregate>,
  row: any,
  options: {
    completed?: boolean;
    countMinutes?: boolean;
    allowTaskRevisitForCompleted?: boolean;
  } = {},
) {
  const taskId = String(row.task_id || row.id || "");
  const isDuplicate = aggregate.taskIds.has(taskId);
  if (!taskId) return;

  if (isDuplicate && !options.allowTaskRevisitForCompleted) return;

  if (!isDuplicate) {
    aggregate.taskIds.add(taskId);
    aggregate.task_count += 1;
  }

  const minutes = Number(
    row.minutes ||
      row.task_minutes ||
      row.actual_minutes ||
      row.estimated_minutes ||
      0,
  );
  if (options.countMinutes && Number.isFinite(minutes) && minutes > 0) {
    aggregate.task_minutes += Math.round(minutes);
  }

  if (options.completed) {
    aggregate.completed_task_count += 1;
    if (Number.isFinite(minutes) && minutes > 0) {
      aggregate.completed_task_minutes += Math.round(minutes);
    } else {
      aggregate.missing_duration_task_count += 1;
    }
  }

  const title = calendarTaskTitle(row, aggregate.entry_date);
  if (!isDuplicate && title && !aggregate.titles.includes(title)) {
    aggregate.titles.push(title);
    aggregate.task_titles = aggregate.titles.join("|||");
  }
}

function extractTaskId(row: any): string {
  return String(row?.task_id || row?.id || "").trim();
}

function mapCalendarStatus(day?: any) {
  if (!day) return "missing";
  return getPresenceStatus({
    entry_date: day.entry_date,
    day_status: day.status,
    check_in_at: day.check_in_at,
    check_out_at: day.check_out_at,
  });
}

function mapCalendarDay({
  date,
  member,
  workDay,
  activity,
  tasks,
}: {
  date: string;
  member: any;
  workDay?: any;
  activity?: any;
  tasks?: any;
}) {
  const schedule = workScheduleForMember(
    Number(member.weekly_capacity_minutes || 2400),
  );
  const memberTracksPresence = tracksPresence(member.role);
  const taskOnlyWorkLog = usesTaskOnlyWorkLog(member.role);
  const assumedPresence = shouldAssumePresence(
    {
      ...member,
      day_status: workDay?.status,
      check_in_at: workDay?.check_in_at,
      check_out_at: workDay?.check_out_at,
    },
    date,
  );
  const nonWorkingReason = nonWorkingDayReason(date);
  const explicitWorkSignal = Boolean(
    workDay?.status ||
    workDay?.check_in_at ||
    workDay?.check_out_at ||
    Number(activity?.activity_minutes || 0) > 0,
  );
  const holiday =
    Boolean(nonWorkingReason) &&
    memberTracksPresence &&
    !hasAutomaticPresence(member.role) &&
    !explicitWorkSignal;
  const activityMinutes = Number(activity?.activity_minutes || 0);
  const entryCount = Number(activity?.entry_count || 0);
  const taskMinutes = Number(tasks?.task_minutes || 0);
  const taskCount = Number(tasks?.task_count || 0);
  const completedTaskMinutes = Number(tasks?.completed_task_minutes || 0);
  const completedTaskCount = Number(tasks?.completed_task_count || 0);
  const missingDurationTaskCount = Number(
    tasks?.missing_duration_task_count || 0,
  );
  const status = taskOnlyWorkLog
    ? activityMinutes > 0 || taskMinutes > 0 || taskCount > 0
      ? "closed"
      : "missing"
    : holiday
      ? "holiday"
      : assumedPresence
        ? "present"
        : mapCalendarStatus(workDay);
  const taskTitles = splitTaskTitles(tasks?.task_titles).slice(0, 8);
  const loadMinutes = Math.max(activityMinutes, taskMinutes);
  const assumedCheckInAt = assumedPresence
    ? localDateTime(date, schedule.workStartTime)
    : null;
  const checkInAt = workDay?.check_in_at || assumedCheckInAt;
  const checkInMinute = minutesSinceMidnightFromDate(checkInAt);
  const checkOutMinute = minutesSinceMidnightFromDate(workDay?.check_out_at);
  const expectedStartMinute = timeToMinutes(schedule.workStartTime);
  const expectedEndMinute = timeToMinutes(schedule.expectedCheckOutTime);
  const ignoreTimingSignals = suppressPresenceTimingSignals(member);
  const minutesLate =
    !ignoreTimingSignals && status !== "absent" && checkInMinute !== null
      ? Math.max(
          0,
          checkInMinute - expectedStartMinute - PRESENCE_GRACE_MINUTES,
        )
      : 0;
  const minutesEarly =
    !ignoreTimingSignals && status === "closed" && checkOutMinute !== null
      ? Math.max(0, expectedEndMinute - checkOutMinute - PRESENCE_GRACE_MINUTES)
      : 0;
  const loadRatio =
    schedule.expectedOfficeMinutes > 0
      ? loadMinutes / schedule.expectedOfficeMinutes
      : 0;
  const hasWorkSignal =
    !holiday &&
    (assumedPresence ||
      status === "present" ||
      status === "closed" ||
      activityMinutes > 0 ||
      taskCount > 0);
  const rawIntensity =
    status === "absent" || status === "holiday"
      ? 0
      : hasWorkSignal
        ? Math.max(1, Math.min(4, Math.ceil(loadRatio * 4)))
        : 0;
  const throughputScore = Math.max(taskCount, entryCount, completedTaskCount);
  const isLongSingleTask = rawIntensity >= 4 && throughputScore < 3;
  const intensity = isLongSingleTask ? 3 : rawIntensity;
  const productivitySignal =
    rawIntensity <= 0
      ? "none"
      : isLongSingleTask
        ? "long-focus"
        : rawIntensity >= 4
          ? "sprint"
          : rawIntensity >= 3
            ? "focus"
            : rawIntensity >= 2
              ? "operational"
              : "low";

  return {
    date,
    status,
    tracksPresence: memberTracksPresence,
    workTrackingMode: taskOnlyWorkLog ? "task-only" : "presence",
    checkInAt,
    checkOutAt: workDay?.check_out_at || null,
    absenceReason: holiday
      ? nonWorkingReason || "Festivo"
      : workDay?.absence_reason || "",
    activityMinutes,
    entryCount,
    taskMinutes,
    taskCount,
    completedTaskMinutes,
    completedTaskCount,
    missingDurationTaskCount,
    taskTitles,
    loadMinutes,
    throughputScore,
    productivitySignal,
    intensity,
    minutesLate,
    minutesEarly,
    signal: minutesLate > 0 ? "late" : minutesEarly > 0 ? "early-exit" : null,
  };
}

function operationalAvailability({
  status,
  plannedSoonMinutes,
  urgentCount,
  dailyCapacityMinutes,
}: {
  status: string;
  plannedSoonMinutes: number;
  urgentCount: number;
  dailyCapacityMinutes: number;
}) {
  if (status === "absent" || status === "holiday") {
    return {
      status: "not-available",
      label: status === "holiday" ? "Festivo" : "Non disponibile oggi",
      detail:
        status === "holiday"
          ? "Giornata non lavorativa salvo rapportino"
          : "Assenza segnata",
    };
  }

  if (status === "missing") {
    return {
      status: "unknown",
      label: "Da verificare",
      detail: "Presenza non ancora segnata",
    };
  }

  if (urgentCount > 0) {
    return {
      status: "protected",
      label: "Presidia urgenze",
      detail: "Carico critico a breve",
    };
  }

  if (plannedSoonMinutes <= 120) {
    return {
      status: "asap",
      label: "Inseribile al più presto",
      detail: "Finestra libera nelle prossime ore",
    };
  }

  if (plannedSoonMinutes <= Math.max(120, dailyCapacityMinutes * 0.65)) {
    return {
      status: "today",
      label: "Inseribile oggi",
      detail: "Carico sostenibile",
    };
  }

  return {
    status: "later",
    label: "Meglio al più tardi",
    detail: "Giornata già carica",
  };
}

function mapOperationalTask(row: any) {
  return {
    id: String(row.id),
    title: String(row.title || "Task senza titolo"),
    clientName: String(row.client_name || ""),
    projectName: String(row.project_name || ""),
    status: String(row.column_id || row.status || "todo"),
    priority: String(row.priority || "medium"),
    dueAt: row.due_at || null,
    estimatedMinutes: estimatedTaskMinutes(row),
  };
}

function mapPresenceRow(row: any, upcomingRows: any[] = []) {
  const weeklyCapacityMinutes = Number(row.weekly_capacity_minutes || 2400);
  const schedule = workScheduleForMember(weeklyCapacityMinutes);
  const activityMinutes = Number(row.activity_minutes || 0);
  const memberTracksPresence = tracksPresence(row.role);
  const taskOnlyWorkLog = usesTaskOnlyWorkLog(row.role);
  const assumedPresence = shouldAssumePresence(row, row.entry_date);
  const status =
    taskOnlyWorkLog && activityMinutes > 0 ? "closed" : getPresenceStatus(row);
  const assumedCheckInAt = assumedPresence
    ? localDateTime(String(row.entry_date), schedule.workStartTime)
    : null;
  const checkInAt = row.check_in_at || assumedCheckInAt;
  const visibleCheckOutAt =
    status === "present" ? null : row.check_out_at || null;
  const grossPresenceMinutes =
    !memberTracksPresence || status === "holiday"
      ? 0
      : assumedPresence
        ? schedule.dailyCapacityMinutes
        : currentPresenceMinutes(checkInAt, visibleCheckOutAt);
  const presenceMinutes =
    !memberTracksPresence || status === "holiday"
      ? 0
      : assumedPresence
        ? schedule.expectedOfficeMinutes
        : netPresenceMinutes(grossPresenceMinutes, schedule.lunchBreakMinutes);
  const checkInMinute = minutesSinceMidnightFromDate(checkInAt);
  const checkOutMinute = minutesSinceMidnightFromDate(visibleCheckOutAt);
  const expectedStartMinute = timeToMinutes(schedule.workStartTime);
  const expectedEndMinute = timeToMinutes(schedule.expectedCheckOutTime);
  const minutesLate =
    memberTracksPresence && status !== "absent" && checkInMinute !== null
      ? Math.max(
          0,
          checkInMinute - expectedStartMinute - PRESENCE_GRACE_MINUTES,
        )
      : 0;
  const minutesEarly =
    memberTracksPresence && status === "closed" && checkOutMinute !== null
      ? Math.max(0, expectedEndMinute - checkOutMinute - PRESENCE_GRACE_MINUTES)
      : 0;
  const presenceSignal =
    minutesLate > 0 ? "late" : minutesEarly > 0 ? "early-exit" : null;
  const sortedUpcomingRows = upcomingRows
    .sort(sortOperationalTasks)
    .slice(0, 3);
  const upcomingTasks = sortedUpcomingRows.map(mapOperationalTask);
  const plannedSoonMinutes = sortedUpcomingRows.reduce(
    (sum, task) => sum + estimatedTaskMinutes(task),
    0,
  );
  const urgentCount = sortedUpcomingRows.filter((task) => {
    const priority = String(task.priority || "").toLowerCase();
    const workflowState = String(
      task.column_id || task.status || "",
    ).toLowerCase();
    return priority === "urgent" || workflowState === "urgent";
  }).length;
  // 2026-06-24: taskCount + taskTitles di oggi per il reminder prima del check-out
  // (richiesta Edis). Mostra quante task sono collegate al membro per la data
  // corrente, anche se non sono "operational" (urgent/today). Così il reminder
  // soft in /presenze può dire "0 task" o "N task collegate".
  const todayTasks = Array.isArray(upcomingRows) ? upcomingRows : [];
  const taskCount = todayTasks.length;
  const taskTitles = todayTasks
    .map((task) => String(task.title || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    id: String(row.id),
    name: formatName(row),
    email: String(row.email || ""),
    role: String(row.role || "junior"),
    tracksPresence: memberTracksPresence,
    workTrackingMode: taskOnlyWorkLog ? "task-only" : "presence",
    status,
    checkInAt,
    checkOutAt: visibleCheckOutAt,
    absenceReason:
      status === "holiday"
        ? nonWorkingDayReason(String(row.entry_date)) || "Festivo"
        : row.absence_reason || "",
    notes: row.notes || "",
    assumedPresence,
    grossPresenceMinutes,
    presenceMinutes,
    activityMinutes,
    dailyCapacityMinutes: schedule.dailyCapacityMinutes,
    expectedOfficeMinutes: schedule.expectedOfficeMinutes,
    lunchBreakMinutes: schedule.lunchBreakMinutes,
    workStartTime: schedule.workStartTime,
    expectedCheckOutTime: schedule.expectedCheckOutTime,
    minutesLate,
    minutesEarly,
    presenceSignal,
    coverageRatio:
      schedule.expectedOfficeMinutes > 0
        ? Math.min(1, presenceMinutes / schedule.expectedOfficeMinutes)
        : 0,
    activityRatio:
      presenceMinutes > 0 ? Math.min(1, activityMinutes / presenceMinutes) : 0,
    upcomingTasks,
    nextTask: upcomingTasks[0] || null,
    plannedSoonMinutes,
    urgentSoonCount: urgentCount,
    taskCount,
    taskTitles,
    availability: taskOnlyWorkLog
      ? {
          status: urgentCount > 0 ? "protected" : "today",
          label: urgentCount > 0 ? "Task prioritarie" : "Rendiconto task",
          detail: "Valuta ore consuntivate, consegne e task assegnate",
        }
      : operationalAvailability({
          status,
          plannedSoonMinutes,
          urgentCount,
          dailyCapacityMinutes: schedule.expectedOfficeMinutes,
        }),
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
    const month = monthBounds(date);

    const rows = await db
      .prepare(
        `SELECT m.id,
                m.email,
                m.first_name,
                m.last_name,
                m.role,
                m.weekly_capacity_minutes,
                wd.check_in_at,
                wd.check_out_at,
                wd.status AS day_status,
                wd.absence_reason,
                wd.notes,
                COALESCE(te.activity_minutes, 0) AS activity_minutes
         FROM members m
         LEFT JOIN work_days wd
           ON wd.organization_id = m.organization_id
          AND wd.member_id = m.id
          AND wd.entry_date = ?
         LEFT JOIN (
           SELECT organization_id, member_id, entry_date, SUM(minutes) AS activity_minutes
           FROM time_entries
           WHERE organization_id = ? AND entry_date = ?
           GROUP BY organization_id, member_id, entry_date
         ) te
           ON te.organization_id = m.organization_id
          AND te.member_id = m.id
          AND te.entry_date = ?
         WHERE m.organization_id = ?
           AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
           AND m.role IN ('super-admin', 'admin', 'direzione', 'capo-reparto', 'junior', 'freelance', 'member', 'dipendente', 'employee')
           AND (? = 1 OR m.id = ?)
         ORDER BY
           CASE
             WHEN wd.status = 'absent' THEN 3
             WHEN wd.check_in_at IS NOT NULL AND wd.check_out_at IS NULL THEN 0
             WHEN wd.check_in_at IS NOT NULL AND wd.check_out_at IS NOT NULL THEN 1
             ELSE 2
           END,
           m.first_name,
           m.last_name,
           m.email`,
      )
      .bind(
        date,
        principal.organizationId,
        date,
        date,
        principal.organizationId,
        isManager ? 1 : 0,
        principal.memberId,
      )
      .all();

    const memberRows = (rows.results || []) as any[];
    const upcomingTasks = await db
      .prepare(
        `SELECT t.id,
                t.assignee_member_id,
                t.title,
                t.client_name,
                t.status,
                t.column_id,
                t.priority,
                t.estimated_minutes,
                t.due_at,
                p.name AS project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         WHERE t.organization_id = ?
           AND t.assignee_member_id IS NOT NULL
           AND COALESCE(t.assignment_status, 'accepted') = 'accepted'
           AND COALESCE(t.column_id, t.status) NOT IN ('done', 'completed', 'validation', 'archived', 'archiviato', 'suspended', 'sospeso')
           AND (? = 1 OR t.assignee_member_id = ?)
         ORDER BY
           CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,
           date(t.due_at) ASC,
           CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           t.updated_at DESC
         LIMIT 500`,
      )
      .bind(principal.organizationId, isManager ? 1 : 0, principal.memberId)
      .all();

    const tasksByMember = new Map<string, any[]>();
    for (const task of (upcomingTasks.results || []) as any[]) {
      const workflowState = String(
        task.column_id || task.status || "",
      ).toLowerCase();
      if (CLOSED_TASK_STATES.has(workflowState)) continue;

      const memberId = String(task.assignee_member_id || "");
      if (!memberId) continue;

      tasksByMember.set(memberId, [
        ...(tasksByMember.get(memberId) || []),
        task,
      ]);
    }

    const people: ReturnType<typeof mapPresenceRow>[] = memberRows.map((row) =>
      mapPresenceRow(
        { ...row, entry_date: date },
        tasksByMember.get(String(row.id)) || [],
      ),
    );
    const self =
      people.find((person) => person.id === principal.memberId) || null;

    const [
      workDaysResult,
      activityDaysResult,
      taskDaysResult,
      trackedTaskDaysResult,
      completedTaskDaysResult,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT member_id,
                  entry_date,
                  status,
                  check_in_at,
                  check_out_at,
                  absence_reason,
                  notes
           FROM work_days
           WHERE organization_id = ?
             AND entry_date >= ?
             AND entry_date <= ?
             AND (? = 1 OR member_id = ?)`,
        )
        .bind(
          principal.organizationId,
          month.monthStart,
          month.monthEnd,
          isManager ? 1 : 0,
          principal.memberId,
        )
        .all(),
      db
        .prepare(
          `SELECT member_id,
                  entry_date,
                  SUM(minutes) AS activity_minutes,
                  COUNT(*) AS entry_count
           FROM time_entries
           WHERE organization_id = ?
             AND entry_date >= ?
             AND entry_date <= ?
             AND (? = 1 OR member_id = ?)
           GROUP BY member_id, entry_date`,
        )
        .bind(
          principal.organizationId,
          month.monthStart,
          month.monthEnd,
          isManager ? 1 : 0,
          principal.memberId,
        )
        .all(),
      db
        .prepare(
          `SELECT id AS task_id,
                  assignee_member_id AS member_id,
                  substr(due_at, 1, 10) AS entry_date,
                  title,
                  CASE
                    WHEN estimated_minutes IS NOT NULL AND estimated_minutes > 0 THEN estimated_minutes
                    WHEN priority = 'urgent' THEN 240
                    WHEN priority = 'high' THEN 180
                    WHEN priority = 'low' THEN 45
                    ELSE 90
                  END AS minutes
           FROM tasks
           WHERE organization_id = ?
             AND assignee_member_id IS NOT NULL
             AND due_at IS NOT NULL
             AND date(due_at) >= date(?)
             AND date(due_at) <= date(?)
             AND COALESCE(assignment_status, 'accepted') = 'accepted'
             AND COALESCE(column_id, status) NOT IN ('done', 'completed', 'validation', 'archived', 'archiviato', 'suspended', 'sospeso')
             AND (? = 1 OR assignee_member_id = ?)`,
        )
        .bind(
          principal.organizationId,
          month.monthStart,
          month.monthEnd,
          isManager ? 1 : 0,
          principal.memberId,
        )
        .all(),
      db
        .prepare(
          `SELECT member_id,
                  entry_date,
                  task_id,
                  minutes,
                  title
           FROM (
             SELECT te.member_id,
                    te.entry_date,
                    COALESCE(NULLIF(te.task_id, ''), te.id) AS task_id,
                    SUM(te.minutes) AS minutes,
                    COALESCE(NULLIF(t.title, ''), NULLIF(te.note, ''), 'Attività da rapportino') AS title
             FROM time_entries te
             LEFT JOIN tasks t
               ON t.id = te.task_id
              AND t.organization_id = te.organization_id
           WHERE te.organization_id = ?
               AND te.entry_date >= ?
               AND te.entry_date <= ?
               AND (? = 1 OR te.member_id = ?)
             GROUP BY te.member_id, te.entry_date, COALESCE(NULLIF(te.task_id, ''), te.id)
           )`,
        )
        .bind(
          principal.organizationId,
          month.monthStart,
          month.monthEnd,
          isManager ? 1 : 0,
          principal.memberId,
        )
        .all(),
      db
        .prepare(
          `SELECT t.id AS task_id,
                  t.assignee_member_id AS member_id,
                  COALESCE(te.entry_date, substr(t.due_at, 1, 10), date(datetime(t.created_at, '+2 hours'))) AS entry_date,
                  t.title,
                  CASE
                    WHEN te.minutes IS NOT NULL AND te.minutes > 0 THEN te.minutes
                    WHEN t.actual_minutes IS NOT NULL AND t.actual_minutes > 0 THEN t.actual_minutes
                    ELSE 0
                  END AS minutes,
                  CASE
                    WHEN COALESCE(te.minutes, t.actual_minutes, 0) <= 0 THEN 1
                    ELSE 0
                  END AS missing_duration
           FROM tasks t
           LEFT JOIN (
             SELECT organization_id,
                    task_id,
                    entry_date,
                    SUM(minutes) AS minutes
             FROM time_entries
             WHERE organization_id = ?
               AND task_id IS NOT NULL
               AND task_id <> ''
               AND entry_date >= ?
               AND entry_date <= ?
             GROUP BY organization_id, task_id, entry_date
           ) te
             ON te.organization_id = t.organization_id
            AND te.task_id = t.id
           WHERE t.organization_id = ?
             AND t.assignee_member_id IS NOT NULL
             AND t.created_at IS NOT NULL
             AND date(COALESCE(te.entry_date, substr(t.due_at, 1, 10), date(datetime(t.created_at, '+2 hours')))) >= date(?)
             AND date(COALESCE(te.entry_date, substr(t.due_at, 1, 10), date(datetime(t.created_at, '+2 hours')))) <= date(?)
             AND COALESCE(t.assignment_status, 'accepted') = 'accepted'
             AND COALESCE(t.column_id, t.status) IN ('done', 'completed', 'validation')
             AND (? = 1 OR t.assignee_member_id = ?)`,
        )
        .bind(
          principal.organizationId,
          month.monthStart,
          month.monthEnd,
          principal.organizationId,
          month.monthStart,
          month.monthEnd,
          isManager ? 1 : 0,
          principal.memberId,
        )
        .all(),
    ]);

    const workDaysByMemberDate = new Map<string, any>();
    for (const day of (workDaysResult.results || []) as any[]) {
      workDaysByMemberDate.set(
        calendarKey(String(day.member_id), String(day.entry_date)),
        day,
      );
    }

    const activityByMemberDate = new Map<string, any>();
    for (const day of (activityDaysResult.results || []) as any[]) {
      activityByMemberDate.set(
        calendarKey(String(day.member_id), String(day.entry_date)),
        day,
      );
    }

    const monthTaskIdsByMember = new Map<string, Set<string>>();
    const addMonthTaskId = (memberId: string, taskId?: string) => {
      const normalized = String(taskId || "").trim();
      if (!normalized) return;

      const set = monthTaskIdsByMember.get(memberId) || new Set<string>();
      set.add(normalized);
      monthTaskIdsByMember.set(memberId, set);
    };

    const tasksByMemberDate = new Map<
      string,
      ReturnType<typeof createCalendarTaskAggregate>
    >();
    const getTaskAggregate = (memberId: string, entryDate: string) => {
      const key = calendarKey(memberId, entryDate);
      const current = tasksByMemberDate.get(key);
      if (current) return current;

      const next = createCalendarTaskAggregate(memberId, entryDate);
      tasksByMemberDate.set(key, next);
      return next;
    };

    for (const day of (trackedTaskDaysResult.results || []) as any[]) {
      const memberId = String(day.member_id || "");
      const entryDate = String(day.entry_date || "");
      if (!memberId || !entryDate) continue;

      const taskId = extractTaskId(day);
      addMonthTaskId(memberId, taskId);
      addCalendarTask(getTaskAggregate(memberId, entryDate), day, {
        countMinutes: true,
      });
    }

    for (const day of (completedTaskDaysResult.results || []) as any[]) {
      const memberId = String(day.member_id || "");
      const entryDate = String(day.entry_date || "");
      if (!memberId || !entryDate) continue;

      const aggregate = getTaskAggregate(memberId, entryDate);
      const key = calendarKey(memberId, entryDate);
      const taskId = extractTaskId(day);
      const alreadyLinkedToDay = Boolean(
        taskId && aggregate.taskIds.has(taskId),
      );
      const hasTrackedActivityForDay =
        Number(activityByMemberDate.get(key)?.activity_minutes || 0) > 0;

      addMonthTaskId(memberId, taskId);
      addCalendarTask(aggregate, day, {
        completed: true,
        allowTaskRevisitForCompleted: true,
        countMinutes: !alreadyLinkedToDay && !hasTrackedActivityForDay,
      });
    }

    for (const day of (taskDaysResult.results || []) as any[]) {
      const memberId = String(day.member_id || "");
      const entryDate = String(day.entry_date || "");
      if (!memberId || !entryDate) continue;

      const key = calendarKey(memberId, entryDate);
      const hasTrackedActivityForDay =
        Number(activityByMemberDate.get(key)?.activity_minutes || 0) > 0;
      const taskId = extractTaskId(day);

      addMonthTaskId(memberId, taskId);
      addCalendarTask(getTaskAggregate(memberId, entryDate), day, {
        countMinutes: !hasTrackedActivityForDay,
      });
    }

    const monthTaskCountByMember = new Map<string, number>();
    monthTaskIdsByMember.forEach((taskIds, memberId) => {
      monthTaskCountByMember.set(memberId, taskIds.size);
    });

    const calendarPeople = memberRows.map((member) => ({
      id: String(member.id),
      name: formatName(member),
      email: String(member.email || ""),
      role: String(member.role || "junior"),
      monthTaskCount: monthTaskCountByMember.get(String(member.id)) || 0,
      days: month.days.map((day) =>
        mapCalendarDay({
          date: day,
          member,
          workDay: workDaysByMemberDate.get(
            calendarKey(String(member.id), day),
          ),
          activity: activityByMemberDate.get(
            calendarKey(String(member.id), day),
          ),
          tasks: tasksByMemberDate.get(calendarKey(String(member.id), day)),
        }),
      ),
    }));

    const summary = people.reduce(
      (acc, person) => {
        acc.total += 1;
        if (!person.tracksPresence) {
          acc.taskOnly += 1;
          acc.activityMinutes += person.activityMinutes;
          return acc;
        }
        acc[
          person.status as
            "present" | "closed" | "absent" | "missing" | "holiday"
        ] += 1;
        acc.presenceMinutes += person.presenceMinutes;
        acc.activityMinutes += person.activityMinutes;
        return acc;
      },
      {
        total: 0,
        present: 0,
        closed: 0,
        absent: 0,
        missing: 0,
        holiday: 0,
        taskOnly: 0,
        presenceMinutes: 0,
        activityMinutes: 0,
      },
    );

    return Response.json(
      {
        role: principal.role,
        isManager,
        date,
        generatedAt: new Date().toISOString(),
        self,
        people,
        calendar: {
          monthStart: month.monthStart,
          monthEnd: month.monthEnd,
          days: month.days,
          people: calendarPeople,
        },
        summary,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Presence GET error:", error);
    return Response.json(
      { error: "Errore nel caricamento presenze" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  }
}
