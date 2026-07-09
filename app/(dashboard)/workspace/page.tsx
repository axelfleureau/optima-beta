"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  type WorkspaceAction,
  useWorkspaceNav,
} from "@/lib/stores/workspace-nav-store";
import { useArchitectStore } from "@/lib/stores/architect-store";
import { useAutoGenStore } from "@/lib/stores/auto-gen-store";
import { getTaskById } from "@/lib/utils/task-matcher";
import { useAuth } from "@/lib/auth-context";
import { DynamicWorkspace } from "@/components/dynamic-workspace";

// Lazy load Auto-Gen Preview Dialog - reduces initial bundle size
const AutoGenPreview = dynamic(
  () =>
    import("@/components/calendar/auto-gen-preview").then((mod) => ({
      default: mod.AutoGenPreview,
    })),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl border border-purple-200/50">
          <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Caricamento anteprima...
          </p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

function normalizeAction(value: string | null): WorkspaceAction {
  if (
    value === "refine" ||
    value === "generate-copy" ||
    value === "generate-visual"
  ) {
    return value;
  }
  return "view";
}

export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    selectedTaskId,
    pendingAction,
    highlightedTaskId,
    navigateToTask,
    clearNavigation,
    setHighlight,
  } = useWorkspaceNav();
  const { openArchitect } = useArchitectStore();
  const { generateCopy, generateVisual } = useAutoGenStore();

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    const action = normalizeAction(searchParams.get("action"));

    if (taskId) {
      navigateToTask(taskId, action);
      scrollToTask(taskId);
      setHighlight(taskId);

      const executeAction = async () => {
        if (action === "refine") {
          const task = await getTaskById(taskId);
          if (task) {
            openArchitect(task.title, task.clientId, task.clientName);
          }
        } else if (action === "generate-copy") {
          const task = await getTaskById(taskId);
          if (task && user) {
            generateCopy(taskId, task.title, task.clientName, user.uid);
          }
        } else if (action === "generate-visual") {
          const task = await getTaskById(taskId);
          if (task && user) {
            const token = await user.getIdToken();
            generateVisual(
              taskId,
              `${task.title}${task.clientName ? ` for ${task.clientName}` : ""}`,
              user.uid,
              token,
            );
          }
        }

        if (action !== "view") {
          setTimeout(() => clearNavigation(), 2500);
        }
      };

      executeAction();
    }
  }, [searchParams, user, navigateToTask, setHighlight, clearNavigation]);

  useEffect(() => {
    if (selectedTaskId && pendingAction) {
      scrollToTask(selectedTaskId);
      setHighlight(selectedTaskId);

      const executeAction = async () => {
        if (pendingAction === "refine") {
          const task = await getTaskById(selectedTaskId);
          if (task) {
            openArchitect(task.title, task.clientId, task.clientName);
          }
        } else if (pendingAction === "generate-copy") {
          const task = await getTaskById(selectedTaskId);
          if (task && user) {
            generateCopy(selectedTaskId, task.title, task.clientName, user.uid);
          }
        } else if (pendingAction === "generate-visual") {
          const task = await getTaskById(selectedTaskId);
          if (task && user) {
            const token = await user.getIdToken();
            generateVisual(
              selectedTaskId,
              `${task.title}${task.clientName ? ` for ${task.clientName}` : ""}`,
              user.uid,
              token,
            );
          }
        }

        if (pendingAction !== "view") {
          setTimeout(() => clearNavigation(), 500);
        }
      };

      executeAction();
    }
  }, [selectedTaskId, pendingAction, user, clearNavigation]);

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlight(null);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId, setHighlight]);

  return (
    <div className="optima-ops-page">
      <DynamicWorkspace />
      <AutoGenPreview />
    </div>
  );
}

function scrollToTask(taskId: string) {
  setTimeout(() => {
    const element = document.getElementById(`task-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 500);
}
