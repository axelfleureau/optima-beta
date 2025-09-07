"use client"
import {
  LayoutDashboard,
  Target,
  FileText,
  Kanban,
  Bot,
  Users,
  CalendarDays,
  Settings,
  User,
  CreditCard,
  LogOut,
  Shield,
  Building,
  UserCog,
  PanelLeft,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useState } from "react"

export function AppSidebar() {
  const { userData, isSuperAdmin, isAdmin, isUser, isClient, signOut } = useAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const superAdminMenuItems = [
    {
      title: "Dashboard Super Admin",
      url: "/super-admin",
      icon: Shield,
    },
    {
      title: "Gestione Agenzie",
      url: "/super-admin/agencies",
      icon: Building,
    },
    {
      title: "Monitoraggio Token",
      url: "/super-admin/tokens",
      icon: CreditCard,
    },
  ]

  const agencyMenuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Campagne",
      url: "/campagne",
      icon: Target,
    },
    {
      title: "Preventivi",
      url: "/preventivi",
      icon: FileText,
    },
    {
      title: "Workspace",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
    {
      title: "Panoramica Clienti",
      url: "/clienti",
      icon: Users,
    },
    {
      title: "Calendario Editoriale",
      url: "/calendario-editoriale",
      icon: CalendarDays,
    },
    {
      title: "Gestione Team",
      url: "/team",
      icon: UserCog,
    },
  ]

  const userMenuItems = [
    {
      title: "I Miei Task",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
  ]

  const clientMenuItems = [
    {
      title: "Il Mio Workspace",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
  ]

  const adminItems = [
    {
      title: "Impostazioni",
      url: "/settings",
      icon: Settings,
    },
  ]

  let menuItems = []
  let menuLabel = "MENU"

  if (isSuperAdmin) {
    menuItems = superAdminMenuItems
    menuLabel = "SUPER ADMIN"
  } else if (isAdmin) {
    menuItems = agencyMenuItems
    menuLabel = "AGENZIA"
  } else if (isUser) {
    menuItems = userMenuItems
    menuLabel = "TEAM MEMBER"
  } else if (isClient) {
    menuItems = clientMenuItems
    menuLabel = "AREA CLIENTE"
  }

  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`)
  }

  const getRoleDisplayName = () => {
    switch (userData?.role) {
      case "super-admin":
        return "Super Admin"
      case "admin":
        return "Admin"
      case "user":
        return "Team Member"
      case "client":
        return "Cliente"
      default:
        return "Utente"
    }
  }

  return (
    <div
      className={`h-screen sticky top-0 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div
            className={`flex items-center group/logo-container relative ${isCollapsed ? "w-full justify-center" : "gap-2"}`}
          >
            <div
              className={`${isCollapsed ? "w-12 h-12" : "w-10 h-10"} rounded-lg flex items-center justify-center flex-shrink-0 relative transition-all duration-200 ${
                isCollapsed ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" : ""
              }`}
              onClick={() => {
                if (isCollapsed) {
                  toggleSidebar()
                }
              }}
            >
              <Image
                src="/assets/logos/righello-logo.svg"
                alt="Righello Logo"
                width={isCollapsed ? 40 : 32}
                height={isCollapsed ? 40 : 32}
                className={`transition-all duration-200 ${isCollapsed ? "group-hover/logo-container:opacity-0" : ""}`}
              />
              {isCollapsed && (
                <PanelLeft className="w-6 h-6 absolute inset-0 m-auto opacity-0 transition-opacity duration-200 group-hover/logo-container:opacity-100 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-lg text-gray-900 dark:text-white">Optima</span>
                <span className="text-xs text-gray-500">{getRoleDisplayName()}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Main menu section */}
        <div className="mb-4">
          {!isCollapsed && (
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">{menuLabel}</div>
          )}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.url}
                className={`flex items-center rounded-lg transition-colors w-full ${
                  isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                } ${
                  isActive(item.url)
                    ? "bg-pink-50 text-pink-600 border border-pink-200"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
                title={isCollapsed ? item.title : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* Admin section */}
        {(isAdmin || isSuperAdmin) && (
          <div>
            <div className="border-t border-gray-200/30 dark:border-gray-700/30 my-3" />
            {!isCollapsed && (
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">AMMINISTRAZIONE</div>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.url}
                  className={`flex items-center rounded-lg transition-colors w-full ${
                    isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                  } ${
                    isActive(item.url)
                      ? "bg-pink-50 text-pink-600 border border-pink-200"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200/30 dark:border-gray-700/30 p-6">
        <div className="space-y-1">
          <div
            className={`flex items-center text-sm text-gray-600 rounded-lg transition-colors ${
              isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            }`}
            title={isCollapsed ? `${userData?.firstName} ${userData?.lastName}` : undefined}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">
                  {userData?.firstName} {userData?.lastName}
                </span>
                <span className="text-xs text-gray-400">{getRoleDisplayName()}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className={`flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 w-full ${
              isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            }`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
