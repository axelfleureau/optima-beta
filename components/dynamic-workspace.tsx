"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { useClients } from "@/hooks/use-clients";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { WorkspaceShell } from "./workspace/workspace-shell";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Clock,
  Target,
  MoreHorizontal,
  Star,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { useWorkspaceNav } from "@/lib/stores/workspace-nav-store";
import type { Task } from "@/lib/types";

// Lazy load Task Detail Dialog - reduces initial bundle (uses @hello-pangea/dnd, complex form)
const TaskDetailDialog = dynamic(
  () =>
    import("@/components/task-detail-dialog").then((mod) => ({
      default: mod.TaskDetailDialog,
    })),
  {
    loading: () => null,
    ssr: false,
  },
);

const defaultColumns = [
  {
    id: "to-do",
    title: "To Do",
    color: "border-blue-200",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "urgenze",
    title: "Urgenze",
    color: "border-red-200",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    id: "in-corso",
    title: "In Corso",
    color: "border-yellow-200",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    id: "validation",
    title: "Validation",
    color: "border-purple-200",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    id: "done",
    title: "Done",
    color: "border-green-200",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    id: "sospensioni",
    title: "Sospensioni",
    color: "border-gray-300",
    bgColor: "bg-gray-50",
    iconColor: "text-gray-600",
  },
  {
    id: "attivita-ricorrenti",
    title: "Attività Ricorrenti",
    color: "border-indigo-200",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
];

export function DynamicWorkspace() {
  const { user, userData } = useAuth();
  const { loading: clientsLoading } = useClients();
  const {
    tasks: allTasks,
    loading: tasksLoading,
    moveTask,
    updateTask,
    uploadTaskAttachments,
    deleteTaskAttachment,
    addComment,
    updateSubItems,
    acceptTaskAssignment,
    rejectTaskAssignment,
  } = useWorkspaceData();
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { highlightedTaskId } = useWorkspaceNav();

  const isClient = userData?.role === "client";

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;
    void moveTask(draggableId, destination.droppableId, {
      destinationIndex: destination.index,
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/10";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10";
      case "low":
        return "border-l-green-500 bg-green-50 dark:bg-green-900/10";
      default:
        return "border-l-gray-300 bg-gray-50 dark:bg-gray-800/50";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-red-600 bg-red-100";
    if (score >= 5) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  if (!user) {
    return (
      <div className="optima-ops-page flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/10 border-t-righello-pink rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-400">
            Accesso in corso...
          </p>
        </div>
      </div>
    );
  }

  if (clientsLoading) {
    return (
      <div className="optima-ops-page flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/10 border-t-righello-pink rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-400">
            Caricamento workspace...
          </p>
        </div>
      </div>
    );
  }

  if (isClient) {
    return (
      <div className="optima-ops-page">
        <div className="flex min-h-screen flex-col">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <Target className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                    {userData?.companyName || "Il Mio Workspace"}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Gestisci le tue richieste e monitora i progressi
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
            {tasksLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-slate-600 dark:border-slate-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                    Caricamento task...
                  </p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div
                  className="flex gap-6 h-full"
                  style={{ minWidth: "1400px" }}
                >
                  {defaultColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex flex-col w-80 min-w-80"
                    >
                      <div
                        className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-t-2xl p-4 shadow-lg border-t-4 ${column.color}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg ${column.bgColor} flex items-center justify-center`}
                            >
                              <Clock
                                className={`h-4 w-4 ${column.iconColor}`}
                              />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                              {column.title}
                            </h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {
                              allTasks.filter(
                                (task) => task.columnId === column.id,
                              ).length
                            }
                          </Badge>
                        </div>
                      </div>

                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-b-2xl p-4 space-y-3 overflow-y-auto transition-all duration-200 ${
                              snapshot.isDraggingOver
                                ? "bg-blue-50/60 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-600"
                                : ""
                            }`}
                            style={{
                              minHeight: "500px",
                              maxHeight: "calc(100vh - 250px)",
                            }}
                          >
                            {allTasks
                              .filter((task) => task.columnId === column.id)
                              .map((task, index) => (
                                <Draggable
                                  key={task.id}
                                  draggableId={task.id}
                                  index={index}
                                  isDragDisabled
                                >
                                  {(provided, snapshot) => {
                                    const isHighlighted =
                                      highlightedTaskId === task.id;

                                    return (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        id={`task-${task.id}`}
                                        className={`p-4 cursor-pointer transition-all duration-300 border-l-4 ${getPriorityColor(task.priority)} ${
                                          snapshot.isDragging
                                            ? "shadow-2xl rotate-2 z-50 scale-105"
                                            : isHighlighted
                                              ? "shadow-xl shadow-purple-500/50 border-purple-500 bg-purple-500/10 dark:bg-purple-500/20 scale-105"
                                              : "hover:shadow-lg hover:scale-102"
                                        } bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50`}
                                        onClick={() => handleTaskClick(task)}
                                      >
                                        <div className="space-y-3">
                                          <div className="flex items-start justify-between">
                                            <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
                                              {task.title}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                              {task.score && task.score > 0 && (
                                                <div
                                                  className={`flex items-center gap-1 px-2 py-1 rounded-full ${getScoreColor(task.score)}`}
                                                >
                                                  <Star className="h-3 w-3" />
                                                  <span className="text-xs font-medium">
                                                    {task.score}
                                                  </span>
                                                </div>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                                              >
                                                <MoreHorizontal className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>

                                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                            {task.description}
                                          </p>

                                          {task.type && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs border-slate-300 dark:border-slate-600"
                                            >
                                              {task.type}
                                            </Badge>
                                          )}

                                          {task.tags &&
                                            task.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {task.tags.map(
                                                  (tag: string) => (
                                                    <Badge
                                                      key={tag}
                                                      variant="secondary"
                                                      className="text-xs bg-slate-100 dark:bg-slate-700"
                                                    >
                                                      <Tag className="h-2 w-2 mr-1" />
                                                      {tag}
                                                    </Badge>
                                                  ),
                                                )}
                                              </div>
                                            )}

                                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>
                                                {task.dueDate
                                                  ? (task.dueDate instanceof
                                                    Date
                                                      ? task.dueDate
                                                      : task.dueDate?.toDate &&
                                                          typeof task.dueDate
                                                            .toDate ===
                                                            "function"
                                                        ? task.dueDate.toDate()
                                                        : new Date(
                                                            task.dueDate as any,
                                                          )
                                                    ).toLocaleDateString(
                                                      "it-IT",
                                                    )
                                                  : "Nessuna scadenza"}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {(task.comments || []).length >
                                                0 && (
                                                <div className="flex items-center gap-1">
                                                  <MessageSquare className="h-3 w-3" />
                                                  <span>
                                                    {
                                                      (task.comments || [])
                                                        .length
                                                    }
                                                  </span>
                                                </div>
                                              )}
                                              {task.attachments &&
                                                task.attachments.length > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <Paperclip className="h-3 w-3" />
                                                    <span>
                                                      {task.attachments.length}
                                                    </span>
                                                  </div>
                                                )}
                                              {task.subItems &&
                                                task.subItems.length > 0 && (
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-xs">
                                                      ✓{" "}
                                                      {
                                                        task.subItems.filter(
                                                          (item) =>
                                                            item.completed,
                                                        ).length
                                                      }
                                                      /{task.subItems.length}
                                                    </span>
                                                  </div>
                                                )}
                                            </div>
                                          </div>

                                          <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Assegnato a:{" "}
                                            {task.assignee || "Non assegnato"}
                                          </div>

                                          <div className="rounded-lg border border-slate-200/70 px-3 py-2 text-xs text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                                            Workspace cliente in sola revisione:
                                            commenti e dettagli sono disponibili
                                            aprendo la card.
                                          </div>
                                        </div>
                                      </Card>
                                    );
                                  }}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            )}
          </div>

          <TaskDetailDialog
            task={selectedTask}
            open={showTaskDetailDialog}
            onOpenChange={setShowTaskDetailDialog}
            onUpdateTask={updateTask}
            onUploadAttachments={uploadTaskAttachments}
            onDeleteAttachment={deleteTaskAttachment}
            onAddComment={addComment}
            onUpdateSubItems={updateSubItems}
            onAcceptAssignment={acceptTaskAssignment}
            onRejectAssignment={rejectTaskAssignment}
          />
        </div>
      </div>
    );
  }

  return <WorkspaceShell />;
}
