"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"

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

function mapNotification(raw: any): Notification {
  return {
    id: String(raw.id),
    userId: String(raw.userId || ""),
    title: String(raw.title || ""),
    message: String(raw.message || ""),
    type: raw.type || "general",
    read: Boolean(raw.read),
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    taskId: raw.taskId || undefined,
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const refreshNotifications = useCallback(async () => {
    if (!userData?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
        credentials: "same-origin",
      })

      if (!response.ok) {
        throw new Error("Errore nel caricamento notifiche")
      }

      const data = await response.json()
      setNotifications((data.notifications || []).map(mapNotification))
    } catch (error) {
      console.error("Errore nel caricamento notifiche:", error)
    } finally {
      setLoading(false)
    }
  }, [userData?.id])

  useEffect(() => {
    void refreshNotifications()

    if (!userData?.id) return

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshNotifications()
      }
    }, 15000)

    const handleFocus = () => void refreshNotifications()
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [refreshNotifications, userData?.id])

  const addNotification = useCallback(
    async (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(notification),
        })

        if (!response.ok) {
          throw new Error("Errore nella creazione notifica")
        }

        await refreshNotifications()
      } catch (error) {
        console.error("Errore nell'aggiunta notifica:", error)
      }
    },
    [refreshNotifications],
  )

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    )

    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: notificationId }),
    }).catch((error) => {
      console.error("Errore nell'aggiornamento notifica:", error)
      void refreshNotifications()
    })
  }, [refreshNotifications])

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))

    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ all: true }),
    }).catch((error) => {
      console.error("Errore nell'aggiornamento notifiche:", error)
      void refreshNotifications()
    })
  }, [refreshNotifications])

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId))

    void fetch(`/api/notifications?id=${encodeURIComponent(notificationId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    }).catch((error) => {
      console.error("Errore nell'eliminazione notifica:", error)
      void refreshNotifications()
    })
  }, [refreshNotifications])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      loading,
    }),
    [addNotification, deleteNotification, loading, markAllAsRead, markAsRead, notifications],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
