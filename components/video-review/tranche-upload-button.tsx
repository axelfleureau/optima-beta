"use client";

import { useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cleanupPreparedVideoUpload,
  uploadPreparedVideo,
  uploadVideoPoster,
} from "@/lib/video-node-upload-client";

/**
 * Carica un contenuto NUOVO nella consegna: video, immagine singola o
 * carosello immagini. Video piccoli possono andare al nodo; immagini e file
 * grandi passano da R2 multipart.
 */
export function TrancheUploadButton({
  trancheId,
  onUploaded,
  primary = false,
}: {
  trancheId: string;
  onUploaded: () => void;
  primary?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fatti, setFatti] = useState(0);
  const [totale, setTotale] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /** Quanti file salgono davvero insieme. Oltre non si guadagna: la banda è
   *  quella, e il nodo deve restare reattivo per chi sta guardando i video. */
  const CONCURRENZA = 3;

  function classify(files: File[]) {
    const hasImage = files.some((file) => file.type.startsWith("image/"));
    const hasVideo = files.some((file) => file.type.startsWith("video/"));
    if (hasImage && hasVideo) {
      return {
        ok: false as const,
        error:
          "Seleziona solo immagini (diventano un carosello) oppure solo video (uno per post).",
      };
    }
    return { ok: true as const };
  }

  async function upload(files: File[]) {
    const classification = classify(files);
    if (!classification.ok) {
      setError(classification.error);
      return;
    }
    setError(null);
    setProgress(0);
    setFatti(0);
    setTotale(files.length);
    try {
      const prep = await fetch(
        `/api/video-review/tranches/${trancheId}/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: files.map((file) => ({
              filename: file.name,
              fileSize: file.size,
              contentType: file.type || "application/octet-stream",
            })),
          }),
        },
      ).then((r) => r.json());
      if (!prep?.ok) throw new Error(prep?.error || "preparazione fallita");

      const uploads = Array.isArray(prep.uploads) ? prep.uploads : [prep];

      // Progresso aggregato: ogni file contribuisce per la sua quota, così la
      // barra non salta all'indietro quando i file finiscono in ordine sparso.
      const pct = new Array(uploads.length).fill(0);
      const refresh = () => {
        const sum = pct.reduce((a, b) => a + b, 0);
        setProgress(Math.round(sum / uploads.length));
      };

      const errors: string[] = [];
      let completati = 0;
      let cursore = 0;

      const carica = async (index: number) => {
        const prepared = uploads[index];
        const file = files[index];
        try {
          const meta = await uploadPreparedVideo({
            prepared,
            file,
            onProgress: (value) => {
              pct[index] = value;
              refresh();
            },
          }).catch(async (error) => {
            await cleanupPreparedVideoUpload(prepared);
            throw error;
          });

          await fetch(`/api/video-review/videos/${prepared.videoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              finalize: true,
              fps: meta.fps,
              durationSeconds: meta.durationSeconds,
              width: meta.width,
              height: meta.height,
            }),
          });

          // Poster automatico (frame a metà) per l'anteprima social. Best-effort.
          if (file.type.startsWith("video/")) {
            await uploadVideoPoster(prepared.videoId, file);
          }

          pct[index] = 100;
          completati += 1;
          setFatti(completati);
          refresh();
        } catch (e: any) {
          // Un file che fallisce non deve buttare giù gli altri: si segnala
          // alla fine, gli altri proseguono.
          errors.push(`${file.name}: ${e?.message || "errore"}`);
          pct[index] = 100;
          refresh();
        }
      };

      const worker = async () => {
        while (cursore < uploads.length) {
          const mio = cursore;
          cursore += 1;
          await carica(mio);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENZA, uploads.length) }, worker),
      );

      setProgress(null);
      setFatti(0);
      setTotale(0);
      if (errors.length) {
        setError(
          errors.length === uploads.length
            ? errors[0]
            : `${errors.length} su ${uploads.length} non caricati — ${errors[0]}`,
        );
      }
      onUploaded();
    } catch (e: any) {
      setProgress(null);
      setFatti(0);
      setTotale(0);
      setError(e?.message || "errore");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.mp4,.mov,.m4v,.mkv,.avi,.mxf,.webm,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) void upload(files);
          event.target.value = "";
        }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        variant={primary ? "default" : "outline"}
        className={
          primary
            ? "bg-righello-pink text-white hover:bg-righello-pink/90"
            : "border-white/10 bg-white/5 text-slate-200 hover:border-righello-pink/40"
        }
      >
        {primary ? (
          <ImagePlus className="mr-2 h-4 w-4" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {progress === null
          ? "Carica contenuto"
          : totale > 1
            ? `Carico ${fatti}/${totale} · ${progress}%`
            : `Carico... ${progress}%`}
      </Button>
      {progress !== null && (
        <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-righello-pink transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
