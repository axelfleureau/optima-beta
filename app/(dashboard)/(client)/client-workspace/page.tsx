"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, updateDoc, doc } from "firebase/firestore"

interface Task {
  id: string
  title: string
  description?: string
  status: "richieste" | "in-lavorazione" | "revisione" | "completato"
  priority: "bassa" | "media" | "alta"
  dueDate?: Date
  createdAt: Date
  assignedTo?: string
  clientId: string
  tenantId: string
}

const statusConfig = {
  richieste: {
    label: "Richieste",
    color: "bg-blue-100 text-blue-800",
    icon: AlertCircle,
  },
  "in-lavorazione": {
    label: "In Lavorazione",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  revisione: {
    label: "In Revisione",
    color: "bg-purple-100 text-purple-800",
    icon: User,
  },
  completato: {
    label: "Completato",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
}

const priorityConfig = {
  bassa: { label: "Bassa", color: "bg-gray-100 text-gray-800" },
  media: { label: "Media", color: "bg-orange-100 text-orange-800" },
  alta: { label: "Alta", color: "bg-red-100 text-red-800" },
}

export default function ClientWorkspace() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "media" as const,
    dueDate: "",
  })

  // Carica i task del cliente
  useEffect(() => {
    if (!userData?.tenantId || !userData?.parentTenantId) return

    let unsubscribeTasks: (() => void) | undefined

    const loadClientAndTasks = async () => {
      try {
        const { query, collection, where, onSnapshot, getDocs } = await import("firebase/firestore")

        // STEP 1 - Trova il documento client corrispondente
        const clientQuery = query(collection(db, "clients"), where("clientTenantId", "==", userData.tenantId))

        const clientSnapshot = await getDocs(clientQuery)
        if (clientSnapshot.empty) {
          console.warn("Client document not found for clientTenantId", userData.tenantId)
          setTasks([])
          setLoading(false)
          return
        }

        const clientDoc = clientSnapshot.docs[0]
        const clientId = clientDoc.id

        // STEP 2 - Recupera le tasks per quel client
        const tasksQuery = query(
          collection(db, "tasks"),
          where("tenantId", "==", userData.parentTenantId),
          where("clientId", "==", clientId),
        )

        unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const tasksData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            dueDate: doc.data().dueDate?.toDate(),
          })) as Task[]

          setTasks(tasksData)
          setLoading(false)
        })
      } catch (error) {
        console.error("Error loading client/tasks:", error)
        setTasks([])
        setLoading(false)
      }
    }

    loadClientAndTasks()

    return () => {
      if (unsubscribeTasks) {
        unsubscribeTasks()
      }
    }
  }, [userData?.tenantId, userData?.parentTenantId])

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !userData?.tenantId) return

    setIsAddingTask(true)
    try {
      // Prima trova il documento client corrispondente
      const { getDocs } = await import("firebase/firestore")

      const clientQuery = query(collection(db, "clients"), where("clientTenantId", "==", userData.tenantId))

      const clientSnapshot = await getDocs(clientQuery)
      if (clientSnapshot.empty) {
        throw new Error("Client document not found")
      }

      const clientDoc = clientSnapshot.docs[0]
      const clientId = clientDoc.id

      await addDoc(collection(db, "tasks"), {
        title: newTask.title,
        description: newTask.description,
        status: "richieste",
        priority: newTask.priority,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
        createdAt: new Date(),
        clientId: clientId, // ID del documento clients (corretto)
        tenantId: userData.parentTenantId, // L'agenzia che gestisce il cliente
      })

      setNewTask({ title: "", description: "", priority: "media", dueDate: "" })
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta è stata inviata all'agenzia",
      })
    } catch (error) {
      console.error("Errore nell'aggiunta del task:", error)
      toast({
        title: "Errore",
        description: "Impossibile inviare la richiesta",
        variant: "destructive",
      })
    } finally {
      setIsAddingTask(false)
    }
  }

  const handleMoveToReview = async (taskId: string) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        columnId: "revisione",
      })
      toast({
        title: "Task spostato",
        description: "Il task è stato spostato in revisione",
      })
    } catch (error) {
      console.error("Errore nello spostamento del task:", error)
      toast({
        title: "Errore",
        description: "Impossibile spostare il task",
        variant: "destructive",
      })
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => {
      const taskStatus = task.status
      return taskStatus === status
    })
  }

  const getStats = () => {
    return {
      total: tasks.length,
      richieste: getTasksByStatus("richieste").length,
      inLavorazione: getTasksByStatus("in-lavorazione").length,
      revisione: getTasksByStatus("revisione").length,
      completato: getTasksByStatus("completato").length,
    }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Il Mio Workspace</h1>
          <p className="text-gray-600">Gestisci le tue richieste e monitora i progressi</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">richieste totali</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Richieste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.richieste}</div>
            <p className="text-xs text-muted-foreground">in attesa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Lavorazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inLavorazione}</div>
            <p className="text-xs text-muted-foreground">in corso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Revisione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.revisione}</div>
            <p className="text-xs text-muted-foreground">da approvare</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completato}</div>
            <p className="text-xs text-muted-foreground">terminati</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusTasks = getTasksByStatus(status)
          const Icon = config.icon

          return (
            <Card key={status} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {statusTasks.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {statusTasks.map((task) => (
                  <Card key={task.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                        <Badge className={`text-xs ${priorityConfig[task.priority].color}`}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                      </div>
                      {task.description && <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {task.dueDate ? task.dueDate.toLocaleDateString("it-IT") : "Nessuna scadenza"}
                        </div>
                      </div>
                      {/* I clienti possono spostare solo da "in-lavorazione" a "revisione" */}
                      {status === "in-lavorazione" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveToReview(task.id)}
                          className="w-full text-xs"
                        >
                          Sposta in Revisione
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                {statusTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun task</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
