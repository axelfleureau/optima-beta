"use client";

import { cn } from "@/lib/utils";

/**
 * Player che rispetta il formato REALE del video (16:9, 9:16 verticale,
 * quadrato…), usando width/height letti da ffprobe all'ingest.
 * - orizzontale: larghezza piena, aspect corretto
 * - verticale:   altezza limitata e video centrato (niente reel schiacciato)
 * - sconosciuto: fallback 16:9
 */
export function AdaptivePlayer({
  src,
  width,
  height,
  className,
  maxVerticalHeight = "min(70vh, 560px)",
}: {
  src: string | null;
  width?: number | null;
  height?: number | null;
  className?: string;
  maxVerticalHeight?: string;
}) {
  const known = Boolean(width && height);
  const isVertical = known ? (height as number) > (width as number) : false;
  const ratio = known ? `${width} / ${height}` : "16 / 9";

  if (!src) {
    return (
      <div
        className={cn("flex w-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground", className)}
        style={{ aspectRatio: "16 / 9" }}
      >
        Video non disponibile
      </div>
    );
  }

  return (
    <div className={cn("flex w-full justify-center overflow-hidden rounded-md bg-black", className)}>
      <video
        controls
        preload="metadata"
        playsInline
        src={src}
        className="max-w-full bg-black"
        style={
          isVertical
            ? { aspectRatio: ratio, height: maxVerticalHeight, width: "auto" }
            : { aspectRatio: ratio, width: "100%" }
        }
      />
    </div>
  );
}
