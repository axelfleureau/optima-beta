"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import {
  CalendarIcon,
  PlusCircle,
  List,
  LayoutGrid,
  ChevronDown,
  MoreHorizontal,
  Video,
  Search,
  Filter,
  SortAsc,
  Eye,
  Edit3,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useEditorialPosts } from "@/hooks/use-editorial-posts"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/lib/auth-context"
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
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import {
  generateCaption,
  canGenerateCaption,
  getMissingFieldsSuggestion,
  type CaptionGenerationData,
} from "@/lib/ai-caption-service"
import dynamic from "next/dynamic"

// Loading component
function CalendarLoading() {
  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento calendario editoriale...</p>
      </div>
    </div>
  )
}

// Dynamically import the client component with no SSR
const EditorialCalendarClient = dynamic(() => import("./editorial-calendar-client"), {
  ssr: false,
  loading: () => <CalendarLoading />,
})

export default function EditorialCalendarPage() {
  return <EditorialCalendarClient />
}

const statusConfig = {
  [PostStatusEnum.IDEA]: {
    label: "Idea",
    icon: AlertCircle,
    color: "bg-amber-500",
    lightColor: "bg-amber-50 text-amber-700 border-amber-200",
    darkColor: "bg-amber-900/20 text-amber-400 border-amber-800",
  },
  [PostStatusEnum.BOZZA]: {
    label: "Bozza",
    icon: Edit3,
    color: "bg-blue-500",
    lightColor: "bg-blue-50 text-blue-700 border-blue-200",
    darkColor: "bg-blue-900/20 text-blue-400 border-blue-800",
  },
  [PostStatusEnum.REVISIONE_INTERNA]: {
    label: "Revisione Interna",
    icon: Eye,
    color: "bg-purple-500",
    lightColor: "bg-purple-50 text-purple-700 border-purple-200",
    darkColor: "bg-purple-900/20 text-purple-400 border-purple-800",
  },
  [PostStatusEnum.REVISIONE_CLIENTE]: {
    label: "Revisione Cliente",
    icon: Users,
    color: "bg-pink-500",
    lightColor: "bg-pink-50 text-pink-700 border-pink-200",
    darkColor: "bg-pink-900/20 text-pink-400 border-pink-800",
  },
  [PostStatusEnum.APPROVATO]: {
    label: "Approvato",
    icon: CheckCircle2,
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    darkColor: "bg-emerald-900/20 text-emerald-400 border-emerald-800",
  },
  [PostStatusEnum.PROGRAMMATO]: {
    label: "Programmato",
    icon: Clock,
    color: "bg-teal-500",
    lightColor: "bg-teal-50 text-teal-700 border-teal-200",
    darkColor: "bg-teal-900/20 text-teal-400 border-teal-800",
  },
  [PostStatusEnum.PUBBLICATO]: {
    label: "Pubblicato",
    icon: Zap,
    color: "bg-green-600",
    lightColor: "bg-green-50 text-green-700 border-green-200",
    darkColor: "bg-green-900/20 text-green-400 border-green-800",
  },
  [PostStatusEnum.RIFIUTATO]: {
    label: "Rifiutato",
    icon: AlertCircle,
    color: "bg-red-500",
    lightColor: "bg-red-50 text-red-700 border-red-200",
    darkColor: "bg-red-900/20 text-red-400 border-red-800",
  },
  [PostStatusEnum.ARCHIVIATO]: {
    label: "Archiviato",
    icon: Target,
    color: "bg-gray-500",
    lightColor: "bg-gray-50 text-gray-700 border-gray-200",
    darkColor: "bg-gray-900/20 text-gray-400 border-gray-800",
  },
}

const statusOrder = Object.values(PostStatusEnum)

function EditorialCalendarPageContent() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"table" | "kanban" | "calendar">("table")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null)

  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    userData?.role === "client" && userData.clientId ? userData.clientId : null,
  )

  const { clients, loading: clientsLoading } = useClients()
  const {
    posts,
    loading: postsLoading,
    addPost,
    updatePost,
    deletePost,
    updatePostStatus,
  } = useEditorialPosts(selectedClientId)

  const [searchTerm, setSearchTerm] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Add this right after all the useState hooks
  const [isAuthenticated, setIsAuthenticated] = useState(!!userData)

  useEffect(() => {
    setIsAuthenticated(!!userData)
  }, [userData])

  const [hasClientRole, setHasClientRole] = useState(false)

  useEffect(() => {
    setHasClientRole(userData?.role === "client" && !!userData.clientId)
  }, [userData])

  useEffect(() => {
    if (hasClientRole) {
      setSelectedClientId(userData.clientId)
    }
  }, [hasClientRole, userData?.clientId])

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-righello-pink border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Autenticazione...</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (userData?.role === "client" && userData.clientId && !selectedClientId) {
      setSelectedClientId(userData.clientId)
    }
  }, [userData, selectedClientId])

  const filteredPosts = useMemo(() => {
    return posts.filter(
      (post) =>
        post.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.caption && post.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
        post.platform.some((p) => p.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [posts, searchTerm])

  const postsByStatus = useMemo(() => {
    const grouped: Record<string, EditorialPost[]> = {}
    statusOrder.forEach((status) => (grouped[status] = []))
    filteredPosts.forEach((post) => {
      if (grouped[post.status]) {
        grouped[post.status].push(post)
      } else {
        if (!grouped[PostStatusEnum.ARCHIVIATO]) grouped[PostStatusEnum.ARCHIVIATO] = []
        grouped[PostStatusEnum.ARCHIVIATO].push(post)
      }
    })
    return grouped
  }, [filteredPosts])

  const handleAddOrEditPost = async (values: Partial<EditorialPost>) => {
    try {
      if (!values.clientId && selectedClientId) {
        values.clientId = selectedClientId
      } else if (!values.clientId && userData?.role === "client" && userData.clientId) {
        values.clientId = userData.clientId
      }

      if (!values.clientId) {
        toast({ title: "Errore", description: "Seleziona un cliente per il post.", variant: "destructive" })
        return
      }

      if (editingPost) {
        await updatePost(editingPost.id, values)
        toast({ title: "Successo", description: "Post aggiornato con successo." })
      } else {
        const newPostData = {
          name: values.name || "Nuovo Post",
          date: values.date || Timestamp.now(),
          status: values.status || PostStatusEnum.IDEA,
          platform: values.platform || [PlatformEnum.INSTAGRAM],
          format: values.format || PostFormatEnum.POST_SINGOLO,
          clientId: values.clientId,
          ...values,
        } as Omit<EditorialPost, "id" | "createdAt" | "updatedAt" | "tenantId" | "createdBy">
        await addPost(newPostData)
        toast({ title: "Successo", description: "Post creato con successo." })
      }
      setIsFormOpen(false)
      setEditingPost(null)
    } catch (error) {
      console.error("Error saving post:", error)
      toast({ title: "Errore", description: "Impossibile salvare il post.", variant: "destructive" })
    }
  }

  const openEditForm = (post: EditorialPost) => {
    setEditingPost(post)
    setIsFormOpen(true)
  }

  const openNewForm = () => {
    setEditingPost(null)
    setIsFormOpen(true)
  }

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo post?")) {
      try {
        await deletePost(postId)
        toast({ title: "Successo", description: "Post eliminato." })
      } catch (error) {
        console.error("Error deleting post:", error)
        toast({ title: "Errore", description: "Impossibile eliminare il post.", variant: "destructive" })
      }
    }
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const newStatus = destination.droppableId as EditorialPostStatus

    updatePostStatus(draggableId, newStatus)
      .then(() => {
        toast({ title: "Aggiornato", description: `Stato del post aggiornato a ${statusConfig[newStatus].label}.` })
      })
      .catch((err) => {
        console.error("Failed to update post status:", err)
        toast({ title: "Errore", description: "Impossibile aggiornare lo stato del post.", variant: "destructive" })
      })
  }

  if (postsLoading || clientsLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-righello-pink border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento calendario editoriale...</p>
        </div>
      </div>
    )
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title and Logo */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-righello-pink to-righello-pink-dark rounded-2xl flex items-center justify-center shadow-lg">
                  <Image
                    src="/assets/logos/righello-mark-pink.png"
                    alt="Righello Mark"
                    width={24}
                    height={24}
                    className="brightness-0 invert"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold righello-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Calendario Editoriale
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 righello-body">
                    Gestisci e pianifica i tuoi contenuti con precisione
                  </p>
                </div>
              </div>

              {/* Video Tutorial Link */}
              <div className="flex items-center gap-2 text-sm text-righello-pink hover:text-righello-pink-dark transition-colors cursor-pointer">
                <Video className="w-4 h-4" />
                <span>Guarda il tutorial per ottimizzare il tuo workflow</span>
              </div>

              {/* Client Selector */}
              {userData?.role !== "client" && (
                <div className="max-w-xs">
                  <Select
                    value={selectedClientId || ""}
                    onValueChange={(value) => setSelectedClientId(value === "all" ? null : value)}
                    disabled={userData?.role === "client"}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Seleziona cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i Clienti</SelectItem>
                      {clientOptions.map((client) => (
                        <SelectItem key={client.value} value={client.value}>
                          {client.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cerca contenuti..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Button
                onClick={openNewForm}
                className="bg-gradient-to-r from-righello-pink to-righello-pink-dark hover:from-righello-pink-dark hover:to-righello-pink text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-righello-pink transition-all duration-200 hover:scale-105"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Nuovo Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-1 rounded-2xl shadow-lg">
              <TabsTrigger
                value="table"
                className="data-[state=active]:bg-righello-pink data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
              >
                <List className="w-4 h-4 mr-2" />
                Tutti i Post
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="data-[state=active]:bg-righello-pink data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Bacheca per Stato
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-righello-pink data-[state=active]:text-white rounded-xl font-medium px-6 py-2 transition-all duration-200"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Vista Calendario
              </TabsTrigger>
            </TabsList>

            {/* Additional Controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
                <Filter className="w-4 h-4 mr-2" />
                Filtri
              </Button>
              <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
                <SortAsc className="w-4 h-4 mr-2" />
                Ordina
              </Button>
            </div>
          </div>

          {/* Table View */}
          <TabsContent value="table" className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nome</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Data</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Stato</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Formato</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Piattaforme</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Obiettivo</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Visual</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-[200px]">
                        Caption
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Note</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">
                        Azioni
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center h-32">
                          <div className="space-y-3">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                              <List className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                                Nessun post trovato
                              </p>
                              {!selectedClientId && userData?.role !== "client" && (
                                <p className="text-sm text-slate-500 dark:text-slate-500">
                                  Seleziona un cliente per visualizzare i contenuti
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredPosts.map((post) => {
                      const statusInfo = statusConfig[post.status]
                      return (
                        <TableRow
                          key={post.id}
                          className="border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">{post.name}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {format(post.date.toDate(), "dd MMM yyyy", { locale: it })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium`}
                            >
                              <statusInfo.icon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{post.format}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {post.platform.slice(0, 2).map((platform) => (
                                <Badge key={platform} variant="outline" className="text-xs">
                                  {platform}
                                </Badge>
                              ))}
                              {post.platform.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{post.platform.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {post.objective ? (
                              <Badge variant="secondary" className="text-xs">
                                {post.objective}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {post.visuals && post.visuals.length > 0 ? (
                              <a
                                href={post.visuals[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-righello-pink hover:text-righello-pink-dark font-medium transition-colors"
                              >
                                Visual ({post.visuals.length})
                              </a>
                            ) : (
                              <span className="text-slate-400">Nessuno</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate text-slate-600 dark:text-slate-400">
                              {post.caption?.substring(0, 50)}...
                            </p>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate text-slate-600 dark:text-slate-400">
                              {post.notes?.substring(0, 50)}...
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openEditForm(post)}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50">
                <Button
                  variant="outline"
                  onClick={openNewForm}
                  className="w-full border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-righello-pink hover:text-righello-pink transition-colors"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Aggiungi nuovo post
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Kanban View */}
          <TabsContent value="kanban" className="space-y-6">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {statusOrder.map((statusKey) => {
                  const statusInfo = statusConfig[statusKey]
                  const postsInStatus = postsByStatus[statusKey] || []

                  return (
                    <Droppable key={statusKey} droppableId={statusKey}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden transition-all duration-200 ${
                            snapshot.isDraggingOver ? "ring-2 ring-righello-pink ring-opacity-50 scale-105" : ""
                          }`}
                        >
                          <CardHeader className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
                            <CardTitle className="flex items-center justify-between text-sm font-semibold">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
                                <statusInfo.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <span className="text-slate-700 dark:text-slate-300">{statusInfo.label}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs font-medium">
                                {postsInStatus.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                            {postsInStatus.map((post, index) => (
                              <Draggable key={post.id} draggableId={post.id} index={index}>
                                {(providedDraggable, snapshotDraggable) => (
                                  <Card
                                    ref={providedDraggable.innerRef}
                                    {...providedDraggable.draggableProps}
                                    {...providedDraggable.dragHandleProps}
                                    className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border border-slate-200/50 dark:border-slate-700/50 ${
                                      snapshotDraggable.isDragging ? "shadow-2xl rotate-2 scale-105" : "hover:scale-102"
                                    }`}
                                    onClick={() => openEditForm(post)}
                                  >
                                    <div className="space-y-3">
                                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                                        {post.name}
                                      </h4>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        {format(post.date.toDate(), "d MMM", { locale: it })}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {post.platform.slice(0, 2).map((platform) => (
                                          <Badge key={platform} variant="outline" className="text-xs">
                                            {platform}
                                          </Badge>
                                        ))}
                                        {post.platform.length > 2 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{post.platform.length - 2}
                                          </Badge>
                                        )}
                                      </div>
                                      {post.format && (
                                        <Badge variant="secondary" className="text-xs">
                                          {post.format}
                                        </Badge>
                                      )}
                                      {post.objective && (
                                        <Badge variant="outline" className="text-xs">
                                          {post.objective}
                                        </Badge>
                                      )}
                                    </div>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditingPost(null)
                                setIsFormOpen(true)
                              }}
                              className="w-full mt-3 border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-righello-pink hover:text-righello-pink transition-colors"
                            >
                              <PlusCircle className="w-4 h-4 mr-2" />
                              Nuovo Post
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </Droppable>
                  )
                })}
              </div>
            </DragDropContext>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {format(currentMonth, "MMMM yyyy", { locale: it })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      Precedente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      Oggi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      Successivo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={undefined}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={it}
                  className="w-full"
                  components={{
                    DayContent: ({ date }) => {
                      const postsOnDay = filteredPosts.filter(
                        (post) => format(post.date.toDate(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
                      )
                      return (
                        <div className="relative w-full h-full p-1 min-h-[80px]">
                          <span className="absolute top-1 right-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {format(date, "d")}
                          </span>
                          {postsOnDay.length > 0 && (
                            <div className="mt-6 space-y-1">
                              {postsOnDay.slice(0, 2).map((post) => {
                                const statusInfo = statusConfig[post.status]
                                return (
                                  <Popover key={post.id}>
                                    <PopoverTrigger asChild>
                                      <div
                                        className={`p-1 text-xs rounded cursor-pointer transition-all hover:scale-105 ${statusInfo.color} text-white truncate font-medium`}
                                      >
                                        {post.name}
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0" align="start">
                                      <div className="p-4 space-y-3">
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                            {post.name}
                                          </h4>
                                          <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {format(post.date.toDate(), "PPP p", { locale: it })}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium`}
                                            >
                                              <statusInfo.icon className="w-3 h-3 mr-1" />
                                              {statusInfo.label}
                                            </Badge>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-sm">
                                              <span className="font-medium">Piattaforme:</span>{" "}
                                              {post.platform.join(", ")}
                                            </p>
                                            <p className="text-sm">
                                              <span className="font-medium">Formato:</span> {post.format}
                                            </p>
                                            {post.objective && (
                                              <p className="text-sm">
                                                <span className="font-medium">Obiettivo:</span> {post.objective}
                                              </p>
                                            )}
                                            {post.caption && (
                                              <p className="text-sm">
                                                <span className="font-medium">Caption:</span>{" "}
                                                {post.caption.substring(0, 100)}...
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <Button
                                          onClick={() => openEditForm(post)}
                                          size="sm"
                                          className="w-full bg-righello-pink hover:bg-righello-pink-dark"
                                        >
                                          Vedi Dettagli
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )
                              })}
                              {postsOnDay.length > 2 && (
                                <div className="p-1 text-xs text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
                                  +{postsOnDay.length - 2} altro/i
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    },
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Form Dialog */}
      <EditorialPostFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingPost(null)
        }}
        onSubmit={handleAddOrEditPost}
        post={editingPost}
        clients={clientOptions}
        selectedClientId={selectedClientId}
        userRole={userData?.role}
      />
    </div>
  )
}

//export default function EditorialCalendarPage() {
//  return <EditorialCalendarPageClient />
//}

// Enhanced Form Dialog Component with AI Caption Generation
interface EditorialPostFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: Partial<EditorialPost>) => Promise<void>
  post: EditorialPost | null
  clients: { value: string; label: string }[]
  selectedClientId: string | null
  userRole?: string
}

function EditorialPostFormDialog({
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
  const [targetAudience, setTargetAudience] = useState<string>("")
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
    // Verifica autenticazione con più controlli
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
          <DialogTitle className="text-2xl font-bold righello-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {post ? "Modifica Post" : "Nuovo Post Editoriale"}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 righello-body">
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
                      ? "border-righello-pink text-righello-pink hover:bg-righello-pink hover:text-white"
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
                className="flex-1 sm:flex-none bg-gradient-to-r from-righello-pink to-righello-pink-dark hover:from-righello-pink-dark hover:to-righello-pink text-white font-semibold shadow-lg hover:shadow-righello-pink transition-all duration-200"
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
