"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clapperboard, Plus, Copy, Check } from "lucide-react";

type Member = { id: string; name: string; email: string | null };
type Client = { id: string; name: string; company: string | null };
type Tranche = {
  id: string;
  title: string;
  token: string;
  clientId: string | null;
  clientName: string | null;
  videomaker: { id: string; name: string | null } | null;
  smm: { id: string; name: string | null } | null;
  counts: { total: number; pending: number; revision: number; approved: number };
};

const NONE = "__none__";

export default function VideoReviewPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>(NONE);
  const [videomakerId, setVideomakerId] = useState<string>(NONE);
  const [smmId, setSmmId] = useState<string>(NONE);

  async function load() {
    const [meta, list] = await Promise.all([
      fetch("/api/video-review/meta").then((r) => r.json()).catch(() => ({})),
      fetch("/api/video-review/tranches").then((r) => r.json()).catch(() => ({})),
    ]);
    if (meta?.ok) {
      setClients(meta.clients || []);
      setMembers(meta.members || []);
    }
    if (list?.ok) setTranches(list.tranches || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createTranche() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/video-review/tranches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        clientId: clientId === NONE ? null : clientId,
        videomakerMemberId: videomakerId === NONE ? null : videomakerId,
        smmMemberId: smmId === NONE ? null : smmId,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({ ok: false }));
    setSaving(false);
    if (res?.ok) {
      setTitle("");
      setClientId(NONE);
      setVideomakerId(NONE);
      setSmmId(NONE);
      setCreating(false);
      load();
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/video/review/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  const totals = tranches.reduce(
    (acc, t) => ({
      pending: acc.pending + t.counts.pending,
      revision: acc.revision + t.counts.revision,
      approved: acc.approved + t.counts.approved,
    }),
    { pending: 0, revision: 0, approved: 0 },
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clapperboard className="h-7 w-7 text-righello-pink" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Video Review</h1>
            <p className="text-muted-foreground">
              Consegne video ai clienti: approvazione, note di modifica e pubblicazione.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Annulla" : "Nuova tranche"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tranche</CardDescription>
            <CardTitle className="text-3xl">{tranches.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In attesa di review</CardDescription>
            <CardTitle className="text-3xl">{totals.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Da revisionare</CardDescription>
            <CardTitle className="text-3xl text-amber-500">{totals.revision}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approvati</CardDescription>
            <CardTitle className="text-3xl text-emerald-500">{totals.approved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuova tranche</CardTitle>
            <CardDescription>
              Videomaker e SMM si scelgono per nominativo: chiunque del team, anche solo per questa
              consegna.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli cliente" />
                  </SelectTrigger>
                  <SelectContent>
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
                <label className="text-sm font-medium">Nome tranche</label>
                <Input
                  placeholder="es. Tranche settembre"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Videomaker</label>
                <Select value={videomakerId} onValueChange={setVideomakerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Nessuno —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMM</label>
                <Select value={smmId} onValueChange={setSmmId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Nessuno —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={createTranche} disabled={saving || !title.trim()}>
              {saving ? "Creo…" : "Crea tranche"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carico…</p>
      ) : tranches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessuna tranche. Creane una per iniziare a raccogliere i video di un cliente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tranches.map((t) => (
            <Card key={t.id} className="transition-colors hover:border-righello-pink/50">
              <CardHeader className="pb-3">
                <CardDescription>{t.clientName || "Senza cliente"}</CardDescription>
                <Link href={`/video/${t.id}`}>
                  <CardTitle className="text-lg hover:text-righello-pink">{t.title}</CardTitle>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{t.counts.total} video</Badge>
                  {t.counts.revision > 0 && (
                    <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                      {t.counts.revision} da revisionare
                    </Badge>
                  )}
                  {t.counts.approved > 0 && (
                    <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                      {t.counts.approved} approvati
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>🎬 Videomaker: {t.videomaker?.name || "—"}</p>
                  <p>📣 SMM: {t.smm?.name || "—"}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyLink(t.token)}>
                  {copied === t.token ? (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Copiato
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" /> Link review
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
