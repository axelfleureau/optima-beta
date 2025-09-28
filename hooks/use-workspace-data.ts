"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Task, TaskComment, SubItem } from "@/lib/types"

// Helper function to remove undefined values from objects
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(removeUndefined)
  if (typeof obj === "object") {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value)
      }
    }
    return cleaned
  }
  return obj
}

// Helper function to safely convert various date formats to Date object
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date()

  if (dateValue instanceof Date) return dateValue

  if (dateValue && typeof dateValue.toDate === "function") {
    return dateValue.toDate()
  }

  if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }

  if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
    return new Date(dateValue.seconds * 1000)
  }

  return new Date()
}

export function useWorkspaceData() {
  const { user, userData, loading: authLoading } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user || !userData?.tenantId) {
      setLoading(false)
      return
    }

    console.log("Preparing query with:", {
      role: userData.role,
      tenantId: userData.tenantId,
      parentTenantId: userData.parentTenantId,
      assignedClientIds: userData.assignedClientIds,
    })

    let unsubscribe: (() => void) | undefined

    const initFirestore = async () => {
      try {
        const { db } = await import("@/lib/firebase")
        const { query, collection, where, onSnapshot, getDocs, or } = await import("firebase/firestore")

        let tasksQuery

        switch (userData.role) {
          case "super-admin":
            // Super admin vede tutte le task di tutte le agenzie
            tasksQuery = collection(db, "tasks")
            break

          case "admin":
            // Admin vede tutte le task del proprio tenant
            tasksQuery = query(collection(db, "tasks"), where("tenantId", "==", userData.tenantId))
            break

          case "direzione":
          case "capo-reparto":
            // Direzione e Capo Reparto vedono le task del proprio tenant
            tasksQuery = query(collection(db, "tasks"), where("tenantId", "==", userData.tenantId))
            break

          case "junior":
            // Junior vede solo le task assegnate a lui
            tasksQuery = query(
              collection(db, "tasks"),
              where("tenantId", "==", userData.parentTenantId || userData.tenantId),
              where("assignedUserId", "==", userData.id)
            )
            break

          case "client":
            // Client vede solo le proprie task
            if (!userData.parentTenantId) {
              console.error("Client user missing parentTenantId")
              setTasks([])
              setLoading(false)
              return
            }

            // Trova il documento client corrispondente
            const clientQuery = query(collection(db, "clients"), where("clientTenantId", "==", userData.tenantId))

            const clientSnapshot = await getDocs(clientQuery)
            if (clientSnapshot.empty) {
              console.warn("Client document not found for clientTenantId", userData.tenantId)
              setTasks([])
              setLoading(false)
              return
            }

            const clientDoc = clientSnapshot.docs[0]
            const clientDocumentId = clientDoc.id

            tasksQuery = query(
              collection(db, "tasks"),
              where("tenantId", "==", userData.parentTenantId),
              where("clientId", "==", clientDocumentId),
            )
            break

          default:
            console.error("Unknown user role:", userData.role)
            setTasks([])
            setLoading(false)
            return
        }

        unsubscribe = onSnapshot(
          tasksQuery,
          (snapshot) => {
            const tasksData = snapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                id: doc.id,
                ...data,
                createdAt: safeToDate(data.createdAt),
                updatedAt: safeToDate(data.updatedAt),
                dueDate: data.dueDate ? safeToDate(data.dueDate) : null,
                tags: data.tags || [],
                attachments: data.attachments || [],
                subItems: Array.isArray(data.subItems)
                  ? data.subItems.map((item: any) => ({
                      ...item,
                      createdAt: safeToDate(item.createdAt),
                    }))
                  : [],
                comments: Array.isArray(data.comments)
                  ? data.comments.map((comment: any) => ({
                      ...comment,
                      createdAt: safeToDate(comment.createdAt),
                      updatedAt: comment.updatedAt ? safeToDate(comment.updatedAt) : undefined,
                    }))
                  : [],
                type: data.type || "",
                score: data.score || 0,
                status: data.status || data.columnId,
                richDescription: data.richDescription || "",
                parentItemId: data.parentItemId || null,
                assignedUserId: data.assignedUserId || null,
              }
            }) as Task[]

            console.log(
              "Tasks loaded for role",
              userData.role,
              ":",
              tasksData.map((t) => ({
                id: t.id,
                title: t.title,
                clientId: t.clientId,
                assignedUserId: t.assignedUserId,
                tenantId: t.tenantId,
              })),
            )

            setTasks(tasksData)
            setLoading(false)
          },
          (err) => {
            console.error("Error fetching tasks:", err)
            setError(err.message)
            setLoading(false)
          },
        )
      } catch (err) {
        console.error("Error initializing Firestore:", err)
        setError(err instanceof Error ? err.message : "Failed to initialize")
        setLoading(false)
      }
    }

    initFirestore()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user, userData?.tenantId, userData?.parentTenantId, userData?.role, userData?.assignedClientIds, authLoading])

  const moveTask = async (taskId: string, newColumnId: string) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      const taskRef = doc(db, "tasks", taskId)
      await updateDoc(taskRef, {
        columnId: newColumnId,
        status: newColumnId,
        updatedAt: new Date(),
      })
    } catch (err) {
      console.error("Error moving task:", err)
      setError(err instanceof Error ? err.message : "Failed to move task")
    }
  }

  const addComment = async (taskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc, arrayUnion, getDoc } = await import("firebase/firestore")

      const newComment = removeUndefined({
        id: `comment_${Date.now()}`,
        text: comment.text,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar || null,
        createdAt: new Date(),
      })

      const taskRef = doc(db, "tasks", taskId)
      const taskDoc = await getDoc(taskRef)
      const taskData = taskDoc.data()

      if (!taskData || !Array.isArray(taskData.comments)) {
        await updateDoc(taskRef, {
          comments: [newComment],
          updatedAt: new Date(),
        })
      } else {
        await updateDoc(taskRef, {
          comments: arrayUnion(newComment),
          updatedAt: new Date(),
        })
      }
    } catch (err) {
      console.error("Error adding comment:", err)
      setError(err instanceof Error ? err.message : "Failed to add comment")
      throw err
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      const cleanUpdates = removeUndefined({
        ...updates,
        updatedAt: new Date(),
      })

      const taskRef = doc(db, "tasks", taskId)
      await updateDoc(taskRef, cleanUpdates)
    } catch (err) {
      console.error("Error updating task:", err)
      setError(err instanceof Error ? err.message : "Failed to update task")
      throw err
    }
  }

  const updateSubItems = async (taskId: string, subItems: SubItem[]) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      const cleanSubItems = subItems.map((item) =>
        removeUndefined({
          ...item,
          createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(),
        }),
      )

      const taskRef = doc(db, "tasks", taskId)
      await updateDoc(taskRef, {
        subItems: cleanSubItems,
        updatedAt: new Date(),
      })
    } catch (err) {
      console.error("Error updating sub-items:", err)
      setError(err instanceof Error ? err.message : "Failed to update sub-items")
      throw err
    }
  }

  return {
    tasks,
    loading,
    error,
    moveTask,
    updateTask,
    addComment,
    updateSubItems,
  }
}
