/**
 * Raggruppa i media di una consegna in POST e ne deriva il tipo.
 *
 * Un post è ciò che il cliente vede e approva come unità:
 *   - 1 video            -> "video"
 *   - 1 immagine         -> "image"
 *   - N immagini insieme -> "carousel" (le slide restano righe separate, così
 *                            si possono commentare singolarmente)
 *
 * Il tipo è DERIVATO dal gruppo, non salvato: non può andare fuori sincrono.
 */

export type PostType = "video" | "image" | "carousel";

export type PostMedia = {
  id: string;
  mediaType: "video" | "image";
  slideIndex: number | null;
  postGroupId?: string | null;
};

export type MediaPost<T extends PostMedia> = {
  groupId: string;
  type: PostType;
  /** Slide ordinate: per video/immagine singola è un solo elemento. */
  slides: T[];
  cover: T;
  slideCount: number;
};

export function derivePostType(slides: PostMedia[]): PostType {
  if (slides.some((slide) => slide.mediaType === "video")) return "video";
  return slides.length > 1 ? "carousel" : "image";
}

/** Raggruppa preservando l'ordine di arrivo dei gruppi. */
export function groupIntoPosts<T extends PostMedia>(media: T[]): MediaPost<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of media) {
    const key = item.postGroupId || item.id;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  return Array.from(groups.entries()).map(([groupId, slides]) => {
    const ordered = [...slides].sort(
      (a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0),
    );
    return {
      groupId,
      type: derivePostType(ordered),
      slides: ordered,
      cover: ordered[0],
      slideCount: ordered.length,
    };
  });
}

export const POST_TYPE_META: Record<
  PostType,
  { label: string; badge: string; accent: string }
> = {
  video: {
    label: "Video",
    badge: "border-violet-400/30 bg-violet-500/15 text-violet-200",
    accent: "text-violet-300",
  },
  image: {
    label: "Immagine",
    badge: "border-sky-400/30 bg-sky-500/15 text-sky-200",
    accent: "text-sky-300",
  },
  carousel: {
    label: "Carosello",
    badge: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    accent: "text-amber-300",
  },
};
