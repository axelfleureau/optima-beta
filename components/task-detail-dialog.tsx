"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Calendar,
  Clock,
  User,
  Paperclip,
  Plus,
  X,
  Edit3,
  Check,
  GripVertical,
  Star,
  Tag,
  Send,
  Upload,
  Eye,
  Download,
  Trash2,
  FileArchive,
  FileImage,
  FileText,
} from "lucide-react"
import type { Project, Task, SubItem, TaskComment } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/use-users"
import { cn } from "@/lib/utils"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { TaskAssetGallery } from '@/components/task-asset-gallery'

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  projects?: Project[]
  onUploadAttachments?: (taskId: string, files: File[]) => Promise<unknown>
  onDeleteAttachment?: (taskId: string, attachmentId: string) => Promise<unknown>
  onAddComment: (taskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => Promise<void>
  onUpdateSubItems: (taskId: string, subItems: SubItem[]) => Promise<void>
  onAcceptAssignment?: (taskId: string) => Promise<void>
  onRejectAssignment?: (taskId: string, reason?: string) => Promise<void>
}

const taskTypes = [
  "Marketing",
  "Design",
  "Development",
  "Content",
  "Strategy",
  "Research",
  "Testing",
  "Meeting",
  "Review",
]

const statusOptions = [
  { value: "to-do", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "on-hold", label: "On Hold" },
]

const dialogSurfaceClass =
  "border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-[#05070b] dark:text-slate-50"

const labelClass =
  "mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"

const compactLabelClass =
  "mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300 md:mb-2 md:text-sm"

const editableSurfaceClass =
  "rounded-md border border-slate-200 bg-white p-3 text-slate-950 shadow-sm transition-colors hover:border-righello-pink/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:border-righello-pink/60 dark:hover:bg-slate-900/80"

const inputSurfaceClass =
  "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:ring-righello-pink/25 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"

const selectSurfaceClass =
  "border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  projects = [],
  onUploadAttachments,
  onDeleteAttachment,
  onAddComment,
  onUpdateSubItems,
  onAcceptAssignment,
  onRejectAssignment,
}: TaskDetailDialogProps) {
  const { userData } = useAuth()
  const { users, loading: usersLoading } = useUsers()
  const { toast } = useToast()
  const router = useRouter()

  // Editing states
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editingRichDescription, setEditingRichDescription] = useState(false)
  const [editingDeliverable, setEditingDeliverable] = useState(false)

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [richDescription, setRichDescription] = useState("")
  const [deliverable, setDeliverable] = useState("")
  const [deliverableType, setDeliverableType] = useState<string>("other")
  const [dueDate, setDueDate] = useState("")
  const [newComment, setNewComment] = useState("")
  const [newSubItem, setNewSubItem] = useState("")
  const [subItems, setSubItems] = useState<SubItem[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null)
  const [assignmentRejectionReason, setAssignmentRejectionReason] = useState("")
  const [respondingAssignment, setRespondingAssignment] = useState<"accept" | "reject" | null>(null)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setRichDescription(task.richDescription || "")
      setDeliverable(task.expectedDeliverable || "")
      setDeliverableType(task.deliverableType || "other")
      const dueDateValue = task.dueDate
      if (dueDateValue) {
        let dateObj: Date
        if (dueDateValue instanceof Date) {
          dateObj = dueDateValue
        } else if ((dueDateValue as any).toDate && typeof (dueDateValue as any).toDate === 'function') {
          dateObj = (dueDateValue as any).toDate()
        } else {
          dateObj = new Date(dueDateValue as any)
        }
        setDueDate(dateObj.toISOString().split("T")[0])
      } else {
        setDueDate("")
      }
      setSubItems(task.subItems || [])
      setAssignmentRejectionReason("")
    }
  }, [task])

  if (!task) return null

  const currentMember = users.find((member) => member.email?.toLowerCase() === userData?.email?.toLowerCase())
  const currentMemberId = currentMember?.id
  const assignmentStatus = task.assignmentStatus || "accepted"
  const isPendingAssignment = assignmentStatus === "pending"
  const isRejectedAssignment = assignmentStatus === "rejected"
  const canRespondToAssignment = isPendingAssignment && task.assignedUserId === currentMemberId

  const handleSaveTitle = async () => {
    if (title.trim() !== task.title) {
      await onUpdateTask(task.id, { title: title.trim() })
      toast({ title: "Titolo aggiornato", description: "Il titolo della task è stato modificato" })
    }
    setEditingTitle(false)
  }

  const handleSaveDescription = async () => {
    if (description !== task.description) {
      await onUpdateTask(task.id, { description })
      toast({ title: "Descrizione aggiornata" })
    }
    setEditingDescription(false)
  }

  const handleSaveRichDescription = async () => {
    if (richDescription !== task.richDescription) {
      await onUpdateTask(task.id, { richDescription })
      toast({ title: "Descrizione dettagliata aggiornata" })
    }
    setEditingRichDescription(false)
  }

  const handleUpdateField = async (field: keyof Task, value: any) => {
    await onUpdateTask(task.id, { [field]: value })
    toast({ title: "Campo aggiornato", description: `${field} modificato con successo` })
  }

  const handleAcceptAssignment = async () => {
    if (!onAcceptAssignment) return

    setRespondingAssignment("accept")
    try {
      await onAcceptAssignment(task.id)
      toast({
        title: "Assegnazione accettata",
        description: "La task ora risulta ufficialmente assegnata a te",
      })
    } finally {
      setRespondingAssignment(null)
    }
  }

  const handleRejectAssignment = async () => {
    if (!onRejectAssignment) return

    setRespondingAssignment("reject")
    try {
      await onRejectAssignment(task.id, assignmentRejectionReason.trim() || undefined)
      toast({
        title: "Assegnazione rifiutata",
        description: "La risposta è stata registrata nello storico della task",
      })
    } finally {
      setRespondingAssignment(null)
    }
  }

  const handleDueDateChange = async (newDate: string) => {
    setDueDate(newDate)
    await onUpdateTask(task.id, { dueDate: newDate ? new Date(newDate) : null })
    toast({ title: "Scadenza aggiornata" })
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !userData) return

    await onAddComment(task.id, {
      text: newComment.trim(),
      authorId: userData.tenantId,
      authorName: `${userData.firstName} ${userData.lastName}`.trim() || userData.email,
      authorAvatar: null,
    })

    setNewComment("")
    toast({ title: "Commento aggiunto" })
  }

  const handleAddSubItem = () => {
    if (!newSubItem.trim()) return

    const newItem: SubItem = {
      id: `subitem_${Date.now()}`,
      title: newSubItem.trim(),
      completed: false,
      createdAt: new Date(),
    }

    const updatedSubItems = [...subItems, newItem]
    setSubItems(updatedSubItems)
    onUpdateSubItems(task.id, updatedSubItems)
    setNewSubItem("")
    toast({ title: "Sub-item aggiunto" })
  }

  const handleToggleSubItem = (itemId: string) => {
    const updatedSubItems = subItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    )
    setSubItems(updatedSubItems)
    onUpdateSubItems(task.id, updatedSubItems)
  }

  const handleRemoveSubItem = (itemId: string) => {
    const updatedSubItems = subItems.filter((item) => item.id !== itemId)
    setSubItems(updatedSubItems)
    onUpdateSubItems(task.id, updatedSubItems)
  }

  const handleSubItemDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(subItems)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedItems = items.map((item, index) => ({ ...item, order: index }))
    setSubItems(updatedItems)
    onUpdateSubItems(task.id, updatedItems)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-red-600"
    if (score >= 5) return "text-yellow-600"
    return "text-green-600"
  }

  const calculateProgress = () => {
    if (!subItems || subItems.length === 0) return 0
    const completed = subItems.filter(item => item.completed).length
    return Math.round((completed / subItems.length) * 100)
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB"
    const units = ["B", "KB", "MB", "GB"]
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${Number((bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1))} ${units[index]}`
  }

  const getAttachmentIcon = (type?: string, name?: string) => {
    const normalizedType = type || ""
    const normalizedName = (name || "").toLowerCase()

    if (normalizedType.startsWith("image/")) return <FileImage className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
    if (normalizedName.endsWith(".zip") || normalizedName.endsWith(".rar") || normalizedName.endsWith(".7z")) {
      return <FileArchive className="h-4 w-4 text-amber-600 dark:text-amber-300" />
    }
    return <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
  }

  const getAttachmentPreviewKind = (attachment?: any) => {
    const type = String(attachment?.type || "").toLowerCase()
    const name = String(attachment?.name || "").toLowerCase()

    if (type.startsWith("image/")) return "image"
    if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf"
    if (type.startsWith("video/")) return "video"
    if (type.startsWith("audio/")) return "audio"
    return "file"
  }

  const handleUploadAttachments = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !onUploadAttachments) return

    const files = Array.from(fileList)
    setUploadingAttachments(true)
    try {
      await onUploadAttachments(task.id, files)
      toast({
        title: "Allegati caricati",
        description: `${files.length} file aggiunti alla task`,
      })
    } catch (error) {
      toast({
        title: "Upload non riuscito",
        description: error instanceof Error ? error.message : "Errore durante il caricamento degli allegati",
        variant: "destructive",
      })
    } finally {
      setUploadingAttachments(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!onDeleteAttachment) return

    try {
      await onDeleteAttachment(task.id, attachmentId)
      if (previewAttachment?.id === attachmentId) {
        setPreviewAttachment(null)
      }
      toast({ title: "Allegato rimosso" })
    } catch (error) {
      toast({
        title: "Rimozione non riuscita",
        description: error instanceof Error ? error.message : "Errore durante la rimozione dell'allegato",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 p-4 pt-12 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6", dialogSurfaceClass)}>
        <DialogHeader className="space-y-4 pr-8 text-left sm:pr-0">
          {/* Title - Inline Editable */}
          <div className="flex items-start gap-2">
            {editingTitle ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn("text-lg font-semibold", inputSurfaceClass)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle()
                    if (e.key === "Escape") {
                      setTitle(task.title)
                      setEditingTitle(false)
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" className="h-11 w-11 md:h-9 md:w-auto md:px-3" onClick={handleSaveTitle}>
                  <Check className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-11 w-11 md:h-9 md:w-auto md:px-3"
                  onClick={() => {
                    setTitle(task.title)
                    setEditingTitle(false)
                  }}
                >
                  <X className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </div>
            ) : (
              <DialogTitle
                className="min-w-0 flex-1 cursor-pointer rounded p-2 text-xl font-semibold leading-tight text-slate-950 transition-colors hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-slate-900/80 sm:text-lg"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
                <Edit3 className="h-4 w-4 ml-2 inline opacity-50" />
              </DialogTitle>
            )}
          </div>

          {/* Meta Information Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Creata il {(task.createdAt instanceof Date ? task.createdAt : (task.createdAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Aggiornata il {(task.updatedAt instanceof Date ? task.updatedAt : (task.updatedAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {task.assignee || (task.assignedUserId ? "Assegnato" : "Non assegnato")}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Contextual Links - Interactive */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Client Link - Clickable */}
          {task.clientId && (
            <button
              onClick={() => {
                router.push(`/clienti?clientId=${task.clientId}`)
                onOpenChange(false)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors dark:bg-purple-500/15 dark:text-purple-200 dark:hover:bg-purple-500/25"
            >
              <User className="h-3 w-3" />
              <span>{task.clientName || "Cliente"}</span>
            </button>
          )}

          {task.projectId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
              <FileText className="h-3 w-3" />
              <span>{task.projectName || "Progetto"}</span>
            </span>
          )}

          {/* Calendar Entry Link - Clickable (if calendarId exists) */}
          {(task as any).calendarId && (
            <button
              onClick={() => {
                router.push(`/calendario-editoriale?entryId=${(task as any).calendarId}`)
                onOpenChange(false)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25"
            >
              <Calendar className="h-3 w-3" />
              <span>Collegato a calendario</span>
            </button>
          )}

          {/* Dependencies Link - Show count, future: open dependency dialog */}
          {task.dependencies && task.dependencies.length > 0 && (
            <button
              onClick={() => {
                toast({
                  title: "Dipendenze",
                  description: `Questa task dipende da ${task.dependencies?.length || 0} altre task`
                })
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-100 transition-colors dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25"
            >
              <Star className="h-3 w-3" />
              <span>{task.dependencies.length} dipendenze</span>
            </button>
          )}
        </div>

        {(isPendingAssignment || isRejectedAssignment) && (
          <div
            className={cn(
              "mb-4 rounded-md border p-4",
              isPendingAssignment
                ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
                : "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100",
            )}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {isPendingAssignment ? <Clock className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>
                    {isPendingAssignment
                      ? canRespondToAssignment
                        ? "Assegnazione da accettare"
                        : "Assegnazione in attesa"
                      : "Assegnazione rifiutata"}
                  </span>
                </div>
                <p className="text-sm leading-6 opacity-90">
                  {isPendingAssignment
                    ? canRespondToAssignment
                      ? "Un collega pari ruolo ti ha proposto questa task. Accettandola diventa ufficialmente tua; puoi rifiutarla lasciando una nota facoltativa."
                      : `La task è stata proposta a ${task.assignee || "un esecutore"} e diventerà ufficiale solo dopo l'accettazione.`
                    : "La proposta di assegnazione è stata rifiutata e resta visibile nello storico operativo."}
                </p>
                {isRejectedAssignment && task.assignmentRejectionReason && (
                  <p className="rounded-md bg-black/5 p-2 text-sm dark:bg-white/10">
                    Motivo: {task.assignmentRejectionReason}
                  </p>
                )}
              </div>

              {canRespondToAssignment && (
                <div className="w-full space-y-2 md:w-[320px]">
                  <Textarea
                    value={assignmentRejectionReason}
                    onChange={(event) => setAssignmentRejectionReason(event.target.value)}
                    placeholder="Motivo del rifiuto (facoltativo)"
                    rows={2}
                    className={cn("text-sm", inputSurfaceClass)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11 border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:bg-slate-950 dark:text-rose-200 dark:hover:bg-rose-500/10"
                      disabled={respondingAssignment !== null}
                      onClick={handleRejectAssignment}
                    >
                      {respondingAssignment === "reject" ? "Invio..." : "Rifiuta"}
                    </Button>
                    <Button
                      className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={respondingAssignment !== null}
                      onClick={handleAcceptAssignment}
                    >
                      {respondingAssignment === "accept" ? "Invio..." : "Accetta"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 pb-6 md:grid md:grid-cols-3 md:gap-6 md:pb-0">
          {/* Main Content - 2/3 width */}
          <div className="order-2 space-y-4 md:order-1 md:col-span-2 md:space-y-6">
            {/* Description - Inline Editable */}
            <div>
              <Label className={labelClass}>Descrizione</Label>
              {editingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descrizione breve della task..."
                    className={inputSurfaceClass}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setDescription(task.description || "")
                        setEditingDescription(false)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-11 md:h-9" onClick={handleSaveDescription}>
                      <Check className="h-5 w-5 md:h-4 md:w-4 mr-1" />
                      Salva
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 md:h-9"
                      onClick={() => {
                        setDescription(task.description || "")
                        setEditingDescription(false)
                      }}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(editableSurfaceClass, "min-h-[88px] cursor-pointer whitespace-pre-wrap break-words leading-6")}
                  onClick={() => setEditingDescription(true)}
                >
                  {task.description || (
                    <span className="text-slate-400 italic dark:text-slate-500">Clicca per aggiungere una descrizione...</span>
                  )}
                  <Edit3 className="h-4 w-4 ml-2 inline text-slate-500 opacity-70 dark:text-slate-400" />
                </div>
              )}
            </div>

            {/* Rich Description - Inline Editable */}
            <div>
              <Label className={labelClass}>Descrizione Dettagliata</Label>
              {editingRichDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={richDescription}
                    onChange={(e) => setRichDescription(e.target.value)}
                    rows={6}
                    placeholder="Descrizione dettagliata con supporto Markdown..."
                    className={cn("font-mono text-sm", inputSurfaceClass)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setRichDescription(task.richDescription || "")
                        setEditingRichDescription(false)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-11 md:h-9" onClick={handleSaveRichDescription}>
                      <Check className="h-5 w-5 md:h-4 md:w-4 mr-1" />
                      Salva
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 md:h-9"
                      onClick={() => {
                        setRichDescription(task.richDescription || "")
                        setEditingRichDescription(false)
                      }}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(editableSurfaceClass, "min-h-[120px] cursor-pointer break-words leading-6")}
                  onClick={() => setEditingRichDescription(true)}
                >
                  {task.richDescription ? (
                    <div className="whitespace-pre-wrap">{task.richDescription}</div>
                  ) : (
                    <span className="text-slate-400 italic dark:text-slate-500">Clicca per aggiungere una descrizione dettagliata...</span>
                  )}
                  <Edit3 className="h-4 w-4 ml-2 inline text-slate-500 opacity-70 dark:text-slate-400" />
                </div>
              )}
            </div>

            {/* Deliverable Section with Save/Cancel */}
            <div>
              <Label className={labelClass}>Deliverable Atteso</Label>
              
              <div className="space-y-3">
                {/* Type Select - Sempre editabile */}
                <Select
                  value={deliverableType}
                  onValueChange={setDeliverableType}
                >
                  <SelectTrigger className={cn("h-11 md:h-10", selectSurfaceClass)}>
                    <SelectValue placeholder="Tipo deliverable..." />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                    <SelectItem value="file">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        <span>File</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="design">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4" />
                        <span>Design</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="feature">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        <span>Feature</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="content">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Contenuto</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Altro</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Description - Editable con Save */}
                {editingDeliverable ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Descrivi cosa deve produrre questa task..."
                      value={deliverable}
                      onChange={(e) => setDeliverable(e.target.value)}
                      rows={2}
                      className={cn("text-sm", inputSurfaceClass)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="h-11 md:h-9"
                        onClick={async () => {
                          await handleUpdateField("expectedDeliverable", deliverable)
                          await handleUpdateField("deliverableType", deliverableType)
                          setEditingDeliverable(false)
                          toast({ title: "Deliverable aggiornato" })
                        }}
                      >
                        <Check className="h-5 w-5 md:h-4 md:w-4 mr-1" />
                        Salva
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 md:h-9"
                        onClick={() => {
                          setDeliverable(task.expectedDeliverable || "")
                          setDeliverableType(task.deliverableType || "other")
                          setEditingDeliverable(false)
                        }}
                      >
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(editableSurfaceClass, "min-h-[60px] cursor-pointer")}
                    onClick={() => setEditingDeliverable(true)}
                  >
                    {task.expectedDeliverable ? (
                      <p className="text-sm whitespace-pre-wrap">{task.expectedDeliverable}</p>
                    ) : (
                      <span className="text-slate-400 italic text-sm dark:text-slate-500">Clicca per definire il deliverable atteso...</span>
                    )}
                    <Edit3 className="h-4 w-4 ml-2 inline text-slate-500 opacity-70 dark:text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Sub-items with Drag & Drop */}
            <div>
              <Label className={labelClass}>Sub-attività</Label>
              <DragDropContext onDragEnd={handleSubItemDragEnd}>
                <Droppable droppableId="subitems">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {subItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                              </div>
                              <div className="p-2 md:p-0">
                                <Checkbox checked={item.completed} onCheckedChange={() => handleToggleSubItem(item.id)} className="h-5 w-5 md:h-4 md:w-4" />
                              </div>
                              <span className={`flex-1 ${item.completed ? "text-slate-500 line-through dark:text-slate-500" : ""}`}>
                                {item.title}
                              </span>
                              <Button size="sm" variant="ghost" className="h-11 w-11 md:h-8 md:w-8 p-0" onClick={() => handleRemoveSubItem(item.id)}>
                                <X className="h-5 w-5 md:h-3 md:w-3" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add new sub-item */}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Aggiungi sub-attività..."
                  value={newSubItem}
                  onChange={(e) => setNewSubItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubItem()
                  }}
                  className={cn("h-12 md:h-10", inputSurfaceClass)}
                />
                <Button size="sm" className="h-12 w-12 md:h-10 md:w-10" onClick={handleAddSubItem}>
                  <Plus className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <Label className={cn(labelClass, "mb-3")}>Commenti ({(task.comments || []).length})</Label>

              {/* Add new comment */}
              <div className="flex gap-2 mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {userData?.firstName?.[0]}
                    {userData?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Aggiungi un commento..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                    className={cn("h-11 md:h-10", inputSurfaceClass)}
                  />
                  <Button size="sm" className="h-11 w-11 md:h-10 md:w-10" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-2 md:space-y-3 max-h-48 md:max-h-60 overflow-y-auto">
                {(task.comments || []).map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.authorName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.authorName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          {(comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-300">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <Label className={cn(labelClass, "mb-3")}>Timeline Attività</Label>
              
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {/* Created Event */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center dark:bg-purple-500/15">
                    <Plus className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">Task creata</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {(task.createdAt instanceof Date ? task.createdAt : (task.createdAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT", { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Assignment Event (if assigned) */}
                {task.assignedUserId && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center dark:bg-blue-500/15">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium">Assegnata a {task.assignee}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Data assegnazione non tracciata</p>
                    </div>
                  </div>
                )}

                {/* Due Date Event (if exists) */}
                {task.dueDate && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center dark:bg-orange-500/15">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium">Scadenza impostata</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {(task.dueDate instanceof Date ? task.dueDate : (task.dueDate as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                    <Edit3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">Ultimo aggiornamento</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {(task.updatedAt instanceof Date ? task.updatedAt : (task.updatedAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT", {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Assets Gallery */}
            <div className="mt-6">
              <TaskAssetGallery
                assets={task.generatedAssets ?? []}
                onDelete={async (assetId) => {
                  const updatedAssets = task.generatedAssets?.filter(a => a.id !== assetId) || []
                  await onUpdateTask(task.id, { generatedAssets: updatedAssets })
                }}
              />
            </div>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="order-1 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60 md:order-2 md:border-0 md:bg-transparent md:p-0 dark:md:bg-transparent md:space-y-4">
            {/* Project */}
            <div>
              <Label className={compactLabelClass}>Progetto</Label>
              <Select
                value={task.projectId || "none"}
                onValueChange={(value) => {
                  void handleUpdateField("projectId", value === "none" ? null : value)
                }}
              >
                <SelectTrigger className={cn("h-11 md:h-10", selectSurfaceClass)}>
                  <SelectValue placeholder="Collega a progetto" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <SelectItem value="none">Senza progetto</SelectItem>
                  {projects
                    .filter((project) => (task.clientId === "tenant" ? !project.clientId : !project.clientId || project.clientId === task.clientId))
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {project.members?.length ? ` · ${project.members.length} persone` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className={compactLabelClass}>Stato</Label>
              
              {/* Status Badge Prominent */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                <div className={`h-3 w-3 rounded-full ${
                  task.status === 'done' ? 'bg-green-500' :
                  task.status === 'in-progress' ? 'bg-blue-500' :
                  task.status === 'review' ? 'bg-yellow-500' :
                  task.columnId === 'on-hold' ? 'bg-gray-400' :
                  'bg-gray-300'
                }`} />
                <span className="font-medium text-sm">
                  {statusOptions.find(s => s.value === (task.status || task.columnId))?.label || 'To Do'}
                </span>
              </div>

              {/* Progress Bar (if has sub-items) */}
              {subItems && subItems.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Progresso sub-attività</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status Select */}
              <Select
                value={task.status || task.columnId}
                onValueChange={(value) => handleUpdateField("status", value)}
              >
                <SelectTrigger className={cn("h-11 md:h-10", selectSurfaceClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type/Category */}
            <div>
              <Label className={compactLabelClass}>Tipologia</Label>
              <Select value={task.type || ""} onValueChange={(value) => handleUpdateField("type", value)}>
                <SelectTrigger className={cn("h-11 md:h-10", selectSurfaceClass)}>
                  <SelectValue placeholder="Seleziona tipologia" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  {taskTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className={compactLabelClass}>Priorità</Label>
              <Select value={task.priority} onValueChange={(value) => handleUpdateField("priority", value)}>
                <SelectTrigger className={cn("h-11 md:h-10", selectSurfaceClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <Badge className={`mt-1 ${getPriorityColor(task.priority)}`}>
                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Bassa"}
              </Badge>
            </div>

            {/* Score */}
            <div>
              <Label className={compactLabelClass}>Punteggio Valutazione</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={task.score || 0}
                  onChange={(e) => handleUpdateField("score", Number.parseInt(e.target.value) || 0)}
                  className={cn("w-20 h-11 md:h-10", inputSurfaceClass)}
                />
                <div className="flex items-center gap-1">
                  <Star className={`h-4 w-4 ${getScoreColor(task.score || 0)}`} />
                  <span className={`text-sm font-medium ${getScoreColor(task.score || 0)}`}>{task.score || 0}/10</span>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <Label className={compactLabelClass}>Scadenza</Label>
              <Input type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} className={cn("h-11 md:h-10", inputSurfaceClass)} />
            </div>

            {/* Assignee */}
            <div>
              <Label className={compactLabelClass}>Assegnato a</Label>
              <Select
                value={task.assignedUserId || "unassigned"}
                onValueChange={(value) => {
                  if (value === "unassigned") {
                    handleUpdateField("assignedUserId", null)
                  } else {
                    const selectedUser = users.find(u => u.id === value)
                    if (selectedUser) {
                      handleUpdateField("assignedUserId", value)
                    }
                  }
                }}
              >
                <SelectTrigger className={cn("h-11 md:h-10", selectSurfaceClass)}>
                  <SelectValue placeholder="Seleziona utente..." />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 italic dark:text-slate-400">Non assegnato</span>
                    </div>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {usersLoading && (
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-500">Caricamento utenti...</p>
              )}
              
              {users.length === 0 && !usersLoading && (
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-500">Nessun utente disponibile nel tenant</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label className={compactLabelClass}>Tags</Label>
              <div className="flex flex-wrap gap-1">
                {(task.tags || []).map((tag, index) => (
                  <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Allegati ({task.attachments?.length || 0})
                </Label>
                {onUploadAttachments && (
                  <>
                    <input
                      id={`task-attachment-upload-${task.id}`}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void handleUploadAttachments(event.target.files)
                        event.currentTarget.value = ""
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                    className="h-10 border-slate-200 bg-white text-xs text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 md:h-8"
                      disabled={uploadingAttachments}
                      onClick={() => document.getElementById(`task-attachment-upload-${task.id}`)?.click()}
                    >
                      {uploadingAttachments ? (
                        <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-righello-pink border-t-transparent" />
                      ) : (
                        <Upload className="mr-2 h-3.5 w-3.5" />
                      )}
                      Carica
                    </Button>
                  </>
                )}
              </div>

              {task.attachments && task.attachments.length > 0 ? (
                <div className="space-y-2">
                  {task.attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200"
                    >
                      {getAttachmentIcon(attachment.type, attachment.name)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{attachment.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(Number(attachment.size || 0))}</p>
                      </div>
                      {attachment.url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                          onClick={() => setPreviewAttachment(attachment)}
                          aria-label={`Visualizza ${attachment.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {attachment.url && (
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <a href={attachment.url} target="_blank" rel="noreferrer" aria-label={`Apri ${attachment.name}`}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {onDeleteAttachment && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                          onClick={() => void handleDeleteAttachment(attachment.id)}
                          aria-label={`Rimuovi ${attachment.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <Paperclip className="mb-2 h-4 w-4" />
                  Nessun allegato. Puoi caricare immagini, PDF, ZIP e documenti operativi.
                </div>
              )}
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewAttachment} onOpenChange={(isOpen) => !isOpen && setPreviewAttachment(null)}>
        <DialogContent className={cn("left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[92vh] sm:max-w-[96vw] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border md:max-w-5xl", dialogSurfaceClass)}>
          {previewAttachment && (
            <>
              <DialogHeader className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:px-5">
                <DialogTitle className="flex min-w-0 items-center gap-2 text-base md:text-lg">
                  {getAttachmentIcon(previewAttachment.type, previewAttachment.name)}
                  <span className="truncate">{previewAttachment.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="h-[calc(100dvh-62px)] overflow-auto bg-slate-50 p-3 dark:bg-black sm:h-auto sm:max-h-[78vh] md:p-5">
                {getAttachmentPreviewKind(previewAttachment) === "image" && (
                  <div className="flex min-h-[45vh] items-center justify-center">
                    <img
                      src={previewAttachment.url}
                      alt={previewAttachment.name}
                      className="max-h-[72vh] max-w-full rounded-md object-contain shadow-sm"
                    />
                  </div>
                )}

                {getAttachmentPreviewKind(previewAttachment) === "pdf" && (
                  <iframe
                    src={previewAttachment.url}
                    title={previewAttachment.name}
                    className="h-[72vh] w-full rounded-md border border-slate-200 bg-white dark:border-slate-800"
                  />
                )}

                {getAttachmentPreviewKind(previewAttachment) === "video" && (
                  <video
                    src={previewAttachment.url}
                    controls
                    className="mx-auto max-h-[72vh] w-full rounded-md bg-black"
                  />
                )}

                {getAttachmentPreviewKind(previewAttachment) === "audio" && (
                  <div className="mx-auto flex min-h-[260px] max-w-xl flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
                    {getAttachmentIcon(previewAttachment.type, previewAttachment.name)}
                    <div>
                      <p className="font-medium text-slate-950 dark:text-slate-50">{previewAttachment.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatFileSize(Number(previewAttachment.size || 0))}</p>
                    </div>
                    <audio src={previewAttachment.url} controls className="w-full" />
                  </div>
                )}

                {getAttachmentPreviewKind(previewAttachment) === "file" && (
                  <div className="mx-auto flex min-h-[320px] max-w-xl flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
                    {getAttachmentIcon(previewAttachment.type, previewAttachment.name)}
                    <div>
                      <p className="font-medium text-slate-950 dark:text-slate-50">{previewAttachment.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatFileSize(Number(previewAttachment.size || 0))}
                      </p>
                    </div>
                    <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
                      Questo formato non ha anteprima browser affidabile. Puoi comunque aprirlo o scaricarlo.
                    </p>
                    <Button asChild className="bg-righello-pink text-white hover:bg-righello-pink/90">
                      <a href={previewAttachment.url} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Apri file
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
