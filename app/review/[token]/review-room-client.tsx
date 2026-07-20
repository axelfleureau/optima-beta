"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";

type Marker = {
  id: string;
  mediaId?: string;
  tSeconds: number;
  note: string;
};
type ReviewMedia = {
  id: string;
  title: string;
  status: string;
  mediaType: "video" | "image";
  fps: number;
  width: number | null;
  height: number | null;
  plannedPublishDate: string | null;
  streamUrl: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  slideIndex: number | null;
  markers: Marker[];
};
type ReviewData = {
  tranche: {
    title: string;
    clientName: string | null;
    postType: "video" | "image" | "carousel";
  };
  videos: ReviewMedia[];
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
    : d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

function initials(name: string | null) {
  return String(name || "R")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function postLabel(data: ReviewData) {
  if (data.tranche.postType === "carousel") {
    return `Carosello ${data.videos.length} slide`;
  }
  if (data.tranche.postType === "image") return "Post immagine";
  return "Video/Reel";
}

function SocialPostReview({
  token,
  data,
}: {
  token: string;
  data: ReviewData;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"idle" | "revising">("idle");
  const [markers, setMarkers] = useState<Marker[]>(
    data.videos.flatMap((media) =>
      (media.markers || []).map((marker) => ({
        ...marker,
        mediaId: media.id,
      })),
    ),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(data.videos.map((media) => [media.id, media.status])),
  );

  const sorted = useMemo(
    () =>
      [...data.videos].sort(
        (a, b) =>
          (a.slideIndex || 9999) - (b.slideIndex || 9999) ||
          a.title.localeCompare(b.title),
      ),
    [data.videos],
  );
  const current = sorted[Math.min(index, Math.max(0, sorted.length - 1))];
  const isVideo = current?.mediaType === "video";
  const aggregateStatus = sorted.every(
    (media) => statuses[media.id] === "approved",
  )
    ? "approved"
    : sorted.some((media) => statuses[media.id] === "revision")
      ? "revision"
      : "pending";
  const statusLabel =
    aggregateStatus === "approved"
      ? "Approvato"
      : aggregateStatus === "revision"
        ? "Revisione inviata"
        : "Da revisionare";
  const statusClass =
    aggregateStatus === "approved"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
      : aggregateStatus === "revision"
        ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
        : "border-white/10 bg-white/10 text-neutral-200";

  function addNote() {
    if (!current || !note.trim()) return;
    const tSeconds = isVideo ? (videoRef.current?.currentTime ?? 0) : 0;
    videoRef.current?.pause();
    setMarkers((items) => [
      ...items,
      {
        id: `tmp-${Date.now()}`,
        mediaId: current.id,
        tSeconds,
        note: note.trim(),
      },
    ]);
    setNote("");
  }

  async function approvePost() {
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/video-review/review/${token}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((response) => response.json())
      .catch(() => ({ ok: false }));
    setBusy(false);
    if (r?.ok) {
      setStatuses(
        Object.fromEntries(sorted.map((media) => [media.id, "approved"])),
      );
      setMode("idle");
      setMsg({ ok: true, text: "Post approvato." });
    } else {
      setMsg({ ok: false, text: r?.error || "Errore, riprova." });
    }
  }

  async function sendRevision() {
    if (!markers.length) {
      setMsg({ ok: false, text: "Aggiungi almeno una nota di modifica." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/video-review/review/${token}/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markers: markers.map((marker) => {
          const media = sorted.find((item) => item.id === marker.mediaId);
          return {
            mediaId: marker.mediaId,
            slideIndex: media?.slideIndex || null,
            tSeconds: marker.tSeconds,
            note: marker.note,
          };
        }),
      }),
    })
      .then((response) => response.json())
      .catch(() => ({ ok: false }));
    setBusy(false);
    if (r?.ok) {
      setStatuses(
        Object.fromEntries(sorted.map((media) => [media.id, "revision"])),
      );
      setMode("idle");
      setMsg({
        ok: true,
        text: `Revisione inviata (${markers.length} note).`,
      });
    } else {
      setMsg({ ok: false, text: r?.error || "Errore, riprova." });
    }
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-8 text-neutral-400">
        Nessun contenuto disponibile.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-neutral-900/70 shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d6487e] to-[#06b6d4] text-sm font-bold text-white">
          {initials(data.tranche.clientName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-100">
            {data.tranche.clientName || "Righello"}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {data.tranche.title}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="bg-black">
        {isVideo ? (
          <video
            ref={videoRef}
            controls
            preload="metadata"
            playsInline
            src={current.streamUrl || ""}
            className="mx-auto max-h-[72vh] max-w-full bg-black"
            style={
              current.width && current.height
                ? { aspectRatio: `${current.width} / ${current.height}` }
                : { aspectRatio: "16 / 9", width: "100%" }
            }
          />
        ) : current.imageUrl || current.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.imageUrl || current.thumbUrl || ""}
            alt={current.title}
            className="mx-auto max-h-[72vh] max-w-full object-contain"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-sm text-neutral-500">
            Immagine non disponibile
          </div>
        )}
      </div>

      {sorted.length > 1 && (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-200 disabled:opacity-40"
          >
            Precedente
          </button>
          <div className="flex items-center gap-2">
            {sorted.map((media, i) => (
              <button
                key={media.id}
                type="button"
                aria-label={`Vai alla slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-[#d6487e]" : "w-2.5 bg-white/25"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setIndex((value) => Math.min(sorted.length - 1, value + 1))
            }
            disabled={index >= sorted.length - 1}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-200 disabled:opacity-40"
          >
            Successiva
          </button>
        </div>
      )}

      <div className="space-y-4 px-4 py-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#d6487e]/30 bg-[#d6487e]/15 px-3 py-1 text-xs font-semibold text-[#ff8ab6]">
              {postLabel(data)}
            </span>
            {current.plannedPublishDate && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
                Pubblicazione {fmtDate(current.plannedPublishDate)}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-200">
            <strong>{data.tranche.clientName || "Righello"}</strong>{" "}
            {current.title}
          </p>
        </div>

        {mode === "idle" ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={approvePost}
              disabled={busy}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950 hover:brightness-110 disabled:opacity-50"
            >
              Approva post
            </button>
            <button
              onClick={() => {
                setMode("revising");
                setMsg(null);
              }}
              disabled={busy}
              className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-amber-950 hover:brightness-110 disabled:opacity-50"
            >
              Richiedi modifiche
            </button>
            {msg && (
              <span
                className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}
              >
                {msg.text}
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-semibold text-neutral-100">
              Nota per{" "}
              {isVideo
                ? `timecode ${timecode(videoRef.current?.currentTime || 0, current.fps)}`
                : `slide ${index + 1}`}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addNote()}
                placeholder={
                  isVideo
                    ? "Cosa modificare in questo punto?"
                    : "Cosa modificare in questa slide?"
                }
                className="min-h-11 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#d6487e]"
              />
              <button
                onClick={addNote}
                disabled={!note.trim()}
                className="rounded-xl bg-[#d6487e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Aggiungi nota
              </button>
            </div>

            {markers.length > 0 && (
              <div className="mt-4 space-y-2">
                {markers.map((marker) => {
                  const mediaIndex = sorted.findIndex(
                    (media) => media.id === marker.mediaId,
                  );
                  const media = sorted[mediaIndex];
                  return (
                    <div
                      key={marker.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => setIndex(Math.max(0, mediaIndex))}
                        className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs text-amber-300"
                      >
                        {media?.mediaType === "image"
                          ? `Slide ${mediaIndex + 1}`
                          : timecode(marker.tSeconds, media?.fps || 25)}
                      </button>
                      <span className="flex-1 text-sm">{marker.note}</span>
                      <button
                        onClick={() =>
                          setMarkers((items) =>
                            items.filter((item) => item.id !== marker.id),
                          )
                        }
                        className="text-neutral-500 hover:text-red-400"
                      >
                        Rimuovi
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={sendRevision}
                disabled={busy || !markers.length}
                className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-amber-950 hover:brightness-110 disabled:opacity-50"
              >
                Invia revisione
              </button>
              <button
                onClick={() => setMode("idle")}
                className="text-sm text-neutral-400 hover:text-white"
              >
                Indietro
              </button>
              {msg && (
                <span
                  className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}
                >
                  {msg.text}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewRoomClient({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<ReviewData | null>(null);
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
        Carico...
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
          <span className="font-bold">Post Review</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/righello-logo-white.png"
            alt="Righello"
            className="ml-auto h-5 w-auto opacity-90"
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#d6487e]">
          {data.tranche.clientName || ""}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{data.tranche.title}</h1>
        <p className="mt-3 text-neutral-400">
          Controlla il contenuto social, poi approva il post oppure lascia note
          di modifica sulla slide o sul punto del video.
        </p>

        <div className="mt-8">
          <SocialPostReview token={token} data={data} />
        </div>

        <p className="mt-12 text-center text-xs text-neutral-600">
          Righello - Post Review
        </p>
      </div>
    </div>
  );
}
