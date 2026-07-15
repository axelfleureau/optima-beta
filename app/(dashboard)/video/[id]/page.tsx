"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { ArrowLeft, Copy, Check, Download, Play } from "lucide-react";
import { AdaptivePlayer } from "@/components/video-review/adaptive-player";

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
  clientName: string | null;
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

  useEffect(() => {
    fetch(`/api/video-review/tranches/${id}`)
      .then((r) => r.json())
      .then((r) => {
        if (r?.ok) {
          setTranche(r.tranche);
          setVideos(r.videos || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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
    <div className="space-y-6 p-4 sm:p-6">
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
        <Button variant="outline" onClick={copyLink} className="shrink-0">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copiato" : "Link review cliente"}
        </Button>
      </div>

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
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Scheda video: player + note cliccabili che portano il cursore sul punto. */
function VideoCard({ video: v }: { video: Video }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const st = STATUS[v.status] || STATUS.pending;

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
          <Badge className={`${st.cls} hover:${st.cls} shrink-0`}>{st.label}</Badge>
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

        <div className="flex flex-wrap gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
