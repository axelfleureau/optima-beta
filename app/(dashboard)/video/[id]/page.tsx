"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Copy, Check, Clapperboard, Play, MessageSquare, Users } from "lucide-react";
import { CollaboratorsField } from "@/components/video-review/collaborators-field";
import { ProjectPicker } from "@/components/video-review/project-picker";
import { VrPageHeader } from "@/components/video-review/page-chrome";
import { VideoDrawer } from "@/components/video-review/video-drawer";
import {
  pageClass,
  containerClass,
  stackClass,
  surfaceClass,
  interactiveSurfaceClass,
  statusMeta,
  COLLAB_ROLE_META,
  initials,
} from "@/lib/video-review-ui";

type Marker = { id: string; tSeconds: number; note: string; done: boolean };
type Collab = { id: string; memberId: string; name: string; role: string };
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
  description: string | null;
  published: boolean;
  projectId: string | null;
  projectName: string | null;
  projectInherited: boolean;
  streamUrl: string | null;
  downloadUrl: string | null;
  thumbUrl: string | null;
  collaborators: Collab[];
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

export default function TranchePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tranche, setTranche] = useState<Tranche | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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

  if (loading) return <div className={`${pageClass} p-6 text-slate-400`}>Carico…</div>;
  if (!tranche)
    return (
      <div className={`${pageClass} p-6 text-slate-400`}>
        Consegna non trovata, o non sei tra i collaboratori.
      </div>
    );

  const openVideo = videos.find((v) => v.id === openId) || null;

  return (
    <div className={pageClass}>
      <div className={containerClass}>
        <div className={stackClass}>
          <VrPageHeader
            icon={Clapperboard}
            title={tranche.title}
            subtitle={tranche.clientName || "Senza cliente"}
            back={
              <Link
                href="/video"
                className="mb-3 inline-flex items-center text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Video Review
              </Link>
            }
            actions={
              <Button variant="outline" onClick={copyLink} className="border-white/10 bg-white/5">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copiato" : "Link review cliente"}
              </Button>
            }
          />

          {/* Collaboratori della consegna + progetto di default */}
          <Card className={surfaceClass}>
            <CardContent className="grid gap-6 p-5 md:grid-cols-2">
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
                    load();
                  }}
                />
                <p className="text-xs text-slate-500">
                  I video lo ereditano, ma ognuno può stare su un progetto diverso.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Video: card COMPATTE; le azioni vivono nel drawer */}
          {videos.length === 0 ? (
            <div className={`${surfaceClass} p-12 text-center text-slate-400`}>
              Nessun video. Il videomaker esporta in{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-300">
                da-revisionare/{tranche.clientName}/{tranche.title}/
              </code>{" "}
              sul NAS e i video compaiono qui da soli.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((v) => (
                <VideoCardCompact key={v.id} video={v} onOpen={() => setOpenId(v.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer: player, note, azioni, progetto e delegati del singolo video */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-white/10 bg-[#0b1220] text-slate-100 sm:max-w-xl"
        >
          {openVideo && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-slate-100">{openVideo.title}</SheetTitle>
              </SheetHeader>
              <VideoDrawer
                video={openVideo}
                clientId={tranche.clientId}
                trancheProjectId={tranche.projectId}
                onChange={load}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Card compatta: colpo d'occhio. Tutte le azioni sono nel drawer. */
function VideoCardCompact({ video: v, onOpen }: { video: Video; onOpen: () => void }) {
  const st = statusMeta(v.status);
  const openNotes = v.markers.filter((m) => !m.done).length;
  const isVertical = !!(v.width && v.height && v.height > v.width);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${interactiveSurfaceClass} group flex w-full flex-col overflow-hidden text-left`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {v.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.thumbUrl}
            alt=""
            className={isVertical ? "mx-auto h-full w-auto" : "h-full w-full object-cover"}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <Clapperboard className="h-8 w-8" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-black/30">
          <Play className="h-9 w-9 text-white opacity-0 transition-opacity group-hover:opacity-90" />
        </span>
        <span className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[11px] ${st.badge}`}>
          {st.label}
        </span>
        {v.version > 1 && (
          <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[11px] text-slate-200">
            v{v.version}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-sm font-semibold text-slate-100">{v.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {v.projectName && (
            <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-slate-300">
              {v.projectName}
            </Badge>
          )}
          {openNotes > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <MessageSquare className="h-3 w-3" /> {openNotes}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1">
            {v.collaborators.length > 0 ? (
              <span className="flex -space-x-1.5">
                {v.collaborators.slice(0, 3).map((c) => (
                  <Avatar
                    key={c.id}
                    className="h-5 w-5 border border-[#121b2b]"
                    title={`${c.name} · ${COLLAB_ROLE_META[c.role]?.label || c.role}`}
                  >
                    <AvatarFallback className="bg-white/10 text-[8px] text-slate-200">
                      {initials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </span>
            ) : (
              <Users className="h-3 w-3 text-slate-600" />
            )}
          </span>
        </div>
      </div>
    </button>
  );
}
