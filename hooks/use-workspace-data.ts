"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Task, TaskComment, SubItem } from "@/lib/types";
import {
  notifyOperationalDataChanged,
  useLiveRefresh,
} from "@/hooks/use-live-refresh";
import {
  humanizeSessionErrorMessage,
  isSessionExpiredError,
  isSessionExpiredStatus,
  SessionAwareRequestError,
} from "@/lib/session-error";

type CreateTaskInput = {
  title: string;
  description?: string;
  richDescription?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  workMode?: "office" | "remote";
  type?: string;
  score?: number;
  dueDate?: string | Date | null;
  assignee?: string;
  assignedUserId?: string | null;
  columnId?: string;
  status?: string;
  clientId?: string;
  clientName?: string;
  projectId?: string | null;
  projectName?: string;
  attachments?: unknown[];
  tags?: string[];
};

type MoveTaskOptions = {
  destinationIndex?: number;
};

type TaskUpdateInput = Partial<Task> & {
  assignmentAction?: "accept" | "reject";
  assignmentRejectionReason?: string | null;
};

async function parseTaskResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SessionAwareRequestError(
      isSessionExpiredStatus(response.status)
        ? humanizeSessionErrorMessage(payload.error)
        : payload.error || "Operazione workspace non riuscita",
      response.status,
    );
  }

  return payload;
}

function getTaskColumn(task: Task) {
  return task.columnId || task.status;
}

function reorderTaskForMove(
  current: Task[],
  taskId: string,
  newColumnId: string,
  destinationIndex?: number,
) {
  const movingTask = current.find((task) => task.id === taskId);

  if (!movingTask) {
    return current;
  }

  const movedTask = {
    ...movingTask,
    columnId: newColumnId,
    status: newColumnId as Task["status"],
    updatedAt: new Date(),
  };

  const withoutMovingTask = current.filter((task) => task.id !== taskId);

  if (typeof destinationIndex !== "number") {
    return [movedTask, ...withoutMovingTask];
  }

  const nextTasks: Task[] = [];
  let targetColumnCount = 0;
  let inserted = false;

  for (const task of withoutMovingTask) {
    if (
      !inserted &&
      getTaskColumn(task) === newColumnId &&
      targetColumnCount === destinationIndex
    ) {
      nextTasks.push(movedTask);
      inserted = true;
    }

    nextTasks.push(task);

    if (getTaskColumn(task) === newColumnId) {
      targetColumnCount += 1;
    }
  }

  if (!inserted) {
    nextTasks.push(movedTask);
  }

  return nextTasks;
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    createdAt: task.createdAt ? new Date(task.createdAt as any) : new Date(),
    updatedAt: task.updatedAt ? new Date(task.updatedAt as any) : new Date(),
    dueDate: task.dueDate ? new Date(task.dueDate as any) : null,
    assignmentStatus: task.assignmentStatus || "accepted",
    assignmentRequestedAt: task.assignmentRequestedAt
      ? new Date(task.assignmentRequestedAt as any)
      : null,
    assignmentRespondedAt: task.assignmentRespondedAt
      ? new Date(task.assignmentRespondedAt as any)
      : null,
    comments: (task.comments || []).map((comment) => ({
      ...comment,
      createdAt: comment.createdAt
        ? new Date(comment.createdAt as any)
        : new Date(),
      updatedAt: comment.updatedAt
        ? new Date(comment.updatedAt as any)
        : undefined,
    })),
    subItems: (task.subItems || []).map((item) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt as any) : new Date(),
    })),
    tags: task.tags || [],
    attachments: task.attachments || [],
  };
}

export function useWorkspaceData() {
  const { user, userData, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refreshTasks = useCallback(async () => {
    if (authLoading) return;

    if (!user || !userData?.tenantId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(!hasLoadedRef.current);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await parseTaskResponse(response);
      setTasks((payload.tasks || []).map(normalizeTask));
    } catch (err) {
      console.error("Error loading workspace tasks:", err);
      if (isSessionExpiredError(err) && hasLoadedRef.current) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento delle task",
      );
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [authLoading, user, userData?.tenantId]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useLiveRefresh(refreshTasks, {
    enabled: Boolean(user && userData?.tenantId && !authLoading),
    intervalMs: 15000,
  });

  const createTask = async (task: CreateTaskInput) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(task),
      });

      const payload = await parseTaskResponse(response);
      const createdTask = normalizeTask(payload.task);
      setTasks((current) => [createdTask, ...current]);
      notifyOperationalDataChanged();
      return createdTask;
    } catch (err) {
      console.error("Error creating task:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante la creazione della task",
      );
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: TaskUpdateInput) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updates),
      });

      const payload = await parseTaskResponse(response);
      const updatedTask = normalizeTask(payload.task);
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      notifyOperationalDataChanged();
    } catch (err) {
      console.error("Error updating task:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'aggiornamento della task",
      );
      throw err;
    }
  };

  const uploadTaskAttachments = async (taskId: string, files: File[]) => {
    if (files.length === 0) return;

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      const payload = await parseTaskResponse(response);
      const updatedTask = normalizeTask(payload.task);
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      notifyOperationalDataChanged();
      return updatedTask;
    } catch (err) {
      console.error("Error uploading task attachments:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante il caricamento degli allegati",
      );
      throw err;
    }
  };

  const deleteTaskAttachment = async (taskId: string, attachmentId: string) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );

      const payload = await parseTaskResponse(response);
      const updatedTask = normalizeTask(payload.task);
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      notifyOperationalDataChanged();
      return updatedTask;
    } catch (err) {
      console.error("Error deleting task attachment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante la rimozione dell'allegato",
      );
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    const previousTasks = tasks;
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      await parseTaskResponse(response);
      notifyOperationalDataChanged();
    } catch (err) {
      console.error("Error deleting task:", err);
      setTasks(previousTasks);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'eliminazione della task",
      );
      throw err;
    }
  };

  const moveTask = async (
    taskId: string,
    newColumnId: string,
    options: MoveTaskOptions = {},
  ) => {
    let previousTasks: Task[] = [];

    setError(null);
    setTasks((current) => {
      previousTasks = current;
      return reorderTaskForMove(
        current,
        taskId,
        newColumnId,
        options.destinationIndex,
      );
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          columnId: newColumnId,
        }),
      });

      const payload = await parseTaskResponse(response);
      const updatedTask = normalizeTask(payload.task);
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      notifyOperationalDataChanged();
    } catch (err) {
      console.error("Error moving task:", err);
      setTasks(previousTasks);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante lo spostamento della task",
      );
      throw err;
    }
  };

  const addComment = async (
    taskId: string,
    comment: Omit<TaskComment, "id" | "createdAt">,
  ) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    const nextComment: TaskComment = {
      id: `comment_${Date.now()}`,
      text: comment.text,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorAvatar: comment.authorAvatar || null,
      mentions: comment.mentions || [],
      attachments: comment.attachments || [],
      createdAt: new Date(),
    };

    await updateTask(taskId, {
      comments: [...(currentTask?.comments || []), nextComment],
    });
  };

  const updateSubItems = async (taskId: string, subItems: SubItem[]) => {
    await updateTask(taskId, { subItems });
  };

  const acceptTaskAssignment = async (taskId: string) => {
    await updateTask(taskId, { assignmentAction: "accept" });
  };

  const rejectTaskAssignment = async (taskId: string, reason?: string) => {
    await updateTask(taskId, {
      assignmentAction: "reject",
      assignmentRejectionReason: reason,
    });
  };

  return {
    tasks,
    loading,
    error,
    refreshTasks,
    createTask,
    moveTask,
    updateTask,
    deleteTask,
    uploadTaskAttachments,
    deleteTaskAttachment,
    addComment,
    updateSubItems,
    acceptTaskAssignment,
    rejectTaskAssignment,
  };
}
