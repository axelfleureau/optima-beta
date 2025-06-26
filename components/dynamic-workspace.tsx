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
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  PanelLeft,
  PanelRight,
  Upload,
  X,
  FileText,
  ImageIcon,
  Star,
  Tag,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { useClients } from "@/hooks/use-clients"
import { useWorkspaceData, type Task } from "@/hooks/use-workspace-data"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { TaskDetailDialog } from "@/components/task-detail-dialog"

const defaultColumns = [
  { id: "to-do", title: "To Do", color: "border-blue-200" },
  { id: "urgenze", title: "Urgenze", color: "border-red-200" },
  { id: "in-corso", title: "In Corso", color: "border-yellow-200" },
  { id: "validation", title: "Validation", color: "border-purple-200" },
  { id: "done", title: "Done", color: "border-green-200" },
  { id: "sospensioni", title: "Sospensioni", color: "border-gray-300" },
  { id: "attivita-ricorrenti", title: "Attività Ricorrenti", color: "border-indigo-200" },
]

// Colonne per il workspace interno del tenant
const tenantColumns = [
  { id: "backlog", title: "Backlog", color: "border-gray-200" },
  { id: "planning", title: "Planning", color: "border-blue-200" },
  { id: "in-progress", title: "In Progress", color: "border-yellow-200" },
  { id: "review", title: "Review", color: "border-purple-200" },
  { id: "completed", title: "Completed", color: "border-green-200" },
  { id: "recurring", title: "Recurring", color: "border-indigo-200" },
]

const clientColors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-cyan-500",
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
    if (clients.length > 0 && !selectedClientId && !showTenantWorkspace) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId, showTenantWorkspace])

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

  // Filter tasks based on selected client or tenant
  const tasks = allTasks.filter((task) => {
    if (showTenantWorkspace) {
      return task.clientId === "tenant"
    } else {
      return task.clientId === selectedClientId
    }
  })

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
        (searchTerm === "" || task.title.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-yellow-500"
      case "low":
        return "border-l-green-500"
      default:
        return "border-l-gray-300"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-red-600"
    if (score >= 5) return "text-yellow-600"
    return "text-green-600"
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

    const targetClientId = showTenantWorkspace ? "tenant" : selectedClientId
    const targetClientName = showTenantWorkspace ? "tenant" : selectedClient?.name || ""

    if (!showTenantWorkspace && !selectedClientId) {
      setShowWorkspaceAlert(true)
      return
    }

    try {
      const { db } = await import("@/lib/firebase")
      const { collection, addDoc } = await import("firebase/firestore")

      await addDoc(collection(db, "tasks"), {
        title: taskForm.title,
        description: taskForm.description,
        richDescription: taskForm.richDescription,
        priority: taskForm.priority,
        type: taskForm.type,
        score: taskForm.score,
        columnId: taskForm.columnId,
        status: taskForm.columnId,
        assignee: taskForm.assignee,
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
    if (!selectedClientId && !showTenantWorkspace) {
      setShowWorkspaceAlert(true)
      return
    }
    setShowTaskDialog(true)
  }

  const handleTenantWorkspaceClick = () => {
    setShowTenantWorkspace(true)
    setSelectedClientId("")
  }

  const handleClientWorkspaceClick = (clientId: string) => {
    setShowTenantWorkspace(false)
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access the workspace</p>
      </div>
    )
  }

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading clients...</p>
      </div>
    )
  }

  if (isClient) {
    // Vista client minimal - usa le task filtrate automaticamente dal hook
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b p-4 bg-white">
          <h1 className="text-2xl font-bold">{userData?.companyName || "Il Mio Workspace"}</h1>
          <p className="text-gray-600">Gestisci le tue richieste e monitora i progressi</p>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 p-4 h-full" style={{ minWidth: "1200px" }}>
              {defaultColumns.map((column) => (
                <div key={column.id} className="flex flex-col w-80 min-w-80">
                  <div className={`border-t-4 ${column.color} bg-white rounded-t-lg p-3 shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{column.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {allTasks.filter((task) => task.columnId === column.id).length}
                      </Badge>
                    </div>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 bg-gray-50 p-3 space-y-3 overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver ? "bg-blue-50" : ""
                        }`}
                        style={{ minHeight: "500px", maxHeight: "calc(100vh - 200px)" }}
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
                                  className={`p-4 cursor-pointer transition-all border-l-4 ${getPriorityColor(task.priority)} ${
                                    snapshot.isDragging ? "shadow-lg rotate-2 z-50" : "hover:shadow-md"
                                  }`}
                                  onClick={() => handleTaskClick(task)}
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                                      {task.score && task.score > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Star className={`h-3 w-3 ${getScoreColor(task.score)}`} />
                                          <span className={`text-xs ${getScoreColor(task.score)}`}>{task.score}</span>
                                        </div>
                                      )}
                                    </div>

                                    <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>

                                    {task.type && (
                                      <Badge variant="outline" className="text-xs">
                                        {task.type}
                                      </Badge>
                                    )}

                                    {task.tags && task.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {task.tags.map((tag: string) => (
                                          <Badge key={tag} variant="secondary" className="text-xs">
                                            <Tag className="h-2 w-2 mr-1" />
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-500">
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
    )
  }

  return (
    <div className="flex h-screen max-w-full">
      {/* Client Sidebar - Solo per admin */}
      <div
        className={`${
          sidebarCollapsed ? "w-0 min-w-0 opacity-0" : "w-80 min-w-80 opacity-100"
        } bg-gray-50 border-r flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
      >
        {/* Client Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">Clienti</span>
            </div>
            <Button size="sm" className="bg-pink-500 hover:bg-pink-600" onClick={() => setShowClientDialog(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Aggiungi
            </Button>
          </div>

          <Input placeholder="Cerca clienti..." className="w-full" />
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {clients.map((client) => {
              const taskCount = getClientTaskCount(client.id)
              return (
                <button
                  key={client.id}
                  onClick={() => handleClientWorkspaceClick(client.id)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    selectedClientId === client.id && !showTenantWorkspace
                      ? "bg-white shadow-md border-2 border-pink-200"
                      : "bg-white/70 hover:bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full ${client.color}`}></div>
                    <span className="font-medium text-sm">{client.name}</span>
                  </div>
                  <div className="text-xs text-gray-500">{taskCount.active} task attive</div>
                  <div className="text-xs text-gray-400 mt-1">{taskCount.completed} completate</div>
                </button>
              )
            })}

            {clients.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-3">Nessun cliente trovato</p>
                <Button size="sm" className="bg-pink-500 hover:bg-pink-600" onClick={() => setShowClientDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Aggiungi primo cliente
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tenant Section */}
        <div className="p-4 border-t bg-gray-100">
          <button
            onClick={handleTenantWorkspaceClick}
            className={`w-full text-left p-3 rounded-lg ${
              showTenantWorkspace
                ? "bg-white shadow-md border-2 border-pink-200"
                : "bg-white hover:bg-gray-50 border border-gray-200"
            } transition-colors`}
          >
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-gray-600" />
              <div>
                <span className="font-medium text-sm text-gray-800">{userData?.companyName || "Team Interno"}</span>
                <div className="text-xs text-gray-500">Workspace interno</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 -left-3 z-10 h-8 w-8 rounded-full bg-white border shadow-sm"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Header */}
        <div className="border-b p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {showTenantWorkspace ? (
                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                    <Building className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full ${selectedClient?.color || "bg-gray-300"}`}></div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">
                    {showTenantWorkspace
                      ? userData?.companyName || "Team Interno"
                      : selectedClient?.name || "Seleziona Cliente"}
                  </h1>
                  <p className="text-gray-600">{showTenantWorkspace ? "Workspace Interno" : "Workspace Cliente"}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cerca task..."
                className="w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtri
              </Button>
              <Button className="bg-pink-500 hover:bg-pink-600" onClick={handleNewTaskClick}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Task
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {tasksLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading tasks...</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 p-4 h-full" style={{ minWidth: "1600px" }}>
                {activeColumns.map((column) => (
                  <div key={column.id} className="flex flex-col w-80 min-w-80">
                    {/* Column Header */}
                    <div className={`border-t-4 ${column.color} bg-white rounded-t-lg p-3 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{column.title}</h3>
                        <Badge variant="secondary" className="text-xs">
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
                          className={`flex-1 bg-gray-50 p-3 space-y-3 overflow-y-auto transition-colors ${
                            snapshot.isDraggingOver ? "bg-blue-50" : ""
                          }`}
                          style={{ minHeight: "500px", maxHeight: "calc(100vh - 200px)" }}
                        >
                          {getTasksForColumn(column.id).map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-4 cursor-pointer transition-all border-l-4 ${getPriorityColor(task.priority)} ${
                                    snapshot.isDragging ? "shadow-lg rotate-2 z-50" : "hover:shadow-md"
                                  }`}
                                  onClick={() => handleTaskClick(task)}
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                                      <div className="flex items-center gap-1">
                                        {task.score && task.score > 0 && (
                                          <div className="flex items-center gap-1">
                                            <Star className={`h-3 w-3 ${getScoreColor(task.score)}`} />
                                            <span className={`text-xs ${getScoreColor(task.score)}`}>{task.score}</span>
                                          </div>
                                        )}
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>

                                    {task.type && (
                                      <Badge variant="outline" className="text-xs">
                                        {task.type}
                                      </Badge>
                                    )}

                                    {task.tags && task.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {task.tags.map((tag: string) => (
                                          <Badge key={tag} variant="secondary" className="text-xs">
                                            <Tag className="h-2 w-2 mr-1" />
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-500">
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

                                    <div className="text-xs text-gray-500">
                                      Assegnato a: {task.assignee || "Non assegnato"}
                                    </div>
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-gray-300 h-12 text-gray-500 hover:border-gray-400 hover:text-gray-600"
                            onClick={() => {
                              if (!showTenantWorkspace && !selectedClientId) {
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{showTenantWorkspace ? "Aggiungi Task Interna" : "Aggiungi Nuova Task"}</DialogTitle>
            <DialogDescription>
              {showTenantWorkspace
                ? "Crea una task per il team interno. Questa task non sarà visibile ai clienti."
                : "Inserisci i dettagli della nuova task. Il titolo è obbligatorio."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Titolo *
              </Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="col-span-3"
                placeholder="Titolo della task"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descrizione
              </Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="col-span-3"
                placeholder="Descrizione breve"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="richDescription" className="text-right">
                Descrizione Dettagliata
              </Label>
              <Textarea
                id="richDescription"
                value={taskForm.richDescription}
                onChange={(e) => setTaskForm({ ...taskForm, richDescription: e.target.value })}
                className="col-span-3"
                placeholder="Descrizione dettagliata (supporta Markdown)"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipologia
              </Label>
              <Select value={taskForm.type} onValueChange={(value) => setTaskForm({ ...taskForm, type: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleziona tipologia" />
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
              <Label htmlFor="priority" className="text-right">
                Priorità
              </Label>
              <Select
                value={taskForm.priority}
                onValueChange={(value: "low" | "medium" | "high") => setTaskForm({ ...taskForm, priority: value })}
              >
                <SelectTrigger className="col-span-3">
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
              <Label htmlFor="score" className="text-right">
                Punteggio (0-10)
              </Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="10"
                value={taskForm.score}
                onChange={(e) => setTaskForm({ ...taskForm, score: Number.parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Punteggio valutazione"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Scadenza
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignee" className="text-right">
                Assegnato a
              </Label>
              <Input
                id="assignee"
                value={taskForm.assignee}
                onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                className="col-span-3"
                placeholder="Nome dell'assegnatario"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="column" className="text-right">
                Colonna
              </Label>
              <Select
                value={taskForm.columnId}
                onValueChange={(value) => setTaskForm({ ...taskForm, columnId: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(showTenantWorkspace ? tenantColumns : defaultColumns).map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right">Allegati</Label>
              <div className="col-span-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    disabled={uploadingFiles}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={uploadingFiles}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFiles ? "Caricamento..." : "Carica File"}
                  </Button>
                </div>

                {/* Attachments List */}
                {taskForm.attachments.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {taskForm.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getFileIcon(attachment.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                          className="h-6 w-6 p-0 flex-shrink-0"
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
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleAddTask} className="bg-pink-500 hover:bg-pink-600">
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remaining dialogs... */}
      {/* Add Client Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aggiungi Nuovo Cliente</DialogTitle>
            <DialogDescription>
              Crea un nuovo cliente con accesso dedicato alla piattaforma. Verrà creato un account utente e un workspace
              privato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome *
              </Label>
              <Input
                id="name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                className="col-span-3"
                placeholder="Nome del cliente"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={clientForm.contactEmail}
                onChange={(e) => setClientForm({ ...clientForm, contactEmail: e.target.value })}
                className="col-span-3"
                placeholder="email@esempio.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password *
              </Label>
              <div className="col-span-3 flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={clientForm.password}
                    onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                    placeholder="Password di accesso"
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
                <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                  Genera
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="industry" className="text-right">
                Settore
              </Label>
              <Input
                id="industry"
                value={clientForm.industry}
                onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                className="col-span-3"
                placeholder="Settore di attività"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefono
              </Label>
              <Input
                id="phone"
                value={clientForm.contactPhone}
                onChange={(e) => setClientForm({ ...clientForm, contactPhone: e.target.value })}
                className="col-span-3"
                placeholder="+39 123 456 7890"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Indirizzo
              </Label>
              <Input
                id="address"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                className="col-span-3"
                placeholder="Via, Città"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="welcomeEmail" className="text-right">
                Email di benvenuto
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="welcomeEmail"
                  checked={clientForm.sendWelcomeEmail}
                  onCheckedChange={(checked) => setClientForm({ ...clientForm, sendWelcomeEmail: checked })}
                />
                <Label htmlFor="welcomeEmail" className="text-sm text-gray-600">
                  Invia email con credenziali di accesso
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientDialog(false)} disabled={isCreatingClient}>
              Annulla
            </Button>
            <Button onClick={handleAddClient} className="bg-pink-500 hover:bg-pink-600" disabled={isCreatingClient}>
              {isCreatingClient ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creazione...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crea Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workspace Selection Alert */}
      <Dialog open={showWorkspaceAlert} onOpenChange={setShowWorkspaceAlert}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Workspace non selezionato
            </DialogTitle>
            <DialogDescription>
              Per creare una nuova task è necessario selezionare prima un workspace (cliente) dalla barra laterale.
            </DialogDescription>
          </DialogHeader>
          <Alert className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Seleziona un cliente dalla lista a sinistra oppure crea un nuovo cliente per iniziare a lavorare.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkspaceAlert(false)}>
              Ho capito
            </Button>
            <Button
              onClick={() => {
                setShowWorkspaceAlert(false)
                setShowClientDialog(true)
              }}
              className="bg-pink-500 hover:bg-pink-600"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Aggiungi Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
