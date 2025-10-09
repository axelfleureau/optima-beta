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
  Menu,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useNotifications } from "@/lib/notification-context"
import { useUsers } from "@/hooks/use-users"
import { useClients } from "@/hooks/use-clients"
import { useWorkspaceData } from "@/hooks/use-workspace-data"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { UserAssignmentSelect } from "@/components/ui/user-assignment-select"
import { ClientSidebar } from "./client-sidebar"
import { KanbanBoard } from "./kanban-board"
import { useWorkspaceLayout } from "@/hooks/use-workspace-layout"
import { useIsMounted } from "@/hooks/use-is-mounted"
import type { Task } from "@/lib/types"

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
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showWorkspaceAlert, setShowWorkspaceAlert] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const { users } = useUsers()
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
  })

  useEffect(() => {
    setTaskForm((prev) => ({
      ...prev,
      columnId: showTenantWorkspace ? "backlog" : "to-do",
    }))
  }, [showTenantWorkspace])

  const {
    tasks: allTasks,
    loading: tasksLoading,
    moveTask,
    updateTask,
    addComment,
    updateSubItems,
  } = useWorkspaceData()

  const tasks = allTasks.filter((task) => {
    if (showTenantWorkspace) {
      return task.clientId === "tenant"
    } else if (showAllClients) {
      return task.clientId !== "tenant"
    } else {
      return task.clientId === selectedClientId
    }
  })

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

    await moveTask(draggableId, destination.droppableId)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-gradient-to-r from-red-50 to-red-100"
      case "medium":
        return "border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100"
      case "low":
        return "border-l-green-500 bg-gradient-to-r from-green-50 to-green-100"
      default:
        return "border-l-gray-300 bg-gradient-to-r from-gray-50 to-gray-100"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-red-600 bg-red-100"
    if (score >= 5) return "text-yellow-600 bg-yellow-100"
    return "text-green-600 bg-green-100"
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
        const url = URL.createObjectURL(file)

        const attachment: TaskAttachment = {
          id: `${Date.now()}-${i}`,
          name: file.name,
          url: url,
          type: file.type,
          size: file.size,
        }

        newAttachments.push(attachment)
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
      const { db } = await import("@/lib/firebase")
      const { collection, addDoc } = await import("firebase/firestore")

      const assignedUser = users.find((u) => `${u.firstName} ${u.lastName}`.trim() === taskForm.assignee.trim())
      const assignedUserId = assignedUser?.id || null

      const taskDocRef = await addDoc(collection(db, "tasks"), {
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
        tenantId: user?.uid,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
        attachments: taskForm.attachments,
        tags: taskForm.tags,
        comments: [],
        subItems: [],
        parentItemId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      if (assignedUser && assignedUserId) {
        try {
          await addNotification({
            userId: assignedUserId,
            title: "Nuovo task assegnato",
            message: `Ti è stato assegnato il task: "${taskForm.title}"`,
            type: "task_assigned",
            taskId: taskDocRef.id,
            metadata: {
              taskTitle: taskForm.title,
              priority: taskForm.priority,
              dueDate: taskForm.dueDate,
              assignedBy: userData?.firstName + " " + userData?.lastName,
              clientName: targetClientName,
            },
          })
        } catch (notificationError) {
          console.error("Errore nell'invio della notifica:", notificationError)
          toast({
            title: "Avvertenza",
            description: "Task creato ma notifica non inviata",
            variant: "default",
          })
        }
      }

      toast({
        title: "Successo",
        description: "Task aggiunta con successo",
      })

      setShowTaskDialog(false)
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
      })
    } catch (error) {
      console.error("Error adding task:", error)
      toast({
        title: "Errore",
        description: "Errore durante l'aggiunta della task",
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <div className="flex min-h-[100dvh]">
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
          <SheetContent side="left" className="w-80 p-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl lg:hidden">
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

        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 lg:gap-4">
                  {/* Mobile Workspace/Client Selector */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setMobileSheetOpen(true)}
                    aria-label="Seleziona workspace/cliente"
                  >
                    <Building className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex items-center gap-2 lg:gap-4">
                    {showTenantWorkspace ? (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                    ) : showAllClients ? (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-xl ${selectedClient?.color || "bg-gradient-to-br from-gray-400 to-gray-600"} shadow-lg flex items-center justify-center`}
                      >
                        <span className="text-white font-bold text-lg">{selectedClient?.name?.charAt(0) || "?"}</span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
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
                    className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={handleNewTaskClick}
                  >
                    <Plus className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Nuova Task</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 lg:p-6">
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
          onAddComment={addComment}
          onUpdateSubItems={updateSubItems}
        />

        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
            <DialogHeader>
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
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right font-medium">
                  Titolo *
                </Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Inserisci il titolo della task..."
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right font-medium pt-2">
                  Descrizione
                </Label>
                <Textarea
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Descrivi la task..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right font-medium">
                  Priorità
                </Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value as "low" | "medium" | "high" })}
                >
                  <SelectTrigger className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bassa</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right font-medium">
                  Tipo
                </Label>
                <Select value={taskForm.type} onValueChange={(value) => setTaskForm({ ...taskForm, type: value })}>
                  <SelectTrigger className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="score" className="text-right font-medium">
                  Score (1-10)
                </Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="10"
                  value={taskForm.score}
                  onChange={(e) => setTaskForm({ ...taskForm, score: Number.parseInt(e.target.value) || 0 })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignee" className="text-right font-medium">
                  Assegnato a
                </Label>
                <UserAssignmentSelect
                  value={taskForm.assignee}
                  onValueChange={(value) => setTaskForm({ ...taskForm, assignee: value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Seleziona utente..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right font-medium">
                  Scadenza
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="column" className="text-right font-medium">
                  Colonna
                </Label>
                <Select
                  value={taskForm.columnId}
                  onValueChange={(value) => setTaskForm({ ...taskForm, columnId: value })}
                >
                  <SelectTrigger className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50">
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

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Allegati</Label>
                <div className="col-span-3 space-y-3">
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
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTaskDialog(false)}
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
          <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Aggiungi Nuovo Cliente
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Inserisci i dettagli del nuovo cliente. Verrà creato automaticamente un account per l'accesso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientName" className="text-right font-medium">
                  Nome *
                </Label>
                <Input
                  id="clientName"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Nome del cliente..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="industry" className="text-right font-medium">
                  Settore
                </Label>
                <Input
                  id="industry"
                  value={clientForm.industry}
                  onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Settore di attività..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactEmail" className="text-right font-medium">
                  Email *
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={clientForm.contactEmail}
                  onChange={(e) => setClientForm({ ...clientForm, contactEmail: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="email@cliente.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactPhone" className="text-right font-medium">
                  Telefono
                </Label>
                <Input
                  id="contactPhone"
                  value={clientForm.contactPhone}
                  onChange={(e) => setClientForm({ ...clientForm, contactPhone: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="+39 123 456 7890"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="address" className="text-right font-medium pt-2">
                  Indirizzo
                </Label>
                <Textarea
                  id="address"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="col-span-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  placeholder="Indirizzo completo..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right font-medium">
                  Password *
                </Label>
                <div className="col-span-3 flex gap-2">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Email di benvenuto</Label>
                <div className="col-span-3 flex items-center space-x-2">
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
