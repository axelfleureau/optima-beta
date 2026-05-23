"use client"

import { Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationPanel } from "@/components/ui/notification-panel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MobileHeader() {
  const { isMobile, toggleSidebar } = useSidebar()
  const { userData, signOut } = useAuth()

  if (!isMobile) return null

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#050505]/92 p-4 text-white backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-righello-pink text-sm font-black text-white shadow-lg shadow-righello-pink/20">
            O
          </div>
          <div className="leading-none">
            <span className="block text-lg font-bold">Optima</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">by Righello</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationPanel />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-righello-pink text-white">
                  {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
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
