"use client";

import { useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cleanupPreparedVideoUpload,
  uploadPreparedVideo,
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
  const [error, setError] = useState<string | null>(null);

  function classify(files: File[]) {
    const hasImage = files.some((file) => file.type.startsWith("image/"));
    const hasVideo = files.some((file) => file.type.startsWith("video/"));
    if (hasImage && hasVideo) {
      return {
        ok: false as const,
        error:
          "Caricamento misto non supportato: seleziona solo immagini oppure un solo video.",
      };
    }
    if (hasVideo && files.length !== 1) {
      return {
        ok: false as const,
        error: "Carica un solo video alla volta.",
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
      for (let index = 0; index < uploads.length; index += 1) {
        const prepared = uploads[index];
        const file = files[index];
        const meta = await uploadPreparedVideo({
          prepared,
          file,
          onProgress: (value) => {
            const total = uploads.length;
            setProgress(Math.round(((index + value / 100) / total) * 100));
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
      }
      setProgress(null);
      onUploaded();
    } catch (e: any) {
      setProgress(null);
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
        {progress !== null ? `Carico... ${progress}%` : "Carica contenuto"}
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
