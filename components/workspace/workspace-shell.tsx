"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Filter,
  Search,
  Sparkles,
  Target,
  Building,
  Globe,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  X,
  FileText,
  ImageIcon,
  Briefcase,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/use-users"
import { useClients } from "@/hooks/use-clients"
import { useWorkspaceData } from "@/hooks/use-workspace-data"
import { useProjects } from "@/hooks/use-projects"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { UserAssignmentSelect } from "@/components/ui/user-assignment-select"
import { ClientSidebar } from "./client-sidebar"
import { KanbanBoard } from "./kanban-board"
import { useWorkspaceLayout } from "@/hooks/use-workspace-layout"
import { useIsMounted } from "@/hooks/use-is-mounted"
import type { Project, Task } from "@/lib/types"

// Import Sheet dynamically with ssr: false to prevent hydration mismatch
const MobileSheet = dynamic(
  () => import("@/components/ui/sheet").then(mod => ({ 
    default: ({ open, onOpenChange, children }: any) => (
      <mod.Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </mod.Sheet>
    )
  })),
  { ssr: false }
)

const SheetContent = dynamic(
  () => import("@/components/ui/sheet").then(mod => ({ default: mod.SheetContent })),
  { ssr: false }
)

const defaultColumns = [
  { id: "to-do", title: "To Do", color: "border-blue-200", bgColor: "bg-blue-50", iconColor: "text-blue-600" },
  { id: "urgenze", title: "Urgenze", color: "border-red-200", bgColor: "bg-red-50", iconColor: "text-red-600" },
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
  { id: "done", title: "Done", color: "border-green-200", bgColor: "bg-green-50", iconColor: "text-green-600" },
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
]

const tenantColumns = [
  { id: "backlog", title: "Backlog", color: "border-gray-200", bgColor: "bg-gray-50", iconColor: "text-gray-600" },
  { id: "planning", title: "Planning", color: "border-blue-200", bgColor: "bg-blue-50", iconColor: "text-blue-600" },
  {
    id: "in-progress",
    title: "In Progress",
    color: "border-yellow-200",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  { id: "review", title: "Review", color: "border-purple-200", bgColor: "bg-purple-50", iconColor: "text-purple-600" },
  {
    id: "completed",
    title: "Completed",
    color: "border-green-200",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    id: "recurring",
    title: "Recurring",
    color: "border-indigo-200",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
]

const clientColors = [
  "bg-gradient-to-br from-red-400 to-red-600",
  "bg-gradient-to-br from-blue-400 to-blue-600",
  "bg-gradient-to-br from-green-400 to-green-600",
  "bg-gradient-to-br from-purple-400 to-purple-600",
  "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "bg-gradient-to-br from-pink-400 to-pink-600",
  "bg-gradient-to-br from-indigo-400 to-indigo-600",
  "bg-gradient-to-br from-orange-400 to-orange-600",
  "bg-gradient-to-br from-teal-400 to-teal-600",
  "bg-gradient-to-br from-cyan-400 to-cyan-600",
]

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

interface TaskAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export function WorkspaceShell() {
  const { user, userData } = useAuth()
  const { clients } = useClients()
  const [searchTerm, setSearchTerm] = useState("")
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showWorkspaceAlert, setShowWorkspaceAlert] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const { toast } = useToast()
  const { users } = useUsers()
  const { projects, createProject } = useProjects()
  const isMounted = useIsMounted()

  const {
    selectedClientId,
    showAllClients,
    showTenantWorkspace,
    sidebarCollapsed,
    handleTenantWorkspaceClick,
    handleAllClientsClick,
    handleClientWorkspaceClick,
    toggleSidebar,
  } = useWorkspaceLayout()

  const [clientForm, setClientForm] = useState({
    name: "",
    industry: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    password: "",
    sendWelcomeEmail: true,
  })

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    richDescription: "",
    priority: "medium" as "low" | "medium" | "high",
    type: "",
    score: 0,
    dueDate: "",
    assignee: "",
    columnId: showTenantWorkspace ? "backlog" : "to-do",
    attachments: [] as TaskAttachment[],
    tags: [] as string[],
    projectId: "",
  })

  const [projectForm, setProjectForm] = useState({
    name: "",
    status: "active" as Project["status"],
    dueAt: "",
    memberIds: [] as string[],
  })

  const resetTaskForm = () => {
    for (const attachment of taskForm.attachments) {
      if (attachment.url.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.url)
      }
    }

    setTaskForm({
      title: "",
      description: "",
      richDescription: "",
      priority: "medium",
      type: "",
      score: 0,
      dueDate: "",
      assignee: "",
      columnId: showTenantWorkspace ? "backlog" : "to-do",
      attachments: [],
      tags: [],
      projectId: "",
    })
    setPendingTaskFiles([])
  }

  const resetProjectForm = () => {
    setProjectForm({
      name: "",
      status: "active",
      dueAt: "",
      memberIds: [],
    })
  }

  useEffect(() => {
    setTaskForm((prev) => ({
      ...prev,
      columnId: showTenantWorkspace ? "backlog" : "to-do",
    }))
  }, [showTenantWorkspace])

  const {
    tasks: allTasks,
    loading: tasksLoading,
    createTask,
    moveTask,
    updateTask,
    uploadTaskAttachments,
    deleteTaskAttachment,
    addComment,
    updateSubItems,
    acceptTaskAssignment,
    rejectTaskAssignment,
  } = useWorkspaceData()
  const [pendingTaskFiles, setPendingTaskFiles] = useState<Array<{ id: string; file: File }>>([])

  const tasks = allTasks.filter((task) => {
    if (showTenantWorkspace) {
      return task.clientId === "tenant"
    } else if (showAllClients) {
      return task.clientId !== "tenant"
    } else {
      return task.clientId === selectedClientId
    }
  })

  const visibleProjects = projects.filter((project) => {
    if (showTenantWorkspace) {
      return !project.clientId
    }
    if (showAllClients) {
      return Boolean(project.clientId)
    }
    return project.clientId === selectedClientId
  })

  const selectedProject = projects.find((project) => project.id === taskForm.projectId)

  const getUserName = (memberId: string) => {
    const member = users.find((user) => user.id === memberId)
    return member ? [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email : ""
  }

  useEffect(() => {
    if (selectedTask && allTasks.length > 0) {
      const updatedTask = allTasks.find((t) => t.id === selectedTask.id)
      if (updatedTask) {
        const hasChanged = JSON.stringify(updatedTask) !== JSON.stringify(selectedTask)
        if (hasChanged) {
          setSelectedTask(updatedTask)
        }
      }
    }
  }, [allTasks, selectedTask?.id])

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    void moveTask(draggableId, destination.droppableId, {
      destinationIndex: destination.index,
    }).catch(() => {
      toast({
        title: "Spostamento non salvato",
        description: "La task è stata riportata nella posizione precedente.",
        variant: "destructive",
      })
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-amber-500"
      case "low":
        return "border-l-emerald-500"
      default:
        return "border-l-slate-300"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-red-100 text-red-700"
    if (score >= 5) return "bg-amber-100 text-amber-700"
    return "bg-emerald-100 text-emerald-700"
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setClientForm({ ...clientForm, password })
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    setUploadingFiles(true)
    const newAttachments: TaskAttachment[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const attachmentId = `${Date.now()}-${i}`
        const url = URL.createObjectURL(file)

        const attachment: TaskAttachment = {
          id: attachmentId,
          name: file.name,
          url: url,
          type: file.type,
          size: file.size,
        }

        newAttachments.push(attachment)
        setPendingTaskFiles((current) => [...current, { id: attachmentId, file }])
      }

      setTaskForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments],
      }))

      toast({
        title: "Successo",
        description: `${newAttachments.length} file caricati`,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei file",
        variant: "destructive",
      })
    } finally {
      setUploadingFiles(false)
    }
  }

  const removeAttachment = (attachmentId: string) => {
    setTaskForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((att) => att.id !== attachmentId),
    }))
    setPendingTaskFiles((current) => current.filter((item) => item.id !== attachmentId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const handleAddClient = async () => {
    if (!clientForm.name.trim()) {
      toast({
        title: "Errore",
        description: "Il nome del cliente è obbligatorio",
        variant: "destructive",
      })
      return
    }

    if (!clientForm.contactEmail.trim()) {
      toast({
        title: "Errore",
        description: "L'email del cliente è obbligatoria",
        variant: "destructive",
      })
      return
    }

    if (!clientForm.password.trim()) {
      toast({
        title: "Errore",
        description: "La password è obbligatoria",
        variant: "destructive",
      })
      return
    }

    if (clientForm.password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive",
      })
      return
    }

    setIsCreatingClient(true)

    try {
      const { auth, db } = await import("@/lib/firebase")
      const { createUserWithEmailAndPassword } = await import("firebase/auth")
      const { collection, addDoc, doc, setDoc } = await import("firebase/firestore")

      const userCredential = await createUserWithEmailAndPassword(auth, clientForm.contactEmail, clientForm.password)
      const clientUser = userCredential.user
      const clientTenantId = clientUser.uid

      await setDoc(doc(db, "users", clientUser.uid), {
        firstName: clientForm.name.split(" ")[0] || clientForm.name,
        lastName: clientForm.name.split(" ").slice(1).join(" ") || "",
        email: clientForm.contactEmail,
        companyName: clientForm.name,
        tenantId: clientTenantId,
        plan: "client",
        role: "client",
        parentTenantId: user?.uid,
        aiTokensUsed: 0,
        aiTokensLimit: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const randomColor = clientColors[Math.floor(Math.random() * clientColors.length)]
      const clientRef = await addDoc(collection(db, "clients"), {
        name: clientForm.name,
        industry: clientForm.industry,
        contactEmail: clientForm.contactEmail,
        contactPhone: clientForm.contactPhone,
        address: clientForm.address,
        color: randomColor,
        tenantId: user?.uid,
        clientTenantId: clientTenantId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      if (clientForm.sendWelcomeEmail) {
        try {
          await fetch("/api/send-welcome-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clientName: clientForm.name,
              clientEmail: clientForm.contactEmail,
              password: clientForm.password,
              agencyName: userData?.companyName || "Optima Platform",
            }),
          })
        } catch (emailError) {
          console.error("Error sending welcome email:", emailError)
        }
      }

      toast({
        title: "Successo",
        description: `Cliente ${clientForm.name} aggiunto con successo${
          clientForm.sendWelcomeEmail ? " e email di benvenuto inviata" : ""
        }`,
      })

      setShowClientDialog(false)
      setClientForm({
        name: "",
        industry: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        password: "",
        sendWelcomeEmail: true,
      })
    } catch (error: any) {
      console.error("Error adding client:", error)
      let errorMessage = "Errore durante l'aggiunta del cliente"

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Questa email è già in uso"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email non valida"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password troppo debole"
      }

      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreatingClient(false)
    }
  }

  const handleAddTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Errore",
        description: "Il titolo della task è obbligatorio",
        variant: "destructive",
      })
      return
    }

    const targetClientId = showTenantWorkspace ? "tenant" : showAllClients ? "all" : selectedClientId
    const selectedClient = clients.find((c) => c.id === selectedClientId)
    const targetClientName = showTenantWorkspace ? "tenant" : showAllClients ? "all" : selectedClient?.name || ""

    if (!showTenantWorkspace && !selectedClientId && !showAllClients) {
      setShowWorkspaceAlert(true)
      return
    }

    try {
      const assignedUser = users.find((u) => `${u.firstName} ${u.lastName}`.trim() === taskForm.assignee.trim())
      const assignedUserId = assignedUser?.id || null

      const createdTask = await createTask({
        title: taskForm.title,
        description: taskForm.description,
        richDescription: taskForm.richDescription,
        priority: taskForm.priority,
        type: taskForm.type,
        score: taskForm.score,
        columnId: taskForm.columnId,
        status: taskForm.columnId,
        assignee: taskForm.assignee,
        assignedUserId: assignedUserId,
        clientId: targetClientId,
        clientName: targetClientName,
        projectId: taskForm.projectId || null,
        projectName: selectedProject?.name || "",
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
        attachments: [],
        tags: taskForm.tags,
      })

      if (pendingTaskFiles.length > 0) {
        await uploadTaskAttachments(
          createdTask.id,
          pendingTaskFiles.map((item) => item.file),
        )
      }

      toast({
        title: "Successo",
        description:
          createdTask.assignmentStatus === "pending"
            ? "Task proposta: l'esecutore deve accettarla prima che sia ufficiale"
            : "Task aggiunta con successo",
      })

      setShowTaskDialog(false)
      resetTaskForm()
    } catch (error) {
      console.error("Error adding task:", error)
      toast({
        title: "Errore",
        description: "Errore durante l'aggiunta della task",
        variant: "destructive",
      })
    }
  }

  const handleAddProject = async () => {
    if (!projectForm.name.trim()) {
      toast({
        title: "Errore",
        description: "Il nome del progetto è obbligatorio",
        variant: "destructive",
      })
      return
    }

    if (!showTenantWorkspace && !selectedClientId && !showAllClients) {
      setShowWorkspaceAlert(true)
      return
    }

    try {
      const project = await createProject({
        name: projectForm.name,
        status: projectForm.status,
        clientId: showTenantWorkspace || showAllClients ? null : selectedClientId,
        dueAt: projectForm.dueAt ? new Date(projectForm.dueAt) : null,
        memberIds: projectForm.memberIds,
      })

      toast({
        title: "Progetto creato",
        description: `${project.name} è pronto per contenere task e ore.`,
      })

      setTaskForm((current) => ({ ...current, projectId: project.id }))
      setShowProjectDialog(false)
      resetProjectForm()
    } catch (error) {
      console.error("Error adding project:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la creazione del progetto",
        variant: "destructive",
      })
    }
  }

  const handleNewTaskClick = () => {
    if (!selectedClientId && !showTenantWorkspace && !showAllClients) {
      setShowWorkspaceAlert(true)
      return
    }
    setShowTaskDialog(true)
  }

  const handleAddTaskToColumn = (columnId: string) => {
    if (!showTenantWorkspace && !selectedClientId && !showAllClients) {
      setShowWorkspaceAlert(true)
      return
    }
    setTaskForm({ ...taskForm, columnId: columnId })
    setShowTaskDialog(true)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskDetailDialog(true)
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  const activeColumns = showTenantWorkspace ? tenantColumns : defaultColumns

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50 lg:h-[100dvh] lg:overflow-hidden">
      <div className="flex min-h-[100dvh] lg:h-full lg:min-h-0">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <ClientSidebar
            clients={clients}
            allTasks={allTasks}
            selectedClientId={selectedClientId}
            showAllClients={showAllClients}
            showTenantWorkspace={showTenantWorkspace}
            collapsed={sidebarCollapsed}
            onSelectClient={handleClientWorkspaceClick}
            onSelectAllClients={handleAllClientsClick}
            onSelectTenantWorkspace={handleTenantWorkspaceClick}
            onToggleCollapse={toggleSidebar}
            onAddClient={() => setShowClientDialog(true)}
            isMobile={false}
          />
        </div>

        {/* Mobile Sidebar - Sheet/Drawer (client-side only to prevent hydration mismatch) */}
        <MobileSheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="left" className="h-[100dvh] max-h-[100dvh] w-80 overflow-hidden bg-white/80 p-0 backdrop-blur-xl dark:bg-slate-800/80 lg:hidden">
            <ClientSidebar
              clients={clients}
              allTasks={allTasks}
              selectedClientId={selectedClientId}
              showAllClients={showAllClients}
              showTenantWorkspace={showTenantWorkspace}
              collapsed={false}
              onSelectClient={(id) => {
                handleClientWorkspaceClick(id)
                setMobileSheetOpen(false)
              }}
              onSelectAllClients={() => {
                handleAllClientsClick()
                setMobileSheetOpen(false)
              }}
              onSelectTenantWorkspace={() => {
                handleTenantWorkspaceClick()
                setMobileSheetOpen(false)
              }}
              onToggleCollapse={() => setMobileSheetOpen(false)}
              onAddClient={() => {
                setShowClientDialog(true)
                setMobileSheetOpen(false)
              }}
              isMobile={true}
            />
          </SheetContent>
        </MobileSheet>

        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:min-h-0">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-corporate-medium backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:static">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 lg:gap-4">
                  {/* Mobile Workspace/Client Selector */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 lg:hidden"
                    onClick={() => setMobileSheetOpen(true)}
                    aria-label="Seleziona workspace/cliente"
                  >
                    <Building className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex min-w-0 items-center gap-2 lg:gap-4">
                    {showTenantWorkspace ? (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg lg:h-12 lg:w-12 lg:rounded-xl">
                        <Building className="h-5 w-5 text-white lg:h-6 lg:w-6" />
                      </div>
                    ) : showAllClients ? (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg lg:h-12 lg:w-12 lg:rounded-xl">
                        <Globe className="h-5 w-5 text-white lg:h-6 lg:w-6" />
                      </div>
                    ) : (
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${selectedClient?.color || "bg-gradient-to-br from-gray-400 to-gray-600"} shadow-lg lg:h-12 lg:w-12 lg:rounded-xl`}
                      >
                        <span className="text-base font-bold text-white lg:text-lg">{selectedClient?.name?.charAt(0) || "?"}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h1 className="truncate bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold text-transparent dark:from-slate-100 dark:to-slate-300 lg:text-2xl">
                        {showTenantWorkspace
                          ? userData?.companyName || "Team Interno"
                          : showAllClients
                            ? "Tutti i Clienti"
                            : selectedClient?.name || "Seleziona Cliente"}
                      </h1>
                      <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1 lg:gap-2">
                        <Sparkles className="h-3 w-3 lg:h-4 lg:w-4" />
                        <span className="hidden sm:inline">
                          {showTenantWorkspace
                            ? "Workspace Interno"
                            : showAllClients
                              ? "Vista Globale Clienti"
                              : "Workspace Cliente"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cerca task..."
                      className="pl-10 w-[180px] lg:w-[250px] bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="hidden lg:flex bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filtri
                  </Button>
                  <Button
                    size="sm"
                    className="h-10 flex-shrink-0 bg-gradient-to-r from-pink-500 to-rose-600 px-3 text-white shadow-lg transition-all duration-200 hover:from-pink-600 hover:to-rose-700 hover:shadow-xl lg:h-9"
                    onClick={handleNewTaskClick}
                  >
                    <Plus className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Nuova Task</span>
                  </Button>
                </div>
              </div>
              <div className="relative mt-3 md:hidden">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cerca task..."
                  className="h-11 w-full border-slate-200/70 bg-white/80 pl-10 text-base shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-950/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200/70 bg-white/60 p-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/45 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <Briefcase className="h-3.5 w-3.5" />
                    Progetti
                  </div>
                  {visibleProjects.length > 0 ? (
                    visibleProjects.slice(0, 4).map((project) => (
                      <Badge
                        key={project.id}
                        variant="outline"
                        className="max-w-[210px] truncate border-righello-cyan/35 bg-righello-cyan/10 text-righello-cyan"
                        title={project.name}
                      >
                        {project.name}
                        {project.members?.length ? ` · ${project.members.length} persone` : ""}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Nessun progetto collegato a questo workspace
                    </span>
                  )}
                  {visibleProjects.length > 4 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">+{visibleProjects.length - 4}</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 flex-shrink-0 border-slate-300 bg-white/70 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                  onClick={() => setShowProjectDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuovo Progetto
                </Button>
              </div>
            </div>
          </div>

          <div className="min-h-[calc(100dvh-220px)] min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-3 [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y] dark:bg-slate-950 sm:p-4 lg:min-h-0 lg:overflow-hidden lg:p-6">
            {tasksLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento task...</p>
                </div>
              </div>
            ) : (
              <KanbanBoard
                tasks={tasks}
                columns={activeColumns}
                searchTerm={searchTerm}
                showAllClients={showAllClients}
                onDragEnd={handleDragEnd}
                onTaskClick={handleTaskClick}
                onAddTaskToColumn={handleAddTaskToColumn}
                getPriorityColor={getPriorityColor}
                getScoreColor={getScoreColor}
              />
            )}
          </div>
        </div>

        <TaskDetailDialog
          task={selectedTask}
          open={showTaskDetailDialog}
          onOpenChange={setShowTaskDetailDialog}
          onUpdateTask={updateTask}
          projects={projects}
          onUploadAttachments={uploadTaskAttachments}
          onDeleteAttachment={deleteTaskAttachment}
          onAddComment={addComment}
          onUpdateSubItems={updateSubItems}
          onAcceptAssignment={acceptTaskAssignment}
          onRejectAssignment={rejectTaskAssignment}
        />

        <Dialog
          open={showProjectDialog}
          onOpenChange={(nextOpen) => {
            setShowProjectDialog(nextOpen)
            if (!nextOpen) resetProjectForm()
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] max-w-[560px] rounded-lg border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Briefcase className="h-5 w-5 text-righello-cyan" />
                Nuovo Progetto
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Crea un contenitore di lavoro dentro il cliente e assegna subito il team operativo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="projectName">Nome progetto *</Label>
                <Input
                  id="projectName"
                  value={projectForm.name}
                  onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                  className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Es. Sito Tomasella 2026"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Stato</Label>
                  <Select
                    value={projectForm.status}
                    onValueChange={(value) => setProjectForm({ ...projectForm, status: value as Project["status"] })}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Pianificato</SelectItem>
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="in-progress">In corso</SelectItem>
                      <SelectItem value="on-hold">In pausa</SelectItem>
                      <SelectItem value="completed">Completato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="projectDueAt">Scadenza</Label>
                  <Input
                    id="projectDueAt"
                    type="date"
                    value={projectForm.dueAt}
                    onChange={(event) => setProjectForm({ ...projectForm, dueAt: event.target.value })}
                    className="border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Persone assegnate al progetto</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/70">
                  {users.length > 0 ? (
                    users.map((member) => {
                      const checked = projectForm.memberIds.includes(member.id)
                      const name = getUserName(member.id)

                      return (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-white dark:hover:bg-slate-800"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              setProjectForm((current) => ({
                                ...current,
                                memberIds: nextChecked
                                  ? [...current.memberIds, member.id]
                                  : current.memberIds.filter((id) => id !== member.id),
                              }))
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate">{name}</span>
                          <span className="text-xs text-slate-500">{member.role}</span>
                        </label>
                      )
                    })
                  ) : (
                    <p className="px-2 py-4 text-sm text-slate-500">Nessun membro disponibile.</p>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Le task restano assegnabili a una persona specifica, ma il progetto puo avere piu responsabili operativi.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowProjectDialog(false)}>
                Annulla
              </Button>
              <Button type="button" className="bg-righello-pink text-white hover:bg-righello-pink/90" onClick={handleAddProject}>
                Crea Progetto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showTaskDialog}
          onOpenChange={(nextOpen) => {
            setShowTaskDialog(nextOpen)
            if (!nextOpen) resetTaskForm()
          }}
        >
          <DialogContent className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-white/95 p-4 pt-12 backdrop-blur-xl dark:bg-slate-900/95 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[600px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:border-slate-200/50 sm:p-6 dark:sm:border-slate-700/50">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {showTenantWorkspace
                  ? "Aggiungi Task Interna"
                  : showAllClients
                    ? "Aggiungi Task Globale"
                    : "Aggiungi Nuova Task"}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                {showTenantWorkspace
                  ? "Crea una task per il team interno. Questa task non sarà visibile ai clienti."
                  : showAllClients
                    ? "Crea una task che sarà visibile nella vista globale di tutti i clienti."
                    : "Inserisci i dettagli della nuova task. Il titolo è obbligatorio."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:max-h-[60vh] sm:overflow-y-auto">
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="title" className="font-medium sm:text-right">
                  Titolo *
                </Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Inserisci il titolo della task..."
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                <Label htmlFor="description" className="font-medium sm:pt-2 sm:text-right">
                  Descrizione
                </Label>
                <Textarea
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Descrivi la task..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="project" className="font-medium sm:text-right">
                  Progetto
                </Label>
                <div className="flex gap-2 sm:col-span-3">
                  <Select
                    value={taskForm.projectId || "none"}
                    onValueChange={(value) => setTaskForm({ ...taskForm, projectId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="min-w-0 flex-1 border-slate-200/50 bg-white/60 backdrop-blur-sm dark:border-slate-600/50 dark:bg-slate-700/60">
                      <SelectValue placeholder="Collega a un progetto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Senza progetto</SelectItem>
                      {visibleProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                          {project.members?.length ? ` · ${project.members.length} persone` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-shrink-0 border-slate-200/50 bg-white/60 px-3 dark:border-slate-600/50 dark:bg-slate-700/60"
                    onClick={() => setShowProjectDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="priority" className="font-medium sm:text-right">
                  Priorità
                </Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value as "low" | "medium" | "high" })}
                >
                  <SelectTrigger className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bassa</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="type" className="font-medium sm:text-right">
                  Tipo
                </Label>
                <Select value={taskForm.type} onValueChange={(value) => setTaskForm({ ...taskForm, type: value })}>
                  <SelectTrigger className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50">
                    <SelectValue placeholder="Seleziona tipo..." />
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
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="score" className="font-medium sm:text-right">
                  Score (1-10)
                </Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="10"
                  value={taskForm.score}
                  onChange={(e) => setTaskForm({ ...taskForm, score: Number.parseInt(e.target.value) || 0 })}
                  className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="assignee" className="font-medium sm:text-right">
                  Assegnato a
                </Label>
                <UserAssignmentSelect
                  value={taskForm.assignee}
                  onValueChange={(value) => setTaskForm({ ...taskForm, assignee: value })}
                  className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Seleziona utente..."
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="dueDate" className="font-medium sm:text-right">
                  Scadenza
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="column" className="font-medium sm:text-right">
                  Colonna
                </Label>
                <Select
                  value={taskForm.columnId}
                  onValueChange={(value) => setTaskForm({ ...taskForm, columnId: value })}
                >
                  <SelectTrigger className="bg-white/60 backdrop-blur-sm dark:bg-slate-700/60 sm:col-span-3 border-slate-200/50 dark:border-slate-600/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                <Label className="font-medium sm:pt-2 sm:text-right">Allegati</Label>
                <div className="space-y-3 sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={uploadingFiles}
                    >
                      {uploadingFiles ? (
                        <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Carica File
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    />
                  </div>

                  {taskForm.attachments.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {taskForm.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFileIcon(attachment.type)}
                            <span className="text-sm truncate">{attachment.name}</span>
                            <span className="text-xs text-slate-500">{formatFileSize(attachment.size)}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTaskDialog(false)
                  resetTaskForm()
                }}
                className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
              >
                Annulla
              </Button>
              <Button
                onClick={handleAddTask}
                className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg"
              >
                Aggiungi Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Aggiungi Nuovo Cliente
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Inserisci i dettagli del nuovo cliente. Verrà creato automaticamente un account per l'accesso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:max-h-[60vh] sm:overflow-y-auto">
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="clientName" className="font-medium sm:text-right">
                  Nome *
                </Label>
                <Input
                  id="clientName"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="sm:col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Nome del cliente..."
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="industry" className="font-medium sm:text-right">
                  Settore
                </Label>
                <Input
                  id="industry"
                  value={clientForm.industry}
                  onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                  className="sm:col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Settore di attività..."
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="contactEmail" className="font-medium sm:text-right">
                  Email *
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={clientForm.contactEmail}
                  onChange={(e) => setClientForm({ ...clientForm, contactEmail: e.target.value })}
                  className="sm:col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="email@cliente.com"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="contactPhone" className="font-medium sm:text-right">
                  Telefono
                </Label>
                <Input
                  id="contactPhone"
                  value={clientForm.contactPhone}
                  onChange={(e) => setClientForm({ ...clientForm, contactPhone: e.target.value })}
                  className="sm:col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="+39 123 456 7890"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
                <Label htmlFor="address" className="font-medium sm:pt-2 sm:text-right">
                  Indirizzo
                </Label>
                <Textarea
                  id="address"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="sm:col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Indirizzo completo..."
                  rows={2}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label htmlFor="password" className="font-medium sm:text-right">
                  Password *
                </Label>
                <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={clientForm.password}
                      onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                      className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50 pr-10"
                      placeholder="Password per l'accesso..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  >
                    Genera
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                <Label className="font-medium sm:text-right">Email di benvenuto</Label>
                <div className="flex items-center space-x-2 sm:col-span-3">
                  <Switch
                    checked={clientForm.sendWelcomeEmail}
                    onCheckedChange={(checked) => setClientForm({ ...clientForm, sendWelcomeEmail: checked })}
                  />
                  <Label className="text-sm text-slate-600 dark:text-slate-400">
                    Invia email di benvenuto con le credenziali
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowClientDialog(false)}
                className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                disabled={isCreatingClient}
              >
                Annulla
              </Button>
              <Button
                onClick={handleAddClient}
                disabled={isCreatingClient}
                className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg"
              >
                {isCreatingClient ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Aggiungi Cliente
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showWorkspaceAlert} onOpenChange={setShowWorkspaceAlert}>
          <DialogContent className="sm:max-w-[400px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Seleziona Workspace
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Per creare una nuova task, devi prima selezionare un cliente dalla sidebar o utilizzare il workspace
                interno.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowWorkspaceAlert(false)}
                className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
              >
                Ho capito
              </Button>
              <Button
                onClick={() => {
                  setShowWorkspaceAlert(false)
                  handleTenantWorkspaceClick()
                }}
                className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg"
              >
                Usa Workspace Interno
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
