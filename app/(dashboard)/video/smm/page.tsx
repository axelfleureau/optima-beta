"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Check } from "lucide-react";
import { AdaptivePlayer } from "@/components/video-review/adaptive-player";

type Video = {
  id: string;
  title: string;
  clientName: string | null;
  trancheTitle: string;
  plannedPublishDate: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  description: string;
  published: boolean;
  isMine: boolean;
  streamUrl: string | null;
  downloadUrl: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntil(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function SmmCard({ video, onChange }: { video: Video; onChange: () => void }) {
  const [description, setDescription] = useState(video.description);
  const [published, setPublished] = useState(video.published);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function patch(body: any) {
    setSaving(true);
    await fetch(`/api/video-review/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const d = daysUntil(video.plannedPublishDate);
  const hint =
    d === null ? null : d < 0 ? { t: `scaduta da ${-d}g`, c: "text-red-400" } : d === 0 ? { t: "oggi", c: "text-amber-400" } : d <= 3 ? { t: `tra ${d}g`, c: "text-amber-400" } : { t: `tra ${d}g`, c: "text-muted-foreground" };

  return (
    <Card className={published ? "opacity-70" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{video.title}</CardTitle>
            <CardDescription>
              {video.clientName || "—"} · {video.trancheTitle}
              {video.durationSeconds ? ` · ${Math.round(video.durationSeconds)}s` : ""}
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            {video.isMine && <Badge variant="outline">Tu</Badge>}
            <Badge className={published ? "bg-sky-500/15 text-sky-400" : "bg-emerald-500/15 text-emerald-400"}>
              {published ? "Pubblicato" : "Approvato"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AdaptivePlayer src={video.streamUrl} width={video.width} height={video.height} maxVerticalHeight="min(60vh, 460px)" />
        <p className="text-sm">
          {video.plannedPublishDate ? (
            <>
              📅 {fmtDate(video.plannedPublishDate)} {hint && <span className={hint.c}>· {hint.t}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Nessuna data prevista</span>
          )}
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">Descrizione / caption</label>
          <Textarea
            placeholder="Scrivi qui la descrizione del post…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => patch({ description })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {video.downloadUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={video.downloadUrl}>
                <Download className="mr-2 h-4 w-4" /> Scarica video
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant={published ? "outline" : "default"}
            disabled={saving}
            onClick={async () => {
              const next = !published;
              await patch({ published: next });
              setPublished(next);
              onChange();
            }}
          >
            {published ? "Segna come non pubblicato" : <><Check className="mr-2 h-4 w-4" /> Segna come pubblicato</>}
          </Button>
          {saved && <span className="self-center text-sm text-emerald-400">Salvato ✓</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SmmPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/video-review/approved")
      .then((r) => r.json())
      .then((r) => {
        if (r?.ok) setVideos(r.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }
  useEffect(load, []);

  const toPublish = videos.filter((v) => !v.published);
  const done = videos.filter((v) => v.published);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/video" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Video Review
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Da pubblicare</h1>
        <p className="text-muted-foreground">
          Video approvati dai clienti: scrivi la descrizione, scarica e segna come pubblicato.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carico…</p>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun video approvato al momento.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {toPublish.map((v) => (
              <SmmCard key={v.id} video={v} onChange={load} />
            ))}
          </div>
          {done.length > 0 && (
            <>
              <h2 className="pt-4 text-xl font-semibold">Pubblicati</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {done.map((v) => (
                  <SmmCard key={v.id} video={v} onChange={load} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
