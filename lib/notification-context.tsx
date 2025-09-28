"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/types"

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "task_assigned" | "task_updated" | "comment_added" | "due_date" | "general"
  read: boolean
  createdAt: Date
  taskId?: string
  metadata?: Record<string, any>
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => Promise<void>
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  deleteNotification: (notificationId: string) => void
  loading: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Carica le notifiche per l'utente corrente
  useEffect(() => {
    if (!userData?.id) {
      setLoading(false)
      return
    }

    const loadNotifications = async () => {
      try {
        const { db } = await import("@/lib/firebase")
        const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore")

        // Usa una query semplice senza orderBy per evitare errori di indice composito
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("userId", "==", userData.id)
        )

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
          const notificationsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          })) as Notification[]

          // Ordina manualmente per createdAt (più recenti prima)
          notificationsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          
          setNotifications(notificationsData)
          setLoading(false)
        })

        return unsubscribe
      } catch (error) {
        console.error("Errore nel caricamento notifiche:", error)
        setLoading(false)
      }
    }

    const unsubscribe = loadNotifications()

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [userData?.id])

  const addNotification = async (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { collection, addDoc } = await import("firebase/firestore")

      await addDoc(collection(db, "notifications"), {
        ...notification,
        read: false,
        createdAt: new Date(),
      })
    } catch (error) {
      console.error("Errore nell'aggiunta notifica:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: new Date(),
      })
    } catch (error) {
      console.error("Errore nell'aggiornamento notifica:", error)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read)
    
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc, writeBatch } = await import("firebase/firestore")

      const batch = writeBatch(db)
      
      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, "notifications", notification.id)
        batch.update(notificationRef, {
          read: true,
          readAt: new Date(),
        })
      })

      await batch.commit()
    } catch (error) {
      console.error("Errore nell'aggiornamento notifiche:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { db } = await import("@/lib/firebase")
      const { doc, deleteDoc } = await import("firebase/firestore")

      await deleteDoc(doc(db, "notifications", notificationId))
    } catch (error) {
      console.error("Errore nell'eliminazione notifica:", error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loading,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}