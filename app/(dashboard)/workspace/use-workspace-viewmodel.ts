"use client"

import { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import {
  fetchTasksByClient,
  addTask,
  // ... altre azioni thunk
  selectAllTasks,
  selectTasksLoading,
  selectCurrentSelectedTask,
  setSelectedTask,
  updateLocalTaskOptimistic,
  // ... altri selettori
} from "@/app/store/slices/tasks-slice"
import type { AppDispatch } from "@/app/store/store"
import type { Task } from "@/lib/types"
import { useAuth } from "@/lib/auth-context" // Per tenantId, userId

// Questo è un esempio di ViewModel per la gestione del workspace
export function useWorkspaceViewModel(selectedClientId: string | null) {
  const dispatch = useDispatch<AppDispatch>()
  const tasks = useSelector(selectAllTasks)
  const isLoading = useSelector(selectTasksLoading)
  const currentSelectedTask = useSelector(selectCurrentSelectedTask)
  const { user } = useAuth() // Per ottenere tenantId

  useEffect(() => {
    if (selectedClientId) {
      dispatch(fetchTasksByClient(selectedClientId))
    }
  }, [dispatch, selectedClientId])

  const handleAddTask = async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "subItems" | "attachments">,
  ) => {
    if (!user?.uid) {
      console.error("User not authenticated for adding task")
      // Potresti mostrare un toast di errore
      return
    }
    // Aggiungi tenantId o altre informazioni necessarie
    await dispatch(addTask({ ...taskData, tenantId: user.uid }))
    // Potresti voler re-fetchare le tasks o RTK Query lo farebbe automaticamente con le invalidazioni
  }

  const handleSelectTask = (task: Task | null) => {
    dispatch(setSelectedTask(task))
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Implementa thunk per aggiornare su Firebase
    // Esempio di aggiornamento ottimistico:
    dispatch(updateLocalTaskOptimistic({ id: taskId, ...updates }))
    // await dispatch(updateTaskOnServer({ taskId, updates })); // Thunk che chiama Firebase
  }

  // Funzione per spostare una task (drag and drop)
  const handleMoveTask = async (taskId: string, newColumnId: string, newOrder?: number) => {
    // Aggiornamento ottimistico
    dispatch(updateLocalTaskOptimistic({ id: taskId, columnId: newColumnId /* order: newOrder */ }))
    // Chiamata al backend
    // await dispatch(moveTaskOnServer({ taskId, newColumnId, newOrder }));
    // Potrebbe essere necessario un thunk specifico in tasks-slice.ts
    console.log(`Moving task ${taskId} to column ${newColumnId}`)
    // Qui andrebbe la logica per chiamare Firebase e aggiornare la task
    // Esempio: dispatch(updateTask({ id: taskId, columnId: newColumnId, ... }))
  }

  return {
    tasks,
    isLoading,
    currentSelectedTask,
    handleAddTask,
    handleSelectTask,
    handleUpdateTask,
    handleMoveTask,
    // ...altre funzioni e dati esposti alla View
  }
}
