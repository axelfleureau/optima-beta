"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MoreHorizontal,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  Star,
  Tag,
  Sparkles,
  ImageIcon,
  Briefcase,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useAutoGenStore } from "@/lib/stores/auto-gen-store"
import { useWorkspaceNav } from "@/lib/stores/workspace-nav-store"
import type { Task } from "@/lib/types"

interface TaskCardProps {
  task: Task
  index: number
  dragEnabled: boolean
  showAllClients: boolean
  onTaskClick: (task: Task) => void
  getPriorityColor: (priority: string) => string
  getScoreColor: (score: number) => string
}

function getColumnCardSurface(columnId?: string) {
  switch (columnId) {
    case "to-do":
    case "backlog":
      return "bg-blue-50 border-y-blue-200 border-r-blue-200"
    case "urgenze":
      return "bg-rose-50 border-y-rose-200 border-r-rose-200"
    case "in-corso":
    case "in-progress":
      return "bg-amber-50 border-y-amber-200 border-r-amber-200"
    case "validation":
    case "review":
      return "bg-violet-50 border-y-violet-200 border-r-violet-200"
    case "done":
    case "completed":
      return "bg-emerald-50 border-y-emerald-200 border-r-emerald-200"
    case "sospensioni":
    case "on-hold":
      return "bg-slate-50 border-y-slate-300 border-r-slate-300"
    case "attivita-ricorrenti":
    case "recurring":
      return "bg-indigo-50 border-y-indigo-200 border-r-indigo-200"
    case "planning":
      return "bg-cyan-50 border-y-cyan-200 border-r-cyan-200"
    default:
      return "bg-[#fbf8ec] border-y-[#e6dec8] border-r-[#e6dec8]"
  }
}

export function TaskCard({
  task,
  index,
  dragEnabled,
  showAllClients,
  onTaskClick,
  getPriorityColor,
  getScoreColor,
}: TaskCardProps) {
  const { user } = useAuth()
  const { highlightedTaskId } = useWorkspaceNav()

  return (
    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!dragEnabled}>
      {(provided, snapshot) => {
        const isHighlighted = highlightedTaskId === task.id
        const draggableStyle = provided.draggableProps.style
        const dropStyle = snapshot.isDropAnimating
          ? {
              ...draggableStyle,
              transitionDuration: "120ms",
            }
          : draggableStyle

        return (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={dropStyle}
            id={`task-${task.id}`}
            className={`group min-h-[116px] cursor-pointer border-l-4 p-3 transition-[transform,box-shadow,border-color] duration-150 ease-out will-change-transform [touch-action:pan-x_pan-y] sm:min-h-[132px] sm:p-4 lg:[touch-action:auto] ${getPriorityColor(task.priority)} ${
              snapshot.isDragging
                ? "z-50 rotate-1 scale-[1.02] shadow-2xl transform-gpu"
                : isHighlighted
                  ? "shadow-xl shadow-righello-pink/25 border-righello-pink ring-2 ring-righello-pink/30"
                  : "hover:-translate-y-0.5 hover:shadow-xl"
            } ${getColumnCardSurface(task.columnId || task.status)} text-slate-950 border-y border-r shadow-corporate-medium`}
            onClick={() => onTaskClick(task)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 break-words text-sm font-bold leading-snug text-slate-950 line-clamp-2">
                  {task.title}
                </h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.score && task.score > 0 && (
                    <div className={`flex items-center gap-1 rounded-full px-2 py-1 ${getScoreColor(task.score)}`}>
                      <Star className="h-3 w-3" />
                      <span className="text-xs font-bold">{task.score}</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 flex-shrink-0 p-0 text-slate-500 hover:bg-slate-900/10 hover:text-slate-900 sm:h-7 sm:w-7"
                    aria-label="Azioni task"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {task.description && (
                <p className="text-xs leading-relaxed text-slate-700 line-clamp-2">{task.description}</p>
              )}

              {task.type && (
                <Badge variant="outline" className="border-slate-400/70 bg-white/45 text-xs font-medium text-slate-700">
                  {task.type}
                </Badge>
              )}

              {task.projectName && (
                <Badge variant="outline" className="max-w-full border-cyan-300/70 bg-cyan-50/85 text-xs font-medium text-cyan-800">
                  <Briefcase className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{task.projectName}</span>
                </Badge>
              )}

              {task.assignmentStatus === "pending" && (
                <Badge variant="outline" className="max-w-full border-amber-300 bg-amber-50/90 text-xs font-semibold text-amber-800">
                  <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">In attesa di accettazione</span>
                </Badge>
              )}

              {task.assignmentStatus === "rejected" && (
                <Badge variant="outline" className="max-w-full border-rose-300 bg-rose-50/90 text-xs font-semibold text-rose-800">
                  <XCircle className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Assegnazione rifiutata</span>
                </Badge>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-white/55 text-xs font-medium text-slate-700">
                      <Tag className="mr-1 h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {showAllClients && task.clientName && task.clientName !== "all" && (
                <div className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 rounded bg-gradient-to-br from-cyan-500 to-righello-pink"></div>
                  <span className="text-xs font-semibold text-slate-700">{task.clientName}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {task.dueDate
                      ? (task.dueDate instanceof Date
                          ? task.dueDate
                          : task.dueDate?.toDate && typeof task.dueDate.toDate === "function"
                            ? task.dueDate.toDate()
                            : new Date(task.dueDate as any)
                        ).toLocaleDateString("it-IT", { month: 'short', day: 'numeric' })
                      : "Nessuna"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(task.comments || []).length > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{(task.comments || []).length}</span>
                    </div>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>{task.attachments.length}</span>
                    </div>
                  )}
                  {task.subItems && task.subItems.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs">
                        ✓ {task.subItems.filter((item) => item.completed).length}/{task.subItems.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="truncate text-xs font-medium text-slate-600">
                Assegnato a: {task.assignee || "Non assegnato"}
              </div>

              {(task.contentType === "post" || task.contentType === "video") && (
                <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 min-w-0 flex-1 border-slate-300 bg-white/55 px-2 text-xs text-slate-800 hover:bg-white"
                    onClick={async () => {
                      if (!user) return
                      const { generateCopy } = useAutoGenStore.getState()
                      await generateCopy(
                        task.id,
                        task.title || task.description || "",
                        task.clientName || "",
                        user.uid,
                      )
                    }}
                  >
                    <Sparkles className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Genera Copy</span>
                    <span className="sm:hidden truncate">Copy</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 min-w-0 flex-1 border-slate-300 bg-white/55 px-2 text-xs text-slate-800 hover:bg-white"
                    onClick={async () => {
                      if (!user) return
                      const { generateVisual } = useAutoGenStore.getState()
                      const prompt = `${task.title || task.description}${task.clientName ? ` for ${task.clientName}` : ""}`
                      const token = await user.getIdToken()
                      await generateVisual(task.id, prompt, user.uid, token)
                    }}
                  >
                    <ImageIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Genera Visual</span>
                    <span className="sm:hidden truncate">Visual</span>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )
      }}
    </Draggable>
  )
}
