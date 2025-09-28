"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  MessageSquare, 
  Target, 
  AlertCircle,
  Trash2,
  Eye
} from "lucide-react"
import { useNotifications } from "@/lib/notification-context"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"

const notificationIcons = {
  task_assigned: Target,
  task_updated: Clock,
  comment_added: MessageSquare,
  due_date: AlertCircle,
  general: Bell,
}

const notificationColors = {
  task_assigned: "text-blue-600",
  task_updated: "text-yellow-600", 
  comment_added: "text-green-600",
  due_date: "text-red-600",
  general: "text-gray-600",
}

export function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Se la notifica ha un taskId, potresti voler navigare a quella task
    if (notification.taskId) {
      // TODO: Implementare navigazione alle task
      console.log("Navigazione alla task:", notification.taskId)
    }
  }

  const getRelativeTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: it })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifiche</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Segna tutte come lette
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Caricamento notifiche...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nessuna notifica
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell
                const iconColor = notificationColors[notification.type] || "text-gray-600"
                
                return (
                  <div
                    key={notification.id}
                    className={`px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-l-2 ${
                      notification.read 
                        ? "border-transparent opacity-60" 
                        : "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium truncate">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full justify-center text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Visualizza tutte
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}