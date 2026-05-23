import type { CommandIntent, CommandContext, CommandExecutionResult } from "@/lib/types"

async function parseApiResponse(response: Response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || "Operazione non riuscita")
  }

  return payload
}

function findClientId(entities: Record<string, any>, context: CommandContext) {
  if (entities.clientId) return entities.clientId
  if (!entities.clientName) return null

  const requestedName = String(entities.clientName).toLowerCase()
  return (
    context.availableClients?.find((client) =>
      client.name.toLowerCase().includes(requestedName) ||
      requestedName.includes(client.name.toLowerCase()),
    )?.id || null
  )
}

function findUser(entities: Record<string, any>, context: CommandContext) {
  if (entities.assignedUserId) {
    return context.availableUsers?.find((user) => user.id === entities.assignedUserId)
  }

  if (!entities.assignee) return null
  const requestedName = String(entities.assignee).toLowerCase()

  return (
    context.availableUsers?.find((user) => {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase()
      return fullName.includes(requestedName) || user.email?.toLowerCase().includes(requestedName)
    }) || null
  )
}

function normalizeStatus(value: unknown) {
  const status = typeof value === "string" ? value.toLowerCase() : ""
  const map: Record<string, string> = {
    todo: "to-do",
    "to do": "to-do",
    "to-do": "to-do",
    backlog: "backlog",
    urgenze: "urgenze",
    urgent: "urgenze",
    "in corso": "in-corso",
    "in-corso": "in-corso",
    "in progress": "in-progress",
    "in-progress": "in-progress",
    validation: "validation",
    review: "review",
    done: "done",
    completed: "completed",
  }

  return map[status] || "to-do"
}

async function fetchWorkspaceTasks() {
  const payload = await parseApiResponse(
    await fetch("/api/tasks", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }),
  )

  return Array.isArray(payload.tasks) ? payload.tasks : []
}

async function createWorkspaceTask(taskData: Record<string, any>) {
  const payload = await parseApiResponse(
    await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(taskData),
    }),
  )

  return payload.task
}

export async function executeIntent(
  intent: CommandIntent,
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
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
      case "CREATE_WEBSITE":
        return await handleCreateWebsite(entities, context)
      case "CREATE_GRAPHIC_DESIGN":
        return await handleCreateGraphicDesign(entities, context)
      case "CREATE_VIDEO_PRODUCTION":
        return await handleCreateVideoProduction(entities, context)
      case "CREATE_SOFTWARE_DEV":
        return await handleCreateSoftwareDev(entities, context)
      case "CREATE_CAMPAIGN_PROJECT":
        return await handleCreateCampaignProject(entities, context)
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
    const clientId = findClientId(entities, context)

    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato o non trovato",
        error: "Specifica un cliente valido per la task",
      }
    }

    const client = context.availableClients?.find((item) => item.id === clientId)
    const assignee = findUser(entities, context)
    const taskData = {
      title: entities.title || "Nuova Task",
      description: entities.description || "",
      status: normalizeStatus(entities.status),
      columnId: normalizeStatus(entities.status),
      priority: entities.priority || "medium",
      clientId: clientId,
      clientName: client?.name || entities.clientName || "",
      assignedUserId: assignee?.id || entities.assignedUserId || null,
      assignee: assignee ? `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim() : entities.assignee || "",
      dueDate: entities.dueDate || null,
      tags: entities.tags || [],
      attachments: [],
    }

    const createdTask = await createWorkspaceTask(taskData)

    return {
      success: true,
      message: `Task "${taskData.title}" creata con successo!`,
      data: createdTask,
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
    const clientId = findClientId(entities, context)
    const queryText = String(entities.query || entities.search || entities.title || entities.taskTitle || "").toLowerCase()
    const status = entities.status ? normalizeStatus(entities.status) : null
    const priority = entities.priority ? String(entities.priority).toLowerCase() : null

    const tasks = (await fetchWorkspaceTasks()).filter((task: any) => {
      const matchesClient = !clientId || task.clientId === clientId
      const matchesStatus = !status || task.columnId === status || task.status === status
      const matchesPriority = !priority || task.priority === priority
      const matchesText =
        !queryText ||
        task.title?.toLowerCase().includes(queryText) ||
        task.description?.toLowerCase().includes(queryText)

      return matchesClient && matchesStatus && matchesPriority && matchesText
    })

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
      const requestedTitle = String(entities.taskTitle).toLowerCase()
      const task = (await fetchWorkspaceTasks()).find((item: any) =>
        item.title?.toLowerCase().includes(requestedTitle),
      )
      taskId = task?.id
    }

    if (!taskId) {
      return {
        success: false,
        message: "Task non trovata",
        error: "Impossibile trovare la task specificata",
      }
    }

    const assignedUser = findUser(entities, context)
    const assignedUserId = assignedUser?.id || entities.assignedUserId

    if (!assignedUserId) {
      return {
        success: false,
        message: "Utente non trovato",
        error: "Specifica un utente valido",
      }
    }

    const assignee = assignedUser
      ? `${assignedUser.firstName || ""} ${assignedUser.lastName || ""}`.trim()
      : entities.assignee

    const payload = await parseApiResponse(
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          assignedUserId,
          assignee,
        }),
      }),
    )

    return {
      success: true,
      message: `Task assegnata con successo a ${assignee || "utente selezionato"}`,
      data: payload.task,
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
    let taskId = entities.taskId

    if (!taskId && (entities.taskTitle || entities.title)) {
      const requestedTitle = String(entities.taskTitle || entities.title).toLowerCase()
      const task = (await fetchWorkspaceTasks()).find((item: any) =>
        item.title?.toLowerCase().includes(requestedTitle),
      )
      taskId = task?.id
    }

    if (!taskId) {
      return {
        success: false,
        message: "Task ID non specificato",
        error: "Impossibile aggiornare senza identificare la task",
      }
    }

    const updateData: Record<string, any> = {}
    if (entities.newTitle) updateData.title = entities.newTitle
    if (entities.description) updateData.description = entities.description
    if (entities.status) {
      updateData.status = normalizeStatus(entities.status)
      updateData.columnId = normalizeStatus(entities.status)
    }
    if (entities.priority) updateData.priority = entities.priority
    if (entities.dueDate) updateData.dueDate = entities.dueDate

    const payload = await parseApiResponse(
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updateData),
      }),
    )

    return {
      success: true,
      message: "Task aggiornata con successo",
      data: payload.task,
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
    const tasks = (await fetchWorkspaceTasks())
      .map((task: any) => ({ ...task, type: "task" }))
      .filter(
        (task: any) =>
          task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )

    return {
      success: true,
      message: `Trovati ${tasks.length} risultati`,
      data: tasks,
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

async function handleCreateWebsite(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const websiteType = entities.websiteType || "landing"
    const pages = entities.pages || (websiteType === "landing" ? 1 : 5)
    
    const taskTemplates = {
      landing: [
        { title: "Wireframe Landing Page", description: "Creare wireframe e struttura", priority: "high" },
        { title: "Design Landing Page", description: "Design grafico completo", priority: "high" },
        { title: "Sviluppo Frontend", description: "Implementazione HTML/CSS/JS", priority: "medium" },
        { title: "Integrazione Form", description: "Form contatto funzionante", priority: "medium" },
        { title: "Testing & Deploy", description: "Test cross-browser e pubblicazione", priority: "high" },
      ],
      ecommerce: [
        { title: "Analisi Requirements E-commerce", description: "Definire funzionalità e flussi", priority: "urgent" },
        { title: "Wireframe Shop", description: "Wireframe catalogo prodotti e checkout", priority: "high" },
        { title: "Design E-commerce", description: "Design completo interfaccia shop", priority: "high" },
        { title: "Sviluppo Catalogo Prodotti", description: "Lista prodotti, filtri, ricerca", priority: "medium" },
        { title: "Sistema Carrello", description: "Carrello e checkout flow", priority: "high" },
        { title: "Integrazione Pagamenti", description: "Stripe/PayPal integration", priority: "urgent" },
        { title: "Admin Dashboard", description: "Pannello gestione prodotti", priority: "medium" },
        { title: "Testing & Launch", description: "Test completi e go-live", priority: "urgent" },
      ],
      corporate: [
        { title: "Sitemap & Struttura", description: "Definire architettura informazioni", priority: "high" },
        { title: "Wireframe Pagine", description: `Wireframe ${pages} pagine`, priority: "high" },
        { title: "Design Corporate", description: "Design professionale multi-pagina", priority: "high" },
        { title: "Sviluppo CMS", description: "Sistema gestione contenuti", priority: "medium" },
        { title: "Implementazione Pagine", description: "Sviluppo frontend pagine", priority: "medium" },
        { title: "SEO & Performance", description: "Ottimizzazione SEO e velocità", priority: "medium" },
        { title: "Deploy & Training", description: "Pubblicazione e formazione cliente", priority: "high" },
      ],
      portfolio: [
        { title: "Concept Portfolio", description: "Definire stile e layout", priority: "high" },
        { title: "Design Portfolio", description: "Design interfaccia portfolio", priority: "high" },
        { title: "Gallery System", description: "Sistema gallery progetti", priority: "medium" },
        { title: "About & Contact", description: "Sezioni info e contatto", priority: "low" },
        { title: "Deploy Portfolio", description: "Pubblicazione online", priority: "high" },
      ],
    }
    
    const templates = taskTemplates[websiteType as keyof typeof taskTemplates] || taskTemplates.landing
    
    let clientId = entities.clientId
    if (!clientId && entities.clientName) {
      const client = context.availableClients?.find(
        (c) => c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (client) clientId = client.id
    }
    
    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato",
        error: "Specifica un cliente per il progetto website",
      }
    }
    
    const createdTasks = []
    for (const template of templates) {
      const taskData = {
        ...template,
        status: "todo",
        columnId: "to-do",
        clientId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ["website", websiteType],
        projectType: "website",
        websiteType,
        comments: [],
        subItems: [],
        attachments: [],
      }
      
      const createdTask = await createWorkspaceTask(taskData)
      createdTasks.push(createdTask)
    }
    
    return {
      success: true,
      message: `✅ Progetto website ${websiteType} creato! ${createdTasks.length} task nel workspace`,
      data: { tasks: createdTasks, websiteType },
    }
  } catch (error: any) {
    console.error("Create website error:", error)
    return {
      success: false,
      message: "Errore creazione progetto website",
      error: error.message,
    }
  }
}

async function handleCreateGraphicDesign(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const designType = entities.designType || "logo"
    
    const taskTemplates = {
      logo: [
        { title: "Brief Logo", description: "Raccogliere requirements e mood", priority: "high" },
        { title: "Ricerca Competitor", description: "Analisi competitor e trend", priority: "medium" },
        { title: "Sketches Logo", description: "Bozze preliminari 3-5 opzioni", priority: "high" },
        { title: "Presentazione Concept", description: "Presentare concept al cliente", priority: "high" },
        { title: "Refinement Logo", description: "Raffinamento opzione scelta", priority: "medium" },
        { title: "Varianti Logo", description: "Versioni colori, B/N, responsive", priority: "medium" },
        { title: "Files Finali", description: "Esportare SVG, PNG, EPS, PDF", priority: "high" },
      ],
      branding: [
        { title: "Brand Strategy", description: "Definire identità e valori brand", priority: "urgent" },
        { title: "Logo Design", description: "Creazione logo principale", priority: "high" },
        { title: "Color Palette", description: "Definire palette colori brand", priority: "high" },
        { title: "Typography", description: "Selezione font primari e secondari", priority: "medium" },
        { title: "Visual Elements", description: "Pattern, icone, elementi grafici", priority: "medium" },
        { title: "Brandbook", description: "Manuale identità visiva completo", priority: "high" },
        { title: "Mockup Applicazioni", description: "Mockup biglietti, carta, etc", priority: "low" },
      ],
      brochure: [
        { title: "Content Brochure", description: "Raccogliere testi e immagini", priority: "high" },
        { title: "Layout Brochure", description: "Definire layout e griglie", priority: "high" },
        { title: "Design Brochure", description: "Design grafico completo", priority: "medium" },
        { title: "Revisioni", description: "Ciclo revisioni cliente", priority: "medium" },
        { title: "Print Ready", description: "File stampabile CMYK + abbondanze", priority: "high" },
      ],
    }
    
    const templates = taskTemplates[designType as keyof typeof taskTemplates] || taskTemplates.logo
    
    let clientId = entities.clientId
    if (!clientId && entities.clientName) {
      const client = context.availableClients?.find(
        (c) => c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (client) clientId = client.id
    }
    
    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato",
        error: "Specifica un cliente per il progetto design",
      }
    }
    
    const createdTasks = []
    for (const template of templates) {
      const taskData = {
        ...template,
        status: "todo",
        columnId: "to-do",
        clientId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ["design", designType],
        projectType: "graphic_design",
        designType,
        comments: [],
        subItems: [],
        attachments: [],
      }
      
      const createdTask = await createWorkspaceTask(taskData)
      createdTasks.push(createdTask)
    }
    
    return {
      success: true,
      message: `✅ Progetto ${designType} creato! ${createdTasks.length} task nel workspace`,
      data: { tasks: createdTasks, designType },
    }
  } catch (error: any) {
    console.error("Create graphic design error:", error)
    return {
      success: false,
      message: "Errore creazione progetto design",
      error: error.message,
    }
  }
}

async function handleCreateVideoProduction(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const videoType = entities.videoType || "corporate"
    
    const taskTemplates = {
      corporate: [
        { title: "Pre-Production Meeting", description: "Brief e definizione obiettivi video", priority: "urgent" },
        { title: "Script Video", description: "Scrivere script e storyboard", priority: "high" },
        { title: "Location Scouting", description: "Trovare e confermare location", priority: "high" },
        { title: "Cast & Crew", description: "Selezionare talenti e team", priority: "medium" },
        { title: "Shooting Day", description: "Riprese video in location", priority: "urgent" },
        { title: "Editing Video", description: "Montaggio e color grading", priority: "high" },
        { title: "Sound Design", description: "Audio mixing e musica", priority: "medium" },
        { title: "Revisioni & Delivery", description: "Revisioni cliente e consegna finale", priority: "high" },
      ],
      commercial: [
        { title: "Concept Commerciale", description: "Idea creativa e moodboard", priority: "urgent" },
        { title: "Script 30 sec", description: "Script commerciale conciso", priority: "high" },
        { title: "Storyboard", description: "Visual storyboard shot by shot", priority: "high" },
        { title: "Casting", description: "Selezione attori/modelli", priority: "medium" },
        { title: "Production", description: "Shooting commerciale", priority: "urgent" },
        { title: "Post-Production", description: "Editing, VFX, color", priority: "high" },
        { title: "Final Delivery", description: "Master file + versioni social", priority: "high" },
      ],
      interview: [
        { title: "Prep Intervista", description: "Preparare domande e setup", priority: "high" },
        { title: "Location & Setup", description: "Preparare studio/location", priority: "medium" },
        { title: "Shooting Intervista", description: "Registrazione intervista", priority: "high" },
        { title: "Editing Intervista", description: "Montaggio e sottotitoli", priority: "medium" },
        { title: "Delivery", description: "Esportare video finale", priority: "high" },
      ],
    }
    
    const templates = taskTemplates[videoType as keyof typeof taskTemplates] || taskTemplates.corporate
    
    let clientId = entities.clientId
    if (!clientId && entities.clientName) {
      const client = context.availableClients?.find(
        (c) => c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (client) clientId = client.id
    }
    
    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato",
        error: "Specifica un cliente per il progetto video",
      }
    }
    
    const createdTasks = []
    for (const template of templates) {
      const taskData = {
        ...template,
        status: "todo",
        columnId: "to-do",
        clientId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ["video", videoType],
        projectType: "video_production",
        videoType,
        comments: [],
        subItems: [],
        attachments: [],
      }
      
      const createdTask = await createWorkspaceTask(taskData)
      createdTasks.push(createdTask)
    }
    
    return {
      success: true,
      message: `✅ Progetto video ${videoType} creato! ${createdTasks.length} task nel workspace`,
      data: { tasks: createdTasks, videoType },
    }
  } catch (error: any) {
    console.error("Create video production error:", error)
    return {
      success: false,
      message: "Errore creazione progetto video",
      error: error.message,
    }
  }
}

async function handleCreateSoftwareDev(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const projectType = entities.projectType || "feature"
    
    const taskTemplates = {
      app: [
        { title: "Requirements Analysis", description: "Definire funzionalità e scope", priority: "urgent" },
        { title: "System Architecture", description: "Architettura tecnica e stack", priority: "high" },
        { title: "UI/UX Design", description: "Design interfaccia utente", priority: "high" },
        { title: "Database Schema", description: "Progettare schema database", priority: "high" },
        { title: "Backend Development", description: "Sviluppo API e logica server", priority: "medium" },
        { title: "Frontend Development", description: "Sviluppo interfaccia utente", priority: "medium" },
        { title: "Testing & QA", description: "Test funzionali e bug fixing", priority: "high" },
        { title: "Deploy & Monitoring", description: "Deployment e setup monitoring", priority: "high" },
      ],
      feature: [
        { title: "Feature Spec", description: "Specificare requisiti feature", priority: "high" },
        { title: "Design Feature", description: "Design UI/UX se necessario", priority: "medium" },
        { title: "Implementation", description: "Sviluppo feature", priority: "high" },
        { title: "Unit Tests", description: "Scrivere test automatici", priority: "medium" },
        { title: "Code Review", description: "Review e merge", priority: "high" },
        { title: "Deploy Feature", description: "Deploy in produzione", priority: "high" },
      ],
      integration: [
        { title: "API Research", description: "Studio documentazione API", priority: "high" },
        { title: "Integration Design", description: "Progettare architettura integrazione", priority: "high" },
        { title: "Development", description: "Implementare integrazione", priority: "medium" },
        { title: "Error Handling", description: "Gestione errori e fallback", priority: "medium" },
        { title: "Testing Integration", description: "Test end-to-end", priority: "high" },
        { title: "Documentation", description: "Documentare integrazione", priority: "low" },
      ],
    }
    
    const templates = taskTemplates[projectType as keyof typeof taskTemplates] || taskTemplates.feature
    
    let clientId = entities.clientId
    if (!clientId && entities.clientName) {
      const client = context.availableClients?.find(
        (c) => c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (client) clientId = client.id
    }
    
    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato",
        error: "Specifica un cliente per il progetto software",
      }
    }
    
    const createdTasks = []
    for (const template of templates) {
      const taskData = {
        ...template,
        status: "todo",
        columnId: "to-do",
        clientId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ["software", projectType],
        projectType: "software_dev",
        devProjectType: projectType,
        comments: [],
        subItems: [],
        attachments: [],
      }
      
      const createdTask = await createWorkspaceTask(taskData)
      createdTasks.push(createdTask)
    }
    
    return {
      success: true,
      message: `✅ Progetto software ${projectType} creato! ${createdTasks.length} task nel workspace`,
      data: { tasks: createdTasks, projectType },
    }
  } catch (error: any) {
    console.error("Create software dev error:", error)
    return {
      success: false,
      message: "Errore creazione progetto software",
      error: error.message,
    }
  }
}

async function handleCreateCampaignProject(
  entities: Record<string, any>,
  context: CommandContext
): Promise<CommandExecutionResult> {
  try {
    const campaignType = entities.campaignType || "product_launch"
    const channels = entities.channels || ["social", "email"]
    
    const baseTemplates = {
      product_launch: [
        { title: "Campaign Strategy", description: "Definire strategia e obiettivi lancio", priority: "urgent" },
        { title: "Target Audience", description: "Analisi target e personas", priority: "high" },
        { title: "Key Messages", description: "Definire messaggi chiave e USP", priority: "high" },
        { title: "Content Calendar", description: "Pianificare calendario contenuti", priority: "high" },
        { title: "Creative Assets", description: "Produrre visual e copy", priority: "medium" },
        { title: "Landing Page", description: "Creare landing page prodotto", priority: "high" },
        { title: "Launch Day", description: "Coordinare go-live multi-canale", priority: "urgent" },
        { title: "Performance Monitoring", description: "Monitorare KPI e ottimizzare", priority: "medium" },
      ],
      rebranding: [
        { title: "Brand Audit", description: "Analisi brand attuale", priority: "high" },
        { title: "New Brand Identity", description: "Definire nuova identità", priority: "urgent" },
        { title: "Logo & Visual", description: "Nuovo logo e elementi visual", priority: "high" },
        { title: "Website Redesign", description: "Riprogettare sito web", priority: "high" },
        { title: "Marketing Materials", description: "Aggiornare materiali marketing", priority: "medium" },
        { title: "Internal Rollout", description: "Formazione team interno", priority: "medium" },
        { title: "Public Launch", description: "Lancio pubblico rebranding", priority: "urgent" },
      ],
    }
    
    const templates = baseTemplates[campaignType as keyof typeof baseTemplates] || baseTemplates.product_launch
    
    let clientId = entities.clientId
    if (!clientId && entities.clientName) {
      const client = context.availableClients?.find(
        (c) => c.name.toLowerCase().includes(entities.clientName.toLowerCase())
      )
      if (client) clientId = client.id
    }
    
    if (!clientId) {
      return {
        success: false,
        message: "Cliente non specificato",
        error: "Specifica un cliente per la campagna",
      }
    }
    
    const createdTasks = []
    for (const template of templates) {
      const taskData = {
        ...template,
        status: "todo",
        columnId: "to-do",
        clientId,
        tenantId: context.tenantId,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ["campaign", campaignType, ...channels],
        projectType: "campaign",
        campaignType,
        channels,
        comments: [],
        subItems: [],
        attachments: [],
      }
      
      const createdTask = await createWorkspaceTask(taskData)
      createdTasks.push(createdTask)
    }
    
    return {
      success: true,
      message: `✅ Campagna ${campaignType} creata! ${createdTasks.length} task nel workspace per canali: ${channels.join(', ')}`,
      data: { tasks: createdTasks, campaignType, channels },
    }
  } catch (error: any) {
    console.error("Create campaign project error:", error)
    return {
      success: false,
      message: "Errore creazione campagna",
      error: error.message,
    }
  }
}
