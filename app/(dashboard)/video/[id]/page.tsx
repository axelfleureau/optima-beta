"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Download, Play, Upload } from "lucide-react";
import { AdaptivePlayer } from "@/components/video-review/adaptive-player";
import { CollaboratorsField } from "@/components/video-review/collaborators-field";
import { ProjectPicker } from "@/components/video-review/project-picker";
import { pageClass, surfaceClass } from "@/lib/video-review-ui";

type Marker = { id: string; tSeconds: number; note: string };
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
  streamUrl: string | null;
  downloadUrl: string | null;
  markers: Marker[];
};
type Tranche = {
  id: string;
  title: string;
  token: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
};

function timecode(sec: number, fps = 25) {
  const f = Math.max(0, sec);
  const frames = Math.round((f - Math.floor(f)) * fps) % fps;
  const total = Math.floor(f);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor(total / 60) % 60)}:${p(total % 60)}:${p(frames)}`;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "In attesa", cls: "bg-slate-500/15 text-slate-400" },
  revision: { label: "Da revisionare", cls: "bg-amber-500/15 text-amber-500" },
  approved: { label: "Approvato", cls: "bg-emerald-500/15 text-emerald-500" },
};

export default function TranchePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tranche, setTranche] = useState<Tranche | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetch(`/api/video-review/tranches/${id}`)
      .then((r) => r.json())
      .then((r) => {
        if (r?.ok) {
          setTranche(r.tranche);
          setProjectId(r.tranche?.projectId ?? null);
          setVideos(r.videos || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyLink() {
    if (!tranche) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/review/${tranche.token}`);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <div className="p-6 text-muted-foreground">Carico…</div>;
  if (!tranche) return <div className="p-6 text-muted-foreground">Tranche non trovata.</div>;

  return (
    <div className={`${pageClass} space-y-6 p-4 sm:p-6`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/video"
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Video Review
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{tranche.title}</h1>
          <p className="text-muted-foreground">{tranche.clientName || "Senza cliente"}</p>
        </div>
        <Button variant="outline" onClick={copyLink} className="shrink-0 border-white/10 bg-white/5">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copiato" : "Link review cliente"}
        </Button>
      </div>

      {/* Chi lavora a questa consegna + progetto di default dei suoi video */}
      <Card className={surfaceClass}>
        <CardContent className="grid gap-6 p-4 md:grid-cols-2">
          <CollaboratorsField scope="tranche" scopeId={tranche.id} label="Collaboratori della consegna" />
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Progetto di default</span>
            <ProjectPicker
              clientId={tranche.clientId}
              value={projectId}
              onChange={async (p) => {
                setProjectId(p);
                await fetch(`/api/video-review/tranches/${tranche.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId: p }),
                }).catch(() => {});
              }}
            />
            <p className="text-xs text-slate-500">
              I video lo ereditano, ma ognuno può stare su un progetto diverso.
            </p>
          </div>
        </CardContent>
      </Card>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun video. Il videomaker esporta in{" "}
            <code className="text-xs">da-revisionare/{tranche.clientName}/{tranche.title}/</code> sul
            NAS e i video compaiono qui da soli.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Scheda video: player, note cliccabili, upload della versione corretta. */
function VideoCard({ video: v, onChange }: { video: Video; onChange: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);
  const st = STATUS[v.status] || STATUS.pending;

  /**
   * Carica il montato corretto come NUOVA VERSIONE.
   * I byte vanno dal browser DIRETTAMENTE al nodo (il Worker di Cloudflare ha
   * limiti di dimensione: un video non ci passerebbe).
   */
  async function uploadNewVersion(file: File) {
    setUpErr(null);
    setProgress(0);
    try {
      // 1. Optima prepara la versione e firma la destinazione.
      const prep = await fetch(`/api/video-review/videos/${v.id}/new-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      }).then((r) => r.json());
      if (!prep?.ok) throw new Error(prep?.error || "preparazione fallita");

      // 2. Byte diretti al nodo (con progresso).
      const meta = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", prep.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.upload.onprogress = (e) =>
          e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          try {
            const j = JSON.parse(xhr.responseText);
            j?.ok ? resolve(j) : reject(new Error(j?.error || "upload fallito"));
          } catch {
            reject(new Error(`upload fallito (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("errore di rete verso il nodo"));
        xhr.send(file);
      });

      // 3. Conferma: la nuova versione entra in attesa di review.
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

  /** Porta il video esattamente sul timecode della nota e lo mostra. */
  function seekTo(m: Marker) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = m.tSeconds;
    el.play().catch(() => {
      /* se l'autoplay è bloccato resta comunque sul frame giusto */
    });
    setActive(m.id);
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{v.title}</CardTitle>
            <CardDescription className="truncate font-mono text-xs">
              {v.filename}
              {v.durationSeconds ? ` · ${Math.round(v.durationSeconds)}s` : ""}
              {v.fps ? ` · ${Math.round(v.fps)}fps` : ""}
              {v.width && v.height ? ` · ${v.width}×${v.height}` : ""}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(v.version || 1) > 1 && <Badge variant="outline">v{v.version}</Badge>}
            <Badge className={`${st.cls} hover:${st.cls}`}>{st.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AdaptivePlayer src={v.streamUrl} width={v.width} height={v.height} videoRef={videoRef} />

        {v.markers.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium text-amber-500">
              {v.markers.length} {v.markers.length === 1 ? "nota di modifica" : "note di modifica"}
              <span className="ml-2 font-normal text-muted-foreground">— clicca per andare al punto</span>
            </p>
            <div className="space-y-1">
              {v.markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => seekTo(m)}
                  className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-amber-500/10 ${
                    active === m.id ? "bg-amber-500/15" : ""
                  }`}
                >
                  <span className="shrink-0 font-mono text-xs text-amber-500">
                    {timecode(m.tSeconds, v.fps || 25)}
                  </span>
                  <span className="flex-1">{m.note}</span>
                  <Play className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {v.downloadUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={v.downloadUrl}>
                <Download className="mr-2 h-4 w-4" /> Scarica
              </a>
            </Button>
          )}
          {v.markers.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/video-review/videos/${v.id}/edl`}>⬇ EDL (DaVinci)</a>
            </Button>
          )}

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
            variant="default"
            disabled={progress !== null}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {progress !== null ? `Carico ${progress}%` : `Carica v${(v.version || 1) + 1}`}
          </Button>

          {progress !== null && (
            <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-righello-pink transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {upErr && <span className="text-sm text-red-400">{upErr}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
