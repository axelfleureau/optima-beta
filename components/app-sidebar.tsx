"use client"
import { useState, useEffect, useRef } from "react"
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
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function AppSidebar() {
  const { userData, isSuperAdmin, isAdmin, isJunior, isClient, signOut } = useAuth()
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const [showPreview, setShowPreview] = useState(false)
  const intentTimer = useRef<number | null>(null)

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
      title: "Fatturazione",
      url: "/dashboard/settings/billing",
      icon: CreditCard,
    },
    {
      title: "Impostazioni",
      url: "/settings",
      icon: Settings,
    },
  ]

  let menuItems: typeof superAdminMenuItems = []
  let menuLabel = "MENU"

  if (isSuperAdmin) {
    menuItems = superAdminMenuItems
    menuLabel = "SUPER ADMIN"
  } else if (isAdmin) {
    menuItems = agencyMenuItems
    menuLabel = "AGENZIA"
  } else if (isJunior) {
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
      case "junior":
        return "Team Member"
      case "client":
        return "Cliente"
      default:
        return "Utente"
    }
  }

  const isCollapsed = state === "collapsed"
  const isExpanded = state === "expanded"

  const handleLogoEnter = () => {
    if (state !== "collapsed") return
    intentTimer.current = window.setTimeout(() => {
      setShowPreview(true)
    }, 120)
  }

  const handleLogoLeave = () => {
    if (intentTimer.current) {
      window.clearTimeout(intentTimer.current)
      intentTimer.current = null
    }
  }

  const handlePreviewLeave = () => {
    if (state === "collapsed") {
      setShowPreview(false)
    }
  }

  const handleConfirmExpand = () => {
    setShowPreview(false)
    if (intentTimer.current) {
      window.clearTimeout(intentTimer.current)
      intentTimer.current = null
    }
    toggleSidebar()
  }

  useEffect(() => {
    return () => {
      if (intentTimer.current) {
        window.clearTimeout(intentTimer.current)
      }
    }
  }, [])

  return (
    <div className="relative hidden lg:block">
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-gray-200/30 dark:border-gray-700/30">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label={state === "collapsed" ? "Espandi sidebar" : "Logo Righello"}
                  aria-expanded={isExpanded}
                  onMouseEnter={handleLogoEnter}
                  onMouseLeave={handleLogoLeave}
                  onFocus={handleLogoEnter}
                  onBlur={handleLogoLeave}
                  onClick={handleConfirmExpand}
                  className={`
                    ${isCollapsed ? "w-12 h-12" : "w-10 h-10"} 
                    rounded-lg flex items-center justify-center flex-shrink-0
                    ${isCollapsed ? "hover:bg-gradient-to-br hover:from-pink-500/20 hover:to-purple-500/20 hover:scale-105 transition-all duration-200" : ""}
                  `}
                >
                  <Image
                    src="/assets/logos/righello-logo.svg"
                    alt="Righello Logo"
                    width={isCollapsed ? 40 : 32}
                    height={isCollapsed ? 40 : 32}
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Espandi</TooltipContent>}
            </Tooltip>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-gray-500">{getRoleDisplayName()}</span>
              </div>
            )}
          </div>
          {!isCollapsed && <SidebarTrigger />}
        </SidebarHeader>

        <SidebarContent className={isCollapsed ? "p-2" : "p-6"}>
          <div className="mb-4">
            {!isCollapsed && (
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">{menuLabel}</div>
            )}
            <SidebarMenu className={isCollapsed ? "items-center" : ""}>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <Link href={item.url} className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>

          {(isAdmin || isSuperAdmin) && (
            <div>
              <div className="border-t border-gray-200/30 dark:border-gray-700/30 my-3" />
              {!isCollapsed && (
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">AMMINISTRAZIONE</div>
              )}
              <SidebarMenu className={isCollapsed ? "items-center" : ""}>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <Link href={item.url} className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className={`border-t border-gray-200/30 dark:border-gray-700/30 ${isCollapsed ? "p-2" : "p-6"}`}>
          <SidebarMenu className={isCollapsed ? "items-center" : ""}>
            <SidebarMenuItem>
              <div
                className={`flex items-center text-sm text-gray-600 dark:text-gray-400 rounded-lg transition-colors ${
                  isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                }`}
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
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => signOut()}
                tooltip={isCollapsed ? "Logout" : undefined}
                className={isCollapsed ? "justify-center" : ""}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {isCollapsed && showPreview && (
        <aside
          className="absolute top-0 left-0 h-screen w-64 bg-white/95 dark:bg-gray-900/95 
                     backdrop-blur-md shadow-2xl border-r border-gray-200/30 dark:border-gray-700/30
                     rounded-r-2xl z-50 animate-in fade-in slide-in-from-left-2 duration-150"
          onMouseLeave={handlePreviewLeave}
          onMouseEnter={() => setShowPreview(true)}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="border-b border-gray-200/30 dark:border-gray-700/30 p-4">
            <button
              onClick={handleConfirmExpand}
              className="flex items-center gap-2 w-full hover:bg-gray-100/50 dark:hover:bg-gray-800/50 
                         rounded-lg p-2 transition-colors"
              aria-label="Conferma espansione"
            >
              <Image 
                src="/assets/logos/righello-logo.svg" 
                alt="Righello Logo" 
                width={32} 
                height={32}
                style={{ width: 'auto', height: 'auto' }}
              />
              <span className="text-xs text-gray-500">{getRoleDisplayName()}</span>
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                {menuLabel}
              </div>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.url}
                    onClick={() => setShowPreview(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                               transition-colors
                               ${isActive(item.url) 
                                 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100' 
                                 : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                               }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {(isAdmin || isSuperAdmin) && (
              <div>
                <div className="border-t border-gray-200/30 dark:border-gray-700/30 my-3" />
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                  AMMINISTRAZIONE
                </div>
                <nav className="space-y-1">
                  {adminItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.url}
                      onClick={() => setShowPreview(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                                 transition-colors
                                 ${isActive(item.url) 
                                   ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100' 
                                   : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                 }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200/30 dark:border-gray-700/30 p-4">
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">
                  {userData?.firstName} {userData?.lastName}
                </span>
                <span className="text-xs text-gray-400">{getRoleDisplayName()}</span>
              </div>
            </div>
            <button
              onClick={() => { setShowPreview(false); signOut(); }}
              className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-gray-700 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mt-2"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
