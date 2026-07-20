"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Upload,
  Play,
  FileDown,
  Scissors,
  Crop,
  Loader2,
} from "lucide-react";
import { AdaptivePlayer } from "@/components/video-review/adaptive-player";
import { CollaboratorsField } from "@/components/video-review/collaborators-field";
import { ProjectPicker } from "@/components/video-review/project-picker";
import {
  statusMeta,
  primaryButtonClass,
  insetPanelClass,
} from "@/lib/video-review-ui";
import {
  cleanupPreparedVideoUpload,
  uploadPreparedVideo,
} from "@/lib/video-node-upload-client";

type Marker = { id: string; tSeconds: number; note: string; done: boolean };
type Video = {
  id: string;
  title: string;
  filename: string;
  status: string;
  fps: number | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  version: number;
  plannedPublishDate: string | null;
  projectId: string | null;
  projectInherited: boolean;
  streamUrl: string | null;
  downloadUrl: string | null;
  markers: Marker[];
};

function timecode(sec: number, fps = 25) {
  const frames = Math.round((sec - Math.floor(sec)) * fps) % fps;
  const total = Math.floor(Math.max(0, sec));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor(total / 60) % 60)}:${p(total % 60)}:${p(frames)}`;
}

/**
 * Pannello di dettaglio del singolo video: qui vivono TUTTE le azioni, così le
 * card restano un colpo d'occhio (niente più pulsantiere ripetute).
 */
export function VideoDrawer({
  video: v,
  clientId,
  trancheProjectId,
  onChange,
}: {
  video: Video;
  clientId: string | null;
  trancheProjectId: string | null;
  onChange: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [markers, setMarkers] = useState<Marker[]>(v.markers);
  const [projectId, setProjectId] = useState<string | null>(v.projectId);
  const [progress, setProgress] = useState<number | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState(v.plannedPublishDate || "");
  // Editing
  const [trimMode, setTrimMode] = useState(false);
  const [trimIn, setTrimIn] = useState<number | null>(null);
  const [trimOut, setTrimOut] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const st = statusMeta(v.status);
  const fps = v.fps || 25;

  function seekTo(m: Marker) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = m.tSeconds;
    el.play().catch(() => {});
  }

  async function toggleDone(m: Marker) {
    const done = !m.done;
    setMarkers((ms) => ms.map((x) => (x.id === m.id ? { ...x, done } : x)));
    await fetch(`/api/video-review/markers/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    }).catch(() => {});
  }

  async function patchVideo(body: any) {
    await fetch(`/api/video-review/videos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  async function uploadNewVersion(file: File) {
    setUpErr(null);
    setProgress(0);
    try {
      const prep = await fetch(`/api/video-review/videos/${v.id}/new-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          contentType: file.type || "video/mp4",
        }),
      }).then((r) => r.json());
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
      onChange();
    } catch (e: any) {
      setProgress(null);
      setUpErr(e?.message || "errore");
    }
  }

  /** Editing sul nodo (taglia/9:16) → crea una nuova versione. */
  async function runEdit(
    op: "trim" | "reframe",
    params: Record<string, unknown>,
    tag: string,
  ) {
    setEditErr(null);
    setEditing(tag);
    try {
      const prep = await fetch(`/api/video-review/videos/${v.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, params }),
      }).then((r) => r.json());
      if (!prep?.ok) throw new Error(prep?.error || "preparazione fallita");

      const meta = await fetch(prep.editUrl, { method: "POST" }).then((r) =>
        r.json(),
      );
      if (!meta?.ok) throw new Error(meta?.error || "elaborazione fallita");

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
      setEditing(null);
      setTrimMode(false);
      setTrimIn(null);
      setTrimOut(null);
      onChange();
    } catch (e: any) {
      setEditing(null);
      setEditErr(e?.message || "errore");
    }
  }

  const doneCount = markers.filter((m) => m.done).length;

  return (
    <div className="space-y-5">
      {/* Player */}
      <AdaptivePlayer
        src={v.streamUrl}
        width={v.width}
        height={v.height}
        videoRef={videoRef}
        maxVerticalHeight="min(56vh, 460px)"
      />

      {/* Meta + stato */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <Badge variant="outline" className={st.badge}>
          {st.label}
        </Badge>
        {v.version > 1 && (
          <Badge
            variant="outline"
            className="border-white/10 bg-white/5 text-slate-300"
          >
            v{v.version}
          </Badge>
        )}
        <span className="font-mono">
          {v.filename}
          {v.durationSeconds ? ` · ${Math.round(v.durationSeconds)}s` : ""}
          {v.fps ? ` · ${Math.round(v.fps)}fps` : ""}
          {v.width && v.height ? ` · ${v.width}×${v.height}` : ""}
        </span>
      </div>

      {/* Azioni principali */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="video/*,.mov,.mp4,.mkv,.mxf,.m4v,.webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadNewVersion(f);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          className={primaryButtonClass}
          disabled={progress !== null}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {progress !== null
            ? `Carico ${progress}%`
            : `Carica v${v.version + 1}`}
        </Button>
        {v.downloadUrl && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5"
          >
            <a href={v.downloadUrl}>
              <Download className="mr-2 h-4 w-4" /> Scarica
            </a>
          </Button>
        )}
        {markers.length > 0 && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5"
          >
            <a href={`/api/video-review/videos/${v.id}/edl`}>
              <FileDown className="mr-2 h-4 w-4" /> EDL
            </a>
          </Button>
        )}
      </div>
      {progress !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-righello-pink transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {upErr && <p className="text-sm text-red-400">{upErr}</p>}

      {/* Editing rapido sul nodo (senza DaVinci) → crea una nuova versione */}
      <div className={`${insetPanelClass} space-y-3 p-3`}>
        <p className="text-sm font-medium text-slate-300">Modifica rapida</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5"
            disabled={!!editing}
            onClick={() => runEdit("reframe", { aspect: "9:16" }, "9x16")}
          >
            {editing === "9x16" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crop className="mr-2 h-4 w-4" />
            )}
            Ritaglia 9:16
          </Button>
          <Button
            size="sm"
            variant={trimMode ? "default" : "outline"}
            className={
              trimMode ? primaryButtonClass : "border-white/10 bg-white/5"
            }
            disabled={!!editing}
            onClick={() => setTrimMode((x) => !x)}
          >
            <Scissors className="mr-2 h-4 w-4" /> Taglia
          </Button>
        </div>

        {trimMode && (
          <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-slate-300"
                onClick={() => setTrimIn(videoRef.current?.currentTime ?? 0)}
              >
                Inizio = {trimIn === null ? "qui" : timecode(trimIn, fps)}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-slate-300"
                onClick={() => setTrimOut(videoRef.current?.currentTime ?? 0)}
              >
                Fine = {trimOut === null ? "qui" : timecode(trimOut, fps)}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Metti in pausa sul punto, poi imposta inizio e fine.
            </p>
            <Button
              size="sm"
              className={primaryButtonClass}
              disabled={
                !!editing ||
                trimIn === null ||
                trimOut === null ||
                (trimOut ?? 0) <= (trimIn ?? 0)
              }
              onClick={() =>
                runEdit("trim", { start: trimIn, end: trimOut }, "trim")
              }
            >
              {editing === "trim" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scissors className="mr-2 h-4 w-4" />
              )}
              Applica taglio
            </Button>
          </div>
        )}
        {editErr && <p className="text-sm text-red-400">{editErr}</p>}
        <p className="text-xs text-slate-500">
          Ogni modifica diventa una nuova versione, che il cliente rivede.
        </p>
      </div>

      {/* Note di modifica: clic = vai al punto · spunta = fatto */}
      {markers.length > 0 && (
        <div className={`${insetPanelClass} p-3`}>
          <p className="mb-2 text-sm font-medium text-amber-300">
            Note di modifica
            <span className="ml-2 font-normal text-slate-500">
              {doneCount}/{markers.length} fatte · clic per andare al punto
            </span>
          </p>
          <div className="space-y-1">
            {markers.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded px-1 py-1.5 hover:bg-white/5"
              >
                <Checkbox
                  checked={m.done}
                  onCheckedChange={() => toggleDone(m)}
                  className="mt-0.5 border-white/20 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => seekTo(m)}
                  className="flex flex-1 items-start gap-2 text-left"
                >
                  <span className="shrink-0 font-mono text-xs text-amber-400">
                    {timecode(m.tSeconds, fps)}
                  </span>
                  <span
                    className={`flex-1 text-sm ${m.done ? "text-slate-500 line-through" : "text-slate-200"}`}
                  >
                    {m.note}
                  </span>
                  <Play className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impostazioni del singolo video */}
      <div className={`${insetPanelClass} space-y-4 p-4`}>
        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-300">
            Progetto del video
          </span>
          <ProjectPicker
            clientId={clientId}
            value={projectId}
            inheritedLabel={
              !projectId && trancheProjectId ? "quello della consegna" : null
            }
            onChange={async (p) => {
              setProjectId(p);
              await patchVideo({ projectId: p });
              onChange();
            }}
          />
          {v.projectInherited && !projectId && (
            <p className="text-xs text-slate-500">
              Eredita il progetto della consegna.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-300">
            Data pubblicazione prevista
          </span>
          <input
            type="date"
            value={plannedDate}
            onChange={(e) => {
              setPlannedDate(e.target.value);
              patchVideo({ plannedPublishDate: e.target.value || null });
            }}
            className="h-9 rounded-lg border border-white/10 bg-[#172235] px-3 text-sm text-slate-100 outline-none focus-visible:border-righello-pink/70"
          />
        </div>

        <CollaboratorsField
          scope="video"
          scopeId={v.id}
          label="Delegati di questo video"
        />
      </div>
    </div>
  );
}
