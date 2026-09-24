"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationPanel } from "@/components/ui/notification-panel"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getAppRouteMeta } from "@/lib/app-navigation"
import { useAuth } from "@/lib/auth-context"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { LogOut, Search, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"

export function AppTopbar() {
  const pathname = usePathname()
  const meta = getAppRouteMeta(pathname)
  const Icon = meta.icon
  const { userData, user, signOut } = useAuth()
  const openCommand = useCommandBarStore((state) => state.open)
  const initials = `${userData?.firstName?.[0] || ""}${userData?.lastName?.[0] || ""}` || "O"

  return (
    <header className="sticky top-0 z-40 hidden h-[72px] items-center gap-4 border-b border-white/[0.07] bg-[#080a10]/88 px-5 text-white backdrop-blur-2xl md:flex xl:px-7">
      <SidebarTrigger className="h-10 w-10 shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/70 hover:bg-white/[0.08] hover:text-white" />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-righello-pink/20 bg-righello-pink/[0.09] text-righello-pink">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-white/38">{meta.eyebrow}</p>
            <span className="h-1 w-1 rounded-full bg-emerald-400" aria-hidden="true" />
          </div>
          <p className="truncate text-lg font-black leading-tight tracking-[-0.02em]">{meta.label}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={openCommand}
        className="group flex h-10 w-full max-w-[360px] items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-left text-sm text-white/44 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white/65"
        aria-label="Apri ricerca e comandi"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Cerca o chiedi a Óptima</span>
        <kbd className="rounded-md border border-white/[0.09] bg-black/20 px-2 py-0.5 font-mono text-[10px] font-bold text-white/38 group-hover:text-white/56">⌘ K</kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openCommand}
          className="h-10 w-10 rounded-xl border border-righello-pink/20 bg-righello-pink/[0.09] text-righello-pink hover:bg-righello-pink/[0.16] hover:text-righello-pink-light"
          aria-label="Apri assistente Óptima"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <div className="[&_button]:h-10 [&_button]:w-10 [&_button]:rounded-xl [&_button]:border [&_button]:border-white/[0.08] [&_button]:bg-white/[0.035] [&_button]:text-white/70 [&_button:hover]:bg-white/[0.08] [&_button:hover]:text-white">
          <NotificationPanel />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-1.5 pr-3 text-white hover:bg-white/[0.08] hover:text-white">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.photoURL || undefined} alt="" />
                <AvatarFallback className="bg-righello-pink text-xs font-black text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="max-w-28 truncate text-sm font-bold">{userData?.firstName || "Account"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-3">
              <p className="truncate text-sm font-bold">{userData?.firstName} {userData?.lastName}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{userData?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
