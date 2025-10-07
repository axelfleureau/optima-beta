"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Paperclip,
  Users,
  UserPlus,
  AlertCircle,
  Building,
  Eye,
  EyeOff,
  Upload,
  X,
  FileText,
  ImageIcon,
  Star,
  Tag,
  Search,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { useClients } from "@/hooks/use-clients"
import { useWorkspaceData } from "@/hooks/use-workspace-data"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useNotifications } from "@/lib/notification-context"
import { useUsers } from "@/hooks/use-users"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { UserAssignmentSelect } from "@/components/ui/user-assignment-select"
import { useAutoGenStore } from "@/lib/stores/auto-gen-store"
import type { Task, Client } from "@/lib/types"

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

// Colonne per il workspace interno del tenant
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

export function DynamicWorkspace() {
  const { user, userData } = useAuth()
  const { clients, loading: clientsLoading } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [showAllClients, setShowAllClients] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showTaskDetailDialog, setShowTaskDetailDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showWorkspaceAlert, setShowWorkspaceAlert] = useState(false)
  const [showTenantWorkspace, setShowTenantWorkspace] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const { users } = useUsers()

  // Client form state
  const [clientForm, setClientForm] = useState({
    name: "",
    industry: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    password: "",
    sendWelcomeEmail: true,
  })

  // Enhanced task form state
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

  // Set default client when clients load
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId && !showTenantWorkspace && !showAllClients) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId, showTenantWorkspace, showAllClients])

  // Reset task form columnId when switching between tenant and client workspace
  useEffect(() => {
    setTaskForm((prev) => ({
      ...prev,
      columnId: showTenantWorkspace ? "backlog" : "to-do",
    }))
  }, [showTenantWorkspace])

  // Get all tasks with enhanced functionality
  const {
    tasks: allTasks,
    loading: tasksLoading,
    moveTask,
    updateTask,
    addComment,
    updateSubItems,
  } = useWorkspaceData()

  // Filter tasks based on selected client or tenant or all clients
  const tasks = allTasks.filter((task) => {
    if (showTenantWorkspace) {
      return task.clientId === "tenant"
    } else if (showAllClients) {
      return task.clientId !== "tenant" // Show all client tasks
    } else {
      return task.clientId === selectedClientId
    }
  })

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    await moveTask(draggableId, destination.droppableId)
  }

  // Check if user is client
  const isClient = userData?.role === "client"

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(
      (task) =>
        task.columnId === columnId &&
        (searchTerm === "" ||
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.assignee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.type?.toLowerCase().includes(searchTerm.toLowerCase())),
    )
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

      // Create Firebase Auth user for the client
      const userCredential = await createUserWithEmailAndPassword(auth, clientForm.contactEmail, clientForm.password)
      const clientUser = userCredential.user
      const clientTenantId = clientUser.uid

      // Create user document for the client
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

      // Create client document in the agency's tenant
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

      // Send welcome email if enabled
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
    const targetClientName = showTenantWorkspace ? "tenant" : showAllClients ? "all" : selectedClient?.name || ""

    if (!showTenantWorkspace && !selectedClientId && !showAllClients) {
      setShowWorkspaceAlert(true)
      return
    }

    try {
      const { db } = await import("@/lib/firebase")
      const { collection, addDoc } = await import("firebase/firestore")

      // Trova l'ID dell'utente assegnato se presente
      const assignedUser = users.find(u => 
        `${u.firstName} ${u.lastName}`.trim() === taskForm.assignee.trim()
      )
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

      // Invia notifica all'utente assegnato se presente
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
              clientName: targetClientName
            }
          })
        } catch (notificationError) {
          console.error("Errore nell'invio della notifica:", notificationError)
          // Non interrompere il flusso per un errore di notifica
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

  const handleTenantWorkspaceClick = () => {
    setShowTenantWorkspace(true)
    setShowAllClients(false)
    setSelectedClientId("")
  }

  const handleAllClientsClick = () => {
    setShowAllClients(true)
    setShowTenantWorkspace(false)
    setSelectedClientId("")
  }

  const handleClientWorkspaceClick = (clientId: string) => {
    setShowTenantWorkspace(false)
    setShowAllClients(false)
    setSelectedClientId(clientId)
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskDetailDialog(true)
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Determine which columns to show based on workspace type
  const activeColumns = showTenantWorkspace ? tenantColumns : defaultColumns

  // Helper function to get task count for a client
  const getClientTaskCount = (clientId: string) => {
    const clientTasks = allTasks.filter((task) => task.clientId === clientId)

    const activeTasks = clientTasks.filter(
      (task) =>
        task.columnId === "to-do" ||
        task.columnId === "in-corso" ||
        task.columnId === "urgenze" ||
        task.columnId === "validation" ||
        task.columnId === "backlog" ||
        task.columnId === "planning" ||
        task.columnId === "in-progress" ||
        task.columnId === "review",
    )

    const completedTasks = clientTasks.filter((task) => task.columnId === "done" || task.columnId === "completed")

    return { active: activeTasks.length, completed: completedTasks.length }
  }

  // Helper function to get all clients task count
  const getAllClientsTaskCount = () => {
    const allClientTasks = allTasks.filter((task) => task.clientId !== "tenant")

    const activeTasks = allClientTasks.filter(
      (task) =>
        task.columnId === "to-do" ||
        task.columnId === "in-corso" ||
        task.columnId === "urgenze" ||
        task.columnId === "validation",
    )

    const completedTasks = allClientTasks.filter((task) => task.columnId === "done")

    return { active: activeTasks.length, completed: completedTasks.length }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Accesso in corso...</p>
        </div>
      </div>
    )
  }

  if (clientsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento workspace...</p>
        </div>
      </div>
    )
  }

  if (isClient) {
    // Vista client minimal - usa le task filtrate automaticamente dal hook
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <div className="flex flex-col h-screen">
          {/* Header migliorato per client */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                    {userData?.companyName || "Il Mio Workspace"}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">Gestisci le tue richieste e monitora i progressi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            {tasksLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento task...</p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 h-full" style={{ minWidth: "1400px" }}>
                  {defaultColumns.map((column) => (
                    <div key={column.id} className="flex flex-col w-80 min-w-80">
                      {/* Column Header migliorato */}
                      <div
                        className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-t-2xl p-4 shadow-lg border-t-4 ${column.color}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${column.bgColor} flex items-center justify-center`}>
                              <Clock className={`h-4 w-4 ${column.iconColor}`} />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{column.title}</h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {allTasks.filter((task) => task.columnId === column.id).length}
                          </Badge>
                        </div>
                      </div>

                      {/* Column Content */}
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
                            style={{ minHeight: "500px", maxHeight: "calc(100vh - 250px)" }}
                          >
                            {allTasks
                              .filter((task) => task.columnId === column.id)
                              .map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${getPriorityColor(task.priority)} ${
                                        snapshot.isDragging
                                          ? "shadow-2xl rotate-2 z-50 scale-105"
                                          : "hover:shadow-lg hover:scale-102"
                                      } bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50`}
                                      onClick={() => handleTaskClick(task)}
                                    >
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                          <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
                                            {task.title}
                                          </h4>
                                          {task.score && task.score > 0 && (
                                            <div
                                              className={`flex items-center gap-1 px-2 py-1 rounded-full ${getScoreColor(task.score)}`}
                                            >
                                              <Star className="h-3 w-3" />
                                              <span className="text-xs font-medium">{task.score}</span>
                                            </div>
                                          )}
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

                                        {task.tags && task.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {task.tags.map((tag: string) => (
                                              <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="text-xs bg-slate-100 dark:bg-slate-700"
                                              >
                                                <Tag className="h-2 w-2 mr-1" />
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                              {task.dueDate
                                                ? new Date(task.dueDate).toLocaleDateString("it-IT")
                                                : "Nessuna scadenza"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {task.comments.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                <span>{task.comments.length}</span>
                                              </div>
                                            )}
                                            {task.attachments && task.attachments.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <Paperclip className="h-3 w-3" />
                                                <span>{task.attachments.length}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs"
                                            onClick={async () => {
                                              if (!user) return
                                              const { generateCopy } = useAutoGenStore.getState()
                                              await generateCopy(task.id, task.title || task.description, task.clientName, user.uid)
                                            }}
                                          >
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Genera Copy
                                          </Button>
                                          
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs"
                                            onClick={async () => {
                                              if (!user) return
                                              const { generateVisual } = useAutoGenStore.getState()
                                              const prompt = `${task.title || task.description}${task.clientName ? ` for ${task.clientName}` : ''}`
                                              const token = await user.getIdToken()
                                              await generateVisual(task.id, prompt, user.uid, token)
                                            }}
                                          >
                                            <ImageIcon className="w-3 h-3 mr-1" />
                                            Genera Visual
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  )}
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

          {/* Enhanced Task Detail Dialog */}
          <TaskDetailDialog
            task={selectedTask}
            open={showTaskDetailDialog}
            onOpenChange={setShowTaskDetailDialog}
            onUpdateTask={updateTask}
            onAddComment={addComment}
            onUpdateSubItems={updateSubItems}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <div className="flex h-screen max-w-full">
        {/* Client Sidebar migliorata - Solo per admin */}
        <div
          className={`${
            sidebarCollapsed ? "w-0 min-w-0" : "w-80 min-w-80"
          } bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col overflow-hidden shadow-xl`}
        >
          {/* Sidebar Header con pulsante minimize */}
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-700/80">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-900 dark:text-slate-100">Clienti</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setShowClientDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={toggleSidebar}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca clienti..."
                className="pl-10 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {/* Vista Tutti i Clienti */}
              <button
                onClick={handleAllClientsClick}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  showAllClients
                    ? "bg-white/90 dark:bg-slate-700/90 shadow-lg border-2 border-pink-200 dark:border-pink-400 scale-105"
                    : "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md hover:scale-102"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">Tutti i Clienti</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {getAllClientsTaskCount().active} attive
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-green-500" />
                      <span className="text-slate-600 dark:text-slate-400">
                        {getAllClientsTaskCount().completed} completate
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Lista Clienti Filtrata */}
              {filteredClients.map((client) => {
                const taskCount = getClientTaskCount(client.id)
                return (
                  <button
                    key={client.id}
                    onClick={() => handleClientWorkspaceClick(client.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      selectedClientId === client.id && !showTenantWorkspace && !showAllClients
                        ? "bg-white/90 dark:bg-slate-700/90 shadow-lg border-2 border-pink-200 dark:border-pink-400 scale-105"
                        : "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md hover:scale-102"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${client.color} shadow-md flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{client.name.charAt(0)}</span>
                      </div>
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{client.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="text-slate-600 dark:text-slate-400">{taskCount.active} attive</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-green-500" />
                          <span className="text-slate-600 dark:text-slate-400">{taskCount.completed} completate</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}

              {filteredClients.length === 0 && clientSearchTerm && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Nessun cliente trovato per "{clientSearchTerm}"
                  </p>
                </div>
              )}

              {clients.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Nessun cliente trovato</p>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg"
                    onClick={() => setShowClientDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Aggiungi primo cliente
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tenant Section migliorata */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-100/50 to-slate-200/50 dark:from-slate-800/50 dark:to-slate-700/50">
            <button
              onClick={handleTenantWorkspaceClick}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                showTenantWorkspace
                  ? "bg-white/90 dark:bg-slate-700/90 shadow-lg border-2 border-pink-200 dark:border-pink-400 scale-105"
                  : "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md hover:scale-102"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {userData?.companyName || "Team Interno"}
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Workspace interno</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Toggle Sidebar Button quando è collassata */}
        {sidebarCollapsed && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 left-4 z-10 h-10 w-10 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
              onClick={toggleSidebar}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Main Workspace migliorato */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Workspace Header migliorato */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4">
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
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                        {showTenantWorkspace
                          ? userData?.companyName || "Team Interno"
                          : showAllClients
                            ? "Tutti i Clienti"
                            : selectedClient?.name || "Seleziona Cliente"}
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        {showTenantWorkspace
                          ? "Workspace Interno"
                          : showAllClients
                            ? "Vista Globale Clienti"
                            : "Workspace Cliente"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cerca task..."
                      className="pl-10 w-[250px] bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filtri
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={handleNewTaskClick}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuova Task
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board migliorato */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            {tasksLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Caricamento task...</p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 h-full" style={{ minWidth: "1800px" }}>
                  {activeColumns.map((column) => (
                    <div key={column.id} className="flex flex-col w-80 min-w-80">
                      {/* Column Header migliorato */}
                      <div
                        className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-t-2xl p-4 shadow-lg border-t-4 ${column.color}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg ${column.bgColor} flex items-center justify-center shadow-sm`}
                            >
                              <Clock className={`h-4 w-4 ${column.iconColor}`} />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{column.title}</h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {getTasksForColumn(column.id).length}
                          </Badge>
                        </div>
                      </div>

                      {/* Column Content */}
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
                            style={{ minHeight: "500px", maxHeight: "calc(100vh - 250px)" }}
                          >
                            {getTasksForColumn(column.id).map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${getPriorityColor(task.priority)} ${
                                      snapshot.isDragging
                                        ? "shadow-2xl rotate-2 z-50 scale-105"
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
                                              <span className="text-xs font-medium">{task.score}</span>
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

                                      {task.tags && task.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {task.tags.map((tag: string) => (
                                            <Badge
                                              key={tag}
                                              variant="secondary"
                                              className="text-xs bg-slate-100 dark:bg-slate-700"
                                            >
                                              <Tag className="h-2 w-2 mr-1" />
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}

                                      {/* Mostra il cliente se siamo nella vista "Tutti i Clienti" */}
                                      {showAllClients && task.clientName && task.clientName !== "all" && (
                                        <div className="flex items-center gap-1">
                                          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-blue-600"></div>
                                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {task.clientName}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          <span>
                                            {task.dueDate
                                              ? new Date(task.dueDate).toLocaleDateString("it-IT")
                                              : "Nessuna scadenza"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {task.comments.length > 0 && (
                                            <div className="flex items-center gap-1">
                                              <MessageSquare className="h-3 w-3" />
                                              <span>{task.comments.length}</span>
                                            </div>
                                          )}
                                          {task.attachments && task.attachments.length > 0 && (
                                            <div className="flex items-center gap-1">
                                              <Paperclip className="h-3 w-3" />
                                              <span>{task.attachments.length}</span>
                                            </div>
                                          )}
                                          {task.subItems && task.subItems.length > 0 && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs">
                                                ✓ {task.subItems.filter((item) => item.completed).length}/
                                                {task.subItems.length}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Assegnato a: {task.assignee || "Non assegnato"}
                                      </div>

                                      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 h-7 text-xs"
                                          onClick={async () => {
                                            if (!user) return
                                            const { generateCopy } = useAutoGenStore.getState()
                                            await generateCopy(task.id, task.title || task.description, task.clientName, user.uid)
                                          }}
                                        >
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          Genera Copy
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 h-7 text-xs"
                                          onClick={async () => {
                                            if (!user) return
                                            const { generateVisual } = useAutoGenStore.getState()
                                            const prompt = `${task.title || task.description}${task.clientName ? ` for ${task.clientName}` : ''}`
                                            const token = await user.getIdToken()
                                            await generateVisual(task.id, prompt, user.uid, token)
                                          }}
                                        >
                                          <ImageIcon className="w-3 h-3 mr-1" />
                                          Genera Visual
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}

                            <Button
                              variant="ghost"
                              className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 h-12 text-slate-500 dark:text-slate-400 hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all duration-200"
                              onClick={() => {
                                if (!showTenantWorkspace && !selectedClientId && !showAllClients) {
                                  setShowWorkspaceAlert(true)
                                  return
                                }
                                setTaskForm({ ...taskForm, columnId: column.id })
                                setShowTaskDialog(true)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Aggiungi task
                            </Button>
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            )}
          </div>
        </div>

        {/* Enhanced Task Detail Dialog */}
        <TaskDetailDialog
          task={selectedTask}
          open={showTaskDetailDialog}
          onOpenChange={setShowTaskDetailDialog}
          onUpdateTask={updateTask}
          onAddComment={addComment}
          onUpdateSubItems={updateSubItems}
        />

        {/* Enhanced Add Task Dialog */}
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

              {/* File Upload Section */}
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

        {/* Enhanced Add Client Dialog */}
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

        {/* Workspace Selection Alert */}
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
