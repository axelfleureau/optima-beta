"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CloudOff,
  FolderX,
  Network,
  Sparkles,
} from "lucide-react";

type NoProject = {
  id: string;
  title: string;
  clientName: string | null;
  media: number;
};
type OnR2 = {
  id: string;
  title: string;
  trancheTitle: string;
  clientName: string | null;
  sizeMb: number | null;
};
type Empty = { id: string; title: string; clientName: string | null };
type Holding = {
  childId: string;
  childName: string;
  parentId: string;
  parentName: string;
};
type Audit = {
  ok: boolean;
  summary: {
    tranchesNoProject: number;
    videosOnR2: number;
    emptyTranches: number;
    holdingCandidates: number;
  };
  tranchesNoProject: NoProject[];
  videosOnR2: OnR2[];
  emptyTranches: Empty[];
  holdingCandidates: Holding[];
};

function Group({
  icon: Icon,
  tone,
  title,
  count,
  children,
}: {
  icon: typeof AlertTriangle;
  tone: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1625]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Icon className={`h-4 w-4 ${tone}`} />
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-300">
          {count}
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-white/5 p-3">{children}</div>}
    </div>
  );
}

export function StructureAudit() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [hidden, setHidden] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [migrating, setMigrating] = useState<string | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/video-review/audit", { cache: "no-store" });
    if (res.status === 403 || res.status === 401) {
      setHidden(true);
      return;
    }
    const data = await res.json().catch(() => null);
    if (data?.ok) setAudit(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function linkHolding(h: Holding) {
    setLinking(h.childId);
    await fetch(`/api/clients/${h.childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentClientId: h.parentId }),
    }).catch(() => {});
    setLinking(null);
    await load();
  }

  async function migrateOne(videoId: string) {
    setMigrateError(null);
    setMigrating(videoId);
    const res = await fetch(`/api/video-review/videos/${videoId}/migrate`, {
      method: "POST",
    });
    const data = await res.json().catch(() => null);
    setMigrating(null);
    if (!data?.ok) {
      setMigrateError(data?.error || "Migrazione non riuscita.");
      return;
    }
    await load();
  }

  async function migrateAll(videos: OnR2[]) {
    setMigrateError(null);
    for (const v of videos) {
      setMigrating(v.id);
      const res = await fetch(`/api/video-review/videos/${v.id}/migrate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setMigrating(null);
        setMigrateError(`"${v.title}": ${data?.error || "errore"}`);
        break;
      }
    }
    setMigrating(null);
    await load();
  }

  if (hidden || !audit) return null;
  const total =
    audit.summary.tranchesNoProject +
    audit.summary.videosOnR2 +
    audit.summary.emptyTranches +
    audit.summary.holdingCandidates;

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-[#111b2d] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-300" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Diagnosi struttura
        </h2>
        {total === 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
            <Check className="h-3.5 w-3.5" /> Tutto in ordine
          </span>
        ) : (
          <span className="ml-auto text-xs text-slate-500">
            {total} cose da sistemare
          </span>
        )}
      </div>

      {total === 0 ? null : (
        <div className="space-y-2">
          <Group
            icon={AlertTriangle}
            tone="text-amber-400"
            title="Consegne senza progetto (bloccano l'upload)"
            count={audit.summary.tranchesNoProject}
          >
            <div className="space-y-1">
              {audit.tranchesNoProject.map((t) => (
                <Link
                  key={t.id}
                  href={`/video/${t.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {t.clientName || "—"} · {t.media} media
                  </span>
                </Link>
              ))}
            </div>
          </Group>

          <Group
            icon={CloudOff}
            tone="text-sky-400"
            title="Video ancora su cloud (R2) da migrare sul NAS"
            count={audit.summary.videosOnR2}
          >
            <div className="space-y-1">
              {audit.videosOnR2.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200"
                >
                  <span className="min-w-0 flex-1 truncate">{v.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {v.clientName || v.trancheTitle}
                    {v.sizeMb ? ` · ${v.sizeMb} MB` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => migrateOne(v.id)}
                    disabled={migrating !== null}
                    className="shrink-0 rounded-md border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-400/20 disabled:opacity-50"
                  >
                    {migrating === v.id ? "Migro…" : "Migra"}
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-[11px] text-slate-500">
                  Sposta i byte sul Mac Studio (faststart incluso).
                </p>
                <button
                  type="button"
                  onClick={() => migrateAll(audit.videosOnR2)}
                  disabled={migrating !== null}
                  className="rounded-md bg-sky-500/90 px-3 py-1 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {migrating ? "Migro…" : "Migra tutti sul NAS"}
                </button>
              </div>
              {migrateError && (
                <p className="px-2 text-[11px] text-red-300">{migrateError}</p>
              )}
            </div>
          </Group>

          <Group
            icon={Network}
            tone="text-cyan-300"
            title="Possibili aziende madri da collegare"
            count={audit.summary.holdingCandidates}
          >
            <div className="space-y-1">
              {audit.holdingCandidates.map((h) => (
                <div
                  key={`${h.childId}-${h.parentId}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    <strong>{h.childName}</strong>{" "}
                    <span className="text-slate-500">sotto</span> {h.parentName}?
                  </span>
                  <button
                    type="button"
                    onClick={() => linkHolding(h)}
                    disabled={linking === h.childId}
                    className="shrink-0 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
                  >
                    {linking === h.childId ? "Collego…" : "Collega"}
                  </button>
                </div>
              ))}
            </div>
          </Group>

          <Group
            icon={FolderX}
            tone="text-slate-400"
            title="Consegne vuote"
            count={audit.summary.emptyTranches}
          >
            <div className="space-y-1">
              {audit.emptyTranches.map((t) => (
                <Link
                  key={t.id}
                  href={`/video/${t.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {t.clientName || "—"}
                  </span>
                </Link>
              ))}
            </div>
          </Group>
        </div>
      )}
    </div>
  );
}
