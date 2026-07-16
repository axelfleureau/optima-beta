"use client";

import { useCallback, useState } from "react";
import { CalendarPlus, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CalendarSyncButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<{ url: string; webcalUrl: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetch("/api/editorial-feed/link", { cache: "no-store" })
      .then((response) => response.json())
      .catch(() => null);
    setLoading(false);
    if (!data?.ok) {
      setError(data?.error || "Impossibile generare il link del feed.");
      return;
    }
    setFeed({ url: data.url, webcalUrl: data.webcalUrl });
  }, []);

  function openDialog() {
    setOpen(true);
    if (!feed && !loading) void load();
  }

  async function copyUrl() {
    if (!feed) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={openDialog}
        className="h-9 border-white/10 bg-[#0b1424] text-slate-200 hover:border-cyan-400/40 hover:bg-white/5"
      >
        <CalendarPlus className="mr-2 h-4 w-4" />
        Collega calendario
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-[#111b2d] text-slate-100">
          <DialogHeader>
            <DialogTitle>Collega a Google o Apple Calendar</DialogTitle>
            <DialogDescription className="text-slate-400">
              Calendario condiviso in sola lettura: i post programmati compaiono
              nel tuo calendario e si aggiornano da soli.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Link di sottoscrizione
              </span>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={loading ? "Genero il link..." : feed?.url || ""}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-10 flex-1 rounded-md border border-white/10 bg-[#0b1424] px-3 text-xs text-slate-300 focus:outline-none"
                />
                <Button
                  onClick={copyUrl}
                  disabled={!feed}
                  className="h-10 bg-righello-pink text-white hover:bg-righello-pink/90"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {error && <p className="text-xs text-red-300">{error}</p>}
            </div>

            {feed && (
              <a
                href={feed.webcalUrl}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                <ExternalLink className="h-4 w-4" />
                Aggiungi ad Apple Calendar (webcal)
              </a>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-[#0b1424] p-3">
                <p className="mb-1 text-sm font-bold text-white">
                  Google Calendar
                </p>
                <p className="text-xs leading-5 text-slate-400">
                  Altri calendari → <span className="text-slate-200">Da URL</span>{" "}
                  → incolla il link → Aggiungi. Google aggiorna gli abbonamenti
                  ogni diverse ore.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0b1424] p-3">
                <p className="mb-1 text-sm font-bold text-white">
                  Apple Calendar
                </p>
                <p className="text-xs leading-5 text-slate-400">
                  File →{" "}
                  <span className="text-slate-200">
                    Nuovo abbonamento calendario
                  </span>{" "}
                  → incolla il link. L'aggiornamento è configurabile (anche ogni
                  ora).
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Chiunque abbia il link può vedere il calendario (sola lettura).
              Condividilo solo con chi di dovere.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
