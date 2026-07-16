"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Scissors, Send } from "lucide-react";
import { surfaceClass } from "@/lib/video-review-ui";

type TodoItem = {
  id: string;
  title: string;
  trancheId: string;
  status: string;
  plannedPublishDate: string | null;
  trancheTitle: string;
  clientName: string | null;
};
type Todo = { revisions: TodoItem[]; toPublish: TodoItem[]; overdue: TodoItem[] };

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function Bucket({
  icon: Icon,
  title,
  items,
  tone,
  href,
}: {
  icon: typeof Send;
  title: string;
  items: TodoItem[];
  tone: string;
  href?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`${surfaceClass} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map((it) => (
          <Link
            key={it.id}
            href={`/video/${it.trancheId}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{it.title}</span>
            <span className="shrink-0 text-xs text-slate-500">{it.clientName || it.trancheTitle}</span>
            {it.plannedPublishDate && (
              <span className={`shrink-0 text-xs ${tone}`}>{fmtDate(it.plannedPublishDate)}</span>
            )}
          </Link>
        ))}
        {items.length > 5 && (
          <p className="px-2 pt-1 text-xs text-slate-500">
            {href ? (
              <Link href={href} className="hover:text-slate-300">
                +{items.length - 5} altri →
              </Link>
            ) : (
              `+${items.length - 5} altri`
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** "Richiede la tua attenzione": rivisioni da fare, da pubblicare, in ritardo. */
export function TodoBoard() {
  const [todo, setTodo] = useState<Todo | null>(null);

  useEffect(() => {
    fetch("/api/video-review/todo")
      .then((r) => r.json())
      .then((r) => r?.ok && setTodo({ revisions: r.revisions, toPublish: r.toPublish, overdue: r.overdue }))
      .catch(() => {});
  }, []);

  if (!todo) return null;
  const total = todo.revisions.length + todo.toPublish.length + todo.overdue.length;
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Richiede la tua attenzione</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Bucket icon={Scissors} title="Da revisionare" items={todo.revisions} tone="text-amber-400" />
        <Bucket icon={Send} title="Da pubblicare" items={todo.toPublish} tone="text-emerald-400" href="/video/smm" />
        <Bucket icon={AlertTriangle} title="In ritardo" items={todo.overdue} tone="text-red-400" />
      </div>
    </div>
  );
}
