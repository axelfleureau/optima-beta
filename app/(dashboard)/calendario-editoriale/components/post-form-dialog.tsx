"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { CalendarIcon, ChevronDown, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import type {
  EditorialPost,
  EditorialPostStatus,
  EditorialPostFormat,
  SocialPlatform,
  PostObjective,
} from "@/lib/types"
import {
  EditorialPostStatus as PostStatusEnum,
  EditorialPostFormat as PostFormatEnum,
  SocialPlatform as PlatformEnum,
  PostObjective as ObjectiveEnum,
} from "@/lib/types"
import { Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import {
  generateCaption,
  canGenerateCaption,
  getMissingFieldsSuggestion,
  type CaptionGenerationData,
} from "@/lib/ai-caption-service"
import { statusConfig } from "../utils/status-config"

interface EditorialPostFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: Partial<EditorialPost>) => Promise<void>
  post: EditorialPost | null
  clients: { value: string; label: string }[]
  selectedClientId: string | null
  userRole?: string
}

export function EditorialPostFormDialog({
  isOpen,
  onClose,
  onSubmit,
  post,
  clients,
  selectedClientId,
  userRole,
}: EditorialPostFormDialogProps) {
  const { user, userData } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [status, setStatus] = useState<EditorialPostStatus>(PostStatusEnum.IDEA)
  const [platform, setPlatform] = useState<SocialPlatform[]>([])
  const [formatVal, setFormatVal] = useState<EditorialPostFormat>(PostFormatEnum.POST_SINGOLO)
  const [objective, setObjective] = useState<PostObjective | undefined>(undefined)
  const [keywords, setKeywords] = useState<string>("")
  const [targetAudience, setTargetAudience] = useState("")
  const [caption, setCaption] = useState("")
  const [notes, setNotes] = useState("")
  const [visualUrl, setVisualUrl] = useState("")
  const [currentClientId, setCurrentClientId] = useState<string | undefined>(undefined)
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false)

  useEffect(() => {
    if (post) {
      setName(post.name)
      setDate(post.date.toDate())
      setStatus(post.status)
      setPlatform(post.platform)
      setFormatVal(post.format)
      setObjective(post.objective)
      setKeywords(post.keywords?.join(", ") || "")
      setTargetAudience(post.targetAudience || "")
      setCaption(post.caption || "")
      setNotes(post.notes || "")
      setVisualUrl(post.visuals && post.visuals.length > 0 ? post.visuals[0].url : "")
      setCurrentClientId(post.clientId)
    } else {
      setName("")
      setDate(new Date())
      setStatus(PostStatusEnum.IDEA)
      setPlatform([PlatformEnum.INSTAGRAM])
      setFormatVal(PostFormatEnum.POST_SINGOLO)
      setObjective(undefined)
      setKeywords("")
      setTargetAudience("")
      setCaption("")
      setNotes("")
      setVisualUrl("")
      setCurrentClientId(selectedClientId || undefined)
    }
  }, [post, isOpen, selectedClientId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const values: Partial<EditorialPost> = {
      name,
      date: date ? Timestamp.fromDate(date) : Timestamp.now(),
      status,
      platform,
      format: formatVal,
      objective,
      keywords: keywords
        ? keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
        : undefined,
      targetAudience: targetAudience || undefined,
      caption,
      notes,
      visuals: visualUrl ? [{ url: visualUrl, type: "image" }] : [],
      clientId: currentClientId,
    }
    onSubmit(values)
  }

  const handleGenerateCaption = async () => {
    const userId = user?.uid || userData?.uid

    if (!userId) {
      console.error("Authentication check failed:", { user, userData })
      toast({
        title: "Errore di autenticazione",
        description: "Effettua nuovamente il login per utilizzare l'AI.",
        variant: "destructive",
      })
      return
    }

    const captionData: CaptionGenerationData = {
      name,
      platform,
      format: formatVal,
      objective,
      keywords: keywords
        ? keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
        : undefined,
      targetAudience: targetAudience || undefined,
      clientName: clients.find((c) => c.value === currentClientId)?.label,
      date,
    }

    if (!canGenerateCaption(captionData)) {
      const missingFields = getMissingFieldsSuggestion(captionData)
      toast({
        title: "Campi mancanti",
        description: `Compila questi campi per generare la caption: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setIsGeneratingCaption(true)
    try {
      console.log("Generating caption with userId:", userId)
      const generatedCaption = await generateCaption(captionData, userId)
      setCaption(generatedCaption)
      toast({
        title: "Caption generata!",
        description: "La caption è stata generata con successo. Puoi modificarla prima di salvare.",
      })
    } catch (error) {
      console.error("Error generating caption:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile generare la caption. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingCaption(false)
    }
  }

  const captionData: CaptionGenerationData = {
    name,
    platform,
    format: formatVal,
    objective,
    keywords: keywords
      ? keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
      : undefined,
    targetAudience: targetAudience || undefined,
    clientName: clients.find((c) => c.value === currentClientId)?.label,
    date,
  }

  const canGenerate = canGenerateCaption(captionData)
  const missingFields = getMissingFieldsSuggestion(captionData)

  const platformOptions = Object.values(PlatformEnum)
  const formatOptions = Object.values(PostFormatEnum)
  const statusOptions = Object.values(PostStatusEnum)
  const objectiveOptions = Object.values(ObjectiveEnum)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
        <DialogHeader className="space-y-3 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {post ? "Modifica Post" : "Nuovo Post Editoriale"}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {post
              ? "Aggiorna i dettagli di questo contenuto."
              : "Crea un nuovo contenuto per il calendario editoriale."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {userRole !== "client" && (
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Cliente *
              </Label>
              <Select
                value={currentClientId}
                onValueChange={setCurrentClientId}
                disabled={!!post?.clientId || userRole === "client"}
              >
                <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Seleziona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nome Post *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                placeholder="Es. Lancio nuovo prodotto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Data Pubblicazione
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: it }) : <span>Scegli una data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={it} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Stato
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EditorialPostStatus)}>
                <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => {
                    const statusInfo = statusConfig[s]
                    return (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <statusInfo.icon className="w-4 h-4" />
                          {statusInfo.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Formato *
              </Label>
              <Select value={formatVal} onValueChange={(v) => setFormatVal(v as EditorialPostFormat)}>
                <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Piattaforme *</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                >
                  {platform.length > 0 ? platform.join(", ") : "Seleziona piattaforme"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {platformOptions.map((p) => (
                  <DropdownMenuCheckboxItem
                    key={p}
                    checked={platform.includes(p)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPlatform([...platform, p])
                      } else {
                        setPlatform(platform.filter((pl) => pl !== p))
                      }
                    }}
                  >
                    {p}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="objective" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Obiettivo
              </Label>
              <Select
                value={objective ?? "none"}
                onValueChange={(v) => setObjective(v === "none" ? undefined : (v as PostObjective))}
              >
                <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Seleziona obiettivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun obiettivo</SelectItem>
                  {objectiveOptions.map((obj) => (
                    <SelectItem key={obj} value={obj}>
                      {obj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Parole Chiave
              </Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                placeholder="marketing, social media, brand (separate da virgola)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Target Audience
            </Label>
            <Input
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              placeholder="Es. Giovani professionisti 25-35 anni interessati al marketing"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="caption" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Caption / Descrizione
              </Label>
              <div className="flex items-center gap-2">
                {!canGenerate && missingFields.length > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                    Mancano: {missingFields.join(", ")}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCaption}
                  disabled={!canGenerate || isGeneratingCaption}
                  className={`${
                    canGenerate
                      ? "border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
                      : "border-slate-300 text-slate-400 cursor-not-allowed"
                  } transition-all duration-200`}
                >
                  {isGeneratingCaption ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Genera Caption AI
                    </>
                  )}
                </Button>
              </div>
            </div>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-none"
              placeholder="Scrivi la caption del post o usa l'AI per generarla automaticamente..."
            />
            {caption && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Caratteri: {caption.length}</span>
                <span>Parole: {caption.split(/\s+/).filter((word) => word.length > 0).length}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Note Interne
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-none"
              placeholder="Note per il team, feedback, modifiche richieste..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visual" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              URL Visual
            </Label>
            <Input
              id="visual"
              value={visualUrl}
              onChange={(e) => setVisualUrl(e.target.value)}
              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              placeholder="https://esempio.com/immagine.jpg"
            />
          </div>

          <DialogFooter className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex gap-3 w-full sm:w-auto">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none border-slate-200 dark:border-slate-700"
                >
                  Annulla
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="flex-1 sm:flex-none bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-500 text-white font-semibold shadow-lg hover:shadow-pink-500/25 transition-all duration-200"
              >
                {post ? "Aggiorna Post" : "Crea Post"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
