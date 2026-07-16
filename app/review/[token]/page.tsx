"use client";

import { use, useEffect, useRef, useState } from "react";

type Marker = { id: string; tSeconds: number; note: string };
type Video = {
  id: string;
  title: string;
  status: string;
  fps: number;
  width: number | null;
  height: number | null;
  plannedPublishDate: string | null;
  streamUrl: string | null;
  markers: Marker[];
};

function timecode(sec: number, fps = 25) {
  const frames = Math.round((sec - Math.floor(sec)) * fps) % fps;
  const total = Math.floor(Math.max(0, sec));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor(total / 60) % 60)}:${p(total % 60)}:${p(frames)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function ReviewVideo({ token, video }: { token: string; video: Video }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState(video.status);
  const [mode, setMode] = useState<"idle" | "revising">("idle");
  const [markers, setMarkers] = useState<Marker[]>(video.markers || []);
  const [pendingT, setPendingT] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function captureHere() {
    const t = ref.current?.currentTime ?? 0;
    ref.current?.pause();
    setPendingT(t);
  }

  function addMarker() {
    if (pendingT === null || !note.trim()) return;
    setMarkers((ms) =>
      [...ms, { id: `tmp-${Date.now()}`, tSeconds: pendingT, note: note.trim() }].sort(
        (a, b) => a.tSeconds - b.tSeconds,
      ),
    );
    setNote("");
    setPendingT(null);
  }

  async function approve() {
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/video-review/review/${token}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id }),
    })
      .then((r) => r.json())
      .catch(() => ({ ok: false }));
    setBusy(false);
    if (r?.ok) {
      setStatus("approved");
      setMsg({ ok: true, text: "Approvato ✓" });
    } else setMsg({ ok: false, text: "Errore, riprova" });
  }

  async function sendRevision() {
    if (!markers.length) {
      setMsg({ ok: false, text: "Aggiungi almeno una nota." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/video-review/review/${token}/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: video.id,
        markers: markers.map((m) => ({ tSeconds: m.tSeconds, note: m.note })),
      }),
    })
      .then((r) => r.json())
      .catch(() => ({ ok: false }));
    setBusy(false);
    if (r?.ok) {
      setStatus("revision");
      setMode("idle");
      setMsg({ ok: true, text: `Revisione inviata (${markers.length} note) ✓` });
    } else setMsg({ ok: false, text: "Errore, riprova" });
  }

  const label =
    status === "approved" ? "Approvato" : status === "revision" ? "Revisione inviata" : "Da revisionare";
  const labelCls =
    status === "approved"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "revision"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-white/10 text-neutral-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{video.title}</h3>
          {video.plannedPublishDate && (
            <p className="text-sm text-neutral-400">
              📅 Pubblicazione prevista: {fmtDate(video.plannedPublishDate)}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${labelCls}`}>{label}</span>
      </div>

      {/* Player col formato reale: i reel 9:16 restano verticali, non schiacciati. */}
      {video.streamUrl ? (
        <div className="flex w-full justify-center overflow-hidden rounded-xl bg-black">
          <video
            ref={ref}
            controls
            preload="metadata"
            playsInline
            src={video.streamUrl}
            className="max-w-full bg-black"
            style={
              video.width && video.height && video.height > video.width
                ? { aspectRatio: `${video.width} / ${video.height}`, height: "min(70vh, 560px)", width: "auto" }
                : { aspectRatio: video.width && video.height ? `${video.width} / ${video.height}` : "16 / 9", width: "100%" }
            }
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black/60 text-sm text-neutral-500">
          Video non disponibile
        </div>
      )}

      {mode === "idle" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={approve}
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-emerald-950 hover:brightness-110 disabled:opacity-50"
          >
            ✓ Approva
          </button>
          <button
            onClick={() => {
              setMode("revising");
              setMsg(null);
            }}
            disabled={busy}
            className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-amber-950 hover:brightness-110 disabled:opacity-50"
          >
            ✎ Richiedi revisione
          </button>
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>
          )}
        </div>
      ) : (
        <div className="mt-4 border-t border-white/10 pt-4">
          {pendingT === null ? (
            <button
              onClick={captureHere}
              className="rounded-lg bg-[#d6487e] px-4 py-2 font-semibold text-white hover:brightness-110"
            >
              + Aggiungi nota al punto attuale
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-amber-500/15 px-2 py-1 font-mono text-xs text-amber-400">
                {timecode(pendingT, video.fps)}
              </span>
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMarker()}
                placeholder="Cosa modificare in questo punto…"
                className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#d6487e]"
              />
              <button onClick={addMarker} disabled={!note.trim()} className="rounded-lg bg-[#d6487e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Aggiungi
              </button>
              <button onClick={() => { setPendingT(null); setNote(""); }} className="rounded-lg px-3 py-2 text-sm text-neutral-400 hover:text-white">
                Annulla
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Metti in pausa sul punto da modificare e aggiungi una nota. Puoi aggiungerne quante vuoi.
          </p>

          {markers.length > 0 && (
            <div className="mt-3 space-y-2">
              {markers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                  <button
                    onClick={() => {
                      if (ref.current) {
                        ref.current.currentTime = m.tSeconds;
                        ref.current.play().catch(() => {});
                      }
                    }}
                    className="shrink-0 font-mono text-xs text-amber-400 hover:underline"
                  >
                    {timecode(m.tSeconds, video.fps)}
                  </button>
                  <span className="flex-1 text-sm">{m.note}</span>
                  <button
                    onClick={() => setMarkers((ms) => ms.filter((x) => x.id !== m.id))}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={sendRevision}
              disabled={busy || !markers.length}
              className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-amber-950 hover:brightness-110 disabled:opacity-50"
            >
              Invia {markers.length} {markers.length === 1 ? "nota" : "note"} al videomaker
            </button>
            <button onClick={() => setMode("idle")} className="text-sm text-neutral-400 hover:text-white">
              Indietro
            </button>
            {msg && (
              <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ tranche: any; videos: Video[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/video-review/review/${token}`)
      .then((r) => r.json())
      .then((r) => (r?.ok ? setData(r) : setError(true)))
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Link non valido o scaduto.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Carico…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-neutral-950 text-neutral-100"
      style={{
        backgroundImage:
          "radial-gradient(1100px 560px at 50% -12%, rgba(214,72,126,0.14) 0%, rgba(6,182,212,0.05) 30%, transparent 60%)",
      }}
    >
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#d6487e] to-[#06b6d4]" />
          <span className="font-bold">Review video</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/righello-logo-white.png"
            alt="Righello"
            className="ml-auto h-5 w-auto opacity-90"
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#d6487e]">
          {data.tranche.clientName || ""}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{data.tranche.title}</h1>
        <p className="mt-3 text-neutral-400">
          {data.videos.length} video da revisionare. Per ognuno puoi <strong>approvare</strong> oppure{" "}
          <strong>richiedere modifiche</strong> mettendo note nei punti precisi del video.
        </p>

        <div className="mt-8 space-y-6">
          {data.videos.map((v) => (
            <ReviewVideo key={v.id} token={token} video={v} />
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-neutral-600">Righello · Video Review</p>
      </div>
    </div>
  );
}
