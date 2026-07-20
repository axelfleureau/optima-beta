"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cleanupPreparedVideoUpload,
  uploadPreparedVideo,
} from "@/lib/video-node-upload-client";

/**
 * Carica un video NUOVO nella consegna, dal browser direttamente al nodo
 * (Mac Studio): i byte non passano da Cloudflare. Il file finisce nella stessa
 * cartella che il videomaker userebbe esportando a mano.
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

  async function upload(file: File) {
    setError(null);
    setProgress(0);
    try {
      const prep = await fetch(
        `/api/video-review/tranches/${trancheId}/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            contentType: file.type || "video/mp4",
          }),
        },
      ).then((r) => r.json());
      if (!prep?.ok) throw new Error(prep?.error || "preparazione fallita");

      const meta = await uploadPreparedVideo({
        prepared: prep,
        file,
        onProgress: setProgress,
      }).catch(async (error) => {
        await cleanupPreparedVideoUpload(prep);
        throw error;
      });

      await fetch(`/api/video-review/videos/${prep.videoId}`, {
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
        accept="video/*,.mp4,.mov,.m4v,.mkv,.avi,.mxf,.webm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
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
        <Upload className="mr-2 h-4 w-4" />
        {progress !== null ? `Carico... ${progress}%` : "Carica video"}
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
