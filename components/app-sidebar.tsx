"use client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
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
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import Image from "next/image"

export function AppSidebar() {
  const { userData, isSuperAdmin, isAdmin, isUser, isClient, signOut } = useAuth()
  const pathname = usePathname()

  // Menu items per super admin
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

  // Menu items per admin (agenzie)
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

  // Menu items per user (utenti interni agenzia)
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

  // Menu items per client
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

  // Scegli il menu appropriato in base al ruolo
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

  const adminItems = [
    {
      title: "Impostazioni",
      url: "/settings",
      icon: Settings,
    },
  ]

  // Verifica se il percorso corrente corrisponde all'URL dell'elemento
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
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0">
            <Image
              src="/assets/logos/righello-logo.svg"
              alt="Righello Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-lg truncate text-righello-darkGray">Optima</span>
            <span className="text-xs text-gray-500 truncate">{getRoleDisplayName()}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 group-data-[collapsible=icon]:hidden">
            {menuLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isSuperAdmin) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 group-data-[collapsible=icon]:hidden">
                AMMINISTRAZIONE
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="truncate">
                {userData?.firstName} {userData?.lastName}
              </span>
              <span className="text-xs text-gray-400 truncate">{getRoleDisplayName()}</span>
            </div>
          </div>
          <SidebarMenuButton
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors justify-start"
            tooltip="Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
