"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Handshake,
  KeyRound,
  LinkIcon,
  Loader2,
  Lock,
  Plus,
  Search,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ClientPortalEntry = {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  username: string;
  secretValue: string;
  isSensitive: boolean;
  tags: string[];
  updatedAt: string;
};

type ClientPortalPayload = {
  canEdit?: boolean;
  canViewEconomics?: boolean;
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    status?: string;
    notes?: string;
    website?: string;
    sector?: string;
    onedrive_folder?: string;
    notion_url?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  entries: ClientPortalEntry[];
  projects: Array<{
    id: string;
    name: string;
    status?: string;
    due_at?: string;
    budget_cents?: number | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    column_id?: string;
    status?: string;
    priority?: string;
    due_at?: string;
    assignee_name?: string;
  }>;
};

const categoryConfig = {
  credentials: {
    label: "Credenziali",
    icon: KeyRound,
    hint: "Accessi, account, utenze, link amministrativi.",
  },
  document: {
    label: "Documenti",
    icon: FileText,
    hint: "File, cartelle, materiali condivisi e riferimenti.",
  },
  contract: {
    label: "Contratti",
    icon: Handshake,
    hint: "Accordi, preventivi firmati, condizioni e note legali.",
  },
  meeting: {
    label: "Recap incontri",
    icon: CalendarDays,
    hint: "Riunioni, decisioni, follow-up e contesto storico.",
  },
  persona: {
    label: "Buyer personas",
    icon: Users,
    hint: "Target, interlocutori, ICP e stakeholder.",
  },
  strategy: {
    label: "Strategia",
    icon: Briefcase,
    hint: "Posizionamento, obiettivi, priorita e roadmap cliente.",
  },
  link: {
    label: "Link utili",
    icon: LinkIcon,
    hint: "Drive, dashboard, analytics, tool esterni.",
  },
  note: {
    label: "Note",
    icon: StickyNote,
    hint: "Informazioni libere e conoscenza operativa.",
  },
};

type CategoryKey = keyof typeof categoryConfig;

const categories = Object.keys(categoryConfig) as CategoryKey[];

const initialForm = {
  category: "note",
  title: "",
  body: "",
  url: "",
  username: "",
  secretValue: "",
  tags: "",
};

function safeCategory(value: string): CategoryKey {
  return categories.includes(value as CategoryKey)
    ? (value as CategoryKey)
    : "note";
}

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(12, value.length - 3))}${value.slice(-3)}`;
}

export default function ClientPortalPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [payload, setPayload] = useState<ClientPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("note");
  const [form, setForm] = useState(initialForm);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function loadPortal() {
    if (!clientId) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/clients/${clientId}/portal`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.error || "Errore nel caricamento del portale cliente",
        );
      setPayload(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento del portale cliente",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const filteredEntries = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!payload) return [];
    if (!search) return payload.entries;

    return payload.entries.filter((entry) => {
      return [
        entry.title,
        entry.body,
        entry.username,
        entry.url,
        entry.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [payload, query]);

  const entriesByCategory = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = filteredEntries.filter(
          (entry) => safeCategory(entry.category) === category,
        );
        return acc;
      },
      {} as Record<CategoryKey, ClientPortalEntry[]>,
    );
  }, [filteredEntries]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/clients/${clientId}/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          isSensitive: form.category === "credentials",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Errore nel salvataggio");
      setForm({ ...initialForm, category: form.category });
      await loadPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function archiveEntry(entryId: string) {
    if (!window.confirm("Archiviare questo elemento del portale cliente?"))
      return;

    try {
      const response = await fetch(
        `/api/clients/${clientId}/portal/${entryId}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Errore nell'archiviazione");
      await loadPortal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore nell'archiviazione",
      );
    }
  }

  if (loading) {
    return (
      <div className="optima-ops-page">
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-righello-pink" />
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="optima-ops-page">
        <div className="optima-ops-container">
          <div className="mx-auto max-w-4xl rounded-lg border border-red-500/30 bg-red-950/30 p-5 text-red-100">
            {error || "Portale cliente non disponibile"}
          </div>
        </div>
      </div>
    );
  }

  const client = payload.client;
  const canEditPortal = Boolean(payload.canEdit);

  return (
    <div className="optima-ops-page">
      <div className="optima-ops-container optima-ops-stack">
        <header className="flex flex-col gap-5 rounded-lg border border-white/10 bg-[#111b2d] p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)] md:p-6">
          <Link
            href="/clienti"
            className="inline-flex w-fit items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna ai clienti
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-righello-pink/35 bg-righello-pink/15 text-righello-pink">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-righello-pink">
                    Portale cliente
                  </p>
                  <h1 className="break-words text-3xl font-bold leading-tight text-white md:text-5xl">
                    {client.name}
                  </h1>
                </div>
              </div>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Archivio operativo per credenziali, documenti, contratti, note,
                recap incontri e buyer personas. Pensato per avere lo scibile
                del cliente in un unico punto.
              </p>
            </div>

            <div className="grid min-w-0 gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:w-[360px]">
              {client.email && <InfoPill label="Email" value={client.email} />}
              {client.phone && (
                <InfoPill label="Telefono" value={client.phone} />
              )}
              {client.company && (
                <InfoPill label="Azienda" value={client.company} />
              )}
              {client.sector && (
                <InfoPill label="Settore" value={client.sector} />
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-6">
            <Card className="border-white/10 bg-[#111b2d] text-slate-100">
              <CardHeader className="gap-4 border-b border-white/10">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-xl text-white">
                      Conoscenza cliente
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      Sezioni ordinate, ricercabili e aggiornabili dal team.
                    </p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cerca nel portale..."
                      className="h-11 border-white/10 bg-[#0b1323] pl-10 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {categories.map((category) => {
                    const config = categoryConfig[category];
                    const Icon = config.icon;
                    const count = entriesByCategory[category]?.length || 0;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`flex min-w-max items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          activeCategory === category
                            ? "border-righello-pink/50 bg-righello-pink/15 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-4 md:p-6">
                <CategoryBlock
                  category={activeCategory}
                  entries={entriesByCategory[activeCategory] || []}
                  revealed={revealed}
                  onReveal={(entryId) =>
                    setRevealed((current) => ({
                      ...current,
                      [entryId]: !current[entryId],
                    }))
                  }
                  onArchive={canEditPortal ? archiveEntry : undefined}
                />
              </CardContent>
            </Card>

            {canEditPortal && (
              <Card className="border-white/10 bg-[#111b2d] text-slate-100">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <Plus className="h-5 w-5 text-righello-pink" />
                    Aggiungi conoscenza
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <form className="grid gap-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <Label>Sezione</Label>
                        <Select
                          value={form.category}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              category: value,
                            }))
                          }
                        >
                          <SelectTrigger className="border-white/10 bg-[#0b1323] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-[#111b2d] text-white">
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {categoryConfig[category].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Titolo</Label>
                        <Input
                          value={form.title}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Es. Accesso Meta Business, Recap call, Contratto 2026..."
                          className="border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>URL o riferimento</Label>
                        <Input
                          value={form.url}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              url: event.target.value,
                            }))
                          }
                          placeholder="https://, Drive, Notion, cartella..."
                          className="border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tag</Label>
                        <Input
                          value={form.tags}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              tags: event.target.value,
                            }))
                          }
                          placeholder="ads, contratto, amministrazione"
                          className="border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {form.category === "credentials" && (
                      <div className="grid gap-4 rounded-lg border border-righello-pink/20 bg-righello-pink/5 p-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Username / email</Label>
                          <Input
                            value={form.username}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                username: event.target.value,
                              }))
                            }
                            placeholder="utente@example.com"
                            className="border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Segreto</Label>
                          <Input
                            value={form.secretValue}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                secretValue: event.target.value,
                              }))
                            }
                            placeholder="Password, recovery code o token"
                            type="password"
                            className="border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Contenuto</Label>
                      <Textarea
                        value={form.body}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            body: event.target.value,
                          }))
                        }
                        placeholder="Scrivi note operative, recap, condizioni, dettagli tecnici, buyer persona o istruzioni..."
                        className="min-h-32 border-white/10 bg-[#0b1323] text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={saving || !form.title.trim()}
                        className="bg-righello-pink text-white hover:bg-righello-pink-dark"
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Salva nel portale
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </main>

          <aside className="min-w-0 space-y-6">
            <Card className="border-white/10 bg-[#111b2d] text-slate-100">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-lg text-white">
                  Riepilogo operativo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <Metric
                  label="Elementi salvati"
                  value={payload.entries.length}
                />
                <Metric
                  label="Progetti collegati"
                  value={payload.projects.length}
                />
                <Metric label="Task recenti" value={payload.tasks.length} />

                {(client.website ||
                  client.onedrive_folder ||
                  client.notion_url) && (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    {client.website && (
                      <ExternalLinkRow label="Sito" href={client.website} />
                    )}
                    {client.onedrive_folder && (
                      <ExternalLinkRow
                        label="OneDrive"
                        href={client.onedrive_folder}
                      />
                    )}
                    {client.notion_url && (
                      <ExternalLinkRow
                        label="Notion"
                        href={client.notion_url}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111b2d] text-slate-100">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-lg text-white">Progetti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {payload.projects.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nessun progetto collegato.
                  </p>
                ) : (
                  payload.projects.slice(0, 8).map((project) => (
                    <div
                      key={project.id}
                      className="rounded-lg border border-white/10 bg-[#0b1323] p-3"
                    >
                      <div className="font-semibold text-white">
                        {project.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>{project.status || "attivo"}</span>
                        {project.due_at && (
                          <span>
                            {new Date(project.due_at).toLocaleDateString(
                              "it-IT",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111b2d] text-slate-100">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-lg text-white">
                  Task recenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {payload.tasks.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nessuna task collegata.
                  </p>
                ) : (
                  payload.tasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-white/10 bg-[#0b1323] p-3"
                    >
                      <div className="line-clamp-2 font-semibold text-white">
                        {task.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge className="border-0 bg-cyan-500/15 text-cyan-200">
                          {task.column_id || task.status || "task"}
                        </Badge>
                        {task.assignee_name && (
                          <Badge className="border-0 bg-white/10 text-slate-200">
                            {task.assignee_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#0b1323] px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="truncate text-sm text-slate-200">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b1323] p-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-lg font-bold text-white">{value}</span>
    </div>
  );
}

function ExternalLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0b1323] px-3 py-2 text-sm text-slate-200 hover:border-righello-pink/40"
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
    </a>
  );
}

function CategoryBlock({
  category,
  entries,
  revealed,
  onReveal,
  onArchive,
}: {
  category: CategoryKey;
  entries: ClientPortalEntry[];
  revealed: Record<string, boolean>;
  onReveal: (entryId: string) => void;
  onArchive?: (entryId: string) => void;
}) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0b1323] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-righello-pink">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{config.label}</h2>
          <p className="mt-1 text-sm text-slate-400">{config.hint}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
          Nessun elemento in questa sezione.
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => {
            const showSecret = Boolean(revealed[entry.id]);
            const isCredential =
              entry.category === "credentials" || entry.isSensitive;
            return (
              <article
                key={entry.id}
                className="rounded-lg border border-white/10 bg-[#0b1323] p-4 shadow-[0_12px_36px_rgba(2,6,23,0.22)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-lg font-bold text-white">
                        {entry.title}
                      </h3>
                      {isCredential && (
                        <Badge className="border-0 bg-righello-pink/15 text-righello-pink">
                          <Lock className="mr-1 h-3 w-3" />
                          sensibile
                        </Badge>
                      )}
                    </div>
                    {entry.updatedAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Aggiornato il{" "}
                        {new Date(entry.updatedAt).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>
                  {onArchive && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onArchive(entry.id)}
                      className="w-fit text-slate-400 hover:bg-red-500/10 hover:text-red-200"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Archivia
                    </Button>
                  )}
                </div>

                {entry.body && (
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                    {entry.body}
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {entry.url && (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-cyan-200 hover:border-cyan-300/30"
                    >
                      <LinkIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{entry.url}</span>
                    </a>
                  )}
                  {entry.username && (
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                      <span className="text-slate-500">Utente: </span>
                      <span className="break-all">{entry.username}</span>
                    </div>
                  )}
                  {entry.secretValue && (
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-righello-pink/20 bg-righello-pink/5 px-3 py-2 text-sm">
                      <span className="min-w-0 break-all font-mono text-slate-100">
                        {showSecret
                          ? entry.secretValue
                          : maskSecret(entry.secretValue)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onReveal(entry.id)}
                        className="h-8 w-8 shrink-0 text-righello-pink hover:bg-righello-pink/10"
                      >
                        {showSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {entry.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="border-0 bg-white/10 text-slate-200"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
