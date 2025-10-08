"use client"

import { useState, useEffect } from "react"
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
  const { toast } = useToast()

  // Editing states
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editingRichDescription, setEditingRichDescription] = useState(false)

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [richDescription, setRichDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [newComment, setNewComment] = useState("")
  const [newSubItem, setNewSubItem] = useState("")
  const [subItems, setSubItems] = useState<SubItem[]>([])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setRichDescription(task.richDescription || "")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <Button size="sm" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTitle(task.title)
                    setEditingTitle(false)
                  }}
                >
                  <X className="h-4 w-4" />
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
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Creata il {(task.createdAt instanceof Date ? task.createdAt : (task.createdAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Aggiornata il {(task.updatedAt instanceof Date ? task.updatedAt : (task.updatedAt as any)?.toDate?.() || new Date()).toLocaleDateString("it-IT")}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{task.assignee || "Non assegnato"}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - 2/3 width */}
          <div className="col-span-2 space-y-6">
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
                    <Button size="sm" onClick={handleSaveDescription}>
                      <Check className="h-4 w-4 mr-1" />
                      Salva
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
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
                    <Button size="sm" onClick={handleSaveRichDescription}>
                      <Check className="h-4 w-4 mr-1" />
                      Salva
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
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
                              <Checkbox checked={item.completed} onCheckedChange={() => handleToggleSubItem(item.id)} />
                              <span className={`flex-1 ${item.completed ? "line-through text-gray-500" : ""}`}>
                                {item.title}
                              </span>
                              <Button size="sm" variant="ghost" onClick={() => handleRemoveSubItem(item.id)}>
                                <X className="h-3 w-3" />
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
                />
                <Button size="sm" onClick={handleAddSubItem}>
                  <Plus className="h-4 w-4" />
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
                  />
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
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
          <div className="space-y-4">
            {/* Status */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Stato</Label>
              <Select
                value={task.status || task.columnId}
                onValueChange={(value) => handleUpdateField("status", value)}
              >
                <SelectTrigger>
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
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipologia</Label>
              <Select value={task.type || ""} onValueChange={(value) => handleUpdateField("type", value)}>
                <SelectTrigger>
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
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Priorità</Label>
              <Select value={task.priority} onValueChange={(value) => handleUpdateField("priority", value)}>
                <SelectTrigger>
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
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Punteggio Valutazione</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={task.score || 0}
                  onChange={(e) => handleUpdateField("score", Number.parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <div className="flex items-center gap-1">
                  <Star className={`h-4 w-4 ${getScoreColor(task.score || 0)}`} />
                  <span className={`text-sm font-medium ${getScoreColor(task.score || 0)}`}>{task.score || 0}/10</span>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Scadenza</Label>
              <Input type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} />
            </div>

            {/* Assignee */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Assegnato a</Label>
              <Input
                value={task.assignee || ""}
                onChange={(e) => handleUpdateField("assignee", e.target.value)}
                placeholder="Nome assegnatario"
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Tags</Label>
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
