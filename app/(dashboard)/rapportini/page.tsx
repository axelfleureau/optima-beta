"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  notifyOperationalDataChanged,
  useLiveRefresh,
} from "@/hooks/use-live-refresh";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  ListChecks,
  LogIn,
  LogOut,
  MonitorUp,
  Plus,
  Send,
  Undo2,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  tracksPresence?: boolean;
  workTrackingMode?: "presence" | "task-only";
};

type Entry = {
  id: string;
  projectId: string | null;
  taskId: string | null;
  clientId: string | null;
  minutes: number;
  billable?: boolean;
  activityCategory?: string;
  note: string;
  workMode?: "office" | "remote";
  taskTitle: string;
  clientName: string;
  projectName: string;
  reviewStatus?: "draft" | "submitted" | "approved" | "changes_requested";
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string;
};

type Option = {
  id: string;
  label: string;
  title?: string;
  name?: string;
  company?: string;
  clientId?: string | null;
  clientName?: string;
  projectName?: string;
  projectId?: string | null;
  status?: string;
  priority?: string;
  workMode?: "office" | "remote";
  dueAt?: string | null;
  subItems?: Array<{
    id: string;
    title: string;
    completed: boolean;
    createdAt?: string | null;
  }>;
};

type TargetOption = Option & {
  value: string;
  kind: "task" | "project" | "client";
};

type TimeTrackingPayload = {
  isManager: boolean;
  tracksPresence?: boolean;
  workTrackingMode?: "presence" | "task-only";
  selectedMember: Member;
  members: Member[];
  day: null | {
    id: string;
    date?: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    status: string;
    absenceReason: string | null;
    notes: string;
    reviewStatus: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNotes: string;
  };
  entries: Entry[];
  submittedReports: Array<{
    id: string;
    date: string;
    reviewStatus: string;
    submittedAt: string | null;
    memberId: string;
    memberName: string;
    memberEmail: string;
    role: string;
    activityMinutes: number;
    entryCount: number;
    pendingCount?: number;
    approvedCount?: number;
    changesRequestedCount?: number;
    reviewNotes: string;
  }>;
  schedule?: {
    workStartTime: string;
    expectedCheckOutTime: string;
    expectedOfficeMinutes: number;
    lunchBreakMinutes: number;
  };
  totals: {
    activityMinutes: number;
    presenceMinutes: number;
    grossPresenceMinutes?: number;
    expectedOfficeMinutes?: number;
    lunchBreakMinutes?: number;
    review?: {
      pendingCount: number;
      pendingMinutes: number;
      approvedCount: number;
      approvedMinutes: number;
      changesRequestedCount: number;
      changesRequestedMinutes: number;
    };
    week?: PeriodTotals;
    month?: PeriodTotals;
  };
  options: {
    tasks: Option[];
    projects: Option[];
    clients: Option[];
  };
};

type PeriodTotals = {
  start: string;
  end: string;
  activityMinutes: number;
  presenceMinutes: number;
  entryCount: number;
};

type ReviewTotals = NonNullable<TimeTrackingPayload["totals"]["review"]>;

const emptyReviewTotals: ReviewTotals = {
  pendingCount: 0,
  pendingMinutes: 0,
  approvedCount: 0,
  approvedMinutes: 0,
  changesRequestedCount: 0,
  changesRequestedMinutes: 0,
};

function summarizeEntryReview(entries: Entry[]): ReviewTotals {
  return entries.reduce<ReviewTotals>(
    (totals, entry) => {
      const status = entry.reviewStatus || "submitted";
      if (status === "approved") {
        totals.approvedCount += 1;
        totals.approvedMinutes += entry.minutes || 0;
      } else if (status === "changes_requested") {
        totals.changesRequestedCount += 1;
        totals.changesRequestedMinutes += entry.minutes || 0;
      } else {
        totals.pendingCount += 1;
        totals.pendingMinutes += entry.minutes || 0;
      }
      return totals;
    },
    { ...emptyReviewTotals },
  );
}

const pageClass = "optima-ops-page min-h-0 max-w-full";
const panelClass =
  "w-full min-w-0 max-w-full overflow-hidden rounded-[8px] border border-white/10 bg-[#151d2c] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.28)] sm:p-5";
const fieldClass =
  "h-11 w-full min-w-0 max-w-full border-white/10 bg-[#222a31] text-slate-100 placeholder:text-slate-400 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20";
const selectClass =
  "h-11 w-full min-w-0 max-w-full truncate rounded-md border border-white/10 bg-[#222a31] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-righello-pink/70";

const activityCategories = [
  "Strategia e pianificazione",
  "Creatività e produzione",
  "Account e project management",
  "Digital e media",
  "PR e relazioni esterne",
  "Attività interna non fatturabile",
];

function stripActivityCategory(note: string, category?: string) {
  const normalized = String(note || "").trim();
  const label = String(category || "").trim();
  if (!label) return normalized;
  return normalized.replace(
    new RegExp(
      `^\\[${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\]\\s*`,
      "i",
    ),
    "",
  );
}

const statusLabel: Record<string, string> = {
  todo: "To Do",
  "to-do": "To Do",
  "in-progress": "In corso",
  review: "Review",
  validation: "Validation",
  done: "Completata",
  completed: "Completata",
  urgent: "Urgenze",
  onhold: "In pausa",
  "on-hold": "In pausa",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.hour || "09"}:${byType.minute || "00"}`;
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return "";
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function normalizeClientLabel(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeClientKey(value?: string | null) {
  return normalizeClientLabel(value).toLowerCase();
}

function cleanClientOption(client: Option) {
  const name = normalizeClientLabel(client.name || client.label);
  const company = normalizeClientLabel(client.company);
  const key = normalizeClientKey(name);
  const companyIsDuplicate = normalizeClientKey(company) === key;

  return {
    ...client,
    label: company && !companyIsDuplicate ? `${name} · ${company}` : name,
    name,
    company: companyIsDuplicate ? "" : company,
  };
}

function dedupeClientOptions(clients: Option[] = []) {
  const seen = new Set<string>();
  const clean: Option[] = [];

  for (const client of clients) {
    const option = cleanClientOption(client);
    const key = normalizeClientKey(option.name || option.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    clean.push(option);
  }

  return clean;
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function timeInputValue(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.hour || "00"}:${byType.minute || "00"}`;
}

function formatDueDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function entryReviewLabel(status?: Entry["reviewStatus"]) {
  if (status === "approved") return "Approvata";
  if (status === "changes_requested") return "Da correggere";
  return "In attesa";
}

function entryReviewTone(status?: Entry["reviewStatus"]) {
  if (status === "approved") {
    return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "changes_requested") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }
  return "border-cyan-300/25 bg-cyan-400/10 text-cyan-100";
}

function TimePickerField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <Input
        className="h-14 rounded-[8px] border-white/10 bg-[#222a31] text-center text-base font-semibold text-slate-100 [color-scheme:dark]"
        type="time"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? (
        <span className="text-xs leading-5 text-slate-500">{helper}</span>
      ) : null}
    </div>
  );
}

function DailyMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "cyan" | "amber" | "pink";
}) {
  const tones = {
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    pink: "border-righello-pink/30 bg-righello-pink/12 text-righello-pink",
  };

  return (
    <div className={`rounded-[8px] border p-4 ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
    </div>
  );
}

function FlowStepCard({
  number,
  title,
  detail,
  icon,
  state,
}: {
  number: string;
  title: string;
  detail: string;
  icon: ReactNode;
  state: "done" | "active" | "idle";
}) {
  const stateClass = {
    done: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    active: "border-righello-pink/35 bg-righello-pink/12 text-white",
    idle: "border-white/10 bg-white/[0.035] text-slate-300",
  }[state];

  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-[8px] border p-3 ${stateClass}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-black/20 text-sm font-black">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-righello-cyan">{icon}</span>
          <p className="truncate text-sm font-black">{title}</p>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

export default function RapportiniPage() {
  const [date, setDate] = useState(today());
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [payload, setPayload] = useState<TimeTrackingPayload | null>(null);
  const [loadedViewKey, setLoadedViewKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkInTime, setCheckInTime] = useState(currentTime());
  const [checkOutTime, setCheckOutTime] = useState(currentTime());
  const [absenceReason, setAbsenceReason] = useState("Assenza");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState("");
  const [activity, setActivity] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [activityCategory, setActivityCategory] = useState(
    activityCategories[0],
  );
  const [isBillable, setIsBillable] = useState(true);
  const [isRemote, setIsRemote] = useState(false);
  const [notes, setNotes] = useState("");
  const [createTaskFromReport, setCreateTaskFromReport] = useState(false);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [reviewingIds, setReviewingIds] = useState<string[]>([]);
  const [changeRequestOpenId, setChangeRequestOpenId] = useState<string | null>(
    null,
  );
  const [changeRequestMessages, setChangeRequestMessages] = useState<
    Record<string, string>
  >({});
  const [entryChangeRequestOpenId, setEntryChangeRequestOpenId] = useState<
    string | null
  >(null);
  const [entryChangeRequestMessages, setEntryChangeRequestMessages] = useState<
    Record<string, string>
  >({});
  const hasLoadedRef = useRef(false);
  const loadedTimeKeyRef = useRef("");
  const desiredViewKeyRef = useRef("");
  const loadRequestSeqRef = useRef(0);
  const timeDraftDirtyRef = useRef(false);
  const checkOutDraftDirtyRef = useRef(false);
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const entryRequestIdRef = useRef("");
  const entrySubmittingRef = useRef(false);

  const updateDesiredView = useCallback(
    (memberId: string, nextDate: string) => {
      desiredViewKeyRef.current = `${memberId}:${nextDate}`;
    },
    [],
  );

  const shiftDate = (days: number) => {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(year, month - 1, day);
    next.setDate(next.getDate() + days);
    const nextDate = toDateInputValue(next);
    updateDesiredView(selectedMemberId, nextDate);
    setDate(nextDate);
  };

  const load = useCallback(async () => {
    const requestSeq = ++loadRequestSeqRef.current;
    const requestDate = date;
    const requestMemberId = selectedMemberId;
    const requestKey = `${requestMemberId}:${requestDate}`;

    setLoading(!hasLoadedRef.current);
    setError("");

    const params = new URLSearchParams({ date: requestDate });
    if (requestMemberId) params.set("memberId", requestMemberId);

    try {
      const response = await fetch(`/api/time-tracking?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Errore nel caricamento rapportino");

      const responseMemberId = String(
        data.selectedMember?.id || requestMemberId || "",
      );
      const responseKey = `${responseMemberId}:${requestDate}`;
      const desiredKey = desiredViewKeyRef.current;
      const resolvingInitialMember = !requestMemberId && !desiredKey;
      const responseIsStale =
        requestSeq !== loadRequestSeqRef.current ||
        (!resolvingInitialMember &&
          desiredKey &&
          desiredKey !== requestKey &&
          desiredKey !== responseKey);

      if (responseIsStale) return;

      setPayload(data);
      setLoadedViewKey(responseKey);
      setNotes(data.day?.notes || "");
      if (!desiredViewKeyRef.current || resolvingInitialMember) {
        desiredViewKeyRef.current = responseKey;
      }
      const nextTimeKey = `${responseMemberId}:${requestDate}`;
      const timeContextChanged = loadedTimeKeyRef.current !== nextTimeKey;
      if (timeContextChanged) {
        loadedTimeKeyRef.current = nextTimeKey;
        timeDraftDirtyRef.current = false;
        checkOutDraftDirtyRef.current = false;
        setSelectedTarget("");
        setSelectedClientId("");
        setTargetPickerOpen(false);
        setClientPickerOpen(false);
        setTargetSearch("");
        setClientSearch("");
        setCreateTaskFromReport(false);
      }
      if (!timeDraftDirtyRef.current) {
        setCheckInTime(
          timeInputValue(data.day?.checkInAt) ||
            data.schedule?.workStartTime ||
            "09:00",
        );
        setCheckOutTime(
          timeInputValue(data.day?.checkOutAt) ||
            data.schedule?.expectedCheckOutTime ||
            "18:00",
        );
      }
      if (!requestMemberId && data.selectedMember?.id) {
        setSelectedMemberId(data.selectedMember.id);
      }
    } catch (err) {
      if (requestSeq !== loadRequestSeqRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento rapportino",
      );
    } finally {
      if (requestSeq === loadRequestSeqRef.current) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
    }
  }, [date, selectedMemberId]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load, {
    enabled: Boolean(payload || !loading),
    intervalMs: 15000,
  });

  const refreshAfterReview = useCallback(() => {
    notifyOperationalDataChanged();
    void load();
  }, [load]);

  const markWorkDaysApprovedLocally = useCallback((workDayIds: string[]) => {
    const approvedWorkDayIds = new Set(workDayIds);
    setPayload((current) => {
      if (!current) return current;
      const activeDayApproved = current.day
        ? approvedWorkDayIds.has(current.day.id)
        : false;
      const reviewedAt = new Date().toISOString();
      const nextEntries = activeDayApproved
        ? current.entries.map((entry) => ({
            ...entry,
            reviewStatus: "approved" as const,
            reviewedAt,
            reviewNotes: "",
          }))
        : current.entries;

      return {
        ...current,
        day:
          activeDayApproved && current.day
            ? {
                ...current.day,
                reviewStatus: "approved",
                reviewedAt,
                reviewNotes: "",
              }
            : current.day,
        entries: nextEntries,
        submittedReports: current.submittedReports.filter(
          (report) => !approvedWorkDayIds.has(report.id),
        ),
        totals: {
          ...current.totals,
          review: summarizeEntryReview(nextEntries),
        },
      };
    });
  }, []);

  const markEntriesApprovedLocally = useCallback((entryIds: string[]) => {
    const approvedEntryIds = new Set(entryIds);
    const reviewedAt = new Date().toISOString();
    setPayload((current) => {
      if (!current) return current;
      const nextEntries = current.entries.map((entry) =>
        approvedEntryIds.has(entry.id)
          ? {
              ...entry,
              reviewStatus: "approved" as const,
              reviewedAt,
              reviewNotes: "",
            }
          : entry,
      );
      const nextReview = summarizeEntryReview(nextEntries);
      const activeDayFullyReviewed =
        current.day &&
        nextEntries.length > 0 &&
        nextReview.pendingCount === 0 &&
        nextReview.changesRequestedCount === 0;

      return {
        ...current,
        day:
          activeDayFullyReviewed && current.day
            ? {
                ...current.day,
                reviewStatus: "approved",
                reviewedAt,
                reviewNotes: "",
              }
            : current.day,
        entries: nextEntries,
        submittedReports: activeDayFullyReviewed
          ? current.submittedReports.filter(
              (report) => report.id !== current.day?.id,
            )
          : current.submittedReports,
        totals: {
          ...current.totals,
          review: nextReview,
        },
      };
    });
  }, []);

  const clientOptions = useMemo(
    () => dedupeClientOptions(payload?.options.clients || []),
    [payload?.options.clients],
  );

  const targetOptions = useMemo<TargetOption[]>(() => {
    if (!payload) return [];
    return [
      ...payload.options.tasks.map((task) => ({
        ...task,
        value: `task:${task.id}`,
        kind: "task" as const,
        projectId: task.projectId || null,
      })),
      ...payload.options.projects.map((project) => ({
        ...project,
        value: `project:${project.id}`,
        kind: "project" as const,
        projectId: project.id,
      })),
      ...clientOptions.map((client) => ({
        ...client,
        value: `client:${client.id}`,
        kind: "client" as const,
        clientId: client.id,
        clientName: client.name || client.label,
        label: client.label || client.name || "Cliente",
      })),
    ];
  }, [clientOptions, payload]);

  const matchClientIdByName = useCallback(
    (clientName?: string | null) => {
      const normalized = normalizeClientKey(clientName);
      if (!normalized) return "";
      return (
        clientOptions.find(
          (client) =>
            normalizeClientKey(client.name || client.label) === normalized,
        )?.id || ""
      );
    },
    [clientOptions],
  );

  const resolveClientId = useCallback(
    (option?: Option | null) =>
      option?.clientId || matchClientIdByName(option?.clientName),
    [matchClientIdByName],
  );

  const selectedOption = useMemo(
    () =>
      targetOptions.find((option) => option.value === selectedTarget) || null,
    [selectedTarget, targetOptions],
  );

  const selectedClientOption = useMemo(
    () =>
      clientOptions.find((client) => client.id === selectedClientId) || null,
    [clientOptions, selectedClientId],
  );

  const filteredClientOptions = useMemo(() => {
    const query = normalizeClientKey(clientSearch);
    if (!query) return clientOptions;
    return clientOptions.filter((client) => {
      const haystack = [client.label, client.name, client.company]
        .filter(Boolean)
        .join(" ");
      return normalizeClientKey(haystack).includes(query);
    });
  }, [clientOptions, clientSearch]);

  const filteredTargets = useMemo(() => {
    const query = targetSearch.trim().toLowerCase();
    if (!query) return targetOptions;
    return targetOptions.filter((option) => {
      const haystack = [
        option.label,
        option.title,
        option.name,
        option.clientName,
        option.projectName,
        option.status,
        ...(option.subItems || []).map((item) => item.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [targetOptions, targetSearch]);

  const groupedTargets = useMemo(() => {
    const tasks = filteredTargets.filter((option) => option.kind === "task");
    const projects = filteredTargets.filter(
      (option) => option.kind === "project",
    );
    const clients = filteredTargets.filter(
      (option) => option.kind === "client",
    );
    const groups = new Map<string, TargetOption[]>();

    for (const task of tasks) {
      const groupName =
        task.projectName || task.clientName || "Task senza progetto";
      groups.set(groupName, [...(groups.get(groupName) || []), task]);
    }

    return { taskGroups: Array.from(groups.entries()), projects, clients };
  }, [filteredTargets]);

  const suggestedTargets = useMemo(
    () =>
      targetOptions
        .filter((option) => option.kind === "task")
        .filter(
          (option) =>
            !["done", "completed", "validation"].includes(
              String(option.status || "").toLowerCase(),
            ),
        )
        .sort((a, b) => {
          const aDue = a.dueAt
            ? new Date(a.dueAt).getTime()
            : Number.POSITIVE_INFINITY;
          const bDue = b.dueAt
            ? new Date(b.dueAt).getTime()
            : Number.POSITIVE_INFINITY;
          if (aDue !== bDue) return aDue - bDue;
          const priority: Record<string, number> = {
            urgent: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return (
            (priority[String(a.priority || "medium").toLowerCase()] ?? 2) -
            (priority[String(b.priority || "medium").toLowerCase()] ?? 2)
          );
        })
        .slice(0, 5),
    [targetOptions],
  );

  const isTaskOnlyWorkLog =
    payload?.workTrackingMode === "task-only" ||
    payload?.tracksPresence === false ||
    payload?.selectedMember?.workTrackingMode === "task-only" ||
    payload?.selectedMember?.tracksPresence === false;
  const reportDeltaMinutes = isTaskOnlyWorkLog
    ? 0
    : (payload?.totals.presenceMinutes || 0) -
      (payload?.totals.activityMinutes || 0);
  const hasPresence = Boolean(
    payload?.day?.checkInAt || payload?.day?.status === "closed",
  );
  const isDayClosed =
    !isTaskOnlyWorkLog &&
    payload?.day?.status === "closed" &&
    Boolean(payload.day.checkOutAt);
  const completionRatio = isTaskOnlyWorkLog
    ? (payload?.entries.length || 0) > 0
      ? 100
      : 0
    : payload?.totals.presenceMinutes && payload.totals.presenceMinutes > 0
      ? Math.min(
          100,
          Math.round(
            (payload.totals.activityMinutes / payload.totals.presenceMinutes) *
              100,
          ),
        )
      : 0;
  const isPastSelectedDate = date < today();
  const reviewStats = payload?.totals.review || {
    pendingCount: 0,
    pendingMinutes: 0,
    approvedCount: 0,
    approvedMinutes: 0,
    changesRequestedCount: 0,
    changesRequestedMinutes: 0,
  };
  const timelineGroups = useMemo(() => {
    const entries = payload?.entries || [];
    const order: Array<Entry["reviewStatus"]> = [
      "changes_requested",
      "submitted",
      "approved",
    ];
    return order
      .map((status) => ({
        status,
        entries: entries.filter((entry) =>
          status === "submitted"
            ? !entry.reviewStatus ||
              entry.reviewStatus === "submitted" ||
              entry.reviewStatus === "draft"
            : entry.reviewStatus === status,
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [payload?.entries]);
  const selectedViewKey = selectedMemberId ? `${selectedMemberId}:${date}` : "";
  const detailIsStale = Boolean(
    payload &&
    selectedViewKey &&
    loadedViewKey &&
    loadedViewKey !== selectedViewKey,
  );
  const pendingReportLabel =
    payload?.submittedReports?.find(
      (report) => report.memberId === selectedMemberId && report.date === date,
    )?.memberName || "rapportino";

  const selectTarget = (option: TargetOption, nextActivity?: string) => {
    setSelectedTarget(option.value);
    const nextClientId = resolveClientId(option);
    if (nextClientId) setSelectedClientId(nextClientId);
    setIsRemote(option.workMode === "remote");
    if (nextActivity && !activity.trim()) setActivity(nextActivity);
    setTargetPickerOpen(false);
  };

  const handleToggleSubItem = async (
    taskOption: TargetOption,
    subItemId: string,
  ) => {
    const nextSubItems = (taskOption.subItems || []).map((item) =>
      item.id === subItemId ? { ...item, completed: !item.completed } : item,
    );

    const response = await fetch(`/api/tasks/${taskOption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subItems: nextSubItems }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "Errore aggiornamento checklist");

    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        options: {
          ...current.options,
          tasks: current.options.tasks.map((task) =>
            task.id === taskOption.id
              ? { ...task, subItems: nextSubItems }
              : task,
          ),
        },
      };
    });
  };

  const mutateDay = async (
    action: string,
    body: Record<string, unknown> = {},
  ) => {
    const response = await fetch("/api/time-tracking/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        date,
        memberId: selectedMemberId,
        ...body,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "Errore aggiornamento giornata");
    await load();
    notifyOperationalDataChanged();
  };

  const handleCheckInTimeChange = (value: string) => {
    timeDraftDirtyRef.current = true;
    setCheckInTime(value);
  };

  const handleCheckOutTimeChange = (value: string) => {
    timeDraftDirtyRef.current = true;
    checkOutDraftDirtyRef.current = true;
    setCheckOutTime(value);
  };

  const savePresenceTimes = async () => {
    if (!checkInTime) {
      throw new Error("Imposta prima l'orario di entrata");
    }

    const shouldPersistCheckOut =
      Boolean(payload?.day?.checkOutAt) || checkOutDraftDirtyRef.current;
    await mutateDay("set-times", {
      checkInTime,
      ...(shouldPersistCheckOut ? { checkOutTime } : {}),
    });
    timeDraftDirtyRef.current = false;
    checkOutDraftDirtyRef.current = false;
    toast.success("Orari giornata aggiornati");
  };

  const undoCheckOut = async () => {
    await mutateDay("undo-check-out");
    toast.success("Checkout annullato: la giornata è di nuovo aperta");
  };

  const handleAddEntry = async () => {
    if (entrySubmittingRef.current) return false;
    if (!payload?.isManager && isPastSelectedDate) {
      throw new Error(
        "La giornata precedente è chiusa: chiedi a un responsabile di correggerla",
      );
    }

    const selected = targetOptions.find(
      (option) => option.value === selectedTarget,
    );
    const [kind, id] = selectedTarget.split(":");
    const clientId = selectedClientId || resolveClientId(selected) || null;
    const taskId = kind === "task" ? id : null;
    const projectId = kind === "project" ? id : selected?.projectId || null;

    if (createTaskFromReport && !taskId) {
      const title = activity.trim();
      if (!title) {
        throw new Error(
          "Scrivi prima cosa è stato fatto: diventerà il titolo della task.",
        );
      }
    }

    const requestId =
      entryRequestIdRef.current ||
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    entryRequestIdRef.current = requestId;
    entrySubmittingRef.current = true;
    setEntrySubmitting(true);

    try {
      const response = await fetch("/api/time-tracking/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          date,
          memberId: selectedMemberId,
          taskId,
          projectId,
          clientId,
          note: activity,
          minutes: Number(minutes),
          billable: isBillable,
          activityCategory,
          workMode: isRemote ? "remote" : "office",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Errore salvataggio attività");

      entryRequestIdRef.current = "";
      setActivity("");
      setMinutes("60");
      setActivityCategory(activityCategories[0]);
      setIsBillable(true);
      setIsRemote(false);
      setSelectedTarget("");
      setSelectedClientId("");
      setCreateTaskFromReport(false);
      await load();
      notifyOperationalDataChanged();
      return true;
    } finally {
      entrySubmittingRef.current = false;
      setEntrySubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const response = await fetch(`/api/time-tracking/entries/${id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "Errore rimozione attività");
    await load();
    notifyOperationalDataChanged();
  };

  const handleSubmitReport = async () => {
    const response = await fetch("/api/time-tracking/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, memberId: selectedMemberId, notes }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "Errore salvataggio rapportino");
    await load();
    notifyOperationalDataChanged();
    toast.success(
      data.emailSent
        ? "Rapportino inviato e riepilogo email spedito"
        : "Rapportino salvato: puoi aggiungere integrazioni fino a fine giornata",
    );
  };

  const handleReviewReport = async (
    workDayId: string,
    action: "approved" | "changes_requested",
    reviewNotes = "",
  ) => {
    const normalizedNotes = reviewNotes.trim();
    if (action === "changes_requested" && normalizedNotes.length < 6) {
      throw new Error("Scrivi un messaggio chiaro per il dipendente");
    }

    setReviewingIds((current) => Array.from(new Set([...current, workDayId])));
    const response = await fetch("/api/time-tracking/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workDayId,
        action,
        notes: action === "changes_requested" ? normalizedNotes : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setReviewingIds((current) => current.filter((id) => id !== workDayId));
    if (!response.ok)
      throw new Error(data.error || "Errore revisione rapportino");
    setSelectedReviewIds((current) => current.filter((id) => id !== workDayId));
    if (action === "approved") {
      markWorkDaysApprovedLocally([workDayId]);
      refreshAfterReview();
      toast.success("Rapportino approvato");
      return;
    }

    await load();
    notifyOperationalDataChanged();
    if (data.emailSent) {
      toast.success("Modifiche richieste ed email inviata");
    } else {
      toast.success("Modifiche richieste");
    }
  };

  const handleReviewEntries = async (
    entryIds: string[],
    action: "approved" | "changes_requested",
    reviewNotes = "",
  ) => {
    const normalizedNotes = reviewNotes.trim();
    if (action === "changes_requested" && normalizedNotes.length < 6) {
      throw new Error("Scrivi un messaggio chiaro per il dipendente");
    }

    setReviewingIds((current) =>
      Array.from(new Set([...current, ...entryIds])),
    );
    const response = await fetch("/api/time-tracking/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryIds,
        action,
        notes: action === "changes_requested" ? normalizedNotes : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setReviewingIds((current) =>
      current.filter((id) => !entryIds.includes(id)),
    );
    if (!response.ok)
      throw new Error(data.error || "Errore revisione attività");
    if (action === "approved") {
      const approvedEntryIds = Array.isArray(data.entryIds)
        ? data.entryIds.map((id: unknown) => String(id)).filter(Boolean)
        : entryIds;
      markEntriesApprovedLocally(approvedEntryIds);
      refreshAfterReview();
      toast.success("Attività approvata");
      return;
    }

    await load();
    notifyOperationalDataChanged();
    if (data.emailSent) {
      toast.success("Modifica richiesta ed email inviata");
    } else {
      toast.success("Modifica richiesta");
    }
  };

  const handleBulkApproveReports = async () => {
    if (!selectedReviewIds.length) return;
    const workDayIds = [...selectedReviewIds];
    setReviewingIds((current) =>
      Array.from(new Set([...current, ...workDayIds])),
    );
    const response = await fetch("/api/time-tracking/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workDayIds,
        action: "approved",
      }),
    });
    const data = await response.json().catch(() => ({}));
    setReviewingIds((current) =>
      current.filter((id) => !workDayIds.includes(id)),
    );
    if (!response.ok)
      throw new Error(data.error || "Errore approvazione rapportini");
    setSelectedReviewIds([]);
    markWorkDaysApprovedLocally(workDayIds);
    refreshAfterReview();
    toast.success(`${data.updated || workDayIds.length} rapportini approvati`);
  };

  const toggleReviewSelection = (workDayId: string) => {
    setSelectedReviewIds((current) =>
      current.includes(workDayId)
        ? current.filter((id) => id !== workDayId)
        : [...current, workDayId],
    );
  };

  const selectAllSubmittedReports = () => {
    const ids = payload?.submittedReports?.map((report) => report.id) || [];
    setSelectedReviewIds((current) =>
      current.length === ids.length ? [] : ids,
    );
  };

  const openReportForEdit = (
    report: TimeTrackingPayload["submittedReports"][number],
  ) => {
    updateDesiredView(report.memberId, report.date);
    timeDraftDirtyRef.current = false;
    checkOutDraftDirtyRef.current = false;
    setDate(report.date);
    setSelectedMemberId(report.memberId);
    setSelectedReviewIds((current) => current.filter((id) => id !== report.id));
    window.setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  if (loading && !payload) {
    return (
      <div className={pageClass}>
        <div className="optima-ops-container overflow-x-clip">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-righello-pink" />
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <div className="optima-ops-container optima-ops-stack overflow-x-clip [overflow-anchor:none] [&_*]:min-w-0">
        <div className="optima-ops-header md:items-center">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-3 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              <UserCheck className="h-7 w-7 shrink-0 text-slate-400 md:h-8 md:w-8" />
              Rapportini
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              {payload?.isManager
                ? "Revisiona presenza degli interni e rendiconti task dei collaboratori esterni."
                : isTaskOnlyWorkLog
                  ? "Registra il lavoro svolto collegando task, clienti, minuti e note di consegna."
                  : "Registra la tua giornata e collega le attività ai task assegnati."}
            </p>
          </div>
          <Badge className="w-fit border-0 bg-righello-pink/20 px-3 py-1 text-righello-pink">
            {payload?.isManager ? "Vista responsabile" : "Vista dipendente"}
          </Badge>
        </div>

        {error && (
          <Alert className="border-red-500/40 bg-red-950/30 text-red-100">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-3 md:grid-cols-4">
          <DailyMetricCard
            label="Attività totali"
            value={formatMinutes(payload?.totals.activityMinutes || 0)}
            detail={
              isTaskOnlyWorkLog
                ? `${payload?.entries.length || 0} mini-invii, presenza non richiesta`
                : hasPresence
                  ? `${payload?.entries.length || 0} mini-invii · presenza ${formatMinutes(payload?.totals.presenceMinutes || 0)}`
                  : `${payload?.entries.length || 0} mini-invii · presenza da aprire`
            }
            tone="cyan"
          />
          <DailyMetricCard
            label="In attesa"
            value={formatMinutes(reviewStats.pendingMinutes)}
            detail={`${reviewStats.pendingCount} attività da approvare`}
            tone={reviewStats.pendingCount > 0 ? "amber" : "green"}
          />
          <DailyMetricCard
            label="Approvate"
            value={formatMinutes(reviewStats.approvedMinutes)}
            detail={`${reviewStats.approvedCount} attività bloccate`}
            tone="green"
          />
          <DailyMetricCard
            label="Da correggere"
            value={
              reviewStats.changesRequestedCount > 0
                ? formatMinutes(reviewStats.changesRequestedMinutes)
                : "0m"
            }
            detail={
              reviewStats.changesRequestedCount > 0
                ? `${reviewStats.changesRequestedCount} attività richiedono modifica`
                : isTaskOnlyWorkLog
                  ? "Nessuna correzione aperta"
                  : `Gap presenza ${reportDeltaMinutes > 0 ? formatMinutes(reportDeltaMinutes) : "0m"}`
            }
            tone={reviewStats.changesRequestedCount > 0 ? "pink" : "green"}
          />
        </section>

        <section className={panelClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-righello-cyan">
                Mini-invii rapportino
              </div>
              <h2 className="mt-1 text-2xl font-bold text-white">
                {isTaskOnlyWorkLog
                  ? `Rendiconto task ${completionRatio}%`
                  : `Copertura giornata ${completionRatio}%`}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                {isTaskOnlyWorkLog
                  ? "Per i collaboratori esterni il rapportino misura task, minuti, cliente/progetto e note di consegna. Entrata e uscita non sono obbligatorie."
                  : "Aggiungi attività durante la giornata: la direzione vedrà un solo rapportino aggregato per persona-giorno."}
              </p>
            </div>
            <Badge className="w-fit rounded-[8px] border border-white/10 bg-white/10 px-3 py-1 text-slate-100">
              {payload?.day?.reviewStatus === "submitted"
                ? "In revisione"
                : payload?.day?.reviewStatus === "approved"
                  ? "Approvato"
                  : payload?.day?.reviewStatus === "changes_requested"
                    ? "Da correggere"
                    : "Bozza"}
            </Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${completionRatio >= 80 ? "bg-emerald-400" : "bg-righello-pink"}`}
              style={{ width: `${completionRatio}%` }}
            />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <FlowStepCard
              number="1"
              title={isTaskOnlyWorkLog ? "Lavoro svolto" : "Presenza"}
              detail={
                isTaskOnlyWorkLog
                  ? `${payload?.entries.length || 0} attività registrate`
                  : hasPresence
                    ? `${formatTime(payload?.day?.checkInAt)} - ${formatTime(payload?.day?.checkOutAt)}`
                    : "Apri giornata o segna assenza."
              }
              icon={<Clock className="h-4 w-4" />}
              state={
                isTaskOnlyWorkLog
                  ? (payload?.entries.length || 0) > 0
                    ? "done"
                    : "active"
                  : hasPresence
                    ? "done"
                    : "active"
              }
            />
            <FlowStepCard
              number="2"
              title="Attività"
              detail={`${payload?.entries.length || 0} righe, ${formatMinutes(payload?.totals.activityMinutes || 0)} registrati.`}
              icon={<ClipboardList className="h-4 w-4" />}
              state={
                (payload?.entries.length || 0) > 0
                  ? "done"
                  : hasPresence || isTaskOnlyWorkLog
                    ? "active"
                    : "idle"
              }
            />
            <FlowStepCard
              number="3"
              title="Salvataggio"
              detail={
                reportDeltaMinutes > 30
                  ? `${formatMinutes(reportDeltaMinutes)} da spiegare prima della review.`
                  : "Puoi salvare e integrare fino a fine giornata."
              }
              icon={<FileText className="h-4 w-4" />}
              state={
                payload?.day?.reviewStatus === "submitted" ||
                payload?.day?.reviewStatus === "approved"
                  ? "done"
                  : (payload?.entries.length || 0) > 0
                    ? "active"
                    : "idle"
              }
            />
          </div>
        </section>

        <section className="grid items-start gap-3 lg:grid-cols-12">
          <div className={`${panelClass} lg:col-span-7 lg:row-span-2`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-righello-pink">
                  {isTaskOnlyWorkLog ? "Rendiconto lavoro" : "Fine giornata"}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {isTaskOnlyWorkLog
                    ? "Task e minuti"
                    : "Controllo rapido della giornata"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isTaskOnlyWorkLog
                    ? "Per i collaboratori esterni contano attività, minuti, cliente/progetto e note: la presenza non viene richiesta."
                    : "Entrata, uscita e attività devono raccontare la giornata senza interpretazioni: se manca qualcosa, correggilo qui prima della review."}
                </p>
              </div>
              {isDayClosed && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 w-full max-w-full shrink-0 rounded-[8px] border-amber-300/30 bg-amber-300/10 px-3 text-amber-100 hover:bg-amber-300/15 sm:w-auto"
                  onClick={() =>
                    undoCheckOut().catch((err) => toast.error(err.message))
                  }
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Annulla checkout
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  {isTaskOnlyWorkLog ? "Modalità" : "Entrata"}
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {isTaskOnlyWorkLog
                    ? "Task"
                    : formatTime(payload?.day?.checkInAt)}
                </p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  {isTaskOnlyWorkLog ? "Valore" : "Uscita"}
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {isTaskOnlyWorkLog
                    ? formatMinutes(payload?.totals.activityMinutes || 0)
                    : formatTime(payload?.day?.checkOutAt)}
                </p>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Task registrate
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {payload?.entries.length || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 rounded-[8px] border border-white/10 bg-[#101827] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">
                  {payload?.day?.reviewStatus === "changes_requested"
                    ? "Ci sono correzioni aperte"
                    : payload?.day?.reviewStatus === "approved"
                      ? "Giornata approvata"
                      : "Giornata modificabile"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {isTaskOnlyWorkLog
                    ? "Per esterni e freelance conta il valore delle attività rendicontate, non la presenza."
                    : "La presenza resta un controllo operativo; il valore della giornata si legge dai minuti delle attività."}
                </p>
              </div>
              <Badge
                className={`w-fit rounded-[8px] border ${
                  payload?.day?.reviewStatus === "changes_requested"
                    ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                    : payload?.day?.reviewStatus === "approved"
                      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                      : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                }`}
              >
                {payload?.day?.reviewStatus === "submitted"
                  ? "In review"
                  : payload?.day?.reviewStatus === "approved"
                    ? "Approvata"
                    : payload?.day?.reviewStatus === "changes_requested"
                      ? "Da correggere"
                      : "Bozza"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:col-span-5">
            <DailyMetricCard
              label="Settimana"
              value={`${formatMinutes(payload?.totals.week?.activityMinutes || 0)} attività`}
              detail={
                isTaskOnlyWorkLog
                  ? `${formatDateRange(payload?.totals.week?.start, payload?.totals.week?.end)} · ${payload?.totals.week?.entryCount || 0} righe`
                  : `${formatDateRange(payload?.totals.week?.start, payload?.totals.week?.end)} · ${formatMinutes(payload?.totals.week?.presenceMinutes || 0)} presenza`
              }
              tone="cyan"
            />
            <DailyMetricCard
              label="Mese"
              value={`${formatMinutes(payload?.totals.month?.activityMinutes || 0)} attività`}
              detail={
                isTaskOnlyWorkLog
                  ? `${formatDateRange(payload?.totals.month?.start, payload?.totals.month?.end)} · ${payload?.totals.month?.entryCount || 0} righe`
                  : `${formatDateRange(payload?.totals.month?.start, payload?.totals.month?.end)} · ${formatMinutes(payload?.totals.month?.presenceMinutes || 0)} presenza`
              }
              tone="green"
            />
          </div>

          <div className={`${panelClass} lg:col-span-5`}>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-righello-cyan">
              Metodo Righello
            </div>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Come collegare bene il lavoro
            </h2>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-300">
              {[
                "Se esiste una task, collega la task.",
                "Se non esiste, collega almeno il progetto.",
                "Nuove task e progetti si creano dal workspace.",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[8px] border border-white/10 bg-[#101827] p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-cyan-300/10 text-xs font-black text-righello-cyan">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-white">{step}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-400">
                      {index === 0
                        ? "Porta con sé cliente, priorità e checklist."
                        : index === 1
                          ? "Tiene puliti consuntivi e lettura cliente."
                          : "Poi tornano nel selettore del rapportino."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              asChild
              variant="outline"
              className="mt-4 min-h-10 rounded-[8px] border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
            >
              <Link href="/workspace">
                Apri workspace
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {payload?.isManager && payload.submittedReports?.length ? (
          <section className={panelClass}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-righello-pink">
                  Review responsabili
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Rapportini da revisionare
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                  Seleziona più dipendenti per approvare in blocco oppure apri
                  un rapportino per correggere orari, note e attività prima
                  della review.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="w-fit border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                  {payload?.submittedReports.length || 0} in attesa
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-[8px] border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                  onClick={selectAllSubmittedReports}
                >
                  {selectedReviewIds.length === payload.submittedReports.length
                    ? "Deseleziona"
                    : "Seleziona tutti"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-[8px] bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50"
                  disabled={
                    !selectedReviewIds.length || reviewingIds.length > 0
                  }
                  onClick={() =>
                    handleBulkApproveReports().catch((err) =>
                      toast.error(err.message),
                    )
                  }
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Approva selezionati
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {payload.submittedReports.map((report) => {
                const selected = selectedReviewIds.includes(report.id);
                const busy = reviewingIds.includes(report.id);
                const active =
                  report.memberId === selectedMemberId && report.date === date;
                const changeRequestOpen = changeRequestOpenId === report.id;
                const changeRequestMessage =
                  changeRequestMessages[report.id] || "";

                return (
                  <div
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openReportForEdit(report)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openReportForEdit(report);
                      }
                    }}
                    className={`cursor-pointer rounded-[8px] border p-4 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.04] ${
                      active
                        ? "border-righello-pink/45 bg-righello-pink/[0.07]"
                        : selected
                          ? "border-emerald-300/35 bg-emerald-300/[0.06]"
                          : "border-white/10 bg-[#0d1524]"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <label className="flex min-w-0 cursor-pointer items-start gap-3">
                        <Checkbox
                          checked={selected}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() =>
                            toggleReviewSelection(report.id)
                          }
                          className="mt-1 border-white/20 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-black text-white">
                            {report.memberName}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {formatShortDate(report.date)} · {report.role} ·{" "}
                            {report.entryCount} attività ·{" "}
                            {formatMinutes(report.activityMinutes)}
                            {typeof report.pendingCount === "number"
                              ? ` · ${report.pendingCount} in attesa`
                              : ""}
                            {report.changesRequestedCount
                              ? ` · ${report.changesRequestedCount} da correggere`
                              : ""}
                            {report.submittedAt
                              ? ` · inviato ${formatTime(report.submittedAt)}`
                              : ""}
                          </span>
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[8px] border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
                          onClick={(event) => {
                            event.stopPropagation();
                            openReportForEdit(report);
                          }}
                        >
                          <FileText className="mr-1.5 h-4 w-4" />
                          Apri
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-[8px] bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50"
                          disabled={busy}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleReviewReport(report.id, "approved").catch(
                              (err) => toast.error(err.message),
                            );
                          }}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Approva
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={`rounded-[8px] border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15 ${
                            changeRequestOpen ? "border-amber-200/60" : ""
                          }`}
                          disabled={busy}
                          onClick={(event) => {
                            event.stopPropagation();
                            setChangeRequestOpenId((current) =>
                              current === report.id ? null : report.id,
                            );
                          }}
                        >
                          {changeRequestOpen
                            ? "Chiudi richiesta"
                            : "Richiedi modifiche"}
                        </Button>
                      </div>
                    </div>

                    {changeRequestOpen ? (
                      <div
                        className="mt-4 overflow-hidden rounded-[10px] border border-amber-300/20 bg-amber-300/[0.045] p-3 shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-end gap-2">
                          <div className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-300/25 bg-amber-300/10 text-amber-100 sm:grid">
                            <FileText className="h-4 w-4" />
                          </div>
                          <Textarea
                            value={changeRequestMessage}
                            onChange={(event) =>
                              setChangeRequestMessages((current) => ({
                                ...current,
                                [report.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (
                                (event.metaKey || event.ctrlKey) &&
                                event.key === "Enter"
                              ) {
                                event.preventDefault();
                                handleReviewReport(
                                  report.id,
                                  "changes_requested",
                                  changeRequestMessage,
                                )
                                  .then(() => {
                                    setChangeRequestOpenId(null);
                                    setChangeRequestMessages((current) => {
                                      const next = { ...current };
                                      delete next[report.id];
                                      return next;
                                    });
                                  })
                                  .catch((err) => toast.error(err.message));
                              }
                            }}
                            rows={2}
                            className="min-h-[46px] flex-1 resize-none rounded-[18px] border-white/10 bg-[#07101d] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-200/50 focus:ring-amber-200/20"
                            placeholder={`Scrivi cosa deve correggere ${report.memberName}...`}
                          />
                          <Button
                            type="button"
                            size="icon"
                            className="h-11 w-11 shrink-0 rounded-full bg-amber-300 text-slate-950 hover:bg-amber-200 disabled:opacity-50"
                            disabled={
                              busy || changeRequestMessage.trim().length < 6
                            }
                            aria-label="Invia richiesta modifiche"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleReviewReport(
                                report.id,
                                "changes_requested",
                                changeRequestMessage,
                              )
                                .then(() => {
                                  setChangeRequestOpenId(null);
                                  setChangeRequestMessages((current) => {
                                    const next = { ...current };
                                    delete next[report.id];
                                    return next;
                                  });
                                })
                                .catch((err) => toast.error(err.message));
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-amber-100/75 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            Il testo viene salvato nella review e inviato via
                            email al dipendente quando l'indirizzo è
                            disponibile.
                          </span>
                          <span className="font-semibold text-amber-100/90">
                            Cmd/Ctrl + Invio
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {detailIsStale ? (
          <section ref={detailSectionRef} className={`${panelClass} py-10`}>
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-righello-pink" />
              <h2 className="mt-5 text-2xl font-black text-white">
                Caricamento rapportino...
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Sto aprendo il dettaglio corretto per {pendingReportLabel}.
                Attendo i dati aggiornati prima di mostrare orari e attività.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
            <section ref={detailSectionRef} className={panelClass}>
              <div className="mb-5">
                <div className="break-words text-xs font-black uppercase tracking-[0.12em] text-righello-pink sm:tracking-[0.24em]">
                  {formatDateLabel(date)}
                </div>
                <h2 className="mt-1 break-words text-2xl font-bold text-white">
                  {payload?.selectedMember?.name || "Dipendente"}
                </h2>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-400">
                    Giornata
                  </label>
                  <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-[8px] border border-white/10 bg-[#222a31]">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Giorno precedente"
                      className="h-11 rounded-none border-r border-white/10 text-slate-100 hover:bg-white/10 hover:text-white"
                      onClick={() => shiftDate(-1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <label className="relative flex min-w-0 items-center justify-center px-3 text-sm font-semibold text-slate-100">
                      <span className="pointer-events-none truncate">
                        {formatShortDate(date)}
                      </span>
                      <Input
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        type="date"
                        value={date}
                        aria-label="Seleziona giornata"
                        onChange={(event) => {
                          updateDesiredView(
                            selectedMemberId,
                            event.target.value,
                          );
                          setDate(event.target.value);
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Giorno successivo"
                      className="h-11 rounded-none border-l border-white/10 text-slate-100 hover:bg-white/10 hover:text-white"
                      onClick={() => shiftDate(1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {payload?.isManager && (
                  <div className="grid gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                      <Users className="h-4 w-4" />
                      Dipendente
                    </label>
                    <select
                      className={selectClass}
                      value={selectedMemberId}
                      onChange={(event) => {
                        updateDesiredView(event.target.value, date);
                        setSelectedMemberId(event.target.value);
                      }}
                    >
                      {payload.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isTaskOnlyWorkLog ? (
                  <div className="rounded-[8px] border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                    <div className="flex items-start gap-3">
                      <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                      <div className="min-w-0">
                        <p className="font-black text-white">
                          Collaboratore esterno: rendiconto task
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          Entrata, uscita e assenze non sono richieste.
                          Inserisci solo attività, minuti, cliente/progetto,
                          remoto e note utili alla review.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                      <Button
                        className="h-auto min-h-12 w-full min-w-0 whitespace-normal bg-righello-pink px-3 text-white hover:bg-righello-pink-dark"
                        onClick={() =>
                          mutateDay(
                            "check-in",
                            payload?.isManager ? { time: checkInTime } : {},
                          )
                            .then(() => {
                              timeDraftDirtyRef.current = false;
                              checkOutDraftDirtyRef.current = false;
                              toast.success("Check-in registrato");
                            })
                            .catch((err) => toast.error(err.message))
                        }
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Check-in
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto min-h-12 w-full min-w-0 whitespace-normal border-white/10 bg-[#0a0f1d] px-3 text-slate-100 hover:bg-white/10 hover:text-white"
                        onClick={() =>
                          mutateDay(
                            "check-out",
                            payload?.isManager ? { time: checkOutTime } : {},
                          )
                            .then(() => {
                              timeDraftDirtyRef.current = false;
                              checkOutDraftDirtyRef.current = false;
                              toast.success("Check-out registrato");
                            })
                            .catch((err) => toast.error(err.message))
                        }
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Check-out
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto min-h-12 w-full min-w-0 whitespace-normal border-red-400/30 bg-red-950/20 px-3 text-red-100 hover:bg-red-500/15 hover:text-red-50"
                        onClick={() =>
                          mutateDay("absence", { reason: absenceReason })
                            .then(() => toast.success("Assenza registrata"))
                            .catch((err) => toast.error(err.message))
                        }
                      >
                        Segna assenza
                      </Button>
                    </div>

                    {payload?.isManager ? (
                      <>
                        <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                          <TimePickerField
                            label="Entrata"
                            value={checkInTime}
                            onChange={handleCheckInTimeChange}
                            helper="Modifica il valore e premi Salva orari."
                          />
                          <TimePickerField
                            label="Uscita"
                            value={checkOutTime}
                            onChange={handleCheckOutTimeChange}
                            helper={
                              payload?.day?.checkOutAt
                                ? "Uscita registrata: puoi correggerla qui."
                                : "Si salva solo se hai fatto checkout o la modifichi."
                            }
                          />
                        </div>

                        <div className="flex flex-col gap-2 rounded-[8px] border border-cyan-300/15 bg-cyan-300/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs leading-5 text-slate-400">
                            Per correggere una giornata già aperta o chiusa,
                            aggiorna gli orari qui e salva. I pulsanti sopra
                            restano scorciatoie per registrare entrata e uscita.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 rounded-[8px] border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
                            onClick={() =>
                              savePresenceTimes().catch((err) =>
                                toast.error(err.message),
                              )
                            }
                          >
                            <Check className="mr-1.5 h-4 w-4" />
                            Salva orari
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-[8px] border border-cyan-300/15 bg-cyan-300/[0.04] p-3 text-xs leading-5 text-slate-400">
                        Entrata e uscita usano l'orario certificato dal server
                        al momento del click. Le correzioni manuali passano da
                        un responsabile.
                      </div>
                    )}
                  </>
                )}

                <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-400">
                      Attività svolta
                    </label>
                    <Input
                      className={fieldClass}
                      placeholder="Es. montaggio video, call cliente, sviluppo landing..."
                      value={activity}
                      onChange={(event) => setActivity(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-400">
                      Minuti
                    </label>
                    <Input
                      className={fieldClass}
                      type="number"
                      min={1}
                      max={1440}
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-[8px] border border-white/10 bg-[#101827] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Compilazione rapida HR
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Presenza, attività collegate e note di blocco devono
                        restare separati: così il dato è leggibile anche a fine
                        mese.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[15, 30, 45, 60, 90, 120].map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-[8px] border-white/10 bg-white/[0.04] px-2.5 text-xs text-slate-100 hover:bg-white/10"
                          onClick={() => setMinutes(String(value))}
                        >
                          {formatMinutes(value)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-400">
                      Tipo attività
                    </label>
                    <select
                      className={selectClass}
                      value={activityCategory}
                      onChange={(event) => {
                        const nextCategory = event.target.value;
                        setActivityCategory(nextCategory);
                        if (
                          nextCategory === "Attività interna non fatturabile"
                        ) {
                          setIsBillable(false);
                        }
                      }}
                    >
                      {activityCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs leading-5 text-slate-500">
                      Tassonomia agenzia: rende confrontabili clienti, progetti
                      e preventivi.
                    </p>
                  </div>

                  <div
                    className={`flex min-w-0 items-start gap-3 rounded-[8px] border p-3 text-left transition ${
                      isBillable
                        ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-50"
                        : "border-amber-300/35 bg-amber-400/10 text-amber-50"
                    }`}
                  >
                    <Checkbox
                      checked={isBillable}
                      onCheckedChange={(checked) =>
                        setIsBillable(checked === true)
                      }
                      className="mt-0.5 border-white/30 data-[state=checked]:border-emerald-300 data-[state=checked]:bg-emerald-400"
                      aria-label="Attività fatturabile"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-black text-white">
                        <FileText className="h-4 w-4 text-emerald-200" />
                        Attività fatturabile
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-300">
                        Disattiva per formazione, riunioni interne,
                        amministrazione o lavoro non imputabile al cliente.
                      </span>
                    </span>
                  </div>
                </div>

                <div
                  className={`flex min-w-0 items-start gap-3 rounded-[8px] border p-3 text-left transition ${
                    isRemote
                      ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50"
                      : "border-white/10 bg-[#101827] text-slate-200 hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <Checkbox
                    checked={isRemote}
                    onCheckedChange={(checked) => setIsRemote(checked === true)}
                    className="mt-0.5 border-white/30 data-[state=checked]:border-cyan-300 data-[state=checked]:bg-cyan-400"
                    aria-label="Task svolta in remoto"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-black text-white">
                      <MonitorUp className="h-4 w-4 text-cyan-200" />
                      Task svolta in remoto
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      Spunta quando l'attività è stata eseguita fuori sede: il
                      dato resta allineato anche nella task del workspace.
                    </span>
                  </span>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-400">
                    Progetto o task collegato
                  </label>
                  <div className="grid gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-12 w-full justify-start gap-3 border-white/10 bg-[#222a31] px-3 py-3 text-left text-slate-100 hover:bg-white/10 hover:text-white"
                      onClick={() => setTargetPickerOpen(true)}
                    >
                      {selectedOption?.kind === "task" ? (
                        <ClipboardList className="h-4 w-4 shrink-0 text-righello-pink" />
                      ) : selectedOption?.kind === "client" ? (
                        <Building2 className="h-4 w-4 shrink-0 text-cyan-200" />
                      ) : (
                        <FolderKanban className="h-4 w-4 shrink-0 text-righello-cyan" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                          {selectedOption?.label || "Attività generale"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {selectedOption
                            ? selectedOption.kind === "task"
                              ? `${selectedOption.projectName || selectedOption.clientName || "Task"}${selectedOption.subItems?.length ? ` · ${selectedOption.subItems.filter((item) => item.completed).length}/${selectedOption.subItems.length} checklist` : ""}`
                              : selectedOption.kind === "project"
                                ? selectedOption.clientName
                                  ? `Progetto · ${selectedOption.clientName}`
                                  : "Progetto"
                                : "Cliente"
                            : "Nessun collegamento obbligatorio"}
                        </span>
                      </span>
                    </Button>
                    {selectedOption && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-fit px-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setSelectedTarget("");
                          setSelectedClientId("");
                          setIsRemote(false);
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Rimuovi collegamento
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                    <Building2 className="h-4 w-4" />
                    Cliente collegato
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-12 w-full justify-start gap-3 border-white/10 bg-[#222a31] px-3 py-3 text-left text-slate-100 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setClientSearch("");
                      setClientPickerOpen(true);
                    }}
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-cyan-200" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {selectedClientOption?.label ||
                          selectedClientOption?.name ||
                          "Nessun cliente specifico"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {selectedClientOption
                          ? "Cliente selezionato per questa attività"
                          : "Cerca e collega un cliente"}
                      </span>
                    </span>
                    <Search className="h-4 w-4 shrink-0 text-slate-500" />
                  </Button>
                  <p className="text-xs leading-5 text-slate-500">
                    Se scegli una task o un progetto, il cliente viene compilato
                    automaticamente quando disponibile.
                  </p>
                </div>

                <Dialog
                  open={clientPickerOpen}
                  onOpenChange={setClientPickerOpen}
                >
                  <DialogContent className="max-h-[86dvh] w-[calc(100vw-24px)] max-w-xl overflow-hidden rounded-[8px] border-white/10 bg-[#070b14] p-0 text-slate-100 shadow-2xl sm:w-full">
                    <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-5">
                      <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
                        <Building2 className="h-5 w-5 text-cyan-200" />
                        Cerca cliente
                      </DialogTitle>
                      <p className="text-sm text-slate-400">
                        Filtra per nome o azienda e collega il cliente al
                        rapportino.
                      </p>
                    </DialogHeader>
                    <div className="border-b border-white/10 p-4 sm:p-5">
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          className="h-12 border-white/10 bg-[#111827] pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"
                          placeholder="Cerca cliente..."
                          value={clientSearch}
                          onChange={(event) =>
                            setClientSearch(event.target.value)
                          }
                          autoFocus
                        />
                      </label>
                    </div>
                    <div className="max-h-[58dvh] space-y-2 overflow-y-auto overscroll-contain p-4 sm:p-5">
                      <button
                        type="button"
                        className={`flex w-full items-start gap-3 rounded-[8px] border p-3 text-left transition ${
                          !selectedClientId
                            ? "border-cyan-300/70 bg-cyan-300/10"
                            : "border-white/10 bg-[#111827] hover:border-white/25"
                        }`}
                        onClick={() => {
                          setSelectedClientId("");
                          setClientSearch("");
                          setClientPickerOpen(false);
                        }}
                      >
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-white">
                            Nessun cliente specifico
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-400">
                            Usa questa opzione solo per attività interne o non
                            attribuibili a un cliente.
                          </span>
                        </span>
                        {!selectedClientId ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                        ) : null}
                      </button>

                      {filteredClientOptions.map((client) => {
                        const selected = client.id === selectedClientId;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            className={`flex w-full items-start gap-3 rounded-[8px] border p-3 text-left transition ${
                              selected
                                ? "border-cyan-300/70 bg-cyan-300/10"
                                : "border-white/10 bg-[#111827] hover:border-white/25"
                            }`}
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setClientSearch("");
                              setClientPickerOpen(false);
                            }}
                          >
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                            <span className="min-w-0 flex-1">
                              <span className="block break-words text-sm font-bold text-white">
                                {client.name || client.label}
                              </span>
                              {client.company ? (
                                <span className="mt-1 block text-xs text-slate-400">
                                  {client.company}
                                </span>
                              ) : null}
                            </span>
                            {selected ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                            ) : null}
                          </button>
                        );
                      })}

                      {!filteredClientOptions.length ? (
                        <div className="rounded-[8px] border border-dashed border-white/15 p-8 text-center text-slate-400">
                          Nessun cliente trovato.
                        </div>
                      ) : null}
                    </div>
                  </DialogContent>
                </Dialog>

                {selectedOption?.kind !== "task" && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 p-3 transition hover:border-cyan-300/35 hover:bg-cyan-300/15">
                    <Checkbox
                      checked={createTaskFromReport}
                      onCheckedChange={(checked) =>
                        setCreateTaskFromReport(Boolean(checked))
                      }
                      className="mt-0.5 border-cyan-200/40 data-[state=checked]:border-cyan-300 data-[state=checked]:bg-cyan-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-cyan-50">
                        Crea task completata dal rapportino
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-cyan-100/75">
                        Utile quando hai svolto un lavoro per un cliente ma non
                        esiste ancora la task. Optima crea la task, la segna
                        completata e collega subito il tempo.
                      </span>
                    </span>
                  </label>
                )}

                <Dialog
                  open={targetPickerOpen}
                  onOpenChange={setTargetPickerOpen}
                >
                  <DialogContent className="max-h-[86dvh] w-[calc(100vw-24px)] max-w-3xl overflow-hidden rounded-[8px] border-white/10 bg-[#070b14] p-0 text-slate-100 shadow-2xl sm:w-full">
                    <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-5">
                      <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
                        <ListChecks className="h-5 w-5 text-righello-pink" />
                        Collega attività
                      </DialogTitle>
                      <p className="text-sm text-slate-400">
                        Cerca task, progetto, cliente o checklist. Le task sono
                        raggruppate per progetto/cliente.
                      </p>
                    </DialogHeader>

                    <div className="border-b border-white/10 p-4 sm:p-5">
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          className="h-12 border-white/10 bg-[#111827] pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"
                          placeholder="Cerca: cliente, progetto, task, sub-attività..."
                          value={targetSearch}
                          onChange={(event) =>
                            setTargetSearch(event.target.value)
                          }
                          autoFocus
                        />
                      </label>
                    </div>

                    <div className="max-h-[58dvh] space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
                      <button
                        type="button"
                        className="w-full rounded-[8px] border border-dashed border-white/15 bg-white/[0.03] p-4 text-left transition hover:border-righello-pink/50 hover:bg-righello-pink/10"
                        onClick={() => {
                          setSelectedTarget("");
                          setSelectedClientId("");
                          setIsRemote(false);
                          setTargetPickerOpen(false);
                        }}
                      >
                        <div className="font-bold text-white">
                          Attività generale
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          Usala per lavoro non associato a un progetto o task
                          specifica.
                        </div>
                      </button>

                      {groupedTargets.taskGroups.map(([groupName, tasks]) => (
                        <div key={groupName} className="space-y-2">
                          <div className="sticky top-[-1rem] z-10 -mx-4 border-y border-white/10 bg-[#070b14]/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur sm:-mx-5 sm:px-5">
                            {groupName}
                          </div>
                          <div className="grid gap-2">
                            {tasks.map((option) => {
                              const completed =
                                option.subItems?.filter(
                                  (item) => item.completed,
                                ).length || 0;
                              const total = option.subItems?.length || 0;
                              return (
                                <div
                                  key={option.value}
                                  className={`rounded-[8px] border p-3 transition ${
                                    selectedTarget === option.value
                                      ? "border-righello-pink/70 bg-righello-pink/10"
                                      : "border-white/10 bg-[#111827] hover:border-white/25"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="w-full text-left"
                                    onClick={() => selectTarget(option)}
                                  >
                                    <div className="flex min-w-0 items-start gap-3">
                                      <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-righello-pink" />
                                      <div className="min-w-0 flex-1">
                                        <div className="break-words text-sm font-bold leading-5 text-white">
                                          {option.title || option.label}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                          <span>
                                            {statusLabel[option.status || ""] ||
                                              option.status ||
                                              "Task"}
                                          </span>
                                          {option.dueAt ? (
                                            <span>
                                              Scade{" "}
                                              {formatDueDate(option.dueAt)}
                                            </span>
                                          ) : null}
                                          {total ? (
                                            <span>
                                              {completed}/{total} checklist
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  </button>

                                  {option.subItems?.length ? (
                                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                      {option.subItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-start gap-2 rounded-md bg-black/20 p-2"
                                        >
                                          <Checkbox
                                            checked={item.completed}
                                            className="mt-0.5 border-white/30 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500"
                                            onCheckedChange={() =>
                                              handleToggleSubItem(
                                                option,
                                                item.id,
                                              )
                                                .then(() =>
                                                  toast.success(
                                                    "Checklist aggiornata",
                                                  ),
                                                )
                                                .catch((err) =>
                                                  toast.error(err.message),
                                                )
                                            }
                                          />
                                          <button
                                            type="button"
                                            className={`min-w-0 flex-1 text-left text-sm leading-5 ${
                                              item.completed
                                                ? "text-slate-500 line-through"
                                                : "text-slate-200 hover:text-white"
                                            }`}
                                            onClick={() =>
                                              selectTarget(option, item.title)
                                            }
                                          >
                                            {item.title}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {groupedTargets.projects.length ? (
                        <div className="space-y-2">
                          <div className="sticky top-[-1rem] z-10 -mx-4 border-y border-white/10 bg-[#070b14]/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur sm:-mx-5 sm:px-5">
                            Progetti
                          </div>
                          <div className="grid gap-2">
                            {groupedTargets.projects.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`rounded-[8px] border p-3 text-left transition ${
                                  selectedTarget === option.value
                                    ? "border-righello-cyan/70 bg-righello-cyan/10"
                                    : "border-white/10 bg-[#111827] hover:border-white/25"
                                }`}
                                onClick={() => selectTarget(option)}
                              >
                                <div className="flex items-start gap-3">
                                  <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-righello-cyan" />
                                  <div className="min-w-0">
                                    <div className="break-words text-sm font-bold text-white">
                                      {option.name || option.label}
                                    </div>
                                    {option.clientName ? (
                                      <div className="mt-1 text-xs text-slate-400">
                                        {option.clientName}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {groupedTargets.clients.length ? (
                        <div className="space-y-2">
                          <div className="sticky top-[-1rem] z-10 -mx-4 border-y border-white/10 bg-[#070b14]/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur sm:-mx-5 sm:px-5">
                            Clienti
                          </div>
                          <div className="grid gap-2">
                            {groupedTargets.clients.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`rounded-[8px] border p-3 text-left transition ${
                                  selectedTarget === option.value
                                    ? "border-cyan-300/70 bg-cyan-300/10"
                                    : "border-white/10 bg-[#111827] hover:border-white/25"
                                }`}
                                onClick={() => selectTarget(option)}
                              >
                                <div className="flex items-start gap-3">
                                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                                  <div className="min-w-0">
                                    <div className="break-words text-sm font-bold text-white">
                                      {option.name || option.label}
                                    </div>
                                    {option.company ? (
                                      <div className="mt-1 text-xs text-slate-400">
                                        {option.company}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {!filteredTargets.length && (
                        <div className="rounded-[8px] border border-dashed border-white/15 p-8 text-center text-slate-400">
                          Nessuna task, progetto o cliente trovato.
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  className="h-auto min-h-11 w-full min-w-0 whitespace-normal bg-righello-pink px-3 text-white hover:bg-righello-pink-dark"
                  disabled={
                    entrySubmitting ||
                    (!payload?.isManager && isPastSelectedDate)
                  }
                  onClick={() =>
                    handleAddEntry()
                      .then((added) => {
                        if (added) toast.success("Attività aggiunta");
                      })
                      .catch((err) => toast.error(err.message))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {entrySubmitting
                    ? "Salvataggio..."
                    : !payload?.isManager && isPastSelectedDate
                      ? "Giornata chiusa"
                      : createTaskFromReport && selectedOption?.kind !== "task"
                        ? "Crea task e aggiungi attività"
                        : "Aggiungi attività"}
                </Button>

                <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-[#1b242b] p-4">
                    <div className="text-sm text-slate-400">
                      Ore presenza nette
                    </div>
                    <div className="mt-1 text-3xl font-black text-white">
                      {formatMinutes(payload?.totals.presenceMinutes || 0)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {formatTime(payload?.day?.checkInAt)} -{" "}
                      {formatTime(payload?.day?.checkOutAt)}
                      {payload?.totals.lunchBreakMinutes
                        ? ` · pausa ${formatMinutes(payload.totals.lunchBreakMinutes)}`
                        : ""}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#1b242b] p-4">
                    <div className="text-sm text-slate-400">Ore attività</div>
                    <div className="mt-1 text-3xl font-black text-white">
                      {formatMinutes(payload?.totals.activityMinutes || 0)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      {payload?.day?.status || "da aprire"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={panelClass}>
              <div className="mb-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-righello-pink sm:tracking-[0.24em]">
                  Rapportino
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Timeline mini-invii
                </h2>
              </div>

              <div className="w-full min-w-0 max-w-full space-y-3">
                <div className="rounded-[8px] border border-white/10 bg-[#0d1524] p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-righello-pink" />
                    <div>
                      <p className="font-bold text-white">
                        Suggerimenti da workspace
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Parti dalle task assegnate: riduce scrittura manuale,
                        errori di consuntivo e attività non collegata.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {suggestedTargets.length ? (
                      suggestedTargets.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="w-full rounded-[8px] border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-righello-pink/40 hover:bg-righello-pink/10"
                          onClick={() => {
                            setSelectedTarget(option.value);
                            const nextClientId = resolveClientId(option);
                            if (nextClientId) setSelectedClientId(nextClientId);
                            setIsRemote(option.workMode === "remote");
                            setActivity(option.title || option.label);
                            setMinutes("60");
                          }}
                        >
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold text-white">
                                {option.title || option.label}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {option.projectName ||
                                  option.clientName ||
                                  "Task"}
                                {option.dueAt
                                  ? ` · scade ${formatDueDate(option.dueAt)}`
                                  : ""}
                              </p>
                            </div>
                            <Badge className="w-fit rounded-[8px] border border-white/10 bg-white/10 text-slate-200">
                              Usa nel rapportino
                            </Badge>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[8px] border border-dashed border-white/10 p-4 text-sm text-slate-500">
                        Nessuna task aperta assegnata per questa giornata.
                      </div>
                    )}
                  </div>
                </div>

                {payload?.entries.length ? (
                  timelineGroups.map((group) => (
                    <div
                      key={group.status || "submitted"}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                          {entryReviewLabel(group.status)}
                        </div>
                        <Badge
                          className={`rounded-[8px] border ${entryReviewTone(group.status)}`}
                        >
                          {group.entries.length}
                        </Badge>
                      </div>
                      {group.entries.map((entry) => {
                        const busy = reviewingIds.includes(entry.id);
                        const canReviewEntry =
                          payload?.isManager &&
                          entry.reviewStatus !== "approved";
                        const canRemoveEntry =
                          payload?.isManager ||
                          (entry.reviewStatus !== "approved" &&
                            !isPastSelectedDate);
                        const entryChangeOpen =
                          entryChangeRequestOpenId === entry.id;
                        const entryChangeMessage =
                          entryChangeRequestMessages[entry.id] || "";

                        return (
                          <div
                            key={entry.id}
                            className="min-w-0 rounded-[8px] border border-white/10 bg-[#222a31] p-4"
                          >
                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="break-words font-bold leading-6 text-white">
                                  {entry.projectName
                                    ? `${entry.projectName}: `
                                    : ""}
                                  {stripActivityCategory(
                                    entry.note,
                                    entry.activityCategory,
                                  ) || "Attività registrata"}
                                </div>
                                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-400">
                                  <Clock className="h-4 w-4 shrink-0" />
                                  {formatMinutes(entry.minutes)}
                                  <Badge
                                    className={`rounded-[8px] border ${entryReviewTone(entry.reviewStatus)}`}
                                  >
                                    {entryReviewLabel(entry.reviewStatus)}
                                  </Badge>
                                  {entry.activityCategory ? (
                                    <Badge className="rounded-[8px] border border-white/10 bg-white/10 text-slate-200">
                                      {entry.activityCategory}
                                    </Badge>
                                  ) : null}
                                  <Badge
                                    className={`rounded-[8px] border ${
                                      entry.billable === false
                                        ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                                        : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                                    }`}
                                  >
                                    {entry.billable === false
                                      ? "Non fatturabile"
                                      : "Fatturabile"}
                                  </Badge>
                                  {entry.workMode === "remote" ? (
                                    <Badge className="gap-1 rounded-[8px] border border-cyan-300/25 bg-cyan-400/10 text-cyan-100">
                                      <MonitorUp className="h-3.5 w-3.5" />
                                      Remoto
                                    </Badge>
                                  ) : null}
                                  {entry.clientName ? (
                                    <Badge className="gap-1 rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                                      <Building2 className="h-3.5 w-3.5" />
                                      {entry.clientName}
                                    </Badge>
                                  ) : null}
                                  {entry.taskTitle ? (
                                    <span className="min-w-0 break-words">
                                      · {entry.taskTitle}
                                    </span>
                                  ) : null}
                                </div>
                                {entry.reviewNotes ? (
                                  <div className="mt-3 rounded-[8px] border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm leading-6 text-amber-100">
                                    {entry.reviewNotes}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
                                {canReviewEntry ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="flex-1 rounded-[8px] bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 sm:flex-none"
                                    disabled={busy}
                                    onClick={() =>
                                      handleReviewEntries(
                                        [entry.id],
                                        "approved",
                                      ).catch((err) => toast.error(err.message))
                                    }
                                  >
                                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                    Approva
                                  </Button>
                                ) : null}
                                {canReviewEntry ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 rounded-[8px] border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15 disabled:opacity-50 sm:flex-none"
                                    disabled={busy}
                                    onClick={() =>
                                      setEntryChangeRequestOpenId((current) =>
                                        current === entry.id ? null : entry.id,
                                      )
                                    }
                                  >
                                    Richiedi
                                  </Button>
                                ) : null}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 shrink-0 border-white/10 bg-white/5 text-slate-100 hover:bg-red-500/15 hover:text-red-100 disabled:opacity-50 sm:flex-none"
                                  disabled={!canRemoveEntry}
                                  onClick={() =>
                                    handleDeleteEntry(entry.id)
                                      .then(() =>
                                        toast.success("Attività rimossa"),
                                      )
                                      .catch((err) => toast.error(err.message))
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Rimuovi
                                </Button>
                              </div>
                            </div>
                            {entryChangeOpen ? (
                              <div className="mt-3 flex items-end gap-2 rounded-[10px] border border-amber-300/20 bg-amber-300/[0.045] p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Textarea
                                  value={entryChangeMessage}
                                  onChange={(event) =>
                                    setEntryChangeRequestMessages(
                                      (current) => ({
                                        ...current,
                                        [entry.id]: event.target.value,
                                      }),
                                    )
                                  }
                                  rows={2}
                                  className="min-h-[44px] flex-1 resize-none rounded-[18px] border-white/10 bg-[#07101d] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-200/50 focus:ring-amber-200/20"
                                  placeholder="Scrivi cosa va corretto in questa attività..."
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 rounded-full bg-amber-300 text-slate-950 hover:bg-amber-200 disabled:opacity-50"
                                  disabled={
                                    busy || entryChangeMessage.trim().length < 6
                                  }
                                  aria-label="Invia richiesta modifiche attività"
                                  onClick={() =>
                                    handleReviewEntries(
                                      [entry.id],
                                      "changes_requested",
                                      entryChangeMessage,
                                    )
                                      .then(() => {
                                        setEntryChangeRequestOpenId(null);
                                        setEntryChangeRequestMessages(
                                          (current) => {
                                            const next = { ...current };
                                            delete next[entry.id];
                                            return next;
                                          },
                                        );
                                      })
                                      .catch((err) => toast.error(err.message))
                                  }
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-white/15 bg-[#111b2d] p-8 text-center text-slate-400">
                    <FileText className="mx-auto mb-3 h-8 w-8" />
                    Nessuna attività registrata per questa giornata.
                  </div>
                )}

                <div className="grid gap-2 pt-3">
                  <label className="text-sm font-semibold text-slate-400">
                    Note fine giornata
                  </label>
                  <Textarea
                    className="min-h-24 min-w-0 border-white/10 bg-[#222a31] text-slate-100 placeholder:text-slate-400 focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20"
                    placeholder="Blocchi, materiali mancanti, note utili"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-[#0a0f1d] text-slate-100 hover:bg-white/10 hover:text-white sm:w-fit"
                    onClick={() =>
                      mutateDay("notes", { notes })
                        .then(() => toast.success("Note salvate"))
                        .catch((err) => toast.error(err.message))
                    }
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Salva note
                  </Button>
                  <div className="rounded-[8px] border border-white/10 bg-[#101827] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-white">
                          Stato review:{" "}
                          {payload?.day?.reviewStatus === "submitted"
                            ? "In attesa"
                            : payload?.day?.reviewStatus === "approved"
                              ? "Approvato"
                              : payload?.day?.reviewStatus ===
                                  "changes_requested"
                                ? "Da correggere"
                                : "Bozza"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Salva note e riepilogo: puoi aggiungere integrazioni
                          fino a fine giornata. Le singole attività restano
                          revisionabili una per una.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="h-10 rounded-[8px] bg-righello-pink px-4 text-white hover:bg-righello-pink-dark"
                        onClick={() =>
                          handleSubmitReport().catch((err) =>
                            toast.error(err.message),
                          )
                        }
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Salva rapportino
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
