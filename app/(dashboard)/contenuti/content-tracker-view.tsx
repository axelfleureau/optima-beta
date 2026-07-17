"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
            label="Fatti"
            value={summary.createdTotal}
            detail={`${summary.complete} clienti completi`}
            tone="emerald"
          />
          <MetricCard
            label="Mancano"
            value={summary.missingTotal}
            detail="contenuti da produrre"
            tone="amber"
          />
          <MetricCard
            label="Da programmare"
            value={summary.toSchedule}
            detail={`su ${summary.clients} clienti`}
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

        {loading ? (
          <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111b2d]">
            <div className="p-8 text-center text-sm text-slate-400">
              Caricamento tracker...
            </div>
          </section>
        ) : filteredRows.length === 0 ? (
          <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111b2d]">
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
          </section>
        ) : (
          <>
            {/* Mobile: una card per cliente, niente scroll orizzontale */}
            <div className="space-y-3 md:hidden">
              {filteredRows.map((row) => (
                <TrackerMobileCard
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  saving={savingId === row.id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === row.id ? null : row.id,
                    )
                  }
                  onChange={(patch) => updateRow(row.id, patch)}
                  onSave={() => saveRow(row)}
                  onDelete={() => deleteRow(row)}
                />
              ))}
            </div>

            {/* Desktop: tabella densa */}
            <section className="hidden overflow-hidden rounded-lg border border-white/10 bg-[#111b2d] md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#0e1830] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2.5 text-left">Cliente</th>
                    <th className="px-3 py-2.5 text-left">Avanzamento</th>
                    <th className="px-3 py-2.5 text-center">Target</th>
                    <th className="px-3 py-2.5 text-center">Fatti</th>
                    <th className="px-3 py-2.5 text-center">Mancano</th>
                    <th className="px-3 py-2.5 text-center">Stato</th>
                    <th className="px-3 py-2.5 text-left">Note</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <TrackerTableRow
                      key={row.id}
                      row={row}
                      expanded={expandedId === row.id}
                      saving={savingId === row.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === row.id ? null : row.id,
                        )
                      }
                      onChange={(patch) => updateRow(row.id, patch)}
                      onSave={() => saveRow(row)}
                      onDelete={() => deleteRow(row)}
                    />
                  ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
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
    ["createdVideoReel", "Video/reel fatti"],
    ["createdPhotoPost", "Foto/post fatti"],
    ["createdGeneric", "Generico fatti"],
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

/** Riepilogo tipi solo quando serve (più di un tipo o tipo diverso da generico). */
function typeSummary(row: TrackerRow): string {
  const parts: string[] = [];
  if (row.targetVideoReel) parts.push(`${row.targetVideoReel} reel`);
  if (row.targetPhotoPost) parts.push(`${row.targetPhotoPost} foto`);
  if (row.targetGeneric) parts.push(`${row.targetGeneric} generici`);
  if (parts.length <= 1 && row.targetGeneric && !row.targetVideoReel && !row.targetPhotoPost) {
    return "";
  }
  return parts.join(" · ");
}

function LabeledNum({
  label,
  value,
  hot = false,
  onChange,
}: {
  label: string;
  value: number;
  hot?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        className={`h-10 w-24 text-right text-slate-100 ${
          hot
            ? "border-emerald-400/40 bg-emerald-500/[0.08]"
            : "border-white/10 bg-[#111b2d]"
        }`}
      />
    </label>
  );
}

function TrackerTableRow({
  row,
  expanded,
  saving,
  onToggle,
  onChange,
  onSave,
  onDelete,
}: {
  row: TrackerRow;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TrackerRow>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const progress =
    row.targetTotal > 0
      ? Math.min(100, Math.round((row.createdTotal / row.targetTotal) * 100))
      : 100;
  const complete = row.status === "complete";
  const mix = typeSummary(row);
  return (
    <>
      <tr
        className={`cursor-pointer border-t border-white/5 ${expanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
        onClick={onToggle}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-100">
                {row.clientName}
              </p>
              {(mix || row.clientCompany) && (
                <p className="truncate text-[11px] text-slate-500">
                  {mix || row.clientCompany}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
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
        <td className="px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-200">
          {row.targetTotal}
        </td>
        <td className="px-3 py-2.5 text-center text-base font-bold tabular-nums text-emerald-300">
          {row.createdTotal}
        </td>
        <td className="px-3 py-2.5 text-center text-base font-bold tabular-nums">
          <span className={row.missingTotal > 0 ? "text-amber-300" : "text-slate-600"}>
            {row.missingTotal}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
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
        <td className="px-3 py-2.5">
          <span className="line-clamp-1 max-w-[220px] text-xs text-slate-500">
            {row.notes || "—"}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right">
          <ChevronDown
            className={`inline h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[#0b1424]">
          <td colSpan={8} className="px-4 py-4">
            <TrackerEditor
              row={row}
              saving={saving}
              onChange={onChange}
              onSave={onSave}
              onDelete={onDelete}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/** Editor per tipo, condiviso fra riga espansa (desktop) e card (mobile). */
function TrackerEditor({
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
  return (
    <>
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
            Target del mese
          </p>
          <LabeledNum
            label="Video / Reel"
            value={row.targetVideoReel}
            onChange={(v) => onChange({ targetVideoReel: v })}
          />
          <LabeledNum
            label="Foto / Post"
            value={row.targetPhotoPost}
            onChange={(v) => onChange({ targetPhotoPost: v })}
          />
          <LabeledNum
            label="Generico"
            value={row.targetGeneric}
            onChange={(v) => onChange({ targetGeneric: v })}
          />
        </div>
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Contenuti fatti
          </p>
          <LabeledNum
            label="Video / Reel"
            value={row.createdVideoReel}
            hot
            onChange={(v) => onChange({ createdVideoReel: v })}
          />
          <LabeledNum
            label="Foto / Post"
            value={row.createdPhotoPost}
            hot
            onChange={(v) => onChange({ createdPhotoPost: v })}
          />
          <LabeledNum
            label="Generico"
            value={row.createdGeneric}
            hot
            onChange={(v) => onChange({ createdGeneric: v })}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Note
          </span>
          <Textarea
            value={row.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Es. range dichiarato 8-10, note operative..."
            className="min-h-[64px] border-white/10 bg-[#111b2d] text-slate-100"
          />
        </label>
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            disabled={saving}
            className="h-10 flex-1 bg-righello-pink text-white hover:bg-righello-pink/90 sm:flex-none"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvo..." : "Salva"}
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            disabled={saving}
            className="h-10 w-10 shrink-0 border-white/10 bg-white/5 p-0 text-slate-300 hover:border-red-400/40 hover:text-red-200"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/** Card mobile: stessi dati della riga tabella, ma incolonnati (niente scroll orizzontale). */
function TrackerMobileCard({
  row,
  expanded,
  saving,
  onToggle,
  onChange,
  onSave,
  onDelete,
}: {
  row: TrackerRow;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TrackerRow>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const complete = row.status === "complete";
  const progress =
    row.targetTotal > 0
      ? Math.min(100, Math.round((row.createdTotal / row.targetTotal) * 100))
      : 100;
  const mix = typeSummary(row);

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111b2d]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-100">
            {row.clientName}
          </span>
          {(mix || row.clientCompany) && (
            <span className="block truncate text-[11px] text-slate-500">
              {mix || row.clientCompany}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            complete
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {complete ? "OK" : "Da fare"}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div className="grid grid-cols-3 gap-2 border-t border-white/5 px-4 py-3 text-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Target
          </p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-slate-200">
            {row.targetTotal}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Fatti
          </p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-emerald-300">
            {row.createdTotal}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Mancano
          </p>
          <p
            className={`mt-0.5 text-xl font-black tabular-nums ${row.missingTotal > 0 ? "text-amber-300" : "text-slate-600"}`}
          >
            {row.missingTotal}
          </p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 bg-[#0b1424] p-4">
          <TrackerEditor
            row={row}
            saving={saving}
            onChange={onChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
