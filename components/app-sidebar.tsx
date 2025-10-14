"use client"
import { useState } from "react"
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
  const [isHoverPreview, setIsHoverPreview] = useState(false)

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
  const isExpanded = state === "expanded" || isHoverPreview

  return (
    <Sidebar 
      collapsible="icon"
      className={isHoverPreview && state === "collapsed" ? "!w-[--sidebar-width]" : ""}
      onMouseLeave={() => {
        if (state === "collapsed") {
          setIsHoverPreview(false)
        }
      }}
    >
      <SidebarHeader className="border-b border-gray-200/30 dark:border-gray-700/30">
        <div className={`flex items-center ${!isExpanded ? "justify-center" : "justify-between"}`}>
          <div 
            className={`flex items-center ${!isExpanded ? "w-full justify-center" : "gap-2"}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label={state === "collapsed" ? "Espandi sidebar" : "Logo Righello"}
                  aria-expanded={isExpanded}
                  onMouseEnter={() => {
                    if (state === "collapsed") {
                      setIsHoverPreview(true)
                    }
                  }}
                  onClick={() => {
                    if (state === "collapsed") {
                      toggleSidebar()
                    }
                  }}
                  className={`
                    ${state === "collapsed" ? "w-12 h-12" : "w-10 h-10"} 
                    rounded-lg flex items-center justify-center flex-shrink-0
                    ${state === "collapsed" ? "hover:bg-gradient-to-br hover:from-pink-500/20 hover:to-purple-500/20 hover:backdrop-blur-xl hover:scale-110 transition-all duration-300" : ""}
                  `}
                >
                  <Image
                    src="/assets/logos/righello-logo.svg"
                    alt="Righello Logo"
                    width={state === "collapsed" ? 40 : 32}
                    height={state === "collapsed" ? 40 : 32}
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </button>
              </TooltipTrigger>
              {state === "collapsed" && <TooltipContent side="right">Espandi</TooltipContent>}
            </Tooltip>
            {isExpanded && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-gray-500">{getRoleDisplayName()}</span>
              </div>
            )}
          </div>
          {isExpanded && <SidebarTrigger />}
        </div>
      </SidebarHeader>

      <SidebarContent className={!isExpanded ? "p-2" : "p-6"}>
        {/* Main menu section */}
        <div className="mb-4">
          {isExpanded && (
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">{menuLabel}</div>
          )}
          <SidebarMenu className={!isExpanded ? "items-center" : ""}>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild
                  isActive={isActive(item.url)}
                  tooltip={!isExpanded ? item.title : undefined}
                >
                  <Link href={item.url} className={`flex items-center gap-3 ${!isExpanded ? "justify-center" : ""}`}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span className="text-sm font-medium">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* Admin section */}
        {(isAdmin || isSuperAdmin) && (
          <div>
            <div className="border-t border-gray-200/30 dark:border-gray-700/30 my-3" />
            {isExpanded && (
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">AMMINISTRAZIONE</div>
            )}
            <SidebarMenu className={!isExpanded ? "items-center" : ""}>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={!isExpanded ? item.title : undefined}
                  >
                    <Link href={item.url} className={`flex items-center gap-3 ${!isExpanded ? "justify-center" : ""}`}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {isExpanded && <span className="text-sm font-medium">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className={`border-t border-gray-200/30 dark:border-gray-700/30 ${!isExpanded ? "p-2" : "p-6"}`}>
        <SidebarMenu className={!isExpanded ? "items-center" : ""}>
          <SidebarMenuItem>
            <div
              className={`flex items-center text-sm text-gray-600 rounded-lg transition-colors ${
                !isExpanded ? "justify-center p-2" : "gap-3 px-3 py-2"
              }`}
            >
              <User className="w-5 h-5 flex-shrink-0" />
              {isExpanded && (
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
              tooltip={!isExpanded ? "Logout" : undefined}
              className={!isExpanded ? "justify-center" : ""}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="font-medium">Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
