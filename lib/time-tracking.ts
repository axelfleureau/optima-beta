import type { WorkspacePrincipal } from "@/lib/workspace-db";
import {
  WORKSPACE_MANAGER_ROLES,
  isExternalWorkspaceMember,
  isWorkspaceManager,
} from "@/lib/workspace-permissions";

export const TIME_MANAGER_ROLES = WORKSPACE_MANAGER_ROLES;
export const AUTO_PRESENT_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
]);
export const DEFAULT_WORK_START_TIME = "09:00";
export const DEFAULT_LUNCH_BREAK_MINUTES = 60;
export const DEFAULT_WORK_DAYS_PER_WEEK = 5;
export const PRESENCE_GRACE_MINUTES = 15;
const ITALIAN_FIXED_PUBLIC_HOLIDAYS = new Map([
  ["01-01", "Capodanno"],
  ["01-06", "Epifania"],
  ["04-25", "Festa della Liberazione"],
  ["05-01", "Festa dei lavoratori"],
  ["06-02", "Festa della Repubblica"],
  ["08-15", "Ferragosto"],
  ["11-01", "Ognissanti"],
  ["12-08", "Immacolata"],
  ["12-25", "Natale"],
  ["12-26", "Santo Stefano"],
]);

export function canManageTime(principal: WorkspacePrincipal) {
  return isWorkspaceManager(principal.role);
}

export function hasAutomaticPresence(role: unknown) {
  return AUTO_PRESENT_ROLES.has(
    String(role || "")
      .trim()
      .toLowerCase(),
  );
}

export function tracksPresence(role: unknown) {
  return !isExternalWorkspaceMember(role);
}

export function usesTaskOnlyWorkLog(role: unknown) {
  return isExternalWorkspaceMember(role);
}

export function nonWorkingDayReason(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const fixedHoliday = ITALIAN_FIXED_PUBLIC_HOLIDAYS.get(date.slice(5, 10));
  if (fixedHoliday) return fixedHoliday;
  const day = parsed.getDay();
  if (day === 0) return "Domenica";
  if (day === 6) return "Sabato";
  return null;
}

export function normalizeDate(value: unknown) {
  const raw =
    typeof value === "string" && value.trim()
      ? value.trim()
      : new Date().toISOString().slice(0, 10);
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : raw.slice(0, 10);
}

export function normalizeMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return 0;
  return Math.max(1, Math.min(1440, Math.round(minutes)));
}

export function normalizeTime(
  value: unknown,
  fallback = DEFAULT_WORK_START_TIME,
) {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return fallback;
  const [hours, minutes] = raw.split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback;
  }
  return raw;
}

function lastSundayOfMonthUtc(year: number, monthIndex: number) {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date;
}

export function europeRomeOffsetForDate(date: string) {
  const normalizedDate = normalizeDate(date);
  const [year, month, day] = normalizedDate.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return "+01:00";

  const currentDayNoonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  const dstStart = lastSundayOfMonthUtc(year, 2).getTime();
  const dstEnd = lastSundayOfMonthUtc(year, 9).getTime();
  return currentDayNoonUtc >= dstStart && currentDayNoonUtc < dstEnd
    ? "+02:00"
    : "+01:00";
}

export function isoForBusinessDateTime(
  date: string,
  time?: unknown,
  fallback = DEFAULT_WORK_START_TIME,
) {
  const normalizedDate = normalizeDate(date);
  return `${normalizedDate}T${normalizeTime(time, fallback)}:00${europeRomeOffsetForDate(normalizedDate)}`;
}

export function timeToMinutes(time: string) {
  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  const safeMinutes = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function dailyGrossCapacityMinutes(
  weeklyCapacityMinutes: unknown,
  workDaysPerWeek = DEFAULT_WORK_DAYS_PER_WEEK,
) {
  return (
    dailyNetCapacityMinutes(
      weeklyCapacityMinutes,
      DEFAULT_LUNCH_BREAK_MINUTES,
      workDaysPerWeek,
    ) + DEFAULT_LUNCH_BREAK_MINUTES
  );
}

export function dailyNetCapacityMinutes(
  weeklyCapacityMinutes: unknown,
  _lunchBreakMinutes = DEFAULT_LUNCH_BREAK_MINUTES,
  workDaysPerWeek = DEFAULT_WORK_DAYS_PER_WEEK,
) {
  const weekly = Number(weeklyCapacityMinutes || 2400);
  const days =
    Number.isFinite(workDaysPerWeek) && workDaysPerWeek > 0
      ? workDaysPerWeek
      : DEFAULT_WORK_DAYS_PER_WEEK;
  return Math.max(0, Math.round(weekly / days));
}

export function weeklyNetCapacityMinutes(
  weeklyCapacityMinutes: unknown,
  _lunchBreakMinutes = DEFAULT_LUNCH_BREAK_MINUTES,
  _workDaysPerWeek = DEFAULT_WORK_DAYS_PER_WEEK,
) {
  const weekly = Number(weeklyCapacityMinutes || 2400);
  if (!Number.isFinite(weekly)) return 0;
  return Math.max(0, Math.round(weekly));
}

export function expectedCheckoutTime(
  workStartTime = DEFAULT_WORK_START_TIME,
  weeklyCapacityMinutes: unknown = 2400,
  workDaysPerWeek = DEFAULT_WORK_DAYS_PER_WEEK,
) {
  return minutesToTime(
    timeToMinutes(workStartTime) +
      dailyGrossCapacityMinutes(weeklyCapacityMinutes, workDaysPerWeek),
  );
}

export function workScheduleForMember(
  weeklyCapacityMinutes: unknown,
  workStartTime = DEFAULT_WORK_START_TIME,
) {
  const normalizedStart = normalizeTime(workStartTime, DEFAULT_WORK_START_TIME);
  const dailyCapacityMinutes = dailyGrossCapacityMinutes(weeklyCapacityMinutes);
  const lunchBreakMinutes = DEFAULT_LUNCH_BREAK_MINUTES;
  const expectedOfficeMinutes = dailyNetCapacityMinutes(
    weeklyCapacityMinutes,
    lunchBreakMinutes,
  );
  return {
    workStartTime: normalizedStart,
    expectedCheckOutTime: expectedCheckoutTime(
      normalizedStart,
      weeklyCapacityMinutes,
    ),
    dailyCapacityMinutes,
    lunchBreakMinutes,
    expectedOfficeMinutes,
    workDaysPerWeek: DEFAULT_WORK_DAYS_PER_WEEK,
  };
}

export function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)
    return 0;
  return Math.round((endMs - startMs) / 60000);
}

function romeDateKey(value: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function todayInEuropeRome() {
  return romeDateKey(Date.now());
}

export function isPastBusinessDate(value: unknown) {
  return normalizeDate(value) < todayInEuropeRome();
}

export function currentPresenceMinutes(
  checkInAt?: string | null,
  checkOutAt?: string | null,
) {
  if (!checkInAt) return 0;
  if (checkOutAt) return minutesBetween(checkInAt, checkOutAt);

  const startMs = new Date(checkInAt).getTime();
  const nowMs = Date.now();
  if (!Number.isFinite(startMs) || nowMs <= startMs) return 0;
  if (romeDateKey(startMs) !== romeDateKey(nowMs)) return 0;
  return Math.round((nowMs - startMs) / 60000);
}

export function netPresenceMinutes(
  grossPresenceMinutes: number,
  lunchBreakMinutes = DEFAULT_LUNCH_BREAK_MINUTES,
  lunchThresholdMinutes = 360,
) {
  if (!Number.isFinite(grossPresenceMinutes) || grossPresenceMinutes <= 0)
    return 0;
  return Math.max(
    0,
    Math.round(
      grossPresenceMinutes -
        (grossPresenceMinutes >= lunchThresholdMinutes ? lunchBreakMinutes : 0),
    ),
  );
}

export function minutesSinceMidnightFromDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getHours() * 60 + parsed.getMinutes();
}
