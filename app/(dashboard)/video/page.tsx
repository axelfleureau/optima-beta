"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clapperboard, Plus, Search, Clock, AlertTriangle, CheckCircle2, Send, Users } from "lucide-react";
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
  h1Class,
  subtitleClass,
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
  counts: { total: number; pending: number; revision: number; approved: number };
};

export default function VideoReviewPage() {
  const { clients, members, loading: metaLoading } = useVideoReviewMeta();
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  // Nuova consegna
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(NONE);
  const [saving, setSaving] = useState(false);

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
      body: JSON.stringify({ title: title.trim(), clientId: clientId === NONE ? null : clientId }),
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

  // Raggruppa per CLIENTE (il progetto è un attributo del video, non un livello).
  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = tranches.filter(
      (t) =>
        !needle ||
        t.title.toLowerCase().includes(needle) ||
        (t.clientName || "").toLowerCase().includes(needle),
    );
    const map = new Map<string, Tranche[]>();
    for (const t of list) {
      const key = t.clientName || "Senza cliente";
      map.set(key, [...(map.get(key) || []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tranches, q]);

  return (
    <div className={pageClass}>
      <div className={containerClass}>
        <div className={stackClass}>
      {/* Testata in stile Optima */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={h1Class}>
            <Clapperboard className="h-7 w-7 text-righello-pink md:h-9 md:w-9" />
            Video Review
          </h1>
          <p className={`mt-1 ${subtitleClass}`}>
            Consegne video ai clienti: approvazione, note di modifica e pubblicazione.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-white/10 bg-white/5">
            <Link href="/video/smm">Da pubblicare</Link>
          </Button>
          <Button className={primaryButtonClass} onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuova consegna
          </Button>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Send, label: "Consegne", value: tranches.length, tone: "text-slate-100" },
          { icon: Clock, label: "In attesa cliente", value: totals.pending, tone: "text-slate-100" },
          { icon: AlertTriangle, label: "Da revisionare", value: totals.revision, tone: "text-amber-300" },
          { icon: CheckCircle2, label: "Approvati", value: totals.approved, tone: "text-emerald-300" },
        ].map((s) => (
          <Card key={s.label} className={surfaceClass}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-200">
                <s.icon className="h-4 w-4 text-righello-pink" />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${s.tone}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ricerca */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca consegna o cliente…"
          className={inputClass}
        />
      </div>

      {/* Consegne raggruppate per cliente */}
      {loading ? (
        <p className="text-slate-400">Carico…</p>
      ) : grouped.length === 0 ? (
        <Card className={surfaceClass}>
          <CardContent className="py-12 text-center text-slate-400">
            {tranches.length === 0
              ? "Nessuna consegna visibile. Creane una, oppure chiedi di essere aggiunto come collaboratore."
              : "Nessun risultato per questa ricerca."}
          </CardContent>
        </Card>
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
                  <Link key={t.id} href={`/video/${t.id}`}>
                    <Card className={`${interactiveSurfaceClass} h-full`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-slate-100">{t.title}</CardTitle>
                        {t.projectNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {t.projectNames.slice(0, 2).map((p) => (
                              <Badge key={p} variant="outline" className="border-white/10 bg-white/5 text-[10px] text-slate-300">
                                {p}
                              </Badge>
                            ))}
                            {t.projectNames.length > 2 && (
                              <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-slate-400">
                                +{t.projectNames.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Stato PER VIDEO: nella stessa consegna convivono stati diversi */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-slate-300">
                            {t.counts.total} video
                          </Badge>
                          {t.counts.revision > 0 && (
                            <Badge variant="outline" className={`text-xs ${statusMeta("revision").badge}`}>
                              {t.counts.revision} da revisionare
                            </Badge>
                          )}
                          {t.counts.pending > 0 && (
                            <Badge variant="outline" className={`text-xs ${statusMeta("pending").badge}`}>
                              {t.counts.pending} in attesa
                            </Badge>
                          )}
                          {t.counts.approved > 0 && (
                            <Badge variant="outline" className={`text-xs ${statusMeta("approved").badge}`}>
                              {t.counts.approved} approvati
                            </Badge>
                          )}
                        </div>

                        {/* Chi ci lavora */}
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          {t.collaborators.length === 0 ? (
                            <span className="text-xs text-slate-500">Nessun collaboratore</span>
                          ) : (
                            <div className="flex -space-x-1.5">
                              {t.collaborators.slice(0, 4).map((c) => (
                                <Avatar key={c.id} className="h-6 w-6 border border-[#172235]" title={`${c.name} · ${COLLAB_ROLE_META[c.role]?.label || c.role}`}>
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
                      </CardContent>
                    </Card>
                  </Link>
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
              Una consegna raccoglie più video per un cliente, con un unico link di review.
              Collaboratori e progetto si impostano dopo, anche per singolo video.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Cliente</label>
              <Select value={clientId} onValueChange={setClientId} disabled={metaLoading}>
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
              <label className="text-sm font-medium text-slate-300">Nome consegna</label>
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
            <Button className={primaryButtonClass} disabled={saving || !title.trim()} onClick={createTranche}>
              {saving ? "Creo…" : "Crea consegna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}
