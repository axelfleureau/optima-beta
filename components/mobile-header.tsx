"use client"

import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationPanel } from "@/components/ui/notification-panel"
import { RighelloIcon } from "@/components/brand/righello-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"
import { getAppRouteMeta } from "@/lib/app-navigation"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"

export function MobileHeader() {
  const { isMobile, toggleSidebar } = useSidebar()
  const { userData, user, signOut } = useAuth()
  const pathname = usePathname()
  const meta = getAppRouteMeta(pathname)
  const openCommand = useCommandBarStore((state) => state.open)

  if (!isMobile) return null

  return (
    <div className="sticky top-0 z-40 flex min-h-[68px] items-center justify-between gap-3 border-b border-white/[0.07] bg-[#080a10]/92 px-3 py-2.5 text-white backdrop-blur-2xl md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-11 w-11 shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.09] hover:text-white"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        
        <div className="flex min-w-0 items-center gap-2.5">
          <RighelloIcon className="hidden h-10 w-10 rounded-xl min-[390px]:grid" imageClassName="h-[19px] w-[19px]" priority />
          <div className="min-w-0 leading-none">
            <span className="block truncate text-base font-black tracking-[-0.02em]">{meta.label}</span>
            <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{meta.eyebrow}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openCommand}
          className="h-11 w-11 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/72 hover:bg-white/[0.09] hover:text-white"
          aria-label="Cerca o apri i comandi"
        >
          <Search className="h-4 w-4" />
        </Button>
        <div className="hidden min-[390px]:block [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-xl [&_button]:border [&_button]:border-white/[0.08] [&_button]:bg-white/[0.04] [&_button]:text-white/72">
          <NotificationPanel />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-11 w-11 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1 hover:bg-white/[0.09]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || undefined} alt="" />
                <AvatarFallback className="bg-righello-pink text-white">
                  {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[min(17rem,calc(100vw-1.5rem))]" align="end" forceMount>
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium leading-none">
              {userData?.firstName} {userData?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData?.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
