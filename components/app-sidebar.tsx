"use client";
import {
  LayoutDashboard,
  Target,
  FileText,
  Kanban,
  Bot,
  Workflow,
  Users,
  CalendarDays,
  CalendarClock,
  Settings,
  User,
  CreditCard,
  LogOut,
  Shield,
  Building,
  UserCog,
  UserCheck,
  PanelLeft,
  ClipboardList,
  Gauge,
  X,
  Upload,
  ArrowRight,
  BriefcaseBusiness,
  Clapperboard,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { RighelloIcon } from "@/components/brand/righello-icon";
import { cn } from "@/lib/utils";

const OptimaMark = ({ className }: { className?: string }) => (
  <RighelloIcon className={className} />
);

export function AppSidebar() {
  const {
    userData,
    isSuperAdmin,
    isAdmin,
    isDirezione,
    isCapoReparto,
    isJunior,
    isFreelance,
    isClient,
    signOut,
  } = useAuth();
  const pathname = usePathname();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();

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
  ];

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
      title: "Controllo Aziendale",
      url: "/management",
      icon: Gauge,
    },
    {
      title: "Presenze",
      url: "/presenze",
      icon: UserCheck,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
    {
      title: "AI Ops",
      url: "/agenti",
      icon: Workflow,
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
      title: "Tracker Contenuti",
      url: "/calendario-editoriale?view=tracker",
      icon: FileSpreadsheet,
    },
    {
      title: "Video Review",
      url: "/video",
      icon: Clapperboard,
    },
    {
      title: "Calendario Team",
      url: "/calendario-team",
      icon: CalendarClock,
    },
    {
      title: "Gestione Team",
      url: "/team",
      icon: UserCog,
    },
    {
      title: "Rapportini",
      url: "/rapportini",
      icon: ClipboardList,
    },
    {
      title: "Crediti Clienti",
      url: "/crediti",
      icon: CreditCard,
    },
    {
      title: "Importa Task",
      url: "/importa-task",
      icon: Upload,
    },
  ];

  const userMenuItems = [
    {
      title: "I Miei Task",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "Clienti",
      url: "/clienti",
      icon: Users,
    },
    {
      title: "Calendario Editoriale",
      url: "/calendario-editoriale",
      icon: CalendarDays,
    },
    {
      title: "Tracker Contenuti",
      url: "/calendario-editoriale?view=tracker",
      icon: FileSpreadsheet,
    },
    {
      title: "Video Review",
      url: "/video",
      icon: Clapperboard,
    },
    {
      title: "Rapportino",
      url: "/rapportini",
      icon: ClipboardList,
    },
    {
      title: "Presenza",
      url: "/presenze",
      icon: UserCheck,
    },
    {
      title: "Calendario Team",
      url: "/calendario-team",
      icon: CalendarClock,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
  ];

  const freelanceMenuItems = [
    {
      title: "Workspace assegnato",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "Clienti assegnati",
      url: "/clienti",
      icon: BriefcaseBusiness,
    },
    {
      title: "Calendario Editoriale",
      url: "/calendario-editoriale",
      icon: CalendarDays,
    },
    {
      title: "Tracker Contenuti",
      url: "/calendario-editoriale?view=tracker",
      icon: FileSpreadsheet,
    },
    {
      title: "Video Review",
      url: "/video",
      icon: Clapperboard,
    },
    {
      title: "Rapportino",
      url: "/rapportini",
      icon: ClipboardList,
    },
    {
      title: "Presenza",
      url: "/presenze",
      icon: UserCheck,
    },
  ];

  const clientMenuItems = [
    {
      title: "Il Mio Workspace",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "Crediti",
      url: "/crediti",
      icon: CreditCard,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
  ];

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
  ];

  const dailyFlowItems = [
    {
      title: "1. Presenza e focus",
      body: "Ingresso, uscita, assenze e anomalie.",
      url: "/presenze",
      icon: UserCheck,
    },
    {
      title: "2. Task operative",
      body: "Cliente, progetto, stato e deliverable.",
      url: "/workspace",
      icon: Kanban,
    },
    {
      title: "3. Rapportino",
      body: "Fine giornata, ore e lavoro svolto.",
      url: "/rapportini",
      icon: ClipboardList,
    },
  ];

  let menuItems: typeof superAdminMenuItems = [];
  let menuLabel = "MENU";

  if (isSuperAdmin) {
    menuItems = superAdminMenuItems;
    menuLabel = "SUPER ADMIN";
  } else if (isAdmin || isDirezione || isCapoReparto) {
    menuItems = agencyMenuItems;
    menuLabel = "AGENZIA";
  } else if (isFreelance) {
    menuItems = freelanceMenuItems;
    menuLabel = "FREELANCE";
  } else if (isJunior) {
    menuItems = userMenuItems;
    menuLabel = "TEAM MEMBER";
  } else if (isClient) {
    menuItems = clientMenuItems;
    menuLabel = "AREA CLIENTE";
  }

  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const getRoleDisplayName = () => {
    switch (userData?.role) {
      case "super-admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "junior":
        return "Team Member";
      case "freelance":
        return "Freelance esterno";
      case "client":
        return "Cliente";
      default:
        return "Utente";
    }
  };

  const isCollapsed = !isMobile && state === "collapsed";
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };
  const getNavItemClass = (active: boolean) =>
    cn(
      "relative flex items-center transition-all duration-200",
      isCollapsed ? "justify-center rounded-xl" : "gap-3 rounded-lg",
      isMobile && "min-h-12 rounded-md px-3 py-3",
      active
        ? isCollapsed
          ? "bg-righello-pink/16 text-white ring-1 ring-righello-pink/35 shadow-[0_10px_24px_rgba(214,72,126,0.12)]"
          : "bg-gradient-to-r from-righello-pink/18 to-righello-cyan/10 text-white ring-1 ring-white/10"
        : "text-white/68 hover:bg-white/[0.06] hover:text-white",
    );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={cn(
          "border-b border-white/10 transition-[padding] duration-200",
          isCollapsed ? "px-1.5 py-3" : "px-4 py-4",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          <div
            className={cn(
              "flex items-center",
              isCollapsed ? "w-full justify-center" : "min-w-0 flex-1",
            )}
          >
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
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSidebar();
                        }
                      }}
                      className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-righello-pink/50"
                      whileHover="hover"
                      initial="rest"
                      animate="rest"
                    >
                      <motion.div
                        variants={{
                          rest: { opacity: 1, scale: 1 },
                          hover: { opacity: 0, scale: 0.8 },
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute"
                      >
                        <OptimaMark />
                      </motion.div>

                      <motion.div
                        variants={{
                          rest: { opacity: 0, scale: 0.8 },
                          hover: { opacity: 1, scale: 1 },
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute"
                      >
                        <PanelLeft className="h-5 w-5 text-righello-pink" />
                      </motion.div>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Espandi</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Link
                href="/dashboard"
                onClick={closeMobileSidebar}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
              >
                <OptimaMark className="h-9 w-9" />
                {!isCollapsed && (
                  <div className="min-w-0 leading-none">
                    <p className="truncate text-lg font-black tracking-[-0.02em] text-white">
                      Optima
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                      by Righello
                    </p>
                  </div>
                )}
              </Link>
            )}
          </div>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Chiudi menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            !isCollapsed && (
              <SidebarTrigger className="h-9 w-9 flex-shrink-0 rounded-lg border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white" />
            )
          )}
        </div>
      </SidebarHeader>

      <SidebarContent
        className={cn(
          isCollapsed ? "p-2" : "p-4",
          isMobile &&
            "gap-4 overflow-y-auto pb-6 [-webkit-overflow-scrolling:touch]",
        )}
      >
        {!isCollapsed && !isClient ? (
          <div className="mb-4 rounded-[8px] border border-righello-cyan/18 bg-righello-cyan/[0.055] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-righello-cyan">
                  Percorso giornata
                </p>
                <p className="mt-1 text-xs leading-5 text-white/48">
                  Ordine consigliato per personale e direzione.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-righello-cyan/70" />
            </div>
            <div className="mt-3 space-y-2">
              {dailyFlowItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "group flex min-h-12 items-center gap-3 rounded-[7px] border px-3 py-2 transition",
                      active
                        ? "border-righello-pink/35 bg-righello-pink/14 text-white"
                        : "border-white/8 bg-black/15 text-white/68 hover:border-righello-cyan/30 hover:bg-white/[0.045] hover:text-white",
                    )}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border border-white/10 bg-white/[0.04]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-white/42">
                        {item.body}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Main menu section */}
        <div className="mb-4">
          {!isCollapsed && (
            <div className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              {menuLabel}
            </div>
          )}
          <SidebarMenu className={isCollapsed ? "items-center" : ""}>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.url)}
                  tooltip={isCollapsed ? item.title : undefined}
                  className={
                    isCollapsed
                      ? "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0"
                      : ""
                  }
                >
                  <Link
                    href={item.url}
                    onClick={closeMobileSidebar}
                    className={getNavItemClass(isActive(item.url))}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span
                        className={cn(
                          "font-medium",
                          isMobile ? "text-[15px]" : "text-sm",
                        )}
                      >
                        {item.title}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* Admin section */}
        {(isAdmin || isDirezione || isCapoReparto || isSuperAdmin) && (
          <div>
            <div className="my-3 border-t border-white/10" />
            {!isCollapsed && (
              <div className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                AMMINISTRAZIONE
              </div>
            )}
            <SidebarMenu className={isCollapsed ? "items-center" : ""}>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={isCollapsed ? item.title : undefined}
                    className={
                      isCollapsed
                        ? "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0"
                        : ""
                    }
                  >
                    <Link
                      href={item.url}
                      onClick={closeMobileSidebar}
                      className={getNavItemClass(isActive(item.url))}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span
                          className={cn(
                            "font-medium",
                            isMobile ? "text-[15px]" : "text-sm",
                          )}
                        >
                          {item.title}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter
        className={cn(
          "border-t border-white/10",
          isCollapsed ? "p-2" : "p-4",
          isMobile && "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
        )}
      >
        <SidebarMenu className={isCollapsed ? "items-center" : ""}>
          <SidebarMenuItem>
            <div
              className={cn(
                "flex items-center rounded-lg text-sm text-white/70 transition-colors",
                isCollapsed
                  ? "h-10 w-10 justify-center"
                  : "gap-3 border border-white/10 bg-white/[0.035] px-3 py-2",
              )}
            >
              <User className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-white">
                    {userData?.firstName} {userData?.lastName}
                  </span>
                  <span className="text-xs text-white/40">
                    {getRoleDisplayName()}
                  </span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              tooltip={isCollapsed ? "Logout" : undefined}
              className={cn(
                "text-white/60 hover:bg-righello-pink/12 hover:text-white",
                isCollapsed &&
                  "justify-center group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0",
              )}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
