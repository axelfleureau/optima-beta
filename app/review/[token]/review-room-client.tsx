"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { derivePostType, groupIntoPosts } from "@/lib/video-review-posts";
import { AdaptivePlayer } from "@/components/video-review/adaptive-player";

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
  hlsUrl: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  slideIndex: number | null;
  postGroupId: string | null;
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

/**
 * Il tipo si deriva dai media effettivi, non da tranche.post_type: quel campo
 * viene sovrascritto a ogni upload ed è inaffidabile.
 */
function postLabel(media: ReviewMedia[]) {
  const type = derivePostType(
    media.map((item) => ({
      id: item.id,
      mediaType: item.mediaType,
      slideIndex: item.slideIndex,
    })),
  );
  if (type === "carousel") return `Carosello · ${media.length} slide`;
  if (type === "image") return "Post immagine";
  return "Video / Reel";
}

/** L'HLS/lo swipe-carousel non devono animare se il cliente ha ridotto le
 * animazioni di sistema: rispettiamo prefers-reduced-motion su tutta la UI. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function SocialPostReview({
  token,
  clientName,
  trancheTitle,
  media,
  postIndex,
  postCount,
}: {
  token: string;
  clientName: string | null;
  trancheTitle: string;
  media: ReviewMedia[];
  postIndex: number;
  postCount: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"idle" | "revising">("idle");
  const [markers, setMarkers] = useState<Marker[]>(
    media.flatMap((item) =>
      (item.markers || []).map((marker) => ({
        ...marker,
        mediaId: item.id,
      })),
    ),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(media.map((item) => [item.id, item.status])),
  );

  const sorted = useMemo(
    () =>
      [...media].sort(
        (a, b) =>
          (a.slideIndex || 9999) - (b.slideIndex || 9999) ||
          a.title.localeCompare(b.title),
      ),
    [media],
  );
  const current = sorted[Math.min(index, Math.max(0, sorted.length - 1))];
  const isVideo = current?.mediaType === "video";
  const canSwipe = sorted.length > 1;

  const scrollToIndex = useCallback(
    (target: number, behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth") => {
      const clamped = Math.max(0, Math.min(sorted.length - 1, target));
      const el = trackRef.current;
      if (el) {
        el.scrollTo({ left: clamped * el.clientWidth, behavior });
      }
      setIndex(clamped);
    },
    [reducedMotion, sorted.length],
  );

  // Sincronizza l'indice mentre l'utente fa swipe nativo (scroll-snap), non
  // solo quando clicca frecce/puntini: cosi' gli indicatori restano coerenti
  // durante il gesto e non solo a fine animazione.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !canSwipe) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const width = el.clientWidth || 1;
        const next = Math.round(el.scrollLeft / width);
        setIndex((prev) => (prev === next ? prev : next));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [canSwipe]);

  function onTrackKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollToIndex(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollToIndex(index - 1);
    }
  }

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
      body: JSON.stringify({ mediaIds: sorted.map((item) => item.id) }),
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
        mediaIds: sorted.map((item) => item.id),
        markers: markers.map((marker) => {
          const target = sorted.find((item) => item.id === marker.mediaId);
          return {
            mediaId: marker.mediaId,
            slideIndex: target?.slideIndex || null,
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
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 text-neutral-400">
        Nessun contenuto disponibile.
      </div>
    );
  }

  const statusAnnouncement = busy
    ? "Invio in corso…"
    : msg
      ? msg.text
      : "";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d6487e] to-[#06b6d4] text-xs font-bold text-white">
          {initials(clientName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-100">
            {clientName || "Righello"}
          </p>
          <p className="truncate text-xs text-neutral-500">{trancheTitle}</p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        {postCount > 1 && (
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Post {postIndex + 1} di {postCount}
          </span>
        )}
        <span className="rounded-full border border-[#d6487e]/30 bg-[#d6487e]/15 px-3 py-1 text-xs font-semibold text-[#ff8ab6]">
          {postLabel(sorted)}
        </span>
        {current.plannedPublishDate && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
            Pubblicazione {fmtDate(current.plannedPublishDate)}
          </span>
        )}
      </div>

      {canSwipe ? (
        <div
          className="relative mt-3 w-full overflow-hidden bg-black"
          style={{ height: "min(68vh, 620px)" }}
        >
          <div
            ref={trackRef}
            className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            tabIndex={0}
            role="group"
            aria-roledescription="carosello"
            aria-label={`${postLabel(sorted)}. Usa le frecce sinistra e destra per cambiare slide.`}
            onKeyDown={onTrackKeyDown}
          >
            {sorted.map((slide, i) => {
              const alt = `${clientName || "Righello"} — slide ${i + 1} di ${sorted.length}: ${slide.title}`;
              const isCurrentVideoSlide = i === index && slide.mediaType === "video";
              return (
                <div
                  key={slide.id}
                  className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center [backface-visibility:hidden] [transform:translateZ(0)]"
                  aria-hidden={i !== index}
                >
                  {isCurrentVideoSlide ? (
                    <AdaptivePlayer
                      src={slide.streamUrl}
                      hlsSrc={slide.hlsUrl}
                      poster={slide.thumbUrl}
                      width={slide.width}
                      height={slide.height}
                      videoRef={videoRef}
                      maxVerticalHeight="min(68vh, 620px)"
                      className="w-full !rounded-none bg-black"
                    />
                  ) : slide.mediaType === "video" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.thumbUrl || undefined}
                      alt={alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : slide.imageUrl || slide.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.imageUrl || slide.thumbUrl || ""}
                      alt={alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                      Immagine non disponibile
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {index + 1} / {sorted.length}
          </span>

          <button
            type="button"
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            aria-label="Slide precedente"
            className="righello-focus absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white backdrop-blur transition disabled:pointer-events-none disabled:opacity-0"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(index + 1)}
            disabled={index >= sorted.length - 1}
            aria-label="Slide successiva"
            className="righello-focus absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white backdrop-blur transition disabled:pointer-events-none disabled:opacity-0"
          >
            ›
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
            {sorted.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Vai alla slide ${i + 1} di ${sorted.length}`}
                aria-current={i === index}
                onClick={() => scrollToIndex(i)}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 bg-black">
          {current.mediaType === "video" ? (
            <AdaptivePlayer
              src={current.streamUrl}
              hlsSrc={current.hlsUrl}
              poster={current.thumbUrl}
              width={current.width}
              height={current.height}
              videoRef={videoRef}
              maxVerticalHeight="min(70vh, 560px)"
              className="mx-auto"
            />
          ) : current.imageUrl || current.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.imageUrl || current.thumbUrl || ""}
              alt={`${clientName || "Righello"} — ${current.title}`}
              loading="eager"
              className="mx-auto max-h-[72vh] max-w-full object-contain"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center text-sm text-neutral-500">
              Immagine non disponibile
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 px-4 py-5">
        <p className="text-sm leading-6 text-neutral-200">
          <strong>{clientName || "Righello"}</strong> {current.title}
        </p>

        {mode === "idle" ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={approvePost}
                disabled={busy}
                className="righello-focus min-h-11 flex-1 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950 hover:brightness-110 disabled:opacity-50"
              >
                Approva post
              </button>
              <button
                onClick={() => {
                  setMode("revising");
                  setMsg(null);
                }}
                disabled={busy}
                className="righello-focus min-h-11 flex-1 rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Richiedi modifiche
              </button>
            </div>
            <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm">
              {statusAnnouncement && (
                <span className={msg?.ok === false ? "text-red-400" : "text-emerald-400"}>
                  {statusAnnouncement}
                </span>
              )}
            </p>
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
                className="righello-focus min-h-11 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#d6487e]"
              />
              <button
                onClick={addNote}
                disabled={!note.trim()}
                className="righello-focus min-h-11 rounded-xl bg-[#d6487e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
                        onClick={() => scrollToIndex(Math.max(0, mediaIndex))}
                        className="righello-focus min-h-11 shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs text-amber-300"
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
                        className="righello-focus min-h-11 px-2 text-neutral-500 hover:text-red-400"
                      >
                        Rimuovi
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={sendRevision}
                  disabled={busy || !markers.length}
                  className="righello-focus min-h-11 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-amber-950 hover:brightness-110 disabled:opacity-50"
                >
                  Invia revisione
                </button>
                <button
                  onClick={() => setMode("idle")}
                  className="righello-focus min-h-11 px-2 text-sm text-neutral-400 hover:text-white"
                >
                  Indietro
                </button>
              </div>
              <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm">
                {statusAnnouncement && (
                  <span className={msg?.ok === false ? "text-red-400" : "text-emerald-400"}>
                    {statusAnnouncement}
                  </span>
                )}
              </p>
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-center text-neutral-400">
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

  const posts = groupIntoPosts(data.videos);

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100"
      style={{
        backgroundImage:
          "radial-gradient(1100px 560px at 50% -12%, rgba(214,72,126,0.14) 0%, rgba(6,182,212,0.05) 30%, transparent 60%)",
      }}
    >
      <div className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/80 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-[#d6487e] to-[#06b6d4]" />
          <span className="font-bold">Post Review</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/righello-logo-white.png"
            alt="Righello"
            className="ml-auto h-5 w-auto opacity-90"
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="truncate text-sm font-semibold uppercase tracking-wider text-[#d6487e]">
          {data.tranche.clientName || ""}
        </p>
        <h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
          {data.tranche.title}
        </h1>
        <p className="mt-3 text-sm text-neutral-400 sm:text-base">
          Controlla il contenuto social, poi approva il post oppure lascia note
          di modifica sulla slide o sul punto del video.
        </p>

        <div className="mt-8 space-y-6">
          {posts.map((post, i, arr) => (
            <SocialPostReview
              key={post.groupId}
              token={token}
              clientName={data.tranche.clientName}
              trancheTitle={data.tranche.title}
              media={post.slides}
              postIndex={i}
              postCount={arr.length}
            />
          ))}
        </div>

        <p className="mt-12 pb-[env(safe-area-inset-bottom)] text-center text-xs text-neutral-600">
          Righello - Post Review
        </p>
      </div>
    </div>
  );
}
