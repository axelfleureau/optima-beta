"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  CopyPlus,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TrackerClient = {
  id: string;
  name: string;
  company: string | null;
};

type TrackerRow = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientCompany: string | null;
  month: string;
  targetVideoReel: number;
  targetPhotoPost: number;
  targetGeneric: number;
  targetTotal: number;
  createdVideoReel: number;
  createdPhotoPost: number;
  createdGeneric: number;
  createdTotal: number;
  missingVideoReel: number;
  missingPhotoPost: number;
  missingTotal: number;
  plannedMissingReel: number;
  plannedMissingPost: number;
  status: "complete" | "to_schedule";
  notes: string;
  updatedAt: string | null;
};

type TrackerPayload = {
  ok: boolean;
  month: string;
  rows: TrackerRow[];
  clients: TrackerClient[];
  summary: {
    clients: number;
    targetTotal: number;
    createdTotal: number;
    missingTotal: number;
    missingVideoReel: number;
    missingPhotoPost: number;
    complete: number;
    toSchedule: number;
  };
};

const EMPTY_SUMMARY: TrackerPayload["summary"] = {
  clients: 0,
  targetTotal: 0,
  createdTotal: 0,
  missingTotal: 0,
  missingVideoReel: 0,
  missingPhotoPost: 0,
  complete: 0,
  toSchedule: 0,
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toNumber(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function formatMonthLabel(month: string) {
  const [year, rawMonth] = month.split("-");
  const date = new Date(Number(year), Number(rawMonth || 1) - 1, 1);
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function computeRow(row: TrackerRow): TrackerRow {
  const targetTotal =
    row.targetVideoReel + row.targetPhotoPost + row.targetGeneric;
  const createdTotal =
    row.createdVideoReel + row.createdPhotoPost + row.createdGeneric;
  const missingVideoReel = Math.max(
    row.targetVideoReel - row.createdVideoReel,
    0,
  );
  const missingPhotoPost = Math.max(
    row.targetPhotoPost - row.createdPhotoPost,
    0,
  );
  const missingTotal = Math.max(targetTotal - createdTotal, 0);
  return {
    ...row,
    targetTotal,
    createdTotal,
    missingVideoReel,
    missingPhotoPost,
    missingTotal,
    status: missingTotal <= 0 ? "complete" : "to_schedule",
  };
}

function defaultNewRow(month: string): TrackerRow {
  return {
    id: "",
    clientId: null,
    clientName: "",
    clientCompany: null,
    month,
    targetVideoReel: 0,
    targetPhotoPost: 0,
    targetGeneric: 0,
    targetTotal: 0,
    createdVideoReel: 0,
    createdPhotoPost: 0,
    createdGeneric: 0,
    createdTotal: 0,
    missingVideoReel: 0,
    missingPhotoPost: 0,
    missingTotal: 0,
    plannedMissingReel: 0,
    plannedMissingPost: 0,
    status: "complete",
    notes: "",
    updatedAt: null,
  };
}

export function ContentTrackerView({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [clients, setClients] = useState<TrackerClient[]>([]);
  const [summary, setSummary] =
    useState<TrackerPayload["summary"]>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [carrying, setCarrying] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [newRow, setNewRow] = useState<TrackerRow>(() =>
    defaultNewRow(currentMonth()),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch(`/api/content-tracker?month=${month}`)
      .then((res) => res.json())
      .catch(() => null);
    if (!data?.ok) {
      toast.error(data?.error || "Tracker contenuti non disponibile");
      setLoading(false);
      return;
    }
    setRows((data.rows || []).map(computeRow));
    setClients(data.clients || []);
    setSummary(data.summary || EMPTY_SUMMARY);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setNewRow(defaultNewRow(month));
  }, [month]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        needle &&
        !row.clientName.toLowerCase().includes(needle) &&
        !(row.notes || "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [query, rows, statusFilter]);

  const availableClients = useMemo(() => {
    const used = new Set(rows.map((row) => row.clientId).filter(Boolean));
    return clients.filter((client) => !used.has(client.id));
  }, [clients, rows]);

  function updateRow(id: string, patch: Partial<TrackerRow>) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? computeRow({ ...row, ...patch }) : row,
      ),
    );
  }

  async function saveRow(row: TrackerRow) {
    setSavingId(row.id || "__new__");
    const payload = {
      action: "upsert",
      id: row.id || undefined,
      clientId: row.clientId,
      clientName: row.clientName,
      month,
      targetVideoReel: row.targetVideoReel,
      targetPhotoPost: row.targetPhotoPost,
      targetGeneric: row.targetGeneric,
      createdVideoReel: row.createdVideoReel,
      createdPhotoPost: row.createdPhotoPost,
      createdGeneric: row.createdGeneric,
      plannedMissingReel: row.plannedMissingReel,
      plannedMissingPost: row.plannedMissingPost,
      notes: row.notes,
    };
    const data = await fetch("/api/content-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .catch(() => null);
    setSavingId(null);
    if (!data?.ok) {
      toast.error(data?.error || "Salvataggio non riuscito");
      return false;
    }
    toast.success("Tracker aggiornato");
    await load();
    return true;
  }

  async function deleteRow(row: TrackerRow) {
    if (!row.id) return;
    setSavingId(row.id);
    const data = await fetch("/api/content-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: row.id }),
    })
      .then((res) => res.json())
      .catch(() => null);
    setSavingId(null);
    if (!data?.ok) {
      toast.error(data?.error || "Eliminazione non riuscita");
      return;
    }
    toast.success("Cliente rimosso dal mese");
    await load();
  }

  async function createRow() {
    if (!newRow.clientName.trim()) {
      toast.error("Scegli o scrivi un cliente");
      return;
    }
    const ok = await saveRow(computeRow(newRow));
    if (ok) {
      setOpenNew(false);
      setNewRow(defaultNewRow(month));
    }
  }

  async function carryForward() {
    setCarrying(true);
    const data = await fetch("/api/content-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "carry_forward", month }),
    })
      .then((res) => res.json())
      .catch(() => null);
    setCarrying(false);
    if (!data?.ok) {
      toast.error(data?.error || "Impossibile portare avanti il mese");
      return;
    }
    if (data.copied === 0) {
      toast.info(
        `Nessun cliente da portare avanti da ${formatMonthLabel(data.sourceMonth)}.`,
      );
      return;
    }
    toast.success(
      `${data.copied} clienti portati avanti da ${formatMonthLabel(data.sourceMonth)} (creati azzerati).`,
    );
    await load();
  }

  return (
    <div
      className={
        embedded ? "text-slate-100" : "min-h-screen bg-[#08111f] text-slate-100"
      }
    >
      <div
        className={
          embedded
            ? "flex w-full flex-col gap-6"
            : "mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
        }
      >
        <header
          className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
            embedded ? "sm:justify-end" : "sm:justify-between"
          }`}
        >
          {!embedded && (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                  Produzione contenuti
                </p>
                <h1 className="text-xl font-black tracking-tight text-white">
                  Tracker contenuti clienti
                </h1>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-10 w-[152px] border-white/10 bg-[#0b1424] pl-9 text-slate-100"
              />
            </div>
            <Button
              variant="outline"
              onClick={carryForward}
              disabled={carrying}
              title="Copia i target e le note dal mese precedente, azzerando i contenuti creati"
              className="h-10 border-white/10 bg-[#0b1424] text-slate-200 hover:bg-white/5"
            >
              <CopyPlus className="mr-2 h-4 w-4" />
              {carrying ? "Copio..." : "Porta avanti"}
            </Button>
            <Button
              onClick={() => setOpenNew(true)}
              className="h-10 bg-righello-pink text-white hover:bg-righello-pink/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi cliente
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Target mese"
            value={summary.targetTotal}
            detail={`${summary.clients} clienti in ${formatMonthLabel(month)}`}
          />
          <MetricCard
            label="Creati"
            value={summary.createdTotal}
            detail={`${summary.complete} clienti completi`}
            tone="emerald"
          />
          <MetricCard
            label="Mancanti"
            value={summary.missingTotal}
            detail={`${summary.toSchedule} clienti da programmare`}
            tone="amber"
          />
          <MetricCard
            label="Reel / Post mancanti"
            value={`${summary.missingVideoReel}/${summary.missingPhotoPost}`}
            detail="Video-reel e foto-post da coprire"
            tone="cyan"
          />
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111b2d] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca cliente o nota..."
                className="h-11 border-white/10 bg-[#0b1424] pl-9 text-slate-100"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 border-white/10 bg-[#0b1424] text-slate-100 lg:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#111b2d] text-slate-100">
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="to_schedule">Da programmare</SelectItem>
                <SelectItem value="complete">Completi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111b2d]">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Caricamento tracker...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300">
                <ClipboardList className="h-6 w-6" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  Nessun cliente in {formatMonthLabel(month)}
                </p>
                <p className="text-sm text-slate-400">
                  Porta avanti i target del mese precedente (creati azzerati),
                  oppure aggiungi i clienti a mano.
                </p>
              </div>
              {rows.length === 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={carryForward}
                    disabled={carrying}
                    className="bg-righello-pink text-white hover:bg-righello-pink/90"
                  >
                    <CopyPlus className="mr-2 h-4 w-4" />
                    {carrying ? "Copio..." : "Porta avanti dal mese precedente"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setOpenNew(true)}
                    className="border-white/10 bg-[#0b1424] text-slate-200 hover:bg-white/5"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi cliente
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1140px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#0e1830]">
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      Cliente
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      Avanzamento
                    </th>
                    <th
                      colSpan={3}
                      className="border-l border-white/10 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-sky-300"
                    >
                      Target
                    </th>
                    <th
                      colSpan={3}
                      className="border-l border-white/10 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                    >
                      Creati
                    </th>
                    <th
                      colSpan={2}
                      className="border-l border-white/10 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-amber-300"
                    >
                      Mancanti
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      Stato
                    </th>
                    <th
                      rowSpan={2}
                      className="border-l border-white/10 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      Note
                    </th>
                    <th rowSpan={2} className="px-2 py-2.5" />
                  </tr>
                  <tr className="bg-[#0e1830] text-slate-500">
                    <th className="border-l border-white/10 px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Reel
                    </th>
                    <th className="px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Post
                    </th>
                    <th className="px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Gen
                    </th>
                    <th className="border-l border-white/10 px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Reel
                    </th>
                    <th className="px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Post
                    </th>
                    <th className="px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Gen
                    </th>
                    <th className="border-l border-white/10 px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Reel
                    </th>
                    <th className="px-1 pb-2 text-center text-[9px] font-semibold uppercase">
                      Tot
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <TrackerTableRow
                      key={row.id}
                      row={row}
                      saving={savingId === row.id}
                      onChange={(patch) => updateRow(row.id, patch)}
                      onSave={() => saveRow(row)}
                      onDelete={() => deleteRow(row)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[90svh] overflow-y-auto border-white/10 bg-[#111b2d] text-slate-100">
          <DialogHeader>
            <DialogTitle>Aggiungi cliente al mese</DialogTitle>
            <DialogDescription className="text-slate-400">
              Imposta target e conteggi iniziali. I mancanti vengono calcolati
              automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={newRow.clientId || "__custom__"}
              onValueChange={(value) => {
                if (value === "__custom__") {
                  setNewRow((row) => ({
                    ...row,
                    clientId: null,
                    clientName: "",
                    clientCompany: null,
                  }));
                  return;
                }
                const client = clients.find((item) => item.id === value);
                setNewRow((row) => ({
                  ...row,
                  clientId: value,
                  clientName: client?.name || "",
                  clientCompany: client?.company || null,
                }));
              }}
            >
              <SelectTrigger className="h-11 border-white/10 bg-[#0b1424]">
                <SelectValue placeholder="Scegli cliente Optima" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#111b2d] text-slate-100">
                <SelectItem value="__custom__">
                  Cliente non collegato
                </SelectItem>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!newRow.clientId && (
              <Input
                value={newRow.clientName}
                onChange={(event) =>
                  setNewRow((row) => ({
                    ...row,
                    clientName: event.target.value,
                  }))
                }
                placeholder="Nome cliente"
                className="h-11 border-white/10 bg-[#0b1424]"
              />
            )}
            <NumberGrid row={newRow} onChange={setNewRow} />
            <Textarea
              value={newRow.notes}
              onChange={(event) =>
                setNewRow((row) => ({ ...row, notes: event.target.value }))
              }
              placeholder="Note contrattuali o operative..."
              className="border-white/10 bg-[#0b1424] text-slate-100"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>
              Annulla
            </Button>
            <Button
              onClick={createRow}
              disabled={savingId === "__new__"}
              className="bg-righello-pink text-white hover:bg-righello-pink/90"
            >
              Salva cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "slate" | "emerald" | "amber" | "cyan";
}) {
  const toneClass = {
    slate: "border-white/10 bg-[#111b2d]",
    emerald: "border-emerald-400/20 bg-emerald-500/10",
    amber: "border-amber-400/20 bg-amber-500/10",
    cyan: "border-cyan-400/20 bg-cyan-500/10",
  }[tone];
  return (
    <div className={`rounded-lg border p-5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function NumberGrid({
  row,
  onChange,
}: {
  row: TrackerRow;
  onChange: (next: TrackerRow) => void;
}) {
  const fields: Array<[keyof TrackerRow, string]> = [
    ["targetVideoReel", "Target video/reel"],
    ["targetPhotoPost", "Target foto/post"],
    ["targetGeneric", "Target generico"],
    ["createdVideoReel", "Video/reel creati"],
    ["createdPhotoPost", "Foto/post creati"],
    ["createdGeneric", "Generico creati"],
    ["plannedMissingReel", "Reel da creare"],
    ["plannedMissingPost", "Post da creare"],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([field, label]) => (
        <label key={String(field)} className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-400">{label}</span>
          <Input
            type="number"
            min={0}
            value={Number(row[field] || 0)}
            onChange={(event) =>
              onChange(
                computeRow({
                  ...row,
                  [field]: toNumber(event.target.value),
                }),
              )
            }
            className="h-10 border-white/10 bg-[#0b1424] text-slate-100"
          />
        </label>
      ))}
    </div>
  );
}

function NumCell({
  value,
  hot = false,
  groupStart = false,
  onChange,
}: {
  value: number;
  hot?: boolean;
  groupStart?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <td
      className={`px-1 py-1.5 text-center ${groupStart ? "border-l border-white/10" : ""}`}
    >
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        className={`h-8 w-12 rounded-md border text-center text-sm tabular-nums text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 ${
          hot
            ? "border-emerald-400/40 bg-emerald-500/[0.08]"
            : "border-white/10 bg-[#0b1424]"
        }`}
      />
    </td>
  );
}

function MissCell({
  value,
  groupStart = false,
}: {
  value: number;
  groupStart?: boolean;
}) {
  return (
    <td
      className={`px-1 py-1.5 text-center tabular-nums ${groupStart ? "border-l border-white/10" : ""}`}
    >
      <span className={value > 0 ? "font-bold text-amber-300" : "text-slate-600"}>
        {value}
      </span>
    </td>
  );
}

function TrackerTableRow({
  row,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  row: TrackerRow;
  saving: boolean;
  onChange: (patch: Partial<TrackerRow>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const progress =
    row.targetTotal > 0
      ? Math.min(100, Math.round((row.createdTotal / row.targetTotal) * 100))
      : 100;
  const complete = row.status === "complete";
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-100">
              {row.clientName}
            </p>
            {row.clientCompany && (
              <p className="truncate text-[11px] text-slate-500">
                {row.clientCompany}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <p className="text-[11px] tabular-nums text-slate-400">
          {row.createdTotal} / {row.targetTotal}
        </p>
        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </td>
      <NumCell
        groupStart
        value={row.targetVideoReel}
        onChange={(v) => onChange({ targetVideoReel: v })}
      />
      <NumCell
        value={row.targetPhotoPost}
        onChange={(v) => onChange({ targetPhotoPost: v })}
      />
      <NumCell
        value={row.targetGeneric}
        onChange={(v) => onChange({ targetGeneric: v })}
      />
      <NumCell
        groupStart
        hot
        value={row.createdVideoReel}
        onChange={(v) => onChange({ createdVideoReel: v })}
      />
      <NumCell
        hot
        value={row.createdPhotoPost}
        onChange={(v) => onChange({ createdPhotoPost: v })}
      />
      <NumCell
        hot
        value={row.createdGeneric}
        onChange={(v) => onChange({ createdGeneric: v })}
      />
      <MissCell groupStart value={row.missingVideoReel} />
      <MissCell value={row.missingTotal} />
      <td className="px-2 py-2 text-center">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            complete
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {complete ? "OK" : "Da fare"}
        </span>
      </td>
      <td className="border-l border-white/10 px-2 py-2">
        <input
          value={row.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Nota..."
          className="w-full min-w-[150px] bg-transparent text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none"
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            title="Salva"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            title="Elimina"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-400 hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
