"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Paperclip,
  Star,
  Tag,
  Sparkles,
  ImageIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useAutoGenStore } from "@/lib/stores/auto-gen-store"
import { useWorkspaceNav } from "@/lib/stores/workspace-nav-store"
import type { Task } from "@/lib/types"

interface TaskCardProps {
  task: Task
  index: number
  showAllClients: boolean
  onTaskClick: (task: Task) => void
  getPriorityColor: (priority: string) => string
  getScoreColor: (score: number) => string
}

export function TaskCard({
  task,
  index,
  showAllClients,
  onTaskClick,
  getPriorityColor,
  getScoreColor,
}: TaskCardProps) {
  const { user } = useAuth()
  const { highlightedTaskId } = useWorkspaceNav()

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => {
        const isHighlighted = highlightedTaskId === task.id

        return (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            id={`task-${task.id}`}
            className={`p-3 md:p-4 cursor-pointer transition-all duration-300 border-l-4 min-h-[60px] md:min-h-[48px] ${getPriorityColor(task.priority)} ${
              snapshot.isDragging
                ? "shadow-2xl rotate-2 z-50 scale-105"
                : isHighlighted
                  ? "shadow-xl shadow-purple-500/50 border-purple-500 bg-purple-500/10 dark:bg-purple-500/20 scale-105"
                  : "hover:shadow-lg hover:scale-102"
            } bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50`}
            onClick={() => onTaskClick(task)}
          >
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-xs md:text-sm leading-tight text-slate-900 dark:text-slate-100">
                  {task.title}
                </h4>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  {task.score && task.score > 0 && (
                    <div className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${getScoreColor(task.score)}`}>
                      <Star className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="text-[10px] md:text-xs font-medium">{task.score}</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 md:h-6 md:w-6 p-0 flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 md:h-3 md:w-3" />
                  </Button>
                </div>
              </div>

              <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{task.description}</p>

              {task.type && (
                <Badge variant="outline" className="text-[10px] md:text-xs border-slate-300 dark:border-slate-600">
                  {task.type}
                </Badge>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] md:text-xs bg-slate-100 dark:bg-slate-700">
                      <Tag className="h-2 w-2 mr-0.5 md:mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {showAllClients && task.clientName && task.clientName !== "all" && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gradient-to-br from-blue-400 to-blue-600"></div>
                  <span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 font-medium">{task.clientName}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-0.5 md:gap-1">
                  <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
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
                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                  {(task.comments || []).length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <MessageSquare className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span>{(task.comments || []).length}</span>
                    </div>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Paperclip className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span>{task.attachments.length}</span>
                    </div>
                  )}
                  {task.subItems && task.subItems.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] md:text-xs">
                        ✓ {task.subItems.filter((item) => item.completed).length}/{task.subItems.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                Assegnato a: {task.assignee || "Non assegnato"}
              </div>

              <div className="flex gap-1.5 md:gap-2 mt-1 md:mt-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 md:h-7 text-[10px] md:text-xs"
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
                  <Sparkles className="w-3 h-3 mr-0.5 md:mr-1" />
                  <span className="hidden sm:inline">Genera Copy</span>
                  <span className="sm:hidden">Copy</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 md:h-7 text-[10px] md:text-xs"
                  onClick={async () => {
                    if (!user) return
                    const { generateVisual } = useAutoGenStore.getState()
                    const prompt = `${task.title || task.description}${task.clientName ? ` for ${task.clientName}` : ""}`
                    const token = await user.getIdToken()
                    await generateVisual(task.id, prompt, user.uid, token)
                  }}
                >
                  <ImageIcon className="w-3 h-3 mr-0.5 md:mr-1" />
                  <span className="hidden sm:inline">Genera Visual</span>
                  <span className="sm:hidden">Visual</span>
                </Button>
              </div>
            </div>
          </Card>
        )
      }}
    </Draggable>
  )
}
