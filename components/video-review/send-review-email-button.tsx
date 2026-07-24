"use client";

import { useState } from "react";
import { Check, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Manda al cliente la mail preimpostata col link di approvazione (v2 inclusa:
 * il link mostra sempre l'ultima versione). Conferma anche all'operatore.
 * Se il cliente non ha email in scheda, la chiede al volo.
 */
export function SendReviewEmailButton({ trancheId }: { trancheId: string }) {
  const [sending, setSending] = useState(false);
  const [askEmail, setAskEmail] = useState(false);
  const [manual, setManual] = useState("");
  const [done, setDone] = useState<{ to: string; confirm: string | null } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function send(to?: string) {
    setSending(true);
    setError(null);
    const data = await fetch(
      `/api/video-review/tranches/${trancheId}/send-review-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(to ? { to } : {}),
      },
    )
      .then((r) => r.json())
      .catch(() => null);
    setSending(false);
    if (!data?.ok) {
      if (data?.needsEmail) setAskEmail(true);
      setError(data?.error || "Invio non riuscito.");
      return;
    }
    setDone({ to: data.sentTo, confirm: data.confirmationTo });
    setAskEmail(false);
    setManual("");
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        <Check className="h-4 w-4" />
        <span>
          Inviata a <strong>{done.to}</strong>
          {done.confirm ? ` · conferma a ${done.confirm}` : ""}
        </span>
      </div>
    );
  }

  if (askEmail) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Input
            type="email"
            autoFocus
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && manual && send(manual)}
            placeholder="email@cliente.it"
            className="h-9 w-56 border-white/10 bg-[#0b1424] text-slate-100"
          />
          <Button
            onClick={() => send(manual)}
            disabled={sending || !manual}
            className="h-9 bg-righello-pink text-white hover:bg-righello-pink/90"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Invio..." : "Invia"}
          </Button>
        </div>
        {error && <p className="text-xs text-amber-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        onClick={() => send()}
        disabled={sending}
        className="border-white/10 bg-white/5 text-slate-200 hover:border-righello-pink/40"
      >
        <Mail className="mr-2 h-4 w-4" />
        {sending ? "Invio..." : "Invia al cliente"}
      </Button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
