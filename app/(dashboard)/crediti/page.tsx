"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  FileImage,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreditClient = {
  id: string;
  name: string;
  company: string;
  email: string;
  balanceCents: number;
  creditedCents: number;
  spentCents: number;
};

type CreditTransaction = {
  id: string;
  clientId: string;
  type: "credit" | "debit";
  amountCents: number;
  currency: string;
  description: string;
  statementMonth: string;
  occurredOn: string;
  receipt: null | { name: string; type: string; size: number; url: string };
  createdBy: { role: string; name: string };
  createdAt: string;
};

type CreditsPayload = {
  canManageCredits: boolean;
  clients: CreditClient[];
  selectedClientId: string;
  transactions: CreditTransaction[];
};

const today = new Date().toISOString().slice(0, 10);

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format((Number(cents) || 0) / 100);
}

function monthLabel(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
}

export default function ClientCreditsPage() {
  const [payload, setPayload] = useState<CreditsPayload | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"credit" | "debit" | null>(null);
  const [error, setError] = useState("");
  const [creditForm, setCreditForm] = useState({
    amount: "",
    occurredOn: today,
    description: "",
  });
  const [debitForm, setDebitForm] = useState({
    amount: "",
    occurredOn: today,
    description: "",
    receipt: null as File | null,
  });

  async function loadCredits(clientId = selectedClientId) {
    setLoading(true);
    setError("");
    try {
      const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
      const response = await fetch(`/api/client-credits${query}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Errore nel caricamento crediti");
      }
      setPayload(data);
      setSelectedClientId(data.selectedClientId || clientId || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore nel caricamento crediti",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCredits("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClient = useMemo(
    () =>
      payload?.clients.find((client) => client.id === selectedClientId) ||
      payload?.clients[0] ||
      null,
    [payload, selectedClientId],
  );

  async function submitMovement(
    event: FormEvent<HTMLFormElement>,
    type: "credit" | "debit",
  ) {
    event.preventDefault();
    if (!selectedClient) return;

    setSaving(type);
    setError("");

    try {
      const form = new FormData();
      form.set("clientId", selectedClient.id);
      form.set("type", type);

      if (type === "credit") {
        form.set("amount", creditForm.amount);
        form.set("occurredOn", creditForm.occurredOn);
        form.set("description", creditForm.description);
      } else {
        form.set("amount", debitForm.amount);
        form.set("occurredOn", debitForm.occurredOn);
        form.set("description", debitForm.description);
        if (debitForm.receipt) form.set("receipt", debitForm.receipt);
      }

      const response = await fetch("/api/client-credits", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Errore nel salvataggio movimento");
      }

      if (type === "credit") {
        setCreditForm({ amount: "", occurredOn: today, description: "" });
      } else {
        setDebitForm({
          amount: "",
          occurredOn: today,
          description: "",
          receipt: null,
        });
        const input = document.getElementById(
          "credit-receipt",
        ) as HTMLInputElement | null;
        if (input) input.value = "";
      }

      await loadCredits(selectedClient.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore nel salvataggio movimento",
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading && !payload) {
    return (
      <div className="optima-ops-page">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-righello-pink" />
        </div>
      </div>
    );
  }

  return (
    <div className="optima-ops-page">
      <div className="optima-ops-container optima-ops-stack">
        <header className="optima-ops-header border-b border-white/10 pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                <WalletCards className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-righello-pink">
                  Crediti cliente
                </p>
                <h1 className="text-3xl font-black tracking-normal text-white md:text-4xl">
                  Fondo scontrini e rimborsi
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Crediti mensili cumulabili, scalati solo con prova allegata. Ogni
              movimento resta tracciato per cliente, mese e autore.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {payload?.canManageCredits && (
              <Select
                value={selectedClientId}
                onValueChange={(value) => {
                  setSelectedClientId(value);
                  loadCredits(value);
                }}
              >
                <SelectTrigger className="h-11 min-w-[260px] border-white/10 bg-[#111827] text-white">
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#111827] text-white">
                  {payload.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => loadCredits(selectedClientId)}
              className="h-11 border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aggiorna
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {!selectedClient ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-slate-400">
            Nessun cliente collegato a questa utenza.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Saldo disponibile"
                value={money(selectedClient.balanceCents)}
                tone={
                  selectedClient.balanceCents > 0
                    ? "cyan"
                    : selectedClient.balanceCents < 0
                      ? "red"
                      : "neutral"
                }
                icon={Banknote}
              />
              <MetricCard
                label="Credito caricato"
                value={money(selectedClient.creditedCents)}
                tone="green"
                icon={ArrowUpCircle}
              />
              <MetricCard
                label="Spese scalate"
                value={money(selectedClient.spentCents)}
                tone="pink"
                icon={ArrowDownCircle}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-5">
                {payload?.canManageCredits && (
                  <form
                    onSubmit={(event) => submitMovement(event, "credit")}
                    className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.055] p-5"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-5 w-5 text-emerald-300" />
                      <div>
                        <h2 className="text-lg font-black text-white">
                          Aggiungi credito mensile
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                          Azione riservata a Righello. Il credito è cumulabile e
                          aumenta il saldo del cliente.
                        </p>
                      </div>
                    </div>
                    <MovementFields
                      amount={creditForm.amount}
                      occurredOn={creditForm.occurredOn}
                      description={creditForm.description}
                      descriptionPlaceholder="Es. Fondo mensile luglio 2026"
                      onAmount={(amount) =>
                        setCreditForm((current) => ({ ...current, amount }))
                      }
                      onOccurredOn={(occurredOn) =>
                        setCreditForm((current) => ({
                          ...current,
                          occurredOn,
                        }))
                      }
                      onDescription={(description) =>
                        setCreditForm((current) => ({
                          ...current,
                          description,
                        }))
                      }
                    />
                    <Button
                      type="submit"
                      disabled={saving === "credit"}
                      className="mt-4 h-11 bg-emerald-500 text-white hover:bg-emerald-400"
                    >
                      {saving === "credit" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                      )}
                      Carica credito
                    </Button>
                  </form>
                )}

                <form
                  onSubmit={(event) => submitMovement(event, "debit")}
                  className="rounded-lg border border-righello-pink/25 bg-righello-pink/[0.065] p-5"
                >
                  <div className="flex items-start gap-3">
                    <Receipt className="mt-1 h-5 w-5 text-righello-pink" />
                    <div>
                      <h2 className="text-lg font-black text-white">
                        Scala credito con scontrino
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-pink-100/70">
                        Carica foto o PDF dello scontrino: il movimento riduce
                        subito il saldo disponibile.
                      </p>
                    </div>
                  </div>
                  <MovementFields
                    amount={debitForm.amount}
                    occurredOn={debitForm.occurredOn}
                    description={debitForm.description}
                    descriptionPlaceholder="Es. Sponsorizzata Meta, stampa urgente, materiale evento..."
                    onAmount={(amount) =>
                      setDebitForm((current) => ({ ...current, amount }))
                    }
                    onOccurredOn={(occurredOn) =>
                      setDebitForm((current) => ({ ...current, occurredOn }))
                    }
                    onDescription={(description) =>
                      setDebitForm((current) => ({ ...current, description }))
                    }
                  />
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="credit-receipt" className="text-slate-300">
                      Prova scontrino
                    </Label>
                    <Input
                      id="credit-receipt"
                      type="file"
                      accept="image/*,application/pdf"
                      required
                      onChange={(event) =>
                        setDebitForm((current) => ({
                          ...current,
                          receipt: event.target.files?.[0] || null,
                        }))
                      }
                      className="border-white/10 bg-[#0b1323] text-white file:mr-3 file:rounded-md file:border-0 file:bg-righello-pink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={saving === "debit"}
                    className="mt-4 h-11 bg-righello-pink text-white hover:bg-righello-pink-dark"
                  >
                    {saving === "debit" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownCircle className="mr-2 h-4 w-4" />
                    )}
                    Scala credito
                  </Button>
                </form>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#111827]">
                <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                      Storico movimenti
                    </p>
                    <h2 className="mt-1 text-xl font-black text-white">
                      {selectedClient.name}
                    </h2>
                  </div>
                  <Badge className="w-fit border border-white/10 bg-white/[0.06] text-slate-200">
                    {payload?.transactions.length || 0} movimenti
                  </Badge>
                </div>

                <div className="max-h-[720px] overflow-y-auto p-4">
                  {!payload?.transactions.length ? (
                    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
                      Nessun movimento registrato per questo cliente.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payload.transactions.map((transaction) => (
                        <article
                          key={transaction.id}
                          className="rounded-lg border border-white/10 bg-[#0b1323] p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  className={
                                    transaction.type === "credit"
                                      ? "border-0 bg-emerald-500/15 text-emerald-200"
                                      : "border-0 bg-righello-pink/15 text-pink-200"
                                  }
                                >
                                  {transaction.type === "credit"
                                    ? "Credito"
                                    : "Spesa"}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {monthLabel(transaction.statementMonth)}
                                </span>
                              </div>
                              <h3 className="mt-2 break-words text-base font-bold text-white">
                                {transaction.description ||
                                  (transaction.type === "credit"
                                    ? "Credito mensile"
                                    : "Scontrino")}
                              </h3>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {new Date(
                                    `${transaction.occurredOn}T00:00:00`,
                                  ).toLocaleDateString("it-IT")}
                                </span>
                                {transaction.createdBy.name && (
                                  <span>
                                    Inserito da {transaction.createdBy.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <div
                                className={
                                  transaction.type === "credit"
                                    ? "text-xl font-black text-emerald-300"
                                    : "text-xl font-black text-pink-300"
                                }
                              >
                                {transaction.type === "credit" ? "+" : "-"}
                                {money(transaction.amountCents)}
                              </div>
                              {transaction.receipt && (
                                <a
                                  href={transaction.receipt.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
                                >
                                  <FileImage className="h-4 w-4" />
                                  Apri prova
                                </a>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
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

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "cyan" | "green" | "pink" | "red" | "neutral";
  icon: typeof Banknote;
}) {
  const toneClass = {
    cyan: "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-200",
    green: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200",
    pink: "border-righello-pink/25 bg-righello-pink/[0.07] text-pink-200",
    red: "border-red-400/25 bg-red-400/[0.07] text-red-200",
    neutral: "border-white/10 bg-white/[0.04] text-slate-200",
  }[tone];

  return (
    <div className={`rounded-lg border p-5 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-current/70">{label}</p>
          <div className="mt-2 text-3xl font-black tracking-normal text-white">
            {value}
          </div>
        </div>
        <Icon className="h-8 w-8 shrink-0 opacity-80" />
      </div>
    </div>
  );
}

function MovementFields({
  amount,
  occurredOn,
  description,
  descriptionPlaceholder,
  onAmount,
  onOccurredOn,
  onDescription,
}: {
  amount: string;
  occurredOn: string;
  description: string;
  descriptionPlaceholder: string;
  onAmount: (value: string) => void;
  onOccurredOn: (value: string) => void;
  onDescription: (value: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-slate-300">Importo</Label>
          <Input
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            inputMode="decimal"
            placeholder="Es. 120,50"
            required
            className="h-11 border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Data</Label>
          <Input
            type="date"
            value={occurredOn}
            onChange={(event) => onOccurredOn(event.target.value)}
            required
            className="h-11 border-white/10 bg-[#0b1323] text-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">Descrizione</Label>
        <Textarea
          value={description}
          onChange={(event) => onDescription(event.target.value)}
          placeholder={descriptionPlaceholder}
          className="min-h-24 border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}
