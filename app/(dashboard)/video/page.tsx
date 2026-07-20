"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  VrPageHeader,
  VrStatCard,
} from "@/components/video-review/page-chrome";
import { TodoBoard } from "@/components/video-review/todo-board";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clapperboard,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Users,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";
import { useVideoReviewMeta } from "@/hooks/use-video-review";
import {
  pageClass,
  containerClass,
  stackClass,
  surfaceClass,
  interactiveSurfaceClass,
  inputClass,
  plainInputClass,
  primaryButtonClass,
  statusMeta,
  COLLAB_ROLE_META,
  initials,
} from "@/lib/video-review-ui";

const NONE = "__none__";

type Collab = { id: string; memberId: string; name: string; role: string };
type Tranche = {
  id: string;
  title: string;
  token: string;
  clientId: string | null;
  clientName: string | null;
  projectNames: string[];
  collaborators: Collab[];
  counts: {
    total: number;
    pending: number;
    revision: number;
    approved: number;
  };
};

export default function VideoReviewPage() {
  const router = useRouter();
  const {
    clients,
    members,
    me,
    canSeeAll,
    loading: metaLoading,
  } = useVideoReviewMeta();
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("__all__");

  // Nuova consegna
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tranche | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    return fetch("/api/video-review/tranches")
      .then((r) => r.json())
      .then((r) => r?.ok && setTranches(r.tranches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  async function createTranche() {
    if (!title.trim()) return;
    setSaving(true);
    const r = await fetch("/api/video-review/tranches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        clientId: clientId === NONE ? null : clientId,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({ ok: false }));
    setSaving(false);
    if (r?.ok) {
      setTitle("");
      setClientId(NONE);
      setOpen(false);
      load();
    }
  }

  async function deleteTranche() {
    if (!deleteTarget || deletingId) return;
    setDeleteError(null);
    setDeletingId(deleteTarget.id);
    try {
      const response = await fetch(
        `/api/video-review/tranches/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Eliminazione non riuscita");
      }
      setTranches((items) =>
        items.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      load();
    } catch (error: any) {
      setDeleteError(error?.message || "Eliminazione non riuscita");
    } finally {
      setDeletingId(null);
    }
  }

  const totals = useMemo(
    () =>
      tranches.reduce(
        (a, t) => ({
          pending: a.pending + t.counts.pending,
          revision: a.revision + t.counts.revision,
          approved: a.approved + t.counts.approved,
        }),
        { pending: 0, revision: 0, approved: 0 },
      ),
    [tranches],
  );

  // Elenco progetti presenti (per il filtro).
  const projectOptions = useMemo(() => {
    const s = new Set<string>();
    tranches.forEach((t) => t.projectNames.forEach((p) => s.add(p)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [tranches]);

  // Filtri: ricerca · progetto · solo i miei per chi ha visione globale.
  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = tranches.filter((t) => {
      if (
        needle &&
        !t.title.toLowerCase().includes(needle) &&
        !(t.clientName || "").toLowerCase().includes(needle)
      )
        return false;
      if (
        projectFilter !== "__all__" &&
        !t.projectNames.includes(projectFilter)
      )
        return false;
      if (
        canSeeAll &&
        onlyMine &&
        !(me && t.collaborators.some((c) => c.memberId === me))
      )
        return false;
      return true;
    });
    const map = new Map<string, Tranche[]>();
    for (const t of list) {
      const key = t.clientName || "Senza cliente";
      map.set(key, [...(map.get(key) || []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tranches, q, projectFilter, canSeeAll, onlyMine, me]);

  return (
    <div className={pageClass}>
      <div className={containerClass}>
        <div className={stackClass}>
          {/* Testata: stesso pattern di Controllo Aziendale/Dashboard */}
          <VrPageHeader
            icon={Clapperboard}
            title="Video Review"
            subtitle="Consegne video ai clienti: approvazione, note di modifica e pubblicazione."
            actions={
              <>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/10 bg-white/5"
                >
                  <Link href="/video/smm">Da pubblicare</Link>
                </Button>
                <Button
                  className={primaryButtonClass}
                  onClick={() => setOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nuova consegna
                </Button>
              </>
            }
          />

          {/* Cosa richiede la TUA attenzione */}
          <TodoBoard />

          {/* Riepilogo */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <VrStatCard
              icon={Send}
              label="Consegne"
              value={tranches.length}
              iconTone="text-righello-pink"
            />
            <VrStatCard
              icon={Clock}
              label="In attesa cliente"
              value={totals.pending}
              iconTone="text-slate-400"
            />
            <VrStatCard
              icon={AlertTriangle}
              label="Da revisionare"
              value={totals.revision}
              tone="text-amber-300"
              iconTone="text-amber-400"
            />
            <VrStatCard
              icon={CheckCircle2}
              label="Approvati"
              value={totals.approved}
              tone="text-emerald-300"
              iconTone="text-emerald-400"
            />
          </div>

          {/* Toolbar: ricerca · progetto · solo i miei solo per direzione/admin */}
          <div className="optima-ops-toolbar rounded-lg">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca consegna o cliente…"
                className={inputClass}
              />
            </div>
            {projectOptions.length > 0 && (
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-11 w-full border-white/10 bg-[#172235] text-slate-100 sm:w-52">
                  <SelectValue placeholder="Progetto" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#111b2d] text-slate-100">
                  <SelectItem value="__all__">Tutti i progetti</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canSeeAll && (
              <Button
                type="button"
                variant={onlyMine ? "default" : "outline"}
                className={
                  onlyMine
                    ? primaryButtonClass
                    : "h-11 shrink-0 border-white/10 bg-white/5 text-slate-300 hover:border-righello-pink/40"
                }
                onClick={() => setOnlyMine((value) => !value)}
              >
                Solo i miei
              </Button>
            )}
          </div>

          {/* Consegne raggruppate per cliente */}
          {loading ? (
            <div className="space-y-8">
              {[0, 1].map((s) => (
                <div key={s} className="space-y-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`${surfaceClass} h-32 animate-pulse`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className={`${surfaceClass} p-12 text-center text-slate-400`}>
              {tranches.length === 0
                ? "Nessuna consegna visibile. Creane una, oppure chiedi di essere aggiunto come collaboratore."
                : "Nessun risultato per questa ricerca."}
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([clientName, list]) => (
                <section key={clientName} className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                    {clientName}
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs normal-case tracking-normal">
                      {list.length}
                    </span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((t) => (
                      <div
                        key={t.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/video/${t.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/video/${t.id}`);
                          }
                        }}
                        className={`${interactiveSurfaceClass} relative flex h-full cursor-pointer flex-col gap-3 p-5 pr-14 outline-none focus-visible:ring-2 focus-visible:ring-righello-pink/60`}
                      >
                        {canSeeAll && (
                          <div
                            className="absolute right-3 top-3"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Azioni consegna ${t.title}`}
                                  className="h-8 w-8 rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-100"
                                >
                                  {deletingId === t.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56 border-white/10 bg-[#0d1320] text-slate-100"
                              >
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-200 focus:bg-red-500/10 focus:text-red-100"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeleteTarget(t);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Elimina consegna
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        <div>
                          <h3 className="text-base font-semibold text-slate-100">
                            {t.title}
                          </h3>
                          {t.projectNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1.5">
                              {t.projectNames.slice(0, 2).map((p) => (
                                <Badge
                                  key={p}
                                  variant="outline"
                                  className="border-white/10 bg-white/5 text-[10px] text-slate-300"
                                >
                                  {p}
                                </Badge>
                              ))}
                              {t.projectNames.length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="border-white/10 bg-white/5 text-[10px] text-slate-400"
                                >
                                  +{t.projectNames.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {/* Stato PER VIDEO: nella stessa consegna convivono stati diversi */}
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-white/10 bg-white/5 text-xs text-slate-300"
                            >
                              {t.counts.total} video
                            </Badge>
                            {t.counts.revision > 0 && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusMeta("revision").badge}`}
                              >
                                {t.counts.revision} da revisionare
                              </Badge>
                            )}
                            {t.counts.pending > 0 && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusMeta("pending").badge}`}
                              >
                                {t.counts.pending} in attesa
                              </Badge>
                            )}
                            {t.counts.approved > 0 && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusMeta("approved").badge}`}
                              >
                                {t.counts.approved} approvati
                              </Badge>
                            )}
                          </div>

                          {/* Chi ci lavora */}
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            {t.collaborators.length === 0 ? (
                              <span className="text-xs text-slate-500">
                                Nessun collaboratore
                              </span>
                            ) : (
                              <div className="flex -space-x-1.5">
                                {t.collaborators.slice(0, 4).map((c) => (
                                  <Avatar
                                    key={c.id}
                                    className="h-6 w-6 border border-[#172235]"
                                    title={`${c.name} · ${COLLAB_ROLE_META[c.role]?.label || c.role}`}
                                  >
                                    <AvatarFallback className="bg-white/10 text-[9px] text-slate-200">
                                      {initials(c.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {t.collaborators.length > 4 && (
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#172235] bg-white/10 text-[9px] text-slate-300">
                                    +{t.collaborators.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Nuova consegna */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="border-white/10 bg-[#111b2d] text-slate-100">
              <DialogHeader>
                <DialogTitle>Nuova consegna</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Una consegna raccoglie più video per un cliente, con un unico
                  link di review. Collaboratori e progetto si impostano dopo,
                  anche per singolo video.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Cliente
                  </label>
                  <Select
                    value={clientId}
                    onValueChange={setClientId}
                    disabled={metaLoading}
                  >
                    <SelectTrigger className="h-11 border-white/10 bg-[#172235] text-slate-100">
                      <SelectValue placeholder="Scegli cliente" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111b2d] text-slate-100">
                      <SelectItem value={NONE}>— Nessun cliente —</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Nome consegna
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createTranche()}
                    placeholder="es. Tranche settembre"
                    className={plainInputClass}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Annulla
                </Button>
                <Button
                  className={primaryButtonClass}
                  disabled={saving || !title.trim()}
                  onClick={createTranche}
                >
                  {saving ? "Creo…" : "Crea consegna"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={Boolean(deleteTarget)}
            onOpenChange={(nextOpen) => {
              if (!nextOpen && !deletingId) {
                setDeleteTarget(null);
                setDeleteError(null);
              }
            }}
          >
            <AlertDialogContent className="border-white/10 bg-[#0b1220] text-slate-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare questa consegna?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Verranno eliminati la tranche{" "}
                  <span className="font-semibold text-slate-200">
                    {deleteTarget?.title}
                  </span>
                  , tutti i video caricati, marker, collaboratori e link di
                  review cliente collegati. L'azione non e reversibile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {deleteError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={Boolean(deletingId)}
                  className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                >
                  Annulla
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={Boolean(deletingId)}
                  onClick={(event) => {
                    event.preventDefault();
                    deleteTranche();
                  }}
                  className="bg-red-500 text-white hover:bg-red-400"
                >
                  {deletingId ? "Elimino..." : "Elimina tutto"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
