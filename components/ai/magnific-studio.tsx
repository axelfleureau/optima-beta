"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ImageIcon, Loader2, Sparkles, Video, Wand2 } from "lucide-react"

type MediaMode = "image" | "video"

type MagnificTask = {
  task_id: string
  status: string
  generated?: string[]
}

type GenerationState = {
  kind: MediaMode
  task: MagnificTask
  error?: string
}

const imageAspectRatios = ["16:9", "1:1", "9:16", "4:5", "3:2", "21:9"]
const videoAspectRatios = [
  { value: "widescreen_16_9", label: "16:9" },
  { value: "social_story_9_16", label: "9:16" },
]

function statusClass(status: string) {
  if (status === "COMPLETED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
  if (status === "FAILED") return "border-red-500/30 bg-red-500/10 text-red-200"
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
}

export function MagnificStudio() {
  const [mode, setMode] = useState<MediaMode>("image")
  const [prompt, setPrompt] = useState("")
  const [imageAspectRatio, setImageAspectRatio] = useState("16:9")
  const [resolution, setResolution] = useState("2K")
  const [videoAspectRatio, setVideoAspectRatio] = useState("widescreen_16_9")
  const [duration, setDuration] = useState("5")
  const [sourceImage, setSourceImage] = useState("")
  const [generateAudio, setGenerateAudio] = useState(false)
  const [generation, setGeneration] = useState<GenerationState | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (mode === "image") return prompt.trim().length >= 2
    return prompt.trim().length >= 2 || sourceImage.trim().length > 0
  }, [loading, mode, prompt, sourceImage])

  useEffect(() => {
    if (!generation?.task.task_id) return
    if (generation.task.status === "COMPLETED" || generation.task.status === "FAILED") return

    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          kind: generation.kind,
          taskId: generation.task.task_id,
        })
        const response = await fetch(`/api/ai/magnific/status?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || "Errore stato Magnific")
        }
        setGeneration({ kind: generation.kind, task: payload.data })
      } catch (error) {
        setGeneration((current) =>
          current
            ? {
                ...current,
                error: error instanceof Error ? error.message : "Errore stato Magnific",
              }
            : current,
        )
      }
    }, 4500)

    return () => window.clearTimeout(timeout)
  }, [generation])

  const submitGeneration = async () => {
    if (!canSubmit) return

    setLoading(true)
    setGeneration(null)

    try {
      const endpoint = mode === "image" ? "/api/ai/magnific/image" : "/api/ai/magnific/video"
      const body =
        mode === "image"
          ? {
              prompt,
              aspectRatio: imageAspectRatio,
              resolution,
            }
          : {
              prompt,
              image: sourceImage.trim() || undefined,
              aspectRatio: videoAspectRatio,
              duration,
              generateAudio,
            }

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Errore generazione Magnific")
      }

      setGeneration({ kind: mode, task: payload.data })
    } catch (error) {
      setGeneration({
        kind: mode,
        task: { task_id: "", status: "FAILED", generated: [] },
        error: error instanceof Error ? error.message : "Errore generazione Magnific",
      })
    } finally {
      setLoading(false)
    }
  }

  const generated = generation?.task.generated || []
  const isVideo = generation?.kind === "video"

  return (
    <Card className="overflow-hidden border-white/10 bg-[#070a12] text-white shadow-2xl">
      <CardHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(219,39,119,0.24),transparent_34%),linear-gradient(135deg,rgba(8,13,24,0.96),rgba(4,7,13,0.96))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
              Magnific Media Studio
            </Badge>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Wand2 className="h-6 w-6 text-pink-400" />
              Generazione immagini e video
            </CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Crea visual premium per post, moodboard, campagne e concept. Le generazioni partono in background e
              Óptima aggiorna lo stato finche Magnific completa il task.
            </p>
          </div>
          <Tabs value={mode} onValueChange={(value) => setMode(value as MediaMode)} className="w-full lg:w-auto">
            <TabsList className="grid w-full grid-cols-2 rounded-lg border border-white/10 bg-black/40 p-1 lg:w-[260px]">
              <TabsTrigger value="image" className="rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white">
                <ImageIcon className="mr-2 h-4 w-4" />
                Immagine
              </TabsTrigger>
              <TabsTrigger value="video" className="rounded-md data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                <Video className="mr-2 h-4 w-4" />
                Video
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 p-4 md:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Descrivi scena, stile, luce, composizione, formato e obiettivo creativo..."
              className="min-h-[132px] resize-none border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus-visible:ring-pink-500"
            />
          </div>

          {mode === "video" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Immagine sorgente opzionale</label>
              <Input
                value={sourceImage}
                onChange={(event) => setSourceImage(event.target.value)}
                placeholder="https://.../reference.jpg"
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {mode === "image" ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Formato</label>
                  <Select value={imageAspectRatio} onValueChange={setImageAspectRatio}>
                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageAspectRatios.map((ratio) => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Qualità</label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["1K", "2K", "4K"].map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Formato</label>
                  <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {videoAspectRatios.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Durata</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 sec</SelectItem>
                      <SelectItem value="10">10 sec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex min-h-10 items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-200 sm:mt-6">
                  <input
                    type="checkbox"
                    checked={generateAudio}
                    onChange={(event) => setGenerateAudio(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black accent-cyan-500"
                  />
                  Audio
                </label>
              </>
            )}

            <Button
              onClick={submitGeneration}
              disabled={!canSubmit}
              className="h-10 rounded-md bg-pink-500 text-white hover:bg-pink-400 disabled:opacity-50 sm:mt-6"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Genera
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Output</p>
              <p className="text-xs text-slate-400">Task asincrono Magnific</p>
            </div>
            {generation?.task.status && (
              <Badge className={cn("rounded-md border", statusClass(generation.task.status))}>
                {generation.task.status}
              </Badge>
            )}
          </div>

          {!generation && (
            <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-white/10 bg-black/20 text-center text-sm text-slate-400">
              L'anteprima comparira qui appena avvii una generazione.
            </div>
          )}

          {generation?.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
              {generation.error}
            </div>
          )}

          {generation && !generation.error && generated.length === 0 && (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-white/10 bg-black/20 text-center text-sm text-slate-300">
              <Loader2 className="mb-3 h-6 w-6 animate-spin text-cyan-300" />
              <span>Task {generation.task.task_id}</span>
              <span className="mt-1 text-xs text-slate-500">Aggiornamento automatico in corso...</span>
            </div>
          )}

          {generated.length > 0 && (
            <div className="grid gap-3">
              {generated.map((url) =>
                isVideo ? (
                  <video key={url} src={url} controls className="max-h-[360px] w-full rounded-md border border-white/10 bg-black" />
                ) : (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-white/10">
                    <img src={url} alt="Output Magnific" className="max-h-[360px] w-full object-cover" />
                  </a>
                ),
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
