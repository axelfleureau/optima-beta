"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, X } from "lucide-react";
import { useCollaborators, useVideoReviewMeta } from "@/hooks/use-video-review";
import {
  COLLAB_ROLE_META,
  initials,
  plainInputClass,
} from "@/lib/video-review-ui";

const ROLES = ["videomaker", "smm", "revisore", "osservatore"] as const;

/**
 * Referenti su una TRANCHE o su un SINGOLO VIDEO.
 * Non sono ruoli permanenti: valgono solo qui. Chiunque sia già coinvolto può
 * aggiungerne altri — verso i subordinati e anche tra pari. Aggiungere qualcuno
 * su un singolo video è la DELEGA: vedrà solo quel video.
 */
export function CollaboratorsField({
  scope,
  scopeId,
  label = "Collaboratori",
  compact = false,
}: {
  scope: "tranche" | "video";
  scopeId: string | null;
  label?: string;
  compact?: boolean;
}) {
  const { collaborators, add, remove } = useCollaborators(scope, scopeId);
  const { members, me } = useVideoReviewMeta();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("videomaker");
  const [busy, setBusy] = useState<string | null>(null);

  const alreadyIds = useMemo(
    () =>
      new Set(
        collaborators.filter((c) => c.role === role).map((c) => c.memberId),
      ),
    [collaborators, role],
  );

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          !alreadyIds.has(m.id) &&
          (m.name.toLowerCase().includes(q.trim().toLowerCase()) ||
            (m.email || "").toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [members, alreadyIds, q],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-white/10 bg-white/5 text-xs hover:border-righello-pink/40"
            >
              <Plus className="mr-1 h-3 w-3" /> Aggiungi
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-[#111b2d] text-slate-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aggiungi collaboratore</DialogTitle>
              <DialogDescription className="text-slate-400">
                {scope === "video"
                  ? "Su questo singolo video: chi lo aggiungi vedrà solo questo video, non il resto della consegna."
                  : "Su tutta la consegna: vedrà tutti i video di questa tranche."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      role === r
                        ? COLLAB_ROLE_META[r].className
                        : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {COLLAB_ROLE_META[r].label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cerca una persona del team…"
                  className={`${plainInputClass} pl-10`}
                />
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Nessuna persona trovata.
                  </p>
                ) : (
                  filtered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy === m.id}
                      onClick={async () => {
                        setBusy(m.id);
                        await add(m.id, role);
                        setBusy(null);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-white/10 text-[10px] text-slate-200">
                          {initials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-200">
                          {m.name}
                        </span>
                        {m.email && (
                          <span className="block truncate text-xs text-slate-500">
                            {m.email}
                          </span>
                        )}
                      </span>
                      <Plus className="h-4 w-4 text-slate-500" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collaborators.length === 0 ? (
        <p className="text-xs text-slate-500">
          Nessuno assegnato
          {scope === "tranche" ? " a questa consegna" : " a questo video"}.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {collaborators.map((c) => {
            const meta =
              COLLAB_ROLE_META[c.role] || COLLAB_ROLE_META.osservatore;
            const isMe = c.memberId === me;
            return (
              <Badge
                key={c.id}
                variant="outline"
                className={`group gap-1.5 py-1 pl-1 pr-1.5 ${meta.className}`}
                title={`${c.name} — ${meta.label}`}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="bg-black/30 text-[9px]">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">
                  {compact ? initials(c.name) : c.name}
                </span>
                {!compact && (
                  <span className="text-[10px] opacity-70">· {meta.label}</span>
                )}
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="ml-0.5 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                    aria-label={`Rimuovi ${c.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
