"use client";

import { useEffect } from "react";

/**
 * Aggancia una sorgente HLS a un <video>, con ritorno automatico all'MP4.
 *
 * Tre casi, in ordine:
 *  1. Safari/iOS riproduce HLS nativamente → basta impostare src.
 *  2. Chrome/Firefox → hls.js, caricato solo qui (import dinamico: ~400KB che
 *     non devono pesare su chi non guarda video).
 *  3. Niente HLS pronto, o errore irrecuperabile → si usa l'MP4 progressivo.
 *
 * Il principio: l'HLS è un miglioramento, non una dipendenza. Se salta, il
 * video si guarda comunque.
 */
export function useHlsVideo(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  hlsUrl: string | null | undefined,
  fallbackUrl: string | null | undefined,
) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const useFallback = () => {
      if (fallbackUrl && el.src !== fallbackUrl) el.src = fallbackUrl;
    };

    if (!hlsUrl) {
      useFallback();
      return;
    }

    // Safari e iOS: HLS nativo, nessuna libreria.
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = hlsUrl;
      const onError = () => useFallback();
      el.addEventListener("error", onError);
      return () => el.removeEventListener("error", onError);
    }

    let destroyed = false;
    let instance: { destroy: () => void } | null = null;

    void (async () => {
      try {
        const { default: Hls } = await import("hls.js");
        if (destroyed || !videoRef.current) return;
        if (!Hls.isSupported()) {
          useFallback();
          return;
        }
        const hls = new Hls({ enableWorker: true });
        instance = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          // Solo gli errori fatali fanno decadere all'MP4: gli altri li
          // recupera hls.js da solo (buffer stall, segmento perso...).
          if (data?.fatal) {
            hls.destroy();
            instance = null;
            useFallback();
          }
        });
      } catch {
        useFallback();
      }
    })();

    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, [videoRef, hlsUrl, fallbackUrl]);
}
