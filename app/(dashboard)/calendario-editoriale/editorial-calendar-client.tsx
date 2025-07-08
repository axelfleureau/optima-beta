"use client"

import { useState, useMemo, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useEditorialPosts } from "@/hooks/use-editorial-posts"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { EditorialPost, EditorialPostStatus } from "@/lib/types"
import {
  EditorialPostStatus as PostStatusEnum,
  EditorialPostFormat as PostFormatEnum,
  SocialPlatform as PlatformEnum,
} from "@/lib/types"
import { Timestamp } from "firebase/firestore"
import type { DropResult } from "@hello-pangea/dnd"

import { CalendarHeader } from "../../../components/ui/calendar-header"
import { CalendarTabs } from "../../../components/ui/calendar-tabs"
import { TableView } from "../../../components/ui/table-view"
import { KanbanView } from "../../../components/ui/kanban-view"
import { CalendarView } from "../../../components/ui/calendar-view"
import { EditorialPostFormDialog } from "../../../components/ui/post-form-dialog"
import { statusConfig, statusOrder } from "./utils/status-config"

export default function EditorialCalendarClient() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"table" | "kanban" | "calendar">("table")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const { clients, loading: clientsLoading } = useClients()
  const {
    posts,
    loading: postsLoading,
    addPost,
    updatePost,
    deletePost,
    updatePostStatus,
  } = useEditorialPosts(selectedClientId)

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Inizializzazione...</p>
        </div>
      </div>
    )
  }

  // Show loading if user data is not available
  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Autenticazione...</p>
        </div>
      </div>
    )
  }

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
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
      <CalendarHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onNewPost={openNewForm}
        selectedClientId={selectedClientId}
        onClientChange={setSelectedClientId}
        clientOptions={clientOptions}
        userRole={userData?.role}
      />

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <CalendarTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <TabsContent value="table" className="space-y-6">
            <TableView
              posts={filteredPosts}
              onEditPost={openEditForm}
              onDeletePost={handleDeletePost}
              onNewPost={openNewForm}
              selectedClientId={selectedClientId}
              userRole={userData?.role}
            />
          </TabsContent>

          <TabsContent value="kanban" className="space-y-6">
            <KanbanView
              postsByStatus={postsByStatus}
              onDragEnd={onDragEnd}
              onEditPost={openEditForm}
              onNewPost={openNewForm}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarView
              posts={filteredPosts}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onEditPost={openEditForm}
            />
          </TabsContent>
        </Tabs>
      </div>

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
