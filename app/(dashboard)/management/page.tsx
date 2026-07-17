"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Gauge,
  LineChart,
  Loader2,
  Target,
  Timer,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ManagementData = {
  summary: {
    totalProjects: number;
    activeProjects: number;
    openTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    trackedWeekHours: number;
    atRiskProjects: number;
  };
  projects: Array<{
    id: string;
    name: string;
    clientName: string | null;
    status: string;
    health: "green" | "yellow" | "red";
    budget: number;
    laborCost: number;
    averageHourlyCost: number;
    budgetUsage: number;
    dueAt: string | null;
    daysUntilDue: number | null;
    tasksCount: number;
    completedTasks: number;
    overdueTasks: number;
    urgentTasks: number;
    trackedHours: number;
    progress: number;
    lastActivityAt: string | null;
  }>;
  people: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    weeklyCapacityHours: number;
    netCapacityHours: number;
    capacityToDateHours: number;
    lunchBreakHours: number;
    presenceWeekHours: number;
    trackedWeekHours: number;
    plannedWeekHours: number;
    committedWeekHours: number;
    utilizationBasis: "net-capacity";
    presenceCoverage: number;
    paceUtilization: number;
    utilization: number;
    status: "balanced" | "overload" | "underload";
    openTasks: number;
    urgentTasks: number;
    overdueTasks: number;
    lastEntryAt: string | null;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    clientName: string | null;
    priority: string;
    dueAt: string | null;
    assignee: string;
  }>;
  stalledTasks: Array<{
    id: string;
    title: string;
    clientName: string | null;
    dueAt: string | null;
    updatedAt: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    date: string;
    minutes: number;
    note: string;
    projectName: string | null;
    taskTitle: string | null;
    memberName: string;
  }>;
  signals: Array<{
    id: string;
    type: string;
    title: string;
    subject: string;
    detail: string;
    severity: "high" | "medium" | "low";
  }>;
};

const pageClass = "optima-ops-page";
const panelClass =
  "rounded-lg border border-white/10 bg-[#121b2b] shadow-[0_18px_70px_rgba(2,6,23,0.24)]";
const insetPanelClass = "rounded-lg border border-white/10 bg-[#0e1625]";
const mutedText = "text-slate-400";

function formatDate(value?: string | null) {
  if (!value) return "Non definita";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatHours(value: number) {
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value)}h`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function pressureLabel(days: number | null) {
  if (days === null)
    return {
      label: "Senza scadenza",
      className: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    };
  if (days < 0)
    return {
      label: "Scaduto",
      className: "border-red-400/30 bg-red-500/15 text-red-200",
    };
  if (days <= 3)
    return {
      label: "Al piu presto",
      className: "border-rose-400/30 bg-rose-500/15 text-rose-100",
    };
  if (days <= 7)
    return {
      label: "Al piu tardi",
      className: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    };
  return {
    label: "Sotto controllo",
    className: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  };
}

function healthClass(health: string) {
  if (health === "red") return "bg-red-400";
  if (health === "yellow") return "bg-amber-300";
  return "bg-emerald-400";
}

function personStatus(status: string) {
  if (status === "overload")
    return {
      label: "Sovraccarico",
      className: "bg-red-500/15 text-red-100 border-red-400/25",
    };
  if (status === "underload")
    return {
      label: "Carico basso",
      className: "bg-sky-500/15 text-sky-100 border-sky-400/25",
    };
  return {
    label: "Bilanciato",
    className: "bg-emerald-500/15 text-emerald-100 border-emerald-400/25",
  };
}

function ProgressBar({
  value,
  tone = "pink",
}: {
  value: number;
  tone?: "pink" | "green" | "amber" | "blue";
}) {
  const color = {
    pink: "bg-righello-pink",
    green: "bg-emerald-400",
    amber: "bg-amber-300",
    blue: "bg-sky-400",
  }[tone];

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function ManagementPage() {
  const [data, setData] = useState<ManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const response = await fetch(`/api/management?ts=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.error || "Errore nel caricamento controllo aziendale",
        );
      setData(payload);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento controllo aziendale",
      );
    } finally {
      if (mode === "initial") setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load("initial");
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load("refresh");
      }
    }, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void load("refresh");
    };
    const handleFocus = () => void load("refresh");

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Progetti attivi",
        value: data.summary.activeProjects,
        detail: `${data.summary.totalProjects} totali`,
        icon: BriefcaseBusiness,
        tone: "text-sky-300",
      },
      {
        label: "Task aperti",
        value: data.summary.openTasks,
        detail: `${data.summary.overdueTasks} in ritardo`,
        icon: Target,
        tone:
          data.summary.overdueTasks > 0 ? "text-red-300" : "text-emerald-300",
      },
      {
        label: "Ore settimana",
        value: formatHours(data.summary.trackedWeekHours),
        detail: "registrate dal team",
        icon: Timer,
        tone: "text-righello-pink",
      },
      {
        label: "Segnali critici",
        value: data.signals.length,
        detail: `${data.summary.atRiskProjects} progetti a rischio`,
        icon: AlertTriangle,
        tone: data.signals.length > 0 ? "text-amber-200" : "text-emerald-300",
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className={pageClass}>
        <div className="optima-ops-container flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-righello-pink" />
          Caricamento controllo aziendale...
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <div className="optima-ops-container optima-ops-stack">
        <header className="optima-ops-header">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-righello-pink/15 text-righello-pink">
              <Gauge className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-normal text-white md:text-4xl">
              Controllo Aziendale
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
              Monitoraggio operativo per progetti, persone, carico di lavoro e
              finestre temporali critiche.
            </p>
          </div>
          <div className="flex items-center text-sm text-slate-500">
            {lastUpdatedAt && (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {refreshing
                  ? "Aggiornamento..."
                  : `Live · ${lastUpdatedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
              </span>
            )}
          </div>
        </header>

        {error && (
          <Alert className="border-red-500/40 bg-red-950/40 text-red-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={cn(panelClass, "p-5")}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-300">
                          {card.label}
                        </p>
                        <p className="mt-4 text-3xl font-black text-white">
                          {card.value}
                        </p>
                        <p className={cn("mt-2 text-xs", mutedText)}>
                          {card.detail}
                        </p>
                      </div>
                      <Icon className={cn("h-5 w-5", card.tone)} />
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className={cn(panelClass, "p-5")}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Segnali da presidiare
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Pattern operativi su ritardi, saturazione e rapporto tra
                      ore lavorate e presenza netta.
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-righello-pink" />
                </div>

                {data.signals.length === 0 ? (
                  <div
                    className={cn(
                      insetPanelClass,
                      "flex items-center gap-3 p-4 text-sm text-emerald-100",
                    )}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    Nessun segnale critico rilevato sui dati disponibili.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.signals.map((signal) => (
                      <div
                        key={signal.id}
                        className={cn(insetPanelClass, "p-4")}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={cn(
                                  "border px-2 py-0.5",
                                  signal.severity === "high"
                                    ? "border-red-400/30 bg-red-500/15 text-red-100"
                                    : "border-amber-400/30 bg-amber-500/15 text-amber-100",
                                )}
                              >
                                {signal.title}
                              </Badge>
                              <span className="text-sm font-bold text-white">
                                {signal.subject}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {signal.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cn(panelClass, "p-5")}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Task in ritardo
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Lista breve per decidere dove intervenire prima.
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-amber-200" />
                </div>
                <div className="space-y-3">
                  {data.overdueTasks.length === 0 ? (
                    <div
                      className={cn(
                        insetPanelClass,
                        "p-4 text-sm text-slate-300",
                      )}
                    >
                      Nessun task scaduto.
                    </div>
                  ) : (
                    data.overdueTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/workspace?taskId=${task.id}&action=view`}
                        className={cn(
                          insetPanelClass,
                          "block p-4 transition hover:border-righello-pink/40 hover:bg-righello-pink/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {task.clientName || "Senza cliente"} ·{" "}
                              {task.assignee}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                        <p className="mt-3 text-xs text-red-200">
                          Scadenza {formatDate(task.dueAt)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className={cn(panelClass, "p-5")}>
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Progetti e finestre temporali
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Priorita operative secondo ritardo, urgenza e avanzamento
                    reale. I costi sono stime interne: ore tracciate per costo
                    orario del team.
                  </p>
                </div>
                <Button
                  asChild
                  className="w-fit bg-righello-pink text-white hover:bg-righello-pink-dark"
                >
                  <Link href="/workspace">Apri kanban</Link>
                </Button>
              </div>
              <div className="space-y-3 md:hidden">
                {data.projects.map((project) => {
                  const pressure = pressureLabel(project.daysUntilDue);
                  return (
                    <Link
                      key={project.id}
                      href={`/workspace?projectId=${project.id}`}
                      className={cn(
                        insetPanelClass,
                        "block p-4 transition active:border-righello-pink/40 active:bg-righello-pink/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                healthClass(project.health),
                              )}
                            />
                            <p className="truncate font-black text-white">
                              {project.name}
                            </p>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-400">
                            {project.clientName || "Progetto interno"}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Finestra
                          </p>
                          <Badge
                            className={cn(
                              "mt-2 max-w-full border",
                              pressure.className,
                            )}
                          >
                            {pressure.label}
                          </Badge>
                          <p className="mt-2 text-xs text-slate-400">
                            {formatDate(project.dueAt)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Rischi
                          </p>
                          <p className="mt-2 text-sm font-bold text-white">
                            {project.overdueTasks} ritardi
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {project.urgentTasks} entro 7 giorni
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                          <span>
                            {project.completedTasks}/{project.tasksCount} task
                            completate
                          </span>
                          <span className="font-bold text-white">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <ProgressBar
                            value={project.progress}
                            tone={project.health === "red" ? "amber" : "green"}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Ore
                          </p>
                          <p className="mt-2 font-black text-white">
                            {formatHours(project.trackedHours)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Costo lavoro
                          </p>
                          <p className="mt-2 font-black text-white">
                            {formatCurrency(project.laborCost)}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {project.averageHourlyCost > 0
                              ? `${formatCurrency(project.averageHourlyCost)}/h medio`
                              : "tariffe non censite"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Progetto</th>
                      <th className="px-3 py-2">Finestra</th>
                      <th className="px-3 py-2">Avanzamento</th>
                      <th className="px-3 py-2">Ore</th>
                      <th className="px-3 py-2">Costo lavoro</th>
                      <th className="px-3 py-2">Rischi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projects.map((project) => {
                      const pressure = pressureLabel(project.daysUntilDue);
                      return (
                        <tr key={project.id} className="bg-[#0e1625]">
                          <td className="rounded-l-lg border-y border-l border-white/10 px-3 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full",
                                  healthClass(project.health),
                                )}
                              />
                              <div>
                                <p className="font-bold text-white">
                                  {project.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {project.clientName || "Progetto interno"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="border-y border-white/10 px-3 py-4">
                            <Badge className={cn("border", pressure.className)}>
                              {pressure.label}
                            </Badge>
                            <p className="mt-2 text-xs text-slate-400">
                              {formatDate(project.dueAt)}
                            </p>
                          </td>
                          <td className="border-y border-white/10 px-3 py-4">
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                              <span>
                                {project.completedTasks}/{project.tasksCount}{" "}
                                task
                              </span>
                              <span>{project.progress}%</span>
                            </div>
                            <div className="mt-2">
                              <ProgressBar
                                value={project.progress}
                                tone={
                                  project.health === "red" ? "amber" : "green"
                                }
                              />
                            </div>
                          </td>
                          <td className="border-y border-white/10 px-3 py-4 font-semibold text-slate-100">
                            {formatHours(project.trackedHours)}
                          </td>
                          <td className="border-y border-white/10 px-3 py-4">
                            <p className="font-semibold text-slate-100">
                              {formatCurrency(project.laborCost)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {project.averageHourlyCost > 0
                                ? `${formatCurrency(project.averageHourlyCost)}/h medio`
                                : "tariffe non censite"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {project.budget > 0
                                ? `budget ${formatCurrency(project.budget)}`
                                : "budget progetto non censito"}
                            </p>
                          </td>
                          <td className="rounded-r-lg border-y border-r border-white/10 px-3 py-4">
                            <p className="text-xs text-slate-300">
                              {project.overdueTasks} ritardi
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {project.urgentTasks} entro 7 giorni
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
              <div className={cn(panelClass, "p-5")}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Monitoraggio personale
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Carico, presenza e approcci problematici rilevati dai dati
                      operativi.
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-sky-300" />
                </div>
                <div className="space-y-3">
                  {data.people.map((person) => {
                    const status = personStatus(person.status);
                    return (
                      <div
                        key={person.id}
                        className={cn(insetPanelClass, "p-4")}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-white">
                                {person.name}
                              </p>
                              <Badge className={cn("border", status.className)}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {person.email}
                            </p>
                          </div>
                          <div className="grid min-w-[360px] grid-cols-3 gap-4 text-sm max-md:min-w-0 max-md:grid-cols-1">
                            <div>
                              <p className="text-xs text-slate-500">
                                Ritmo settimana
                              </p>
                              <p className="mt-1 font-bold text-white">
                                {person.paceUtilization}%
                              </p>
                              <ProgressBar
                                value={person.paceUtilization}
                                tone={
                                  person.status === "overload"
                                    ? "amber"
                                    : "blue"
                                }
                              />
                              <p className="mt-1 text-xs text-slate-500">
                                su base piena {person.utilization}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">
                                Ore registrate
                              </p>
                              <p className="mt-1 font-bold text-white">
                                {formatHours(person.trackedWeekHours)} /{" "}
                                {formatHours(person.capacityToDateHours)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                fino ad ora ·{" "}
                                {formatHours(person.netCapacityHours)} base
                                settimanale ·{" "}
                                {formatHours(person.presenceWeekHours)} presenza
                                · {formatHours(person.plannedWeekHours)}{" "}
                                pianificate
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Task</p>
                              <p className="mt-1 font-bold text-white">
                                {person.openTasks} aperti ·{" "}
                                {person.overdueTasks} ritardi
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={cn(panelClass, "p-5")}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Ore recenti
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Tracciamento operativo collegato a progetti e task.
                    </p>
                  </div>
                  <LineChart className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="space-y-3">
                  {data.recentActivity.length === 0 ? (
                    <div
                      className={cn(
                        insetPanelClass,
                        "p-4 text-sm text-slate-300",
                      )}
                    >
                      Nessuna ora registrata.
                    </div>
                  ) : (
                    data.recentActivity.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(insetPanelClass, "p-4")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">
                              {entry.memberName}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {entry.taskTitle ||
                                entry.projectName ||
                                entry.note ||
                                "Attivita"}
                            </p>
                          </div>
                          <Badge className="border border-sky-400/25 bg-sky-500/15 text-sky-100">
                            {formatHours(entry.minutes / 60)}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {formatDate(entry.date)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
