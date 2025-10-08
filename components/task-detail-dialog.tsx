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
import { Calendar, Clock, User, Paperclip, Plus, X, Edit3, Check, GripVertical, Star, Tag, Send } from "lucide-react"
import type { Task, SubItem, TaskComment } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/use-users"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { TaskAssetGallery } from '@/components/task-asset-gallery'

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  onAddComment: (taskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => Promise<void>
  onUpdateSubItems: (taskId: string, subItems: SubItem[]) => Promise<void>
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

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  onAddComment,
  onUpdateSubItems,
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
    }
  }, [task])

  if (!task) return null

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="space-y-4">
          {/* Title - Inline Editable */}
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
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
                className="text-lg font-semibold cursor-pointer hover:bg-gray-50 p-2 rounded flex-1"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
                <Edit3 className="h-4 w-4 ml-2 inline opacity-50" />
              </DialogTitle>
            )}
          </div>

          {/* Meta Information Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
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
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
            >
              <User className="h-3 w-3" />
              <span>{task.clientName || "Cliente"}</span>
            </button>
          )}

          {/* Calendar Entry Link - Clickable (if calendarId exists) */}
          {(task as any).calendarId && (
            <button
              onClick={() => {
                router.push(`/calendario-editoriale?entryId=${(task as any).calendarId}`)
                onOpenChange(false)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
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
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-100 transition-colors"
            >
              <Star className="h-3 w-3" />
              <span>{task.dependencies.length} dipendenze</span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content - 2/3 width */}
          <div className="order-2 md:order-1 md:col-span-2 space-y-4 md:space-y-6">
            {/* Description - Inline Editable */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Descrizione</Label>
              {editingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descrizione breve della task..."
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
                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 min-h-[80px]"
                  onClick={() => setEditingDescription(true)}
                >
                  {task.description || (
                    <span className="text-gray-400 italic">Clicca per aggiungere una descrizione...</span>
                  )}
                  <Edit3 className="h-4 w-4 ml-2 inline opacity-50" />
                </div>
              )}
            </div>

            {/* Rich Description - Inline Editable */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Descrizione Dettagliata</Label>
              {editingRichDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={richDescription}
                    onChange={(e) => setRichDescription(e.target.value)}
                    rows={6}
                    placeholder="Descrizione dettagliata con supporto Markdown..."
                    className="font-mono text-sm"
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
                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 min-h-[120px]"
                  onClick={() => setEditingRichDescription(true)}
                >
                  {task.richDescription ? (
                    <div className="whitespace-pre-wrap">{task.richDescription}</div>
                  ) : (
                    <span className="text-gray-400 italic">Clicca per aggiungere una descrizione dettagliata...</span>
                  )}
                  <Edit3 className="h-4 w-4 ml-2 inline opacity-50" />
                </div>
              )}
            </div>

            {/* Deliverable Section with Save/Cancel */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Deliverable Atteso</Label>
              
              <div className="space-y-3">
                {/* Type Select - Sempre editabile */}
                <Select
                  value={deliverableType}
                  onValueChange={setDeliverableType}
                >
                  <SelectTrigger className="h-11 md:h-10">
                    <SelectValue placeholder="Tipo deliverable..." />
                  </SelectTrigger>
                  <SelectContent>
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
                      className="text-sm"
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
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50 min-h-[60px]"
                    onClick={() => setEditingDeliverable(true)}
                  >
                    {task.expectedDeliverable ? (
                      <p className="text-sm whitespace-pre-wrap">{task.expectedDeliverable}</p>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Clicca per definire il deliverable atteso...</span>
                    )}
                    <Edit3 className="h-4 w-4 ml-2 inline opacity-50" />
                  </div>
                )}
              </div>
            </div>

            {/* Sub-items with Drag & Drop */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Sub-attività</Label>
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
                              className={`flex items-center gap-2 p-2 border rounded-md ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="p-2 md:p-0">
                                <Checkbox checked={item.completed} onCheckedChange={() => handleToggleSubItem(item.id)} className="h-5 w-5 md:h-4 md:w-4" />
                              </div>
                              <span className={`flex-1 ${item.completed ? "line-through text-gray-500" : ""}`}>
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
                  className="h-12 md:h-10"
                />
                <Button size="sm" className="h-12 w-12 md:h-10 md:w-10" onClick={handleAddSubItem}>
                  <Plus className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Commenti ({(task.comments || []).length})</Label>

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
                    className="h-11 md:h-10"
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
                        <span className="text-xs text-gray-500">
                          {(comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Timeline Attività</Label>
              
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {/* Created Event */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">Task creata</p>
                    <p className="text-xs text-gray-500">
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
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium">Assegnata a {task.assignee}</p>
                      <p className="text-xs text-gray-500">Data assegnazione non tracciata</p>
                    </div>
                  </div>
                )}

                {/* Due Date Event (if exists) */}
                {task.dueDate && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium">Scadenza impostata</p>
                      <p className="text-xs text-gray-500">
                        {(task.dueDate instanceof Date ? task.dueDate : (task.dueDate as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Edit3 className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">Ultimo aggiornamento</p>
                    <p className="text-xs text-gray-500">
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
          <div className="order-1 md:order-2 space-y-3 md:space-y-4">
            {/* Status */}
            <div className="space-y-3">
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Stato</Label>
              
              {/* Status Badge Prominent */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
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
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Progresso sub-attività</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
                <SelectTrigger className="h-11 md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Tipologia</Label>
              <Select value={task.type || ""} onValueChange={(value) => handleUpdateField("type", value)}>
                <SelectTrigger className="h-11 md:h-10">
                  <SelectValue placeholder="Seleziona tipologia" />
                </SelectTrigger>
                <SelectContent>
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
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Priorità</Label>
              <Select value={task.priority} onValueChange={(value) => handleUpdateField("priority", value)}>
                <SelectTrigger className="h-11 md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Punteggio Valutazione</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={task.score || 0}
                  onChange={(e) => handleUpdateField("score", Number.parseInt(e.target.value) || 0)}
                  className="w-20 h-11 md:h-10"
                />
                <div className="flex items-center gap-1">
                  <Star className={`h-4 w-4 ${getScoreColor(task.score || 0)}`} />
                  <span className={`text-sm font-medium ${getScoreColor(task.score || 0)}`}>{task.score || 0}/10</span>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Scadenza</Label>
              <Input type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} className="h-11 md:h-10" />
            </div>

            {/* Assignee */}
            <div>
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Assegnato a</Label>
              <Select
                value={task.assignedUserId || "unassigned"}
                onValueChange={(value) => {
                  if (value === "unassigned") {
                    handleUpdateField("assignedUserId", null)
                    handleUpdateField("assignee", null)
                  } else {
                    const selectedUser = users.find(u => u.id === value)
                    if (selectedUser) {
                      handleUpdateField("assignedUserId", value)
                      handleUpdateField("assignee", `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() || selectedUser.email)
                    }
                  }
                }}
              >
                <SelectTrigger className="h-11 md:h-10">
                  <SelectValue placeholder="Seleziona utente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500 italic">Non assegnato</span>
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
                <p className="text-xs text-gray-500 mt-1">Caricamento utenti...</p>
              )}
              
              {users.length === 0 && !usersLoading && (
                <p className="text-xs text-gray-500 mt-1">Nessun utente disponibile nel tenant</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {(task.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Allegati ({task.attachments.length})
                </Label>
                <div className="space-y-2">
                  {task.attachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm truncate flex-1">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
