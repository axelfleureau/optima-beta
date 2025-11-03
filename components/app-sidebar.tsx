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
import { motion } from "framer-motion"
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// RighelloLogo component
const RighelloLogo = ({ className }: { className?: string }) => (
  <Image
    src="/assets/logos/righello-logo.svg"
    alt="Righello Logo"
    width={24}
    height={24}
    className={className}
    style={{ width: '24px', height: '24px' }}
  />
)

export function AppSidebar() {
  const { userData, isSuperAdmin, isAdmin, isJunior, isClient, signOut } = useAuth()
  const pathname = usePathname()
  const { state, toggleSidebar, isMobile } = useSidebar()

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-gray-200/30 dark:border-gray-700/30">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-2"}`}>
          <div className={`flex items-center ${isCollapsed ? "w-full justify-center" : "flex-1 min-w-0"}`}>
            {/* Logo with transform animation (desktop-only when collapsed) */}
            {!isMobile && isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={toggleSidebar}
                      role="button"
                      tabIndex={0}
                      aria-label="Espandi sidebar"
                      aria-expanded={false}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleSidebar()
                        }
                      }}
                      className="flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 hover:ring-2 hover:ring-pink-500/20 hover:bg-gradient-to-br hover:from-pink-500/10 hover:to-purple-500/10 hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/10 relative"
                      whileHover="hover"
                      initial="rest"
                      animate="rest"
                    >
                      {/* Logo - crossfade OUT on hover */}
                      <motion.div
                        variants={{
                          rest: { opacity: 1, scale: 1 },
                          hover: { opacity: 0, scale: 0.8 }
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute"
                      >
                        <RighelloLogo className="w-6 h-6" />
                      </motion.div>
                      
                      {/* Icon - crossfade IN on hover */}
                      <motion.div
                        variants={{
                          rest: { opacity: 0, scale: 0.8 },
                          hover: { opacity: 1, scale: 1 }
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute"
                      >
                        <PanelLeft className="w-6 h-6 text-pink-500" />
                      </motion.div>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Espandi
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2 px-2 flex-1 min-w-0">
                <RighelloLogo className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-base font-semibold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent truncate">
                    Righello
                  </span>
                )}
              </Link>
            )}
          </div>
          {!isCollapsed && <SidebarTrigger className="flex-shrink-0" />}
        </div>
      </SidebarHeader>

      <SidebarContent className={isCollapsed ? "p-2" : "p-6"}>
        {/* Main menu section */}
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
                  <Link 
                    href={item.url} 
                    className={cn(
                      "flex items-center gap-3 transition-all duration-200",
                      isCollapsed ? "justify-center" : "",
                      isActive(item.url) && [
                        "!border-l-4 !border-pink-500",
                        "!bg-gradient-to-r !from-pink-500/10 !to-transparent"
                      ]
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
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
                    <Link 
                      href={item.url} 
                      className={cn(
                        "flex items-center gap-3 transition-all duration-200",
                        isCollapsed ? "justify-center" : "",
                        isActive(item.url) && [
                          "!border-l-4 !border-pink-500",
                          "!bg-gradient-to-r !from-pink-500/10 !to-transparent"
                        ]
                      )}
                    >
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
              className={`flex items-center text-sm text-gray-600 rounded-lg transition-colors ${
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
  )
}
