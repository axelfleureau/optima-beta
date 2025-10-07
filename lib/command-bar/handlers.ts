import type { CommandIntent, CommandContext, CommandExecutionResult } from "@/lib/types"
import { addDoc, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function executeIntent(
  intent: CommandIntent,
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  console.log("🎯 Executing intent:", intent, "with entities:", entities)

  try {
    switch (intent) {
      case "CREATE_TASK":
        return await handleCreateTask(entities, context)
      case "SEARCH_TASK":
        return await handleSearchTask(entities, context)
      case "ASSIGN_TASK":
        return await handleAssignTask(entities, context)
      case "UPDATE_TASK":
        return await handleUpdateTask(entities, context)
      case "NAVIGATE":
        return await handleNavigate(entities, context)
      case "SHOW_ANALYTICS":
        return await handleShowAnalytics(context)
      case "SEARCH_GLOBAL":
        return await handleSearchGlobal(entities, context)
      case "TASK_REFINEMENT":
        return await handleTaskRefinement(entities, context)
      case "GENERATE_DELIVERABLE":
        return await handleGenerateDeliverable(entities, context)
      default:
        return {
          success: false,
          message: "Intent non supportato",
          error: `Intent ${intent} non è ancora implementato`,
        }
    }
  } catch (error: any) {
    console.error("❌ Intent execution error:", error)
    return {
      success: false,
      message: "Errore durante l'esecuzione",
      error: error.message,
    }
  }
}

async function handleCreateTask(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    let clientId = entities.clientId

    if (!clientId && entities.clientName) {
      const clientDoc = context.availableClients?.find(
        (c) => c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (clientDoc) {
        clientId = clientDoc.id
      }
    }

    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato o non trovato",
        error: "Specifica un cliente valido per la task",
      }
    }

    const taskData = {
      title: entities.title || "Nuova Task",
      description: entities.description || "",
      status: entities.status || "todo",
      columnId: entities.status || "to-do",
      priority: entities.priority || "medium",
      clientId: clientId,
      tenantId: context.tenantId,
      createdBy: context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedUserId: entities.assignedUserId || null,
      dueDate: entities.dueDate || null,
      tags: entities.tags || [],
      comments: [],
      subItems: [],
      attachments: [],
    }

    const docRef = await addDoc(collection(db, "tasks"), taskData)

    return {
      success: true,
      message: `Task "${taskData.title}" creata con successo!`,
      data: { id: docRef.id, ...taskData },
    }
  } catch (error: any) {
    console.error("Create task error:", error)
    return {
      success: false,
      message: "Errore nella creazione della task",
      error: error.message,
    }
  }
}

async function handleSearchTask(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const tasksRef = collection(db, "tasks")
    let q = query(tasksRef, where("tenantId", "==", context.tenantId))

    if (entities.clientName && context.availableClients) {
      const client = context.availableClients.find((c) =>
        c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (client) {
        q = query(tasksRef, where("tenantId", "==", context.tenantId), where("clientId", "==", client.id))
      }
    }

    if (entities.status) {
      q = query(q, where("status", "==", entities.status))
    }

    if (entities.priority) {
      q = query(q, where("priority", "==", entities.priority))
    }

    const snapshot = await getDocs(q)
    const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return {
      success: true,
      message: `Trovate ${tasks.length} tasks`,
      data: tasks,
    }
  } catch (error: any) {
    console.error("Search task error:", error)
    return {
      success: false,
      message: "Errore nella ricerca",
      error: error.message,
    }
  }
}

async function handleAssignTask(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    if (!entities.taskId && !entities.taskTitle) {
      return {
        success: false,
        message: "Specifica quale task assegnare",
        error: "Task non specificata",
      }
    }

    let taskId = entities.taskId
    if (!taskId && entities.taskTitle) {
      const tasksRef = collection(db, "tasks")
      const q = query(
        tasksRef,
        where("tenantId", "==", context.tenantId),
        where("title", "==", entities.taskTitle)
      )
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        taskId = snapshot.docs[0].id
      }
    }

    if (!taskId) {
      return {
        success: false,
        message: "Task non trovata",
        error: "Impossibile trovare la task specificata",
      }
    }

    let assignedUserId = entities.assignedUserId
    if (!assignedUserId && entities.assignee && context.availableUsers) {
      const user = context.availableUsers.find(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(entities.assignee.toLowerCase()) ||
          u.email.toLowerCase().includes(entities.assignee.toLowerCase())
      )
      if (user) {
        assignedUserId = user.id
      }
    }

    if (!assignedUserId) {
      return {
        success: false,
        message: "Utente non trovato",
        error: "Specifica un utente valido",
      }
    }

    const taskRef = doc(db, "tasks", taskId)
    await updateDoc(taskRef, {
      assignedUserId,
      assignee: entities.assignee,
      updatedAt: new Date(),
    })

    return {
      success: true,
      message: `Task assegnata con successo a ${entities.assignee}`,
      data: { taskId, assignedUserId },
    }
  } catch (error: any) {
    console.error("Assign task error:", error)
    return {
      success: false,
      message: "Errore nell'assegnazione",
      error: error.message,
    }
  }
}

async function handleUpdateTask(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    if (!entities.taskId) {
      return {
        success: false,
        message: "Task ID non specificato",
        error: "Impossibile aggiornare senza ID task",
      }
    }

    const taskRef = doc(db, "tasks", entities.taskId)
    const updateData: Record<string, any> = { updatedAt: new Date() }

    if (entities.title) updateData.title = entities.title
    if (entities.description) updateData.description = entities.description
    if (entities.status) updateData.status = entities.status
    if (entities.priority) updateData.priority = entities.priority
    if (entities.dueDate) updateData.dueDate = entities.dueDate

    await updateDoc(taskRef, updateData)

    return {
      success: true,
      message: "Task aggiornata con successo",
      data: updateData,
    }
  } catch (error: any) {
    console.error("Update task error:", error)
    return {
      success: false,
      message: "Errore nell'aggiornamento",
      error: error.message,
    }
  }
}

async function handleNavigate(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  const routeMap: Record<string, string> = {
    dashboard: "/dashboard",
    tasks: "/workspace",
    workspace: "/workspace",
    calendar: "/calendario-editoriale",
    calendario: "/calendario-editoriale",
    campaigns: "/campagne",
    campagne: "/campagne",
    clients: "/clienti",
    clienti: "/clienti",
    team: "/team",
    quotes: "/preventivi",
    preventivi: "/preventivi",
    analytics: "/dashboard",
    settings: "/settings",
  }

  const route = entities.route || entities.page || entities.section
  const normalizedRoute = route?.toLowerCase()
  const targetRoute = routeMap[normalizedRoute] || route

  if (typeof window !== "undefined" && targetRoute) {
    window.location.href = targetRoute
    return {
      success: true,
      message: `Navigazione a ${targetRoute}`,
      data: { route: targetRoute },
    }
  }

  return {
    success: false,
    message: "Percorso non valido",
    error: "Specifica una sezione valida dell'app",
  }
}

async function handleShowAnalytics(context: CommandContext): Promise<CommandExecutionResult> {
  if (typeof window !== "undefined") {
    window.location.href = "/dashboard"
    return {
      success: true,
      message: "Apertura dashboard analytics",
      data: { route: "/dashboard" },
    }
  }

  return {
    success: false,
    message: "Impossibile navigare",
    error: "Funzione disponibile solo nel browser",
  }
}

async function handleSearchGlobal(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const searchTerm = entities.query || entities.search || ""
    const results: any[] = []

    const tasksRef = collection(db, "tasks")
    const tasksQuery = query(tasksRef, where("tenantId", "==", context.tenantId))
    const tasksSnapshot = await getDocs(tasksQuery)
    const tasks = tasksSnapshot.docs
      .map((doc) => ({ id: doc.id, type: "task", ...doc.data() }))
      .filter(
        (task: any) =>
          task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )

    results.push(...tasks)

    return {
      success: true,
      message: `Trovati ${results.length} risultati`,
      data: results,
    }
  } catch (error: any) {
    console.error("Global search error:", error)
    return {
      success: false,
      message: "Errore nella ricerca",
      error: error.message,
    }
  }
}

async function handleTaskRefinement(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const { findTaskByName } = await import("@/lib/utils/task-matcher")
    const { useWorkspaceNav } = await import("@/lib/stores/workspace-nav-store")
    
    let taskId = entities.task_id
    
    if (!taskId && entities.task_name) {
      taskId = await findTaskByName(entities.task_name, context.tenantId)
    }
    
    if (!taskId) {
      return {
        success: false,
        message: "Task non trovata",
        error: "Impossibile trovare la task specificata",
      }
    }
    
    const { navigateToTask } = useWorkspaceNav.getState()
    navigateToTask(taskId, 'refine')
    
    if (typeof window !== "undefined") {
      window.location.href = `/workspace?taskId=${taskId}&action=refine`
    }
    
    return {
      success: true,
      message: "Apertura workspace per raffinare la task...",
      data: { taskId, action: 'refine' },
    }
  } catch (error: any) {
    console.error("Task refinement error:", error)
    return {
      success: false,
      message: "Errore nell'apertura del workspace",
      error: error.message,
    }
  }
}

async function handleGenerateDeliverable(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const { findTaskByName } = await import("@/lib/utils/task-matcher")
    const { useWorkspaceNav } = await import("@/lib/stores/workspace-nav-store")
    
    let taskId = entities.task_id
    
    if (!taskId && entities.task_name) {
      taskId = await findTaskByName(entities.task_name, context.tenantId)
    }
    
    if (!taskId) {
      return {
        success: false,
        message: "Task non trovata",
        error: "Impossibile trovare la task specificata",
      }
    }
    
    const deliverableType = entities.deliverable_type || 'copy'
    const action = deliverableType === 'visual' ? 'generate-visual' : 'generate-copy'
    
    const { navigateToTask } = useWorkspaceNav.getState()
    navigateToTask(taskId, action)
    
    if (typeof window !== "undefined") {
      window.location.href = `/workspace?taskId=${taskId}&action=${action}`
    }
    
    return {
      success: true,
      message: `Generazione ${deliverableType === 'visual' ? 'visual' : 'copy'} per la task...`,
      data: { taskId, action },
    }
  } catch (error: any) {
    console.error("Generate deliverable error:", error)
    return {
      success: false,
      message: "Errore nella generazione del deliverable",
      error: error.message,
    }
  }
}
