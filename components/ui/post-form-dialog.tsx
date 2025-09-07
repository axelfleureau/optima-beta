"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { CaptionGenerationData, generateCaption } from "@/lib/ai-caption-service"
import { aiCaptionService } from "@/lib/ai-caption-service"
import { aiVisualService, type VisualGenerationOptions, type GeneratedVisual } from "@/lib/ai-visual-service"
import {
  Calendar,
  ImageIcon,
  Sparkles,
  Wand2,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Eye,
  Save,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { EditorialPostFormat, SocialPlatform } from "@/lib/types"

interface PostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (post: any) => void
  editingPost?: any
}

export function PostFormDialog({ open, onOpenChange, onSave, editingPost }: PostFormDialogProps) {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()


  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    platform: "instagram",
    type: "post",
    scheduledDate: "",
    scheduledTime: "",
    status: "bozza",
    tags: [] as string[],
    attachments: [] as string[],
  })

  // AI Caption state
  const [captionOptions, setCaptionOptions] = useState<CaptionGenerationData>({
    title: "",
    content:"",
    format: "Post singolo" as EditorialPostFormat,
    platform: "instagram" as SocialPlatform,
    tone: "professionale" as const,
    length: "media" as const,
    includeHashtags: true,
    includeCTA: true,
    targetAudience: "",
  })

  const [generatedCaption, setGeneratedCaption] = useState<GeneratedCaption | null>(null)
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false)

  // AI Visual state
  const [visualOptions, setVisualOptions] = useState<VisualGenerationOptions>({
    description: "",
    style: "professionale" as const,
    mood: "moderno" as const,
    format: "square" as const,
    platform: "instagram" as const,
    isCarousel: false,
    carouselCount: 3,
  })

  const [generatedVisuals, setGeneratedVisuals] = useState<GeneratedVisual[]>([])
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false)

  // Initialize form with editing post
  useEffect(() => {
    if (editingPost) {
      setFormData({
        title: editingPost.title || "",
        content: editingPost.content || "",
        platform: editingPost.platform || "instagram",
        type: editingPost.type || "post",
        scheduledDate: editingPost.scheduledDate || "",
        scheduledTime: editingPost.scheduledTime || "",
        status: editingPost.status || "bozza",
        tags: editingPost.tags || [],
        attachments: editingPost.attachments || [],
      })

      setCaptionOptions((prev) => ({
        ...prev,
        content: editingPost.content || "",
        platform: editingPost.platform || "instagram",
      }))

      setVisualOptions((prev) => ({
        ...prev,
        platform: editingPost.platform || "instagram",
        isCarousel: editingPost.type === "carosello",
      }))
    }
  }, [editingPost])

  // Sync platform across all options
  useEffect(() => {
    setCaptionOptions((prev) => ({ ...prev, platform: formData.platform as any }))
    setVisualOptions((prev) => ({ ...prev, platform: formData.platform as any }))
  }, [formData.platform])

  // Sync content for AI caption
  useEffect(() => {
    setCaptionOptions((prev) => ({ ...prev, content: formData.content }))
  }, [formData.content])

  // helper interni al file (puoi metterli sopra alla funzione)
  const mapTypeToEditorialFormat = (t: string) =>
    (t === "post" ? "post_singolo" : t) as any;

  const toArray = <T,>(v: T | T[] | undefined): T[] =>
    Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];

  // 🔧 SOSTITUISCI QUESTA FUNZIONE NEL TUO FILE
  const handleGenerateCaption = async () => {
    // 1) Validazioni minime
    const name = formData.title?.trim() || editingPost?.title?.trim() || "";
    if (!name) {
      toast({
        title: "Errore",
        description: "Inserisci il Titolo del post (campo 'Titolo' nella tab 'Informazioni Base').",
        variant: "destructive",
      });
      return;
    }
    if (!captionOptions.content?.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci una descrizione del contenuto per generare la caption.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCaption(true);
    try {
      // 2) Normalizzazioni robuste
      const platformNormalized = formData.platform === "twitter" ? "x" : (formData.platform as any);
      const toneNormalized =
        (captionOptions.tone as any) === "ispirazionale" ? ("ispirante" as const) : captionOptions.tone;

      // Se vuoi passare anche la data al service:
      const dateNormalized =
        formData.scheduledDate
          ? new Date(`${formData.scheduledDate}T${formData.scheduledTime || "00:00"}`)
          : undefined;

      const normalized: CaptionGenerationData = {
        title: captionOptions.title ?? "",
        // 👇 array garantito
        platform: toArray(platformNormalized) as any,
        // 👇 mappo il tuo "type" al formato atteso dal service
        format: mapTypeToEditorialFormat(formData.type),
        // opzionali
        keywords: [], // se vuoi, prendi da tags: formData.tags
        targetAudience: captionOptions.targetAudience ?? "",
        clientName: captionOptions.brandVoice ?? "",
        date: dateNormalized,
        tone: toneNormalized ?? "professionale",
        length: captionOptions.length ?? "media",
        includeHashtags: captionOptions.includeHashtags ?? true,
        includeCTA: captionOptions.includeCTA ?? true,
        // objective: puoi mapparlo in futuro se lo usi
      };

      // 3) Call al service (richiede 2 argomenti)
      const res = await generateCaption(normalized, user?.uid || "system");

      // 4) Supporto sia a return stringa sia a oggetto
      const asGenerated =
        typeof res === "string"
          ? ({
            caption: res,
            hashtags: [],
            analysis: { score: 7, suggestions: [], strengths: [], improvements: [] },
          } as any)
          : res;

      setGeneratedCaption(asGenerated);
      toast({
        title: "Caption generata!",
        description: "La tua caption AI è pronta. Puoi modificarla o usarla così com'è.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Errore",
        description: err?.message ?? "Impossibile generare la caption. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleGenerateVisuals = async () => {
    if (!visualOptions.description.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci una descrizione per generare i visual",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingVisuals(true)
    try {
      const results = await aiVisualService.generateVisuals(visualOptions)
      setGeneratedVisuals(results)
      toast({
        title: "Visual generati!",
        description: `${results.length} visual AI sono stati creati per te.`,
      })
    } catch (error) {
      console.error("Error generating visuals:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile generare i visual",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingVisuals(false)
    }
  }

  const handleUseCaption = () => {
    if (generatedCaption) {
      setFormData((prev) => ({
        ...prev,
        content: generatedCaption.caption,
        tags: [...prev.tags, ...generatedCaption.hashtags.filter((tag) => !prev.tags.includes(tag))],
      }))
      toast({
        title: "Caption applicata",
        description: "La caption AI è stata aggiunta al tuo post",
      })
    }
  }

  const handleSavePost = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Errore",
        description: "Titolo e contenuto sono obbligatori",
        variant: "destructive",
      })
      return
    }

    const postData = {
      ...formData,
      id: editingPost?.id || `post_${Date.now()}`,
      createdAt: editingPost?.createdAt || new Date(),
      updatedAt: new Date(),
      aiGenerated: {
        caption: generatedCaption,
        visuals: generatedVisuals,
      },
    }

    onSave(postData)
    onOpenChange(false)

    // Reset form
    setFormData({
      title: "",
      content: "",
      platform: "instagram",
      type: "post",
      scheduledDate: "",
      scheduledTime: "",
      status: "bozza",
      tags: [],
      attachments: [],
    })
    setGeneratedCaption(null)
    setGeneratedVisuals([])
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-100"
    if (score >= 6) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {editingPost ? "Modifica Post" : "Nuovo Post"} con AI Assistant
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Informazioni Base
            </TabsTrigger>
            <TabsTrigger value="ai-caption" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Caption
            </TabsTrigger>
            <TabsTrigger value="ai-visual" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              AI Visual
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-200px)] mt-4">
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titolo *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Inserisci il titolo del post..."
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Piattaforma</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, platform: value }))}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo di Post</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, type: value }))
                      setVisualOptions((prev) => ({ ...prev, isCarousel: value === "carosello" }))
                    }}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post Singolo</SelectItem>
                      <SelectItem value="carosello">Carosello</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="reel">Reel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bozza">Bozza</SelectItem>
                      <SelectItem value="programmato">Programmato</SelectItem>
                      <SelectItem value="pubblicato">Pubblicato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenuto *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Scrivi il contenuto del post..."
                  rows={6}
                  className="bg-white/50 dark:bg-slate-800/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Data Programmazione</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Ora Programmazione</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))}
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-caption" className="space-y-6">
              <Card className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-pink-200 dark:border-pink-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
                    <Sparkles className="w-5 h-5" />
                    Generatore Caption AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tono</Label>
                      <Select
                        value={captionOptions.tone}
                        onValueChange={(value: any) => setCaptionOptions((prev) => ({ ...prev, tone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professionale">Professionale</SelectItem>
                          <SelectItem value="amichevole">Amichevole</SelectItem>
                          <SelectItem value="divertente">Divertente</SelectItem>
                          <SelectItem value="ispirazionale">Ispirazionale</SelectItem>
                          <SelectItem value="informativo">Informativo</SelectItem>
                          <SelectItem value="promozionale">Promozionale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lunghezza</Label>
                      <Select
                        value={captionOptions.length}
                        onValueChange={(value: any) => setCaptionOptions((prev) => ({ ...prev, length: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corta">Corta (50-100 caratteri)</SelectItem>
                          <SelectItem value="media">Media (100-200 caratteri)</SelectItem>
                          <SelectItem value="lunga">Lunga (200+ caratteri)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Input
                        value={captionOptions.targetAudience || ""}
                        onChange={(e) => setCaptionOptions((prev) => ({ ...prev, targetAudience: e.target.value }))}
                        placeholder="es. Giovani professionisti, Mamme, Imprenditori..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand Voice</Label>
                      <Input
                        value={captionOptions.brandVoice || ""}
                        onChange={(e) => setCaptionOptions((prev) => ({ ...prev, brandVoice: e.target.value }))}
                        placeholder="es. Innovativo, Tradizionale, Giovanile..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={captionOptions.includeHashtags}
                          onCheckedChange={(checked) =>
                            setCaptionOptions((prev) => ({ ...prev, includeHashtags: checked }))
                          }
                        />
                        <Label className="text-sm">Includi Hashtag</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={captionOptions.includeCTA}
                          onCheckedChange={(checked) => setCaptionOptions((prev) => ({ ...prev, includeCTA: checked }))}
                        />
                        <Label className="text-sm">Includi Call-to-Action</Label>
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerateCaption}
                      disabled={isGeneratingCaption || !captionOptions.content.trim()}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      {isGeneratingCaption ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Genera Caption AI
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {generatedCaption && (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Caption Generata
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreColor(generatedCaption.analysis.score)} font-semibold`}>
                          <Star className="w-3 h-3 mr-1" />
                          {generatedCaption.analysis.score}/10
                        </Badge>
                        <Button
                          size="sm"
                          onClick={handleUseCaption}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Usa Caption
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <p className="text-sm leading-relaxed">{generatedCaption.caption}</p>
                    </div>

                    {generatedCaption.hashtags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Hashtag Suggeriti</Label>
                        <div className="flex flex-wrap gap-1">
                          {generatedCaption.hashtags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-green-600 mb-2 block">Punti di Forza</Label>
                        <ul className="text-xs space-y-1">
                          {generatedCaption.analysis.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-yellow-600 mb-2 block">Miglioramenti</Label>
                        <ul className="text-xs space-y-1">
                          {generatedCaption.analysis.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-blue-600 mb-2 block">Suggerimenti</Label>
                        <ul className="text-xs space-y-1">
                          {generatedCaption.analysis.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <TrendingUp className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai-visual" className="space-y-6">
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <ImageIcon className="w-5 h-5" />
                    Generatore Visual AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descrizione Visual</Label>
                    <Textarea
                      value={visualOptions.description}
                      onChange={(e) => setVisualOptions((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrivi il visual che vuoi generare..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Stile</Label>
                      <Select
                        value={visualOptions.style}
                        onValueChange={(value: any) => setVisualOptions((prev) => ({ ...prev, style: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fotografico">Fotografico</SelectItem>
                          <SelectItem value="illustrativo">Illustrativo</SelectItem>
                          <SelectItem value="minimalista">Minimalista</SelectItem>
                          <SelectItem value="colorato">Colorato</SelectItem>
                          <SelectItem value="professionale">Professionale</SelectItem>
                          <SelectItem value="creativo">Creativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mood</Label>
                      <Select
                        value={visualOptions.mood}
                        onValueChange={(value: any) => setVisualOptions((prev) => ({ ...prev, mood: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="energico">Energico</SelectItem>
                          <SelectItem value="rilassante">Rilassante</SelectItem>
                          <SelectItem value="professionale">Professionale</SelectItem>
                          <SelectItem value="divertente">Divertente</SelectItem>
                          <SelectItem value="elegante">Elegante</SelectItem>
                          <SelectItem value="moderno">Moderno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Formato</Label>
                      <Select
                        value={visualOptions.format}
                        onValueChange={(value: any) => setVisualOptions((prev) => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Quadrato (1:1)</SelectItem>
                          <SelectItem value="story">Story (9:16)</SelectItem>
                          <SelectItem value="landscape">Orizzontale (16:9)</SelectItem>
                          <SelectItem value="portrait">Verticale (4:5)</SelectItem>
                          <SelectItem value="reel">Reel (9:16)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {visualOptions.isCarousel && (
                    <div className="space-y-2">
                      <Label>Numero di Immagini per Carosello</Label>
                      <Select
                        value={visualOptions.carouselCount?.toString() || "3"}
                        onValueChange={(value) =>
                          setVisualOptions((prev) => ({ ...prev, carouselCount: Number.parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 immagini</SelectItem>
                          <SelectItem value="3">3 immagini</SelectItem>
                          <SelectItem value="4">4 immagini</SelectItem>
                          <SelectItem value="5">5 immagini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerateVisuals}
                      disabled={isGeneratingVisuals || !visualOptions.description.trim()}
                      className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
                    >
                      {isGeneratingVisuals ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando Visual...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Genera Visual AI
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {generatedVisuals.length > 0 && (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Visual Generati ({generatedVisuals.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {generatedVisuals.map((visual, index) => (
                        <div key={visual.id} className="space-y-2">
                          <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                            <img
                              src={visual.imageUrl || "/placeholder.svg"}
                              alt={`Generated visual ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {visual.style}
                            </Badge>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>

          <Separator className="my-4" />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSavePost}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingPost ? "Aggiorna Post" : "Salva Post"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
