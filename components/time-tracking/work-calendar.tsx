"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type DayEntry = {
  id: string;
  minutes: number;
  note: string;
  clientName: string | null;
  projectName: string | null;
};
type RangePayload = {
  ok: boolean;
  days: Record<string, { minutes: number; count: number; entries: DayEntry[] }>;
  totalMinutes: number;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function fmtHM(minutes: number) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * "Cosa ho fatto": ore e attività per giorno, a calendario (settimana/mese).
 * Click su un giorno -> apre il dettaglio di quel giorno nella pagina rapportini.
 */
export function WorkCalendar({
  memberId,
  anchorDate,
  onPickDay,
}: {
  memberId: string;
  anchorDate: string;
  onPickDay: (date: string) => void;
}) {
  const [view, setView] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState<Date>(() =>
    anchorDate ? parseISO(anchorDate) : new Date(),
  );
  const [data, setData] = useState<RangePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const { periodStart, periodEnd, gridDays, title } = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      const e = endOfWeek(anchor, { weekStartsOn: 1 });
      return {
        periodStart: s,
        periodEnd: e,
        gridDays: eachDayOfInterval({ start: s, end: e }),
        title: `Settimana del ${format(s, "d MMM", { locale: it })}`,
      };
    }
    const s = startOfMonth(anchor);
    const e = endOfMonth(anchor);
    return {
      periodStart: s,
      periodEnd: e,
      gridDays: eachDayOfInterval({
        start: startOfWeek(s, { weekStartsOn: 1 }),
        end: endOfWeek(e, { weekStartsOn: 1 }),
      }),
      title: format(s, "MMMM yyyy", { locale: it }),
    };
  }, [anchor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      from: ymd(periodStart),
      to: ymd(periodEnd),
    });
    if (memberId) params.set("memberId", memberId);
    const payload = await fetch(`/api/time-tracking/range?${params}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .catch(() => null);
    setData(payload?.ok ? payload : { ok: true, days: {}, totalMinutes: 0 });
    setLoading(false);
  }, [memberId, periodStart, periodEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  const shift = (dir: number) =>
    setAnchor((a) => (view === "week" ? addWeeks(a, dir) : addMonths(a, dir)));

  const days = data?.days || {};

  return (
    <section className="rounded-lg border border-white/10 bg-[#111b2d]">
      <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
              Cosa hai fatto
            </p>
            <p className="text-sm font-bold capitalize text-white">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold tabular-nums text-slate-200">
            {fmtHM(data?.totalMinutes || 0) || "0m"} totali
          </span>
          <div className="inline-flex rounded-lg border border-white/10 bg-[#0b1424] p-0.5">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  view === v
                    ? "bg-righello-pink/20 text-white ring-1 ring-righello-pink/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v === "week" ? "Settimana" : "Mese"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Precedente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#0b1424] text-slate-300 hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-md border border-white/10 bg-[#0b1424] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Successivo"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#0b1424] text-slate-300 hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 border-b border-white/5 bg-[#0e1830]">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {gridDays.map((day) => {
          const key = ymd(day);
          const info = days[key];
          const outside = view === "month" && !isSameMonth(day, anchor);
          const today = isToday(day);
          const minHeight = view === "week" ? "min-h-[120px]" : "min-h-[92px]";
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(key)}
              className={`${minHeight} border-b border-r border-white/5 p-1.5 text-left align-top last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                info ? "hover:bg-white/[0.03]" : "hover:bg-white/[0.015]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    today
                      ? "bg-righello-pink text-white"
                      : outside
                        ? "text-slate-600"
                        : "text-slate-400"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {info && (
                  <span className="text-[10px] font-bold tabular-nums text-emerald-300">
                    {fmtHM(info.minutes)}
                  </span>
                )}
              </div>
              {info && (
                <div className="mt-1 space-y-0.5">
                  {info.entries
                    .slice(0, view === "week" ? 5 : 2)
                    .map((e) => (
                      <div
                        key={e.id}
                        title={`${e.clientName ? `${e.clientName}: ` : ""}${e.note} · ${fmtHM(e.minutes)}`}
                        className="truncate rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        <span className="text-slate-400">
                          {e.clientName || "—"}
                        </span>{" "}
                        {e.note}
                      </div>
                    ))}
                  {info.entries.length > (view === "week" ? 5 : 2) && (
                    <div className="px-1 text-[10px] text-slate-500">
                      +{info.entries.length - (view === "week" ? 5 : 2)} altre
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="p-2 text-center text-[11px] text-slate-500">
          Aggiorno…
        </div>
      )}
    </section>
  );
}
