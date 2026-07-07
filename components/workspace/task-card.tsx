"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  MonitorUp,
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
  Eye,
  Trash2,
  Flag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAutoGenStore } from "@/lib/stores/auto-gen-store";
import { useWorkspaceNav } from "@/lib/stores/workspace-nav-store";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/lib/types";

interface ColumnOption {
  id: string;
  title: string;
}

interface TaskCardProps {
  task: Task;
  index: number;
  dragEnabled: boolean;
  showAllClients: boolean;
  availableColumns: ColumnOption[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (task: Task) => void;
  getPriorityColor: (priority: string) => string;
  getScoreColor: (score: number) => string;
}

function getColumnCardSurface(columnId?: string) {
  switch (columnId) {
    case "urgenze":
      return "bg-white border-y-rose-200 border-r-rose-200 dark:bg-slate-900 dark:border-y-rose-400/25 dark:border-r-rose-400/25";
    case "in-corso":
    case "in-progress":
      return "bg-white border-y-amber-200 border-r-amber-200 dark:bg-slate-900 dark:border-y-amber-400/25 dark:border-r-amber-400/25";
    case "validation":
    case "review":
      return "bg-white border-y-violet-200 border-r-violet-200 dark:bg-slate-900 dark:border-y-violet-400/25 dark:border-r-violet-400/25";
    case "done":
    case "completed":
      return "bg-white border-y-emerald-200 border-r-emerald-200 dark:bg-slate-900 dark:border-y-emerald-400/25 dark:border-r-emerald-400/25";
    case "sospensioni":
    case "on-hold":
      return "bg-white border-y-slate-300 border-r-slate-300 dark:bg-slate-900 dark:border-y-slate-700 dark:border-r-slate-700";
    case "attivita-ricorrenti":
    case "recurring":
      return "bg-white border-y-indigo-200 border-r-indigo-200 dark:bg-slate-900 dark:border-y-indigo-400/25 dark:border-r-indigo-400/25";
    case "planning":
      return "bg-white border-y-cyan-200 border-r-cyan-200 dark:bg-slate-900 dark:border-y-cyan-400/25 dark:border-r-cyan-400/25";
    default:
      return "bg-white border-y-slate-200 border-r-slate-200 dark:bg-slate-900 dark:border-y-slate-800 dark:border-r-slate-800";
  }
}

function getColumnDotClass(columnId?: string) {
  switch (columnId) {
    case "to-do":
    case "backlog":
      return "bg-blue-500";
    case "urgenze":
      return "bg-rose-500";
    case "in-corso":
    case "in-progress":
      return "bg-amber-500";
    case "validation":
    case "review":
      return "bg-violet-500";
    case "done":
    case "completed":
      return "bg-emerald-500";
    case "sospensioni":
    case "on-hold":
      return "bg-slate-500";
    case "attivita-ricorrenti":
    case "recurring":
      return "bg-indigo-500";
    case "planning":
      return "bg-cyan-500";
    default:
      return "bg-slate-400";
  }
}

const priorityOptions: Array<{ value: Task["priority"]; label: string }> = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Bassa" },
];

function localDateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dueDateFromOffset(offsetDays: number) {
  return new Date(`${localDateInput(offsetDays)}T12:00:00`);
}

function isCurrentTaskColumn(task: Task, columnId: string) {
  return (task.columnId || task.status) === columnId;
}

export function TaskCard({
  task,
  index,
  dragEnabled,
  showAllClients,
  availableColumns,
  onTaskClick,
  onUpdateTask,
  onDeleteTask,
  getPriorityColor,
  getScoreColor,
}: TaskCardProps) {
  const { user } = useAuth();
  const { highlightedTaskId } = useWorkspaceNav();
  const { toast } = useToast();
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);

  const updateFromMenu = async (
    action: string,
    updates: Partial<Task>,
    successTitle: string,
  ) => {
    setUpdatingAction(action);
    try {
      await onUpdateTask(task.id, updates);
      toast({ title: successTitle });
    } catch (error) {
      toast({
        title: "Aggiornamento non riuscito",
        description:
          error instanceof Error
            ? error.message
            : "Impossibile modificare la task",
        variant: "destructive",
      });
    } finally {
      setUpdatingAction(null);
    }
  };

  return (
    <Draggable
      key={task.id}
      draggableId={task.id}
      index={index}
      isDragDisabled={!dragEnabled}
    >
      {(provided, snapshot) => {
        const isHighlighted = highlightedTaskId === task.id;
        const draggableStyle = provided.draggableProps.style;
        const dropStyle = snapshot.isDropAnimating
          ? {
              ...draggableStyle,
              transitionDuration: "120ms",
            }
          : draggableStyle;

        return (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={dropStyle}
            id={`task-${task.id}`}
            className={`group min-h-[112px] cursor-pointer rounded-[8px] border-l-4 p-3 transition-[transform,box-shadow,border-color] duration-150 ease-out will-change-transform [touch-action:pan-x_pan-y] sm:min-h-[124px] lg:[touch-action:auto] ${getPriorityColor(task.priority)} ${
              snapshot.isDragging
                ? "z-50 rotate-1 scale-[1.02] shadow-2xl transform-gpu"
                : isHighlighted
                  ? "shadow-xl shadow-righello-pink/25 border-righello-pink ring-2 ring-righello-pink/30"
                  : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:hover:border-slate-700"
            } ${getColumnCardSurface(task.columnId || task.status)} text-slate-950 border-y border-r shadow-sm dark:text-slate-50`}
            onClick={() => onTaskClick(task)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 break-words text-sm font-black leading-snug text-slate-950 line-clamp-2 dark:text-slate-50">
                  {task.title}
                </h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.score && task.score > 0 && (
                    <div
                      className={`flex items-center gap-1 rounded-full px-2 py-1 ${getScoreColor(task.score)}`}
                    >
                      <Star className="h-3 w-3" />
                      <span className="text-xs font-bold">{task.score}</span>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 shrink-0 rounded-[8px] p-0 text-slate-600 hover:bg-slate-900/10 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:h-8 sm:w-8"
                        aria-label="Configura task"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="z-[100] w-64 rounded-lg border-slate-200 bg-white p-2 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuLabel className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Configurazione task
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                        onSelect={(event) => {
                          event.preventDefault();
                          onTaskClick(task);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Apri dettagli
                      </DropdownMenuItem>

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="h-11 cursor-pointer rounded-md focus:bg-slate-100 data-[state=open]:bg-slate-100 dark:focus:bg-slate-900 dark:data-[state=open]:bg-slate-900">
                          <Clock className="h-4 w-4" />
                          Sposta in stato
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="z-[110] w-56 rounded-lg border-slate-200 bg-white p-2 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                          {availableColumns.map((column) => (
                            <DropdownMenuItem
                              key={column.id}
                              disabled={
                                isCurrentTaskColumn(task, column.id) ||
                                updatingAction !== null
                              }
                              className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                              onSelect={(event) => {
                                event.preventDefault();
                                void updateFromMenu(
                                  `status:${column.id}`,
                                  {
                                    columnId: column.id,
                                    status: column.id as Task["status"],
                                  },
                                  `Task spostata in ${column.title}`,
                                );
                              }}
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${getColumnDotClass(column.id)}`}
                              />
                              <span className="truncate">{column.title}</span>
                              {isCurrentTaskColumn(task, column.id) && (
                                <span className="ml-auto text-xs text-slate-500">
                                  attuale
                                </span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="h-11 cursor-pointer rounded-md focus:bg-slate-100 data-[state=open]:bg-slate-100 dark:focus:bg-slate-900 dark:data-[state=open]:bg-slate-900">
                          <MonitorUp className="h-4 w-4" />
                          Modalità lavoro
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="z-[110] w-48 rounded-lg border-slate-200 bg-white p-2 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                          <DropdownMenuItem
                            disabled={
                              task.workMode !== "remote" ||
                              updatingAction !== null
                            }
                            className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                            onSelect={(event) => {
                              event.preventDefault();
                              void updateFromMenu(
                                "work-mode:office",
                                { workMode: "office" },
                                "Task impostata in sede",
                              );
                            }}
                          >
                            <Briefcase className="h-4 w-4" />
                            In sede
                            {task.workMode !== "remote" && (
                              <span className="ml-auto text-xs text-slate-500">
                                attuale
                              </span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              task.workMode === "remote" ||
                              updatingAction !== null
                            }
                            className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                            onSelect={(event) => {
                              event.preventDefault();
                              void updateFromMenu(
                                "work-mode:remote",
                                { workMode: "remote" },
                                "Task impostata in remoto",
                              );
                            }}
                          >
                            <MonitorUp className="h-4 w-4" />
                            Remoto
                            {task.workMode === "remote" && (
                              <span className="ml-auto text-xs text-slate-500">
                                attuale
                              </span>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="h-11 cursor-pointer rounded-md focus:bg-slate-100 data-[state=open]:bg-slate-100 dark:focus:bg-slate-900 dark:data-[state=open]:bg-slate-900">
                          <Flag className="h-4 w-4" />
                          Priorità
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="z-[110] w-48 rounded-lg border-slate-200 bg-white p-2 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                          {priorityOptions.map((priority) => (
                            <DropdownMenuItem
                              key={priority.value}
                              disabled={
                                task.priority === priority.value ||
                                updatingAction !== null
                              }
                              className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                              onSelect={(event) => {
                                event.preventDefault();
                                void updateFromMenu(
                                  `priority:${priority.value}`,
                                  { priority: priority.value },
                                  `Priorità impostata su ${priority.label}`,
                                );
                              }}
                            >
                              <Flag className="h-4 w-4" />
                              {priority.label}
                              {task.priority === priority.value && (
                                <span className="ml-auto text-xs text-slate-500">
                                  attuale
                                </span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="h-11 cursor-pointer rounded-md focus:bg-slate-100 data-[state=open]:bg-slate-100 dark:focus:bg-slate-900 dark:data-[state=open]:bg-slate-900">
                          <Calendar className="h-4 w-4" />
                          Scadenza rapida
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="z-[110] w-52 rounded-lg border-slate-200 bg-white p-2 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                          {[
                            { label: "Oggi", offset: 0 },
                            { label: "Domani", offset: 1 },
                            { label: "Tra 7 giorni", offset: 7 },
                          ].map((option) => (
                            <DropdownMenuItem
                              key={option.label}
                              disabled={updatingAction !== null}
                              className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                              onSelect={(event) => {
                                event.preventDefault();
                                void updateFromMenu(
                                  `due:${option.offset}`,
                                  { dueDate: dueDateFromOffset(option.offset) },
                                  `Scadenza impostata: ${option.label}`,
                                );
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
                          <DropdownMenuItem
                            disabled={!task.dueDate || updatingAction !== null}
                            className="h-11 cursor-pointer rounded-md focus:bg-slate-100 dark:focus:bg-slate-900"
                            onSelect={(event) => {
                              event.preventDefault();
                              void updateFromMenu(
                                "due:clear",
                                { dueDate: null },
                                "Scadenza rimossa",
                              );
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                            Nessuna scadenza
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
                      <DropdownMenuItem
                        className="h-11 cursor-pointer rounded-md text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-300 dark:focus:bg-red-950/40 dark:focus:text-red-200"
                        onSelect={(event) => {
                          event.preventDefault();
                          onDeleteTask(task);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Elimina task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {task.description && (
                <p className="text-xs leading-relaxed text-slate-700 line-clamp-2 dark:text-slate-300">
                  {task.description}
                </p>
              )}

              {task.type && (
                <Badge
                  variant="outline"
                  className="rounded-[8px] border-slate-300 bg-slate-50 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                >
                  {task.type}
                </Badge>
              )}

              {task.projectName && (
                <Badge
                  variant="outline"
                  className="max-w-full rounded-[8px] border-cyan-300/70 bg-cyan-50/85 text-xs font-medium text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-100"
                >
                  <Briefcase className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{task.projectName}</span>
                </Badge>
              )}

              {task.workMode === "remote" && (
                <Badge
                  variant="outline"
                  className="max-w-full rounded-[8px] border-cyan-300/70 bg-cyan-50/85 text-xs font-semibold text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-100"
                >
                  <MonitorUp className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Remoto</span>
                </Badge>
              )}

              {task.assignmentStatus === "pending" && (
                <Badge
                  variant="outline"
                  className="max-w-full border-amber-300 bg-amber-50/90 text-xs font-semibold text-amber-800"
                >
                  <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">In attesa di accettazione</span>
                </Badge>
              )}

              {task.assignmentStatus === "rejected" && (
                <Badge
                  variant="outline"
                  className="max-w-full border-rose-300 bg-rose-50/90 text-xs font-semibold text-rose-800"
                >
                  <XCircle className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Assegnazione rifiutata</span>
                </Badge>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-white/55 text-xs font-medium text-slate-700"
                    >
                      <Tag className="mr-1 h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {showAllClients &&
                task.clientName &&
                task.clientName !== "all" && (
                  <div className="flex items-center gap-1">
                    <div className="h-3.5 w-3.5 rounded bg-gradient-to-br from-cyan-500 to-righello-pink"></div>
                    <span className="text-xs font-semibold text-slate-700">
                      {task.clientName}
                    </span>
                  </div>
                )}

              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {task.dueDate
                      ? (task.dueDate instanceof Date
                          ? task.dueDate
                          : task.dueDate?.toDate &&
                              typeof task.dueDate.toDate === "function"
                            ? task.dueDate.toDate()
                            : new Date(task.dueDate as any)
                        ).toLocaleDateString("it-IT", {
                          month: "short",
                          day: "numeric",
                        })
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
                        ✓{" "}
                        {task.subItems.filter((item) => item.completed).length}/
                        {task.subItems.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                Assegnato a: {task.assignee || "Non assegnato"}
              </div>

              {(task.contentType === "post" ||
                task.contentType === "video") && (
                <div
                  className="mt-2 flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 min-w-0 flex-1 border-slate-300 bg-white/55 px-2 text-xs text-slate-800 hover:bg-white"
                    onClick={async () => {
                      if (!user) return;
                      const { generateCopy } = useAutoGenStore.getState();
                      await generateCopy(
                        task.id,
                        task.title || task.description || "",
                        task.clientName || "",
                        user.uid,
                      );
                    }}
                  >
                    <Sparkles className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">
                      Genera Copy
                    </span>
                    <span className="sm:hidden truncate">Copy</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 min-w-0 flex-1 border-slate-300 bg-white/55 px-2 text-xs text-slate-800 hover:bg-white"
                    onClick={async () => {
                      if (!user) return;
                      const { generateVisual } = useAutoGenStore.getState();
                      const prompt = `${task.title || task.description}${task.clientName ? ` for ${task.clientName}` : ""}`;
                      const token = await user.getIdToken();
                      await generateVisual(task.id, prompt, user.uid, token);
                    }}
                  >
                    <ImageIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">
                      Genera Visual
                    </span>
                    <span className="sm:hidden truncate">Visual</span>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      }}
    </Draggable>
  );
}
